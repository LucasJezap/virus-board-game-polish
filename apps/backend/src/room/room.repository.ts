import { Injectable } from "@nestjs/common";
import type { RoomId } from "@wirus/shared-types";

import type { RoomAggregate } from "../backend.types";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class RoomRepository {
  public constructor(private readonly redisService: RedisService) {}

  public async reserveDisplayName(displayName: string): Promise<boolean> {
    const normalized = this.displayNameKey(displayName);
    const added = await this.redisService.client.sadd("players:display_names", normalized);
    return added === 1;
  }

  public async releaseDisplayName(displayName: string): Promise<void> {
    await this.redisService.client.srem("players:display_names", this.displayNameKey(displayName));
  }

  public async save(room: RoomAggregate): Promise<void> {
    await this.redisService.client.set(this.roomKey(room.id), JSON.stringify(room));
    await this.redisService.client.sadd("rooms:all", room.id);
  }

  public async findById(roomId: RoomId): Promise<RoomAggregate | null> {
    const serialized = await this.redisService.client.get(this.roomKey(roomId));
    return serialized ? (JSON.parse(serialized) as RoomAggregate) : null;
  }

  public async findByCode(roomCode: string): Promise<RoomAggregate | null> {
    const roomId = await this.redisService.client.get(this.codeKey(roomCode));
    if (!roomId) {
      return null;
    }
    return this.findById(roomId);
  }

  public async indexRoomCode(room: RoomAggregate): Promise<void> {
    await this.redisService.client.set(this.codeKey(room.code), room.id);
  }

  public async findOpenPublicRoom(): Promise<RoomAggregate | null> {
    const rooms = await this.listJoinablePublicRooms();
    return rooms[0] ?? null;
  }

  public async listJoinablePublicRooms(): Promise<RoomAggregate[]> {
    const ids = await this.redisService.client.smembers("rooms:public");
    const rooms: RoomAggregate[] = [];
    for (const roomId of ids) {
      const room = await this.findById(roomId);
      if (!room) {
        continue;
      }
      if (room.phase === "WAITING" && room.players.filter((player) => player.role === "PLAYER").length < 6) {
        rooms.push(room);
      }
    }
    return rooms.sort((left, right) => {
      const leftPlayers = left.players.filter((player) => player.role === "PLAYER").length;
      const rightPlayers = right.players.filter((player) => player.role === "PLAYER").length;
      if (leftPlayers !== rightPlayers) {
        return rightPlayers - leftPlayers;
      }
      return Date.parse(right.updatedAtIso) - Date.parse(left.updatedAtIso);
    });
  }

  public async addPublicRoom(roomId: RoomId): Promise<void> {
    await this.redisService.client.sadd("rooms:public", roomId);
  }

  public async listAllRoomIds(): Promise<string[]> {
    return this.redisService.client.smembers("rooms:all");
  }

  private roomKey(roomId: RoomId): string {
    return `room:${roomId}`;
  }

  private codeKey(roomCode: string): string {
    return `room_code:${roomCode}`;
  }

  private displayNameKey(displayName: string): string {
    return displayName.trim().toLowerCase();
  }
}
