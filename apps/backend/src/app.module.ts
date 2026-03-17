import { Module } from "@nestjs/common";

import { GameModule } from "./game/game.module";
import { RoomModule } from "./room/room.module";
import { RuntimeModule } from "./runtime/runtime.module";
import { SocketModule } from "./socket/socket.module";

@Module({
  imports: [RoomModule, GameModule, RuntimeModule, SocketModule],
})
export class AppModule {}
