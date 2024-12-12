import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

export interface ProviderStatus {
  name: string;
  isActive: boolean;
  lastChecked: number;
  lastError?: string;
}

export class ProviderStatusService {
  private static instance: ProviderStatusService;
  private dbPath: string;
  private data: Map<string, ProviderStatus>;

  private constructor() {
    this.dbPath = join(process.cwd(), 'provider-status.json');
    this.data = new Map();
    this.loadData();
  }

  private async loadData() {
    try {
      if (existsSync(this.dbPath)) {
        const fileContent = await readFile(this.dbPath, 'utf-8');
        const jsonData = JSON.parse(fileContent);
        this.data = new Map(Object.entries(jsonData));
        logger.debug('ProviderStatusService loaded data:', this.data);
      }
    } catch (error) {
      logger.error('Error loading provider status data:', error);
    }
  }

  private async saveData() {
    try {
      const jsonData = Object.fromEntries(this.data);
      await writeFile(this.dbPath, JSON.stringify(jsonData, null, 2));
      logger.debug('ProviderStatusService saved data:', jsonData);
    } catch (error) {
      logger.error('Error saving provider status data:', error);
    }
  }

  static getInstance(): ProviderStatusService {
    if (!ProviderStatusService.instance) {
      ProviderStatusService.instance = new ProviderStatusService();
    }
    return ProviderStatusService.instance;
  }

  async updateProviderStatus(providerName: string, isActive: boolean, error?: string) {
    const status: ProviderStatus = {
      name: providerName,
      isActive,
      lastChecked: Date.now(),
      lastError: error
    };
    
    this.data.set(`provider:${providerName}`, status);
    await this.saveData();
    logger.debug(`Updated status for provider ${providerName}:`, status);
    return status;
  }

  async getProviderStatus(providerName: string): Promise<ProviderStatus | null> {
    const status = this.data.get(`provider:${providerName}`) || null;
    logger.debug(`Retrieved status for provider ${providerName}:`, status);
    return status;
  }

  async getAllProviderStatuses(): Promise<ProviderStatus[]> {
    try {
      const statuses = Array.from(this.data.values());
      logger.debug('Retrieved provider statuses:', statuses);
      return statuses;
    } catch (error) {
      logger.error('Error getting provider statuses:', error);
      return [];
    }
  }
} 