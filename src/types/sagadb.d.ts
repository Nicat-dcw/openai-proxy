declare module 'sagadb' {
  interface SagaDBOptions {
    dbPath: string;
  }

  export class SagaDB {
    constructor(options: SagaDBOptions);
    set(key: string, value: any): Promise<void>;
    get(key: string): Promise<any>;
    keys(): Promise<string[]>;
    delete(key: string): Promise<void>;
  }
} 