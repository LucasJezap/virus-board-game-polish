import { Module, forwardRef } from "@nestjs/common";

import { ClockService } from "../common/clock.service";
import { IdFactory } from "../common/id.factory";
import { GameModule } from "../game/game.module";
import { RedisModule } from "../redis/redis.module";
import { RuntimeModule } from "../runtime/runtime.module";
import { RoomRepository } from "./room.repository";
import { RoomService } from "./room.service";

@Module({
  imports: [RedisModule, GameModule, forwardRef(() => RuntimeModule)],
  providers: [ClockService, IdFactory, RoomRepository, RoomService],
  exports: [RoomService],
})
export class RoomModule {}
