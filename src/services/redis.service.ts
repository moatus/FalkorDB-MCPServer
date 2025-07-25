import { createClient } from 'redis';
import { config } from '../config/index.js';

class RedisService {
  private client: ReturnType<typeof createClient> | null = null;

  constructor() {
    this.init();
  }

  private async init() {
    try {
        this.client = createClient({
            url: config.redis.url,
            username: config.redis.username,
            password: config.redis.password,
        });

        await this.client.connect();
        await this.client.ping();
    } catch (error) {
        setTimeout(() => this.init(), 5000);
    }
  }

  async get(key: string) {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    return await this.client.get(key);
  }

  async set(key: string, value: string) {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    await this.client.set(key, value);
  }

  async close() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}

export const redisService = new RedisService();