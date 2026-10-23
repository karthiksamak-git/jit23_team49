import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  constructor(private readonly redis: RedisService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const path = req.path;
    const windowSeconds = 60;
    const maxRequests = 100;

    const key = `rate_limit:${ip}:${path}`;
    const now = Date.now();

    try {
      const current = await this.redis.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= maxRequests) {
        res.set("Retry-After", String(windowSeconds));
        res.status(429).json({
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        });
        return;
      }

      const pipeline = await this.redis.getClient();
      pipeline.incr(key);
      pipeline.expire(key, windowSeconds);
      await pipeline.exec();
    } catch {
      // Redis unavailable — allow request through (fail open)
    }

    next();
  }
}
