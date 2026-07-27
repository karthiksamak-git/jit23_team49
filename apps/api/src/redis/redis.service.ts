import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;

  getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.getClient().get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.getClient().set(key, value, "EX", ttlSeconds);
      } else {
        await this.getClient().set(key, value);
      }
    } catch {
      // Redis unavailable — graceful degradation
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.getClient().del(key);
    } catch {
      // graceful degradation
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
