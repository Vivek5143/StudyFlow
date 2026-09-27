// LLM Integration Module
// Supports Gemini, Groq, and OpenRouter APIs with multi-provider fallback.

const fetch = require('node-fetch');
const { validateStudySet } = require('./validation.cjs');

class LLMService {
  constructor() {
    this.availableProviders = this.getAvailableProviders();
    if (this.availableProviders.length === 0) {
      throw new Error('No LLM API keys configured. Please set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY');
    }
  }

  getAvailableProviderNames() {
    return this.availableProviders.map((p) => p.name);
  }

  getAvailableProviders() {
    const order = [
      {
        name: 'Gemini',
        key: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        call: this.callGemini,
      },
      {
        name: 'Groq',
        key: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || 'llama3-8b-8192',
        call: this.callGroq,
      },
      {
        name: 'OpenRouter',
        key: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3-8b-instruct',
        call: this.callOpenRouter,
      },
    ];

    return order.filter((p) => Boolean(p.key));
  }

  async generateStudySet(input) {
    const prompt = this.buildStudySetPrompt(input);

    const timeoutMs = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);

    let lastFailureType = 'unknown failure';
    let lastError = null;

    for (const provider of this.availableProviders) {
      console.log(`[LLM] Trying ${provider.name}`);

      try {
        const responseText = await this.withTimeout(
          provider.call.call(this, prompt, { apiKey: provider.key, model: provider.model }),
          timeoutMs
        );

        const parsed = this.parseLLMResponse(responseText);

        // IMPORTANT: validation must happen per-provider before returning.
        const validated = validateStudySet(parsed);

        console.log(`[LLM] ${provider.name} succeeded`);
        return validated;
      } catch (err) {
        lastError = err;
        lastFailureType = this.classifyProviderFailure(err);
        console.warn(`[LLM] ${provider.name} failed: ${lastFailureType}`);
        // Continue to next provider.
      }
    }

    const details = lastError?.message ? `: ${lastError.message}` : '';
    throw new Error(`All LLM providers failed (last: ${lastFailureType})${details}`);
  }

  classifyProviderFailure(err) {
    const msg = err?.message ? String(err.message) : '';
    const name = err?.name ? String(err.name) : '';

    const lower = msg.toLowerCase();

    if (lower.includes('timeout')) return 'timeout';

    if (name === 'ZodError') return 'invalid study-set structure';

    // parseLLMResponse messages include JSON
    if (lower.includes('json')) return 'malformed JSON';

    if (lower.includes('rate limit')) return 'rate limit';

    // node-fetch / upstream failures often don't include the word "network"
    if (
      lower.includes('network') ||
      lower.includes('fetch failed') ||
      lower.includes('socket hang up') ||
      lower.includes('econn') ||
      lower.includes('enotfound') ||
      lower.includes('eai_again') ||
      lower.includes('etimedout') ||
      lower.includes('econnrefused') ||
      lower.includes('getaddrinfo')
    ) {
      return 'network error';
    }

    if (lower.includes('api error')) return 'provider/API error';

    return msg ? 'provider failure' : 'provider failure';
  }

  async withTimeout(promise, timeoutMs) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), timeoutMs);
      })
    ]);
  }

  buildStudySetPrompt({ input }) {
    const content = String(input ?? '').trim();

    return `
You are an expert educational content creator. Generate a structured study set based on the following input.

INPUT:
${content}

REQUIREMENTS:
1. Generate 3-15 cards covering key concepts.
2. Each card MUST have:
  - A concise question (question) that tests exactly one concept.
  - A short, memorable answer (answer), ideally 1-3 sentences and never more than 60 words.
   - Appropriate difficulty level (difficulty): exactly one of: easy, medium, hard
3. Generate unique IDs for each card.

FLASHCARD QUALITY:
- Optimize every card for quick revision and memorization, not essay-style teaching.
- Ask one direct question; avoid multi-part questions and unnecessary setup.
- Give only the essential definition, fact, rule, or relationship needed to answer it.
- Avoid long paragraphs, extended explanations, historical context, and extra examples.
- Use a simple, direct sentence structure and familiar wording.
- If a concept is complex, summarize its core idea rather than expanding the explanation.

OUTPUT FORMAT:
Return ONLY valid JSON in this exact structure:
{
  "title": "Study Set Title",
  "cards": [
    {
      "id": "unique-string-id",
      "question": "Card question",
      "answer": "Card answer",
      "difficulty": "easy|medium|hard"
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON object. Do not include markdown or any additional text.
- Ensure difficulty values are exactly "easy", "medium", or "hard".
- Ensure card ids are unique.
`.trim();
  }

  async callGemini(prompt, { apiKey, model }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.9,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new Error(`Rate limit: ${response.status}`);
      }
      throw new Error(`Gemini API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    // Extract text from Gemini response
    if (!data.candidates || data.candidates.length === 0 ||
        !data.candidates[0].content || !data.candidates[0].content.parts) {
      throw new Error('Invalid response format from Gemini');
    }

    return data.candidates[0].content.parts[0].text;
  }

  async callGroq(prompt, { apiKey, model }) {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new Error(`Rate limit: ${response.status}`);
      }
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0 ||
        !data.choices[0].message) {
      throw new Error('Invalid response format from Groq');
    }

    return data.choices[0].message.content;
  }

  async callOpenRouter(prompt, { apiKey, model }) {
    const url = 'https://openrouter.ai/api/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://studyflow.app', // Optional, for analytics
        'X-Title': 'StudyFlow' // Optional, for analytics
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new Error(`Rate limit: ${response.status}`);
      }
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0 ||
        !data.choices[0].message) {
      throw new Error('Invalid response format from OpenRouter');
    }

    return data.choices[0].message.content;
  }

  parseLLMResponse(responseText) {
    // Clean the response to extract JSON
    let cleaned = responseText.trim();

    // Remove markdown code blocks if present
    if (cleaned.startsWith('```')) {
      const lines = cleaned.split('\n');
      // Find first line with ``` and last line with ```
      let startIdx = -1, endIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('```')) {
          if (startIdx === -1) startIdx = i;
          else endIdx = i;
        }
      }
      if (startIdx !== -1 && endIdx !== -1 && startIdx !== endIdx) {
        cleaned = lines.slice(startIdx + 1, endIdx).join('\n');
      }
    }

    // Try to find JSON object in the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in LLM response');
    }

    const jsonStr = jsonMatch[0];

    try {
      return JSON.parse(jsonStr);
    } catch (parseError) {
      throw new Error(`Invalid JSON in LLM response: ${parseError.message}\nResponse: ${jsonStr.substring(0, 200)}...`);
    }
  }
}

module.exports = { LLMService };
