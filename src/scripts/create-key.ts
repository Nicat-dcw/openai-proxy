import { ApiKeyService } from '../services/api-key-service';
import { logger } from '../utils/logger';

async function createApiKey(isPremium: boolean = false) {
  try {
    const apiKeyService = await ApiKeyService.getInstance();
    const apiKey = await apiKeyService.createApiKey(isPremium);
    const premiumModels = apiKeyService.getPremiumModels();
    
    logger.success('\nAPI Key created successfully!\n');
    logger.info('Your API Key:', apiKey);
    logger.info(`Key Type: ${isPremium ? 'Premium' : 'Standard'}`);
    
    logger.warn('\nImportant Notes:');
    logger.info(`• Daily request limit: ${isPremium ? '15' : '10'} requests`);
    if (isPremium) {
      logger.info('• Access to premium models:');
      premiumModels.forEach(model => {
        logger.info(`  - ${model}`);
      });
    }
    logger.info('• Store this key safely - it won\'t be shown again');
    logger.info('• Use this key in the Authorization header:');
    logger.info('  Authorization: Bearer YOUR_API_KEY\n');
    
    // Example usage
    const exampleModel = isPremium ? premiumModels[0] : 'openai/gpt-3.5-turbo';
    logger.info('Example usage:');
    logger.info('curl -X POST http://localhost:3000/v1/chat/completions \\');
    logger.info('  -H "Authorization: Bearer ' + apiKey + '" \\');
    logger.info('  -H "Content-Type: application/json" \\');
    logger.info(`  -d '{"model": "${exampleModel}", "messages": [{"role": "user", "content": "Hello!"}]}'`);

  } catch (error) {
    logger.error('Failed to create API key:', error);
    process.exit(1);
  }
}

// Get command line arguments
const isPremium = process.argv.includes('--premium');

// Run the script
createApiKey(isPremium); 