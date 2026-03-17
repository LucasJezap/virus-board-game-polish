import { Module, forwardRef } from "@nestjs/common";

import { RoomModule } from "../room/room.module";
import { RoomBroadcastService } from "./room-broadcast.service";
import { RoomRuntimeService } from "./room-runtime.service";

@Module({
  imports: [forwardRef(() => RoomModule)],
  providers: [RoomBroadcastService, RoomRuntimeService],
  exports: [RoomBroadcastService, RoomRuntimeService],
})
export class RuntimeModule {}
