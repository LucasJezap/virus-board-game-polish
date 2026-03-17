import { Injectable, Logger } from "@nestjs/common";

import { RoomBroadcastService } from "./room-broadcast.service";
import { RoomService } from "../room/room.service";

type TimerRef = ReturnType<typeof setTimeout>;

@Injectable()
export class RoomRuntimeService {
  private readonly logger = new Logger(RoomRuntimeService.name);
  private readonly turnTimers = new Map<string, TimerRef>();
  private readonly reconnectTimers = new Map<string, TimerRef>();

  public constructor(
    private readonly roomService: RoomService,
    private readonly roomBroadcastService: RoomBroadcastService,
  ) {}

  public syncTurnTimer(roomId: string, deadlineIso: string | null): void {
    this.clearTurnTimer(roomId);
    if (!deadlineIso) {
      return;
    }

    const delay = Math.max(0, Date.parse(deadlineIso) - Date.now());
    const timer = setTimeout(() => {
      void this.handleTurnTimeout(roomId);
    }, delay);
    this.turnTimers.set(roomId, timer);
  }

  public syncReconnectTimer(roomId: string, deadlineIso: string | null): void {
    this.clearReconnectTimer(roomId);
    if (!deadlineIso) {
      return;
    }

    const delay = Math.max(0, Date.parse(deadlineIso) - Date.now());
    const timer = setTimeout(() => {
      void this.handleReconnectTimeout(roomId);
    }, delay);
    this.reconnectTimers.set(roomId, timer);
  }

  public clearAll(roomId: string): void {
    this.clearTurnTimer(roomId);
    this.clearReconnectTimer(roomId);
  }

  private clearTurnTimer(roomId: string): void {
    const timer = this.turnTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.turnTimers.delete(roomId);
    }
  }

  private clearReconnectTimer(roomId: string): void {
    const timer = this.reconnectTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(roomId);
    }
  }

  private async handleTurnTimeout(roomId: string): Promise<void> {
    try {
      const projection = await this.roomService.handleTurnTimeout(roomId);
      const room = await this.roomService.getRoomAggregate(projection.id);
      this.roomBroadcastService.broadcastAggregate(room);
    } catch (error) {
      this.logger.warn(`Turn timeout handling failed for room ${roomId}: ${String(error)}`);
      this.roomBroadcastService.broadcastRoomError(roomId, "TURN_TIMEOUT_FAILED", "Automatic turn resolution failed");
    }
  }

  private async handleReconnectTimeout(roomId: string): Promise<void> {
    try {
      const projection = await this.roomService.handleReconnectDeadline(roomId);
      const room = await this.roomService.getRoomAggregate(projection.id);
      this.roomBroadcastService.broadcastAggregate(room);
    } catch (error) {
      this.logger.warn(`Reconnect timeout handling failed for room ${roomId}: ${String(error)}`);
      this.roomBroadcastService.broadcastRoomError(roomId, "ROOM_EXPIRY_FAILED", "Room expiry handling failed");
    }
  }
}
