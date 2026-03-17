import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type {
  ClientGameIntent,
  CreateRoomInput,
  JoinRoomInput,
  QuickJoinInput,
  ReconnectRoomInput,
  RoomLobbyEntry,
  SendChatInput,
  StartMatchInput,
} from "@wirus/shared-types";
import type { Server, Socket } from "socket.io";

import { RoomBroadcastService } from "../runtime/room-broadcast.service";
import { RoomService } from "../room/room.service";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
  namespace: "/rooms",
})
export class GameGateway {
  @WebSocketServer()
  private server!: Server;

  public constructor(
    private readonly roomService: RoomService,
    private readonly roomBroadcastService: RoomBroadcastService,
  ) {}

  public afterInit(server: Server): void {
    this.roomBroadcastService.bindServer(server);
  }

  private async broadcastLobbyUpdate(): Promise<RoomLobbyEntry[]> {
    const rooms = await this.roomService.listJoinableRooms();
    this.server.emit("ROOM_LIST_UPDATE", rooms);
    return rooms;
  }

  public async handleDisconnect(socket: Socket): Promise<void> {
    const room = await this.roomService.disconnectPlayerBySocket(socket.id);
    if (room) {
      const aggregate = await this.roomService.getRoomAggregate(room.id);
      this.roomBroadcastService.broadcastAggregate(aggregate);
      await this.broadcastLobbyUpdate();
    }
  }

  @SubscribeMessage("ROOM_LIST")
  public async handleRoomList() {
    return this.broadcastLobbyUpdate();
  }

  @SubscribeMessage("ROOM_CREATE")
  public async handleCreateRoom(@MessageBody() payload: CreateRoomInput, @ConnectedSocket() socket: Socket) {
    const room = await this.roomService.createRoom(payload, socket.id);
    await socket.join(room.id);
    const aggregate = await this.roomService.getRoomAggregate(room.id);
    this.roomBroadcastService.broadcastAggregate(aggregate);
    await this.broadcastLobbyUpdate();
    return room;
  }

  @SubscribeMessage("ROOM_JOIN")
  public async handleJoinRoom(@MessageBody() payload: JoinRoomInput, @ConnectedSocket() socket: Socket) {
    const room = await this.roomService.joinRoom(payload, socket.id);
    await socket.join(room.id);
    const aggregate = await this.roomService.getRoomAggregate(room.id);
    this.roomBroadcastService.broadcastAggregate(aggregate);
    await this.broadcastLobbyUpdate();
    return room;
  }

  @SubscribeMessage("ROOM_QUICK_JOIN")
  public async handleQuickJoin(@MessageBody() payload: QuickJoinInput, @ConnectedSocket() socket: Socket) {
    const room = await this.roomService.quickJoin(payload, socket.id);
    await socket.join(room.id);
    const aggregate = await this.roomService.getRoomAggregate(room.id);
    this.roomBroadcastService.broadcastAggregate(aggregate);
    await this.broadcastLobbyUpdate();
    return room;
  }

  @SubscribeMessage("PLAYER_RECONNECT")
  public async handleReconnect(@MessageBody() payload: ReconnectRoomInput, @ConnectedSocket() socket: Socket) {
    const room = await this.roomService.reconnectPlayer(payload, socket.id);
    await socket.join(room.id);
    const aggregate = await this.roomService.getRoomAggregate(room.id);
    this.roomBroadcastService.broadcastAggregate(aggregate);
    await this.broadcastLobbyUpdate();
    return room;
  }

  @SubscribeMessage("ROOM_START")
  public async handleStart(@MessageBody() payload: StartMatchInput) {
    const room = await this.roomService.startMatch(payload.roomId, payload.playerId);
    const aggregate = await this.roomService.getRoomAggregate(room.id);
    this.roomBroadcastService.broadcastAggregate(aggregate);
    await this.broadcastLobbyUpdate();
    return room;
  }

  @SubscribeMessage("GAME_ACTION")
  public async handleGameAction(@MessageBody() payload: ClientGameIntent) {
    const room = await this.roomService.applyGameIntent(payload);
    const aggregate = await this.roomService.getRoomAggregate(room.id);
    this.roomBroadcastService.broadcastAggregate(aggregate);
    await this.broadcastLobbyUpdate();
    return room;
  }

  @SubscribeMessage("ROOM_CHAT")
  public async handleChat(@MessageBody() payload: SendChatInput) {
    const room = await this.roomService.getProjection(payload.roomId);
    this.server.to(room.id).emit("ROOM_CHAT_MESSAGE", {
      roomId: payload.roomId,
      playerId: payload.playerId,
      message: payload.message,
    });
    return room;
  }
}
