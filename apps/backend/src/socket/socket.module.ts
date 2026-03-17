import { Module } from "@nestjs/common";

import { RuntimeModule } from "../runtime/runtime.module";
import { RoomModule } from "../room/room.module";
import { GameGateway } from "./game.gateway";

@Module({
  imports: [RoomModule, RuntimeModule],
  providers: [GameGateway],
})
export class SocketModule {}
