import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';
import { randomBytes } from 'crypto';
import { ConfigLoader } from '../config/config-loader';

interface ApiKeyData {
  key: string;
  createdAt: number;
  lastUsed: number;
  dailyRequests: number;
  lastResetDate: string;
  isPremium: boolean;
}

export class ApiKeyService {
  private static instance: ApiKeyService;
  private dbPath: string;
  private data: Map<string, ApiKeyData>;
  private readonly STANDARD_DAILY_LIMIT = 10;
  private readonly PREMIUM_DAILY_LIMIT = 15;
  private readonly PREMIUM_MODELS: string[];
  private initialized: boolean = false;

  private constructor() {
    this.dbPath = join(process.cwd(), 'api-keys.json');
    this.data = new Map();
    this.PREMIUM_MODELS = ConfigLoader.getInstance().getPremiumModels();
  }

  private async init() {
    if (!this.initialized) {
      await this.loadData();
      this.initialized = true;
    }
  }

  private async loadData() {
    try {
      if (existsSync(this.dbPath)) {
        const fileContent = await readFile(this.dbPath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        this.data = new Map(Object.entries(jsonData));
      }
    } catch (error) {
      logger.error('Error loading API key data:', error);
    }
  }

  private async saveData() {
    try {
      const existingData = existsSync(this.dbPath) 
        ? JSON.parse(await readFile(this.dbPath, 'utf-8'))
        : {};
      
      const newData = Object.fromEntries(this.data);
      const mergedData = { ...existingData, ...newData };
      
      await writeFile(this.dbPath, JSON.stringify(mergedData, null, 2));
    } catch (error) {
      logger.error('Error saving API key data:', error);
    }
  }

  static async getInstance(): Promise<ApiKeyService> {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
      await ApiKeyService.instance.init();
    }
    return ApiKeyService.instance;
  }

  generateApiKey(): string {
    // Generate a 24-character random string (will result in 32 chars with prefix)
    const randomStr = randomBytes(12) // 12 bytes = 24 hex chars
      .toString('hex')
      .slice(0, 24);  // Ensure exact length
    
    return `gr-${randomStr}`;
  }

  async createApiKey(isPremium: boolean = false): Promise<string> {
    await this.init();  // Ensure data is loaded
    const key = this.generateApiKey();
    const today = new Date().toISOString().split('T')[0];
    
    this.data.set(key, {
      key,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      dailyRequests: 0,
      lastResetDate: today,
      isPremium
    });
    
    await this.saveData();
    return key;
  }

  async validateRequest(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
    const keyData = this.data.get(apiKey);
    
    if (!keyData) {
      return { isValid: false, error: 'Invalid API key' };
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Reset daily counter if it's a new day
    if (keyData.lastResetDate !== today) {
      keyData.dailyRequests = 0;
      keyData.lastResetDate = today;
    }

    // Check rate limit
    if (keyData.dailyRequests >= this.PREMIUM_DAILY_LIMIT) {
      return { 
        isValid: false, 
        error: `Daily rate limit exceeded. Maximum ${this.PREMIUM_DAILY_LIMIT} requests per day.` 
      };
    }

    // Update usage
    keyData.dailyRequests++;
    keyData.lastUsed = Date.now();
    await this.saveData();

    return { isValid: true };
  }

  async getRemainingRequests(apiKey: string): Promise<number> {
    const keyData = this.data.get(apiKey);
    if (!keyData) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    if (keyData.lastResetDate !== today) {
      return this.PREMIUM_DAILY_LIMIT;
    }
    
    return Math.max(0, this.PREMIUM_DAILY_LIMIT - keyData.dailyRequests);
  }

  isPremiumModel(modelName: string): boolean {
    return this.PREMIUM_MODELS.includes(modelName);
  }

  getPremiumModels(): string[] {
    return [...this.PREMIUM_MODELS];
  }
} 