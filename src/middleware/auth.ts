import { Elysia } from 'elysia';
import { ApiKeyService } from '../services/api-key-service';
import { logger } from '../utils/logger';

// List of endpoints that don't require authentication
const PUBLIC_ENDPOINTS = ['/', '/v1/api-keys'];

export const authMiddleware = new Elysia()
  .derive(async ({ request }): Promise<{
    error?: any;
    apiKey?: string;
    remainingRequests: number;
  }> => {
    const url = new URL(request.url);
    logger.debug('Incoming request to:', url.pathname);

    // Skip auth for public endpoints
    if (PUBLIC_ENDPOINTS.includes(url.pathname)) {
      logger.debug('Skipping auth for public endpoint');
      return { remainingRequests: 0 };
    }

    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return {
        error: {
          message: 'Missing Authorization header',
          type: 'auth_error',
          param: null,
          code: 'auth_required'
        },
        remainingRequests: 0
      };
    }

    const apiKey = authHeader.replace('Bearer ', '');
    if (!apiKey || apiKey === authHeader) {
      return {
        error: {
          message: 'Invalid Authorization format. Use: Bearer YOUR_API_KEY',
          type: 'auth_error',
          param: 'authorization',
          code: 'invalid_auth_format'
        },
        remainingRequests: 0
      };
    }

    const apiKeyService = await ApiKeyService.getInstance();
    const validation = await apiKeyService.validateRequest(apiKey);

    if (!validation.isValid) {
      return {
        error: {
          message: validation.error || 'Invalid API key',
          type: 'auth_error',
          param: 'api_key',
          code: 'invalid_api_key'
        },
        remainingRequests: 0
      };
    }

    logger.debug('Auth successful', { key: apiKey.slice(0, 8) + '...' });
    const remainingRequests = await apiKeyService.getRemainingRequests(apiKey);

    return {
      apiKey,
      remainingRequests
    };
  }); 