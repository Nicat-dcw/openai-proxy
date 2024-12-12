import { parse } from 'yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface ProviderConfig {
  apiKey: string;
  baseUrl: string;
  models?: Array<{ [key: string]: string }>;
}

export interface Config {
  providers: {
    [key: string]: ProviderConfig;
  };
  premiumModels?: string[];
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: Config;

  private constructor() {
    const configPath = join(import.meta.dir, '..', 'config.yml');
    const configFile = readFileSync(configPath, 'utf8');
    const parsedConfig = parse(configFile);
    
    // Replace environment variables
    this.config = this.replaceEnvVars(parsedConfig);
  }

  private replaceEnvVars(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/\${(\w+)}/g, (_, key) => process.env[key] || '');
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceEnvVars(item));
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key,
          this.replaceEnvVars(value)
        ])
      );
    }
    return obj;
  }

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  getConfig(): Config {
    return this.config;
  }

  getPremiumModels(): string[] {
    return this.config.premiumModels || [];
  }
} 