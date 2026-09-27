require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { LLMService } = require('./llm.cjs');
const { validateGenerateRequest, validateStudySet } = require('./validation.cjs');

const app = express();

// Initialize LLM service
let llmService;
try {
  llmService = new LLMService();
  console.log(`✓ LLM configured: ${llmService.getAvailableProviderNames().join(', ')}`);
} catch (error) {
  console.error('✗ LLM initialization failed:', error.message);
  console.error('Please configure an API key in .env file');
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Request timeout
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    llm: llmService ? {
      providers: llmService.getAvailableProviderNames(),
      configured: true
    } : {
      configured: false
    }
  });
});

// Generate study set endpoint
app.post('/api/generate', async (req, res) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    // Check LLM service is available
    if (!llmService) {
      return res.status(503).json({
        success: false,
        error: 'LLM service not configured. Please add an API key to .env',
        requestId,
        timestamp: new Date().toISOString()
      });
    }

    // Validate request body
    const validatedInput = validateGenerateRequest(req.body);

    const requestController = new AbortController();
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        requestController.abort();
        reject(new Error('Request timeout'));
      }, REQUEST_TIMEOUT);
    });

    let llmResponse;
    try {
      llmResponse = await Promise.race([
        llmService.generateStudySet(validatedInput, { signal: requestController.signal }),
        timeoutPromise
      ]);
    } finally {
      clearTimeout(timeoutId);
    }

    // Validate LLM output (assignment contract)
    const validatedStudySet = validateStudySet(llmResponse);

    const duration = Date.now() - startTime;
    console.log(`✓ Generated study set in ${duration}ms (${validatedStudySet.cards.length} cards)`);

    res.json({
      success: true,
      data: {
        title: validatedStudySet.title,
        cards: validatedStudySet.cards,
      },
      requestId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`✗ Generation failed after ${duration}ms`, {
      requestId,
      errorName: error?.name || 'Error'
    });

    // Determine error type and status code
    let statusCode = 500;
    let errorMessage = 'Failed to generate study set';

    if (error.name === 'ZodError') {
      statusCode = 400;
      const issues = error.issues || error.errors || [];
      errorMessage = 'Invalid input: ' + issues.map(e => e.message).join(', ');
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
      errorMessage = 'Request timeout - please try again';
    } else if (error.message.includes('API')) {
      statusCode = 502;
      errorMessage = 'LLM API error - please try again';
    } else if (error.message.includes('JSON')) {
      statusCode = 502;
      errorMessage = 'Invalid LLM response format - please try again';
    }

    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      requestId,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 StudyFlow API server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Generate endpoint: POST http://localhost:${PORT}/api/generate\n`);
});
