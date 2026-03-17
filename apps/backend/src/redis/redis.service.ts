import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = Symbol("REDIS_CLIENT");

@Injectable()
export class RedisService implements OnModuleDestroy {
  public constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  public get client(): Redis {
    return this.redis;
  }

  public async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
