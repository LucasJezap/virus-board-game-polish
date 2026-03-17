import { ConflictException, Inject, Injectable, NotFoundException, forwardRef } from "@nestjs/common";
import type {
  ClientGameIntent,
  CreateRoomInput,
  JoinRoomInput,
  QuickJoinInput,
  ReconnectRoomInput,
  RoomLobbyEntry,
  RoomProjection,
} from "@wirus/shared-types";

import type { RoomAggregate } from "../backend.types";
import { ClockService } from "../common/clock.service";
import { IdFactory } from "../common/id.factory";
import { GameService } from "../game/game.service";
import { RoomRuntimeService } from "../runtime/room-runtime.service";
import { toRoomProjection } from "./room.mapper";
import { RoomRepository } from "./room.repository";

const TURN_TIMEOUT_MS = 30_000;
const BOT_MOVE_DELAY_MS = 800;
const RECONNECT_TIMEOUT_MS = 60_000;

@Injectable()
export class RoomService {
  public constructor(
    private readonly roomRepository: RoomRepository,
    private readonly idFactory: IdFactory,
    private readonly clockService: ClockService,
    private readonly gameService: GameService,
    @Inject(forwardRef(() => RoomRuntimeService))
    private readonly roomRuntimeService: RoomRuntimeService,
  ) {}

  public async createRoom(input: CreateRoomInput, socketId: string | null = null): Promise<RoomProjection> {
    if (socketId) {
      const existingSession = await this.findParticipantBySocket(socketId);
      if (existingSession) {
        return toRoomProjection(existingSession.room, existingSession.participant);
      }
    }

    await this.assertDisplayNameAvailable(input.displayName);
    const nowIso = this.clockService.nowIso();
    const playerId = this.idFactory.createId("player");
    const room: RoomAggregate = {
      id: this.idFactory.createId("room"),
      code: this.idFactory.createRoomCode(),
      visibility: input.visibility,
      phase: "WAITING",
      hostPlayerId: playerId,
      inviteToken: this.idFactory.createInviteToken(),
      players: [
        {
          playerId,
          sessionId: this.idFactory.createId("session"),
          socketId,
          displayName: input.displayName,
          role: "PLAYER",
          presence: "CONNECTED",
          roomId: "",
          seatIndex: 0,
          reconnectToken: this.idFactory.createInviteToken(),
          botControlled: false,
          joinedAtIso: nowIso,
          updatedAtIso: nowIso,
        },
      ],
      spectators: [],
      match: null,
      rematchVotes: {},
      reconnectDeadlineIso: null,
      chat: [],
      version: 1,
      createdAtIso: nowIso,
      updatedAtIso: nowIso,
    };
    room.players[0] = {
      ...room.players[0]!,
      roomId: room.id,
    };

    try {
      await this.roomRepository.save(room);
      this.syncRuntime(room);
      await this.roomRepository.indexRoomCode(room);
      if (room.visibility === "public") {
        await this.roomRepository.addPublicRoom(room.id);
      }
    } catch (error) {
      await this.roomRepository.releaseDisplayName(input.displayName);
      throw error;
    }

    return toRoomProjection(room, room.players[0] ?? null);
  }

  public async quickJoin(input: QuickJoinInput, socketId: string | null = null): Promise<RoomProjection> {
    const openRoom = await this.roomRepository.findOpenPublicRoom();
    if (!openRoom) {
      return this.createRoom({ displayName: input.displayName, visibility: "public" }, socketId);
    }
    return this.joinExistingRoom(openRoom, input.displayName, socketId);
  }

  public async listJoinableRooms(): Promise<RoomLobbyEntry[]> {
    const rooms = await this.roomRepository.listJoinablePublicRooms();
    return rooms.map((room) => ({
      id: room.id,
      code: room.code,
      visibility: room.visibility,
      phase: room.phase,
      playerCount: room.players.filter((player) => player.role === "PLAYER").length,
      spectatorCount: room.spectators.length,
      hasActiveMatch: room.match !== null,
      createdAtIso: room.createdAtIso,
      updatedAtIso: room.updatedAtIso,
    }));
  }

  public async getRoomAggregate(roomId: string): Promise<RoomAggregate> {
    return this.getRoom(roomId);
  }

  public async joinRoom(input: JoinRoomInput, socketId: string | null = null): Promise<RoomProjection> {
    if (!input.roomCode) {
      throw new NotFoundException("Room code is required for this backend step");
    }
    const room = await this.roomRepository.findByCode(input.roomCode);
    if (!room) {
      throw new NotFoundException(`Room ${input.roomCode} was not found`);
    }
    return this.joinExistingRoom(room, input.displayName, socketId);
  }

