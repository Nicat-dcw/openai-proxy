import { ConfigLoader } from '../config/config-loader';
import type { ProviderConfig, Config } from '../config/config-loader';
import { logger } from '../utils/logger';
import { ProviderStatusService } from '../services/provider-status';
import fetch from 'node-fetch';

interface ModelInfo {
  customName: string;
  providers: string[];
  originalModel: string;
}

export class ProviderManager {
  private static instance: ProviderManager;
  private providers: { [key: string]: ProviderConfig };
  private modelMappings: Map<string, { provider: string, originalModel: string }>;

  private constructor() {
    const config = ConfigLoader.getInstance().getConfig();
    this.providers = config.providers;
    this.modelMappings = this.buildModelMappings(config);
    logger.debug('ProviderManager initialized with providers:', this.providers);
  }

  private buildModelMappings(config: Config): Map<string, { provider: string, originalModel: string }> {
    const mappings = new Map();
    
    logger.debug('Building model mappings from config:', config);
    
    Object.entries(config.providers).forEach(([providerName, providerConfig]) => {
      logger.debug(`Processing provider ${providerName}:`, providerConfig);
      
      providerConfig.models?.forEach(modelMap => {
        Object.entries(modelMap).forEach(([customName, originalName]) => {
          logger.debug(`Adding mapping: ${customName} -> ${originalName} (${providerName})`);
          mappings.set(customName, {
            provider: providerName,
            originalModel: originalName
          });
        });
      });
    });

    logger.debug('Final model mappings:', Array.from(mappings.entries()));
    return mappings;
  }

  public getAvailableModels(): ModelInfo[] {
    const groupedModels = new Map<string, ModelInfo>();
    
    logger.debug('Getting available models...');
    logger.debug('Model mappings:', Array.from(this.modelMappings.entries()));
    logger.debug('Providers:', this.providers);

    if (this.modelMappings.size === 0) {
      logger.warn('No model mappings found!');
    }

    this.modelMappings.forEach((mapping, customName) => {
      logger.debug(`Processing model ${customName}:`, mapping);
      if (!groupedModels.has(customName)) {
        groupedModels.set(customName, {
          customName,
          providers: [],
          originalModel: mapping.originalModel
        });
      }
      groupedModels.get(customName)?.providers.push(mapping.provider);
    });

    const availableModels = Array.from(groupedModels.values());
    logger.debug('Final available models:', availableModels);
    return availableModels;
  }

  getModelMapping(modelName: string) {
    const [providerName, model] = modelName.split('/');
    if (!model) {
      throw new Error('Model name must be in format: provider/model (e.g., openai/gpt-4)');
    }

    const mapping = this.modelMappings.get(modelName);
    if (!mapping) {
      throw new Error(`No mapping found for model ${modelName}`);
    }

    return mapping;
  }

  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  async executeWithFallback<T>(
    operation: (provider: ProviderConfig) => Promise<T>,
    modelName?: string
  ): Promise<T> {
    if (!modelName) {
      throw new Error('Model name is required and must be in format: provider/model');
    }

    const [providerName, model] = modelName.split('/');
    if (!model) {
      throw new Error('Model name must be in format: provider/model (e.g., openai/gpt-4)');
    }

    // Try primary provider first
    const primaryProvider = this.providers[providerName];
    if (primaryProvider) {
      try {
        logger.debug(`Trying primary provider: ${providerName}`);
        return await operation(primaryProvider);
      } catch (error) {
        logger.warn(`Provider ${providerName} failed, trying fallbacks...`, error);
      }
    }

    // Try other providers that have this model
    for (const [otherProvider, config] of Object.entries(this.providers)) {
      if (otherProvider === providerName) continue;

      const hasModel = config.models?.some(modelMap => 
        Object.values(modelMap).some(originalName => originalName === modelName)
      );

      if (hasModel) {
        try {
          logger.debug(`Trying fallback provider: ${otherProvider}`);
          return await operation(config);
        } catch (error) {
          logger.warn(`Fallback provider ${otherProvider} failed`, error);
        }
      }
    }

    throw new Error(`No available providers found for model ${modelName}`);
  }

  private async checkProviderHealth(providerName: string, provider: ProviderConfig): Promise<boolean> {
    try {
      logger.debug(`Checking provider health: ${providerName}`);
      const result = await fetch(`${provider.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
        },
      });

      const isActive = result.ok;
      await ProviderStatusService.getInstance().updateProviderStatus(
        providerName,
        isActive,
        isActive ? undefined : `HTTP ${result.status}: ${result.statusText}`
      );
      logger.debug(`Provider ${providerName} is ${isActive ? 'active' : 'inactive'}`);
      return isActive;
    } catch (error) {
      logger.error(`Error checking provider health for ${providerName}:`, error);
      await ProviderStatusService.getInstance().updateProviderStatus(
        providerName,
        false,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return false;
    }
  }

  async getProvidersWithStatus() {
    const statusService = ProviderStatusService.getInstance();
    const results = [];

    logger.debug('Current providers config:', this.providers);

    for (const [providerName, provider] of Object.entries(this.providers)) {
      let status = await statusService.getProviderStatus(providerName);
      logger.debug(`Status for provider ${providerName}:`, status);
      
      if (!status || Date.now() - status.lastChecked > 5 * 60 * 1000) {
        logger.debug(`Checking health for provider: ${providerName}`);
        await this.checkProviderHealth(providerName, provider);
        status = await statusService.getProviderStatus(providerName);
      }

      const models = this.getProviderModels(providerName);
      logger.debug(`Models for provider ${providerName}:`, models);

      results.push({
        name: providerName,
        baseUrl: provider.baseUrl,
        isActive: status?.isActive ?? false,
        lastChecked: status?.lastChecked,
        lastError: status?.lastError,
        models
      });
    }

    logger.debug('Final provider results:', results);
    return results;
  }

  private getProviderModels(providerName: string): string[] {
    const provider = this.providers[providerName];
    const models: string[] = [];
    
    logger.debug(`Getting models for provider ${providerName}:`, provider);
    
    if (!provider.models) {
      logger.warn(`No models configured for provider ${providerName}`);
      return models;
    }

    provider.models.forEach(modelMap => {
      Object.values(modelMap).forEach(originalName => {
        logger.debug(`Adding model ${originalName} for provider ${providerName}`);
        models.push(originalName);
      });
    });

    logger.debug(`Final models for provider ${providerName}:`, models);
    return models;
  }

  getProviderBaseUrl(providerName: string): string {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    return provider.baseUrl;
  }

  getProviderApiKey(providerName: string): string {
    const provider = this.providers[providerName];
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    return provider.apiKey;
  }
}