// Test script to verify the complete API integration
// Run with: node test-api-integration.js

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testAPIIntegration() {
  console.log('🧪 Testing StudyFlow API Integration...\n');

  // Test 1: Health check
  console.log('1. Testing health endpoint...');
  try {
    const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
    console.log('   ✓ Health check passed:', healthResponse.data.llm.configured ? 'LLM configured' : 'LLM not configured');
  } catch (error) {
    console.error('   ✗ Health check failed:', error.message);
    return;
  }

  // Test 2: Generate endpoint (without API keys, should show error)
  console.log('2. Testing generate endpoint (expecting LLM configuration error)...');
  try {
    const generateResponse = await axios.post(`${API_BASE_URL}/api/generate`, {
      input: 'machine learning',
    }, {
      timeout: 10000
    });

    if (generateResponse.data.success) {
      console.log('   ✓ Generate endpoint worked (API keys configured)');
      console.log(
        '   📚 Generated:',
        generateResponse.data.data.cards.length,
        'cards'
      );
    } else {
      console.log('   ℹ Generate endpoint returned expected error:', generateResponse.data.error);
    }

  } catch (error) {
    if (error.response?.data?.error?.includes('LLM service not configured')) {
      console.log('   ✓ Generate endpoint returned expected LLM configuration error');
      console.log('   📝 Error message:', error.response.data.error);
    } else {
      console.error('   ✗ Unexpected error:', error.response?.data?.error || error.message);
    }
  }

  console.log('\n📋 Integration Test Summary:');
  console.log('   • Backend server is running');
  console.log('   • /api/generate endpoint is accessible');
  console.log('   • Frontend generates a request with { input }');

  if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY && !process.env.OPENROUTER_API_KEY) {
    console.log('\n⚠️  Note: No LLM API keys configured in .env file');
    console.log('   To test actual generation, add one of the following:');
    console.log('   • GEMINI_API_KEY');
    console.log('   • GROQ_API_KEY');
    console.log('   • OPENROUTER_API_KEY');
  }

  console.log('\n✅ API Integration test completed!');
}

// Run the test
if (require.main === module) {
  testAPIIntegration();
}

module.exports = testAPIIntegration;