  public async startMatch(roomId: string, playerId: string): Promise<RoomProjection> {
    const room = await this.getRoom(roomId);
    if (room.hostPlayerId !== playerId) {
      throw new NotFoundException("Only the host can start the match in this backend step");
    }

    room.match = this.gameService.startMatch(room);
    room.phase = "PLAYING";
    room.match.turnDeadlineIso = this.nextDeadlineIso(TURN_TIMEOUT_MS);
    room.updatedAtIso = this.clockService.nowIso();
    room.version += 1;
    await this.roomRepository.save(room);
    this.syncRuntime(room);

    return toRoomProjection(room);
  }

  public async applyGameIntent(intent: ClientGameIntent): Promise<RoomProjection> {
    const room = await this.getRoom(intent.roomId);
    if (!room.match) {
      throw new NotFoundException("Room does not have an active match");
    }

    if (intent.type === "request_rematch") {
      room.rematchVotes[intent.playerId] = true;
    } else {
      room.match = this.gameService.applyIntent(room.match, intent);
      room.phase = room.match.state.winnerId ? "FINISHED" : "PLAYING";
      room.match.turnDeadlineIso = room.match.state.winnerId ? null : this.computeNextTurnDeadline(room);
    }

    room.updatedAtIso = this.clockService.nowIso();
    room.version += 1;
    await this.roomRepository.save(room);
    this.syncRuntime(room);
    return toRoomProjection(room);
  }

  public async getProjection(roomId: string): Promise<RoomProjection> {
    return toRoomProjection(await this.getRoom(roomId));
  }

  public async reconnectPlayer(input: ReconnectRoomInput, socketId: string | null): Promise<RoomProjection> {
    const room = await this.getRoom(input.roomId);
    const player = room.players.find((candidate) => candidate.reconnectToken === input.reconnectToken);
    if (!player) {
      throw new NotFoundException("Reconnect token was not found for this room");
    }

    player.presence = "CONNECTED";
    player.socketId = socketId;
    player.botControlled = false;
    player.updatedAtIso = this.clockService.nowIso();
    room.reconnectDeadlineIso = this.computeReconnectDeadline(room);
    room.updatedAtIso = this.clockService.nowIso();
    room.version += 1;

    await this.roomRepository.save(room);
    this.syncRuntime(room);
    return toRoomProjection(room);
  }

  public async disconnectPlayerBySocket(socketId: string): Promise<RoomProjection | null> {
    const room = await this.findRoomBySocket(socketId);
    if (!room) {
      return null;
    }

    const player = room.players.find((candidate) => candidate.socketId === socketId);
    if (!player) {
      return null;
    }

    player.presence = "DISCONNECTED";
    player.socketId = null;
    player.botControlled = room.phase === "PLAYING";
    player.updatedAtIso = this.clockService.nowIso();
    room.reconnectDeadlineIso = this.computeReconnectDeadline(room);
    if (room.match) {
      room.match.turnDeadlineIso = this.computeNextTurnDeadline(room);
    }
    room.updatedAtIso = this.clockService.nowIso();
    room.version += 1;
    await this.roomRepository.save(room);
    this.syncRuntime(room);
    return toRoomProjection(room);
  }

  public async handleTurnTimeout(roomId: string): Promise<RoomProjection> {
    const room = await this.getRoom(roomId);
    if (!room.match || room.phase !== "PLAYING") {
      return toRoomProjection(room);
    }

    const activePlayerId = room.match.state.activePlayerId;
    const player = room.players.find((candidate) => candidate.playerId === activePlayerId);
    const mode = player?.botControlled ? "BOT_MOVE" : "AUTO_MOVE";
    room.match = this.gameService.applyAutoMove(room.match, activePlayerId, mode);
    room.phase = room.match.state.winnerId ? "FINISHED" : "PLAYING";
    room.match.turnDeadlineIso = room.match.state.winnerId ? null : this.computeNextTurnDeadline(room);
    room.updatedAtIso = this.clockService.nowIso();
    room.version += 1;
    await this.roomRepository.save(room);
    this.syncRuntime(room);
    return toRoomProjection(room);
  }

  public async handleReconnectDeadline(roomId: string): Promise<RoomProjection> {
    const room = await this.getRoom(roomId);
    const connectedPlayers = room.players.filter((candidate) => candidate.presence === "CONNECTED");
    if (connectedPlayers.length > 0) {
      room.reconnectDeadlineIso = null;
      await this.roomRepository.save(room);
      this.syncRuntime(room);
      return toRoomProjection(room);
    }

    room.phase = "FINISHED";
    room.match = null;
    room.reconnectDeadlineIso = null;
    room.updatedAtIso = this.clockService.nowIso();
    room.version += 1;
    await this.roomRepository.save(room);
    await Promise.all([...room.players, ...room.spectators].map((participant) => this.roomRepository.releaseDisplayName(participant.displayName)));
    this.syncRuntime(room);
    return toRoomProjection(room);
  }

