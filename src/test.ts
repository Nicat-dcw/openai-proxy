import { logger } from './utils/logger';
import fetch from 'node-fetch';
import { readFileSync } from 'fs';

const API_URL = 'http://localhost:3000';

// Get the first API key from api-keys.json
function getTestApiKey(): string {
  try {
    const apiKeys = JSON.parse(readFileSync('api-keys.json', 'utf-8'));
    const firstKey = Object.keys(apiKeys)[0];
    if (!firstKey) {
      throw new Error('No API keys found');
    }
    return firstKey;
  } catch (error) {
    logger.error('Failed to load API key:', error);
    process.exit(1);
  }
}

const API_KEY = getTestApiKey();

async function checkServer() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }
    logger.success('Server is running.');
  } catch (error) {
    logger.error('Server check failed. Is the server running?', error);
    logger.info('Start the server with: bun run src/index.ts');
    process.exit(1);
  }
}

async function testEndpoint(name: string, callback: () => Promise<any>) {
  logger.info(`\nTesting ${name}...`);
  try {
    const response = await callback();
    const data = await response.json();
    logger.success(`✓ ${name} succeeded`);
    logger.debug('Response:', JSON.stringify(data, null, 2));
    return data;
  } catch (error: any) {
    const response = error.response || error;
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = response.statusText || error.message;
    }
    logger.error(`✗ ${name} failed:`, {
      status: response.status,
      error: errorData
    });
    return null;
  }
}

async function runTests() {
  logger.info('🚀 Starting API tests...\n');

  // Check if server is running
  await checkServer();

  // Test models endpoint
  await testEndpoint('/v1/models', async () => {
    return await fetch(`${API_URL}/v1/models`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
  });

  // Test chat completions
  await testEndpoint('/v1/chat/completions', async () => {
    return await fetch(`${API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        messages: [{ role: 'user', content: 'Hello!' }]
      })
    });
  });

  // Test providers endpoint
  await testEndpoint('/v1/providers', async () => {
    return await fetch(`${API_URL}/v1/providers`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });
  });

  logger.info('\n✨ Tests completed\n');
}

// Run tests
runTests().catch(error => {
  logger.error('Test suite failed:', error);
  process.exit(1);
}); 