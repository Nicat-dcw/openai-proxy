import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { ProviderManager } from './providers/manager';
import { logger } from './utils/logger';
import { authMiddleware } from './middleware/auth';

type AuthenticatedRequest = {
  error?: any;
  apiKey?: string;
  remainingRequests: number;
  body?: any;
  query?: Record<string, string>;
  params?: Record<string, string>;
  headers?: Record<string, string>;
};

const app = new Elysia()
  .use(cors())
  .use(authMiddleware)
  .onRequest(({ request }) => {
    logger.debug('Incoming request:', request.url);
  })
    .onError(({ code, error }:any) => {
    logger.error(`Error: ${code}`, error);
    return Response.json({
      error: {
        message: error.message || 'An unexpected error occurred',
        type: code,
        param: null,
        code: error || 'internal_error'
      }
    });
  });

// Models endpoint
app.get('/v1/models', async ({ error, remainingRequests }: AuthenticatedRequest) => {


  try {
    const providerManager = ProviderManager.getInstance();
    const models = providerManager.getAvailableModels();
    logger.debug('Models response:', { models });
    
    return {
      object: "list",
      data: models.map(model => ({
        id: model.customName,
        object: "model",
        created: Date.now(),
        owned_by: model.providers[0],
        providers: model.providers
      })),
      remaining_requests: remainingRequests
    };
  } catch (error: any) {
    logger.error('Models endpoint error:', error);
    throw new Error(error.message || 'Failed to fetch models');
  }
});

// Chat completions endpoint
app.post('/v1/chat/completions', async ({ set, body, error, remainingRequests }:any) => {
  

  const providerManager = ProviderManager.getInstance();
  
  try {
    if (!body.model?.includes('/')) {
      set.status = 400;
      return Response.json({
        error: {
          message: 'Model name must be in format: provider/model',
          type: 'validation_error',
          param: 'model',
          code: 'invalid_model_format'
        }
      });
    }

    const [providerName, modelName] = body.model.split('/');
    const result = await fetch(`${providerManager.getProviderBaseUrl(providerName)}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerManager.getProviderApiKey(providerName)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        model: modelName
      })
    });

    const response = await result.json();
    logger.info(response,"data")
    return Response.json({
      ...response,
      remaining_requests: remainingRequests
    });

  } catch (error: any) {
    set.status = 500;
    return Response.json({
      error: {
        message: error.message || 'Chat completion failed',
        type: 'api_error',
        param: null,
        code: 'chat_completion_error'
      },
      remaining_requests: remainingRequests
    });
  }
});

// Providers endpoint
app.get('/v1/providers', async ({ error }) => {
 

  try {
    const providerManager = ProviderManager.getInstance();
    const providers = await providerManager.getProvidersWithStatus();
    logger.debug('Providers response:', providers);
    
    return {
      object: "list",
      data: providers.map(provider => ({
        id: provider.name,
        object: "provider",
        base_url: provider.baseUrl,
        status: {
          active: provider.isActive,
          last_checked: provider.lastChecked,
          last_error: provider.lastError
        },
        models: provider.models
      })),
    };
  } catch (error: any) {
    logger.error('Providers endpoint error:', error);
    throw new Error(error.message || 'Failed to fetch providers');
  }
});

// Root endpoint
app.get('/', () => {
  return Response.json({
    status: 'healthy',
    version: '1.0.0',
    message: 'AI API Gateway is running'
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});