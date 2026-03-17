import { Injectable } from "@nestjs/common";
import type { RoomProjection } from "@wirus/shared-types";
import type { Server } from "socket.io";

import type { RoomAggregate } from "../backend.types";
import { toRoomProjection } from "../room/room.mapper";

@Injectable()
export class RoomBroadcastService {
  private server: Server | null = null;

  public bindServer(server: Server): void {
    this.server = server;
  }

  public broadcastRoom(room: RoomProjection): void {
    this.server?.to(room.id).emit("ROOM_STATE_UPDATE", room);
  }

  public broadcastAggregate(room: RoomAggregate): void {
    if (!this.server) {
      return;
    }

    for (const participant of room.players) {
      if (participant.socketId) {
        this.server.to(participant.socketId).emit("ROOM_STATE_UPDATE", toRoomProjection(room, participant));
      }
    }

    for (const spectator of room.spectators) {
      if (spectator.socketId) {
        this.server.to(spectator.socketId).emit("ROOM_STATE_UPDATE", toRoomProjection(room, spectator));
      }
    }
  }

  public broadcastRoomError(roomId: string, code: string, message: string): void {
    this.server?.to(roomId).emit("ROOM_ERROR", { code, message });
  }
}
