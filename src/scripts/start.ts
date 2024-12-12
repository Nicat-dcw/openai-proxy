import { logger } from '../utils/logger';
import { exec } from 'child_process';

// First, make sure you have your environment variables set
if (!process.env.OPENAI_API_KEY) {
  logger.error('❌ OPENAI_API_KEY environment variable is not set');
  process.exit(1);
}

// Start the server
logger.info('🚀 Starting server...');
const server = exec('bun run src/index.ts', (error, stdout, stderr) => {
  if (error) {
    logger.error('Server error:', error);
    return;
  }
  if (stderr) {
    logger.error('Server stderr:', stderr);
    return;
  }
  logger.info(stdout);
});

// Wait for server to start
setTimeout(() => {
  // Run tests
  logger.info('⏳ Running tests...');
  exec('bun run src/test.ts', (error, stdout, stderr) => {
    if (error) {
      logger.error('Test error:', error);
      return;
    }
    if (stderr) {
      logger.error('Test stderr:', stderr);
      return;
    }
    logger.info(stdout);

    // Cleanup
    server.kill();
    process.exit(0);
  });
}, 2000); // Wait 2 seconds for server to start

// Handle cleanup
process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
}); 