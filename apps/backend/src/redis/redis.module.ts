import { Module } from "@nestjs/common";
import Redis from "ioredis";

import { REDIS_CLIENT, RedisService } from "./redis.service";

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379", {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        }),
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
