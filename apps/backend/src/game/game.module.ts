import { Module } from "@nestjs/common";

import { ClockService } from "../common/clock.service";
import { IdFactory } from "../common/id.factory";
import { RandomService } from "../common/random.service";
import { GameService } from "./game.service";

@Module({
  providers: [ClockService, IdFactory, RandomService, GameService],
  exports: [GameService],
})
export class GameModule {}