  private async getRoom(roomId: string): Promise<RoomAggregate> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new NotFoundException(`Room ${roomId} was not found`);
    }
    return room;
  }

  private async joinExistingRoom(room: RoomAggregate, displayName: string, socketId: string | null): Promise<RoomProjection> {
    if (socketId) {
      const existingParticipantInRoom = [...room.players, ...room.spectators].find((candidate) => candidate.socketId === socketId);
      if (existingParticipantInRoom) {
        return toRoomProjection(room, existingParticipantInRoom);
      }

      const existingSession = await this.findParticipantBySocket(socketId);
      if (existingSession) {
        throw new ConflictException("To polaczenie jest juz przypisane do innego gracza");
      }
    }

    await this.assertDisplayNameAvailable(displayName);
    const nowIso = this.clockService.nowIso();
    const existingPlayers = room.players.length;
    const player = {
      playerId: this.idFactory.createId("player"),
      sessionId: this.idFactory.createId("session"),
      socketId,
      displayName,
      role: room.phase === "WAITING" && existingPlayers < 6 ? ("PLAYER" as const) : ("SPECTATOR" as const),
      presence: "CONNECTED" as const,
      roomId: room.id,
      seatIndex: room.phase === "WAITING" && existingPlayers < 6 ? existingPlayers : null,
      reconnectToken: this.idFactory.createInviteToken(),
      botControlled: false,
      joinedAtIso: nowIso,
      updatedAtIso: nowIso,
    };

    if (player.role === "PLAYER") {
      room.players = [...room.players, player];
    } else {
      room.spectators = [...room.spectators, player];
    }

    room.updatedAtIso = nowIso;
    room.version += 1;
    try {
      await this.roomRepository.save(room);
    } catch (error) {
      await this.roomRepository.releaseDisplayName(displayName);
      throw error;
    }
    this.syncRuntime(room);
    return toRoomProjection(room, player);
  }

  private syncRuntime(room: RoomAggregate): void {
    this.roomRuntimeService.syncTurnTimer(room.id, room.match?.turnDeadlineIso ?? null);
    this.roomRuntimeService.syncReconnectTimer(room.id, room.reconnectDeadlineIso);
  }

  private computeNextTurnDeadline(room: RoomAggregate): string | null {
    if (!room.match || room.phase !== "PLAYING") {
      return null;
    }

    const activePlayer = room.players.find((candidate) => candidate.playerId === room.match?.state.activePlayerId);
    const timeoutMs = activePlayer?.botControlled ? BOT_MOVE_DELAY_MS : TURN_TIMEOUT_MS;
    return this.nextDeadlineIso(timeoutMs);
  }

  private computeReconnectDeadline(room: RoomAggregate): string | null {
    const connectedPlayers = room.players.filter((candidate) => candidate.presence === "CONNECTED");
    return connectedPlayers.length <= 1 ? this.nextDeadlineIso(RECONNECT_TIMEOUT_MS) : null;
  }

  private nextDeadlineIso(delayMs: number): string {
    return new Date(this.clockService.now().getTime() + delayMs).toISOString();
  }

  private async findRoomBySocket(socketId: string): Promise<RoomAggregate | null> {
    const roomIds = await this.roomRepository.listAllRoomIds();
    for (const roomId of roomIds) {
      const room = await this.roomRepository.findById(roomId);
      if ([...(room?.players ?? []), ...(room?.spectators ?? [])].some((candidate) => candidate.socketId === socketId)) {
        return room;
      }
    }
    return null;
  }

  private async findParticipantBySocket(
    socketId: string,
  ): Promise<{ room: RoomAggregate; participant: RoomAggregate["players"][number] | RoomAggregate["spectators"][number] } | null> {
    const roomIds = await this.roomRepository.listAllRoomIds();
    for (const roomId of roomIds) {
      const room = await this.roomRepository.findById(roomId);
      if (!room) {
        continue;
      }

      const participant = [...room.players, ...room.spectators].find((candidate) => candidate.socketId === socketId);
      if (participant) {
        return { room, participant };
      }
    }

    return null;
  }

  private async assertDisplayNameAvailable(displayName: string): Promise<void> {
    const reserved = await this.roomRepository.reserveDisplayName(displayName);
    if (!reserved) {
      throw new ConflictException(`Gracz o nicku ${displayName} juz istnieje`);
    }
  }
}
