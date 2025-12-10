import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: RedisClientType;

  async onModuleInit() {
    this.redisClient = await createClient({ url: process.env.REDIS_URL });
    this.redisClient.on('error', (err) =>
      console.log('Redis Client Error', err),
    );
    await this.redisClient.connect();
  }

  async setValue(key: string, value: string): Promise<void> {
    await this.redisClient.set(key, value);
  }

  async remove(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async setTimedValue(
    key: string,
    value: string,
    timeInSeconds: number,
  ): Promise<void> {
    await this.redisClient.set(key, value, { EX: timeInSeconds });
  }

  async getValue(key: string): Promise<string | null> {
    const value = await this.redisClient.get(key);
    return typeof value === 'string' ? value : null;
  }

  async getAndDelete(key: string): Promise<string | null> {
    try {
      const value = await this.redisClient.get(key);

      if (typeof value === 'string') {
        await this.redisClient.del(key); // delete after reading
        return value;
      }

      return null;
    } catch (err) {
      console.error(`Redis getAndDelete error for key "${key}":`, err);
      return null;
    }
  }

  onModuleDestroy() {
    this.redisClient.quit();
  }
}
