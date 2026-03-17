import type { Socket } from "socket.io";

import { GameGateway } from "./game.gateway";

describe("GameGateway", () => {
  function createGateway() {
    const roomService = {
      listJoinableRooms: jest.fn().mockResolvedValue([]),
      createRoom: jest.fn().mockResolvedValue({ id: "room_1" }),
      joinRoom: jest.fn().mockResolvedValue({ id: "room_1" }),
      quickJoin: jest.fn().mockResolvedValue({ id: "room_1" }),
      startMatch: jest.fn().mockResolvedValue({ id: "room_1" }),
      applyGameIntent: jest.fn().mockResolvedValue({ id: "room_1" }),
      getProjection: jest.fn().mockResolvedValue({ id: "room_1" }),
      getRoomAggregate: jest.fn().mockResolvedValue({ id: "room_1" }),
      reconnectPlayer: jest.fn().mockResolvedValue({ id: "room_1" }),
      disconnectPlayerBySocket: jest.fn().mockResolvedValue(null),
    } as any;
    const broadcast = { bindServer: jest.fn(), broadcastAggregate: jest.fn(), broadcastRoom: jest.fn() } as any;
    const gateway = new GameGateway(roomService, broadcast);
    const server = { emit: jest.fn(), to: jest.fn().mockReturnValue({ emit: jest.fn() }) } as any;
    (gateway as any).server = server;
    return { gateway, roomService, broadcast, server };
  }

  it("binds the server on init", () => {
    const { gateway, broadcast, server } = createGateway();
    gateway.afterInit(server);
    expect(broadcast.bindServer).toHaveBeenCalledWith(server);
  });

  it("routes room events through the room service", async () => {
    const { gateway, roomService, server } = createGateway();
    const socket = { id: "sock1", join: jest.fn().mockResolvedValue(undefined) } as unknown as Socket;

    await gateway.handleCreateRoom({ displayName: "Alice", visibility: "public" }, socket);
    await gateway.handleJoinRoom({ displayName: "Alice", roomCode: "ROOM01" }, socket);
    await gateway.handleQuickJoin({ displayName: "Alice" }, socket);
    await gateway.handleStart({ roomId: "room_1", playerId: "p1" });
    await gateway.handleGameAction({ type: "draw_card", roomId: "room_1", playerId: "p1" });
    await gateway.handleReconnect({ roomId: "room_1", reconnectToken: "token" }, socket);
    await gateway.handleChat({ roomId: "room_1", playerId: "p1", message: "hi" });

    expect(roomService.createRoom).toHaveBeenCalled();
    expect(roomService.joinRoom).toHaveBeenCalled();
    expect(roomService.quickJoin).toHaveBeenCalled();
    expect(roomService.startMatch).toHaveBeenCalled();
    expect(roomService.applyGameIntent).toHaveBeenCalled();
    expect(roomService.reconnectPlayer).toHaveBeenCalled();
    expect(roomService.listJoinableRooms).toHaveBeenCalled();
    expect(server.to).toHaveBeenCalledWith("room_1");
  });

  it("broadcasts disconnect projections when available", async () => {
    const { gateway, roomService, broadcast } = createGateway();
    roomService.disconnectPlayerBySocket.mockResolvedValueOnce({ id: "room_2" });
    roomService.getRoomAggregate.mockResolvedValueOnce({ id: "room_2" });

    await gateway.handleDisconnect({ id: "sock2" } as Socket);

    expect(broadcast.broadcastAggregate).toHaveBeenCalledWith({ id: "room_2" });
    expect(roomService.listJoinableRooms).toHaveBeenCalled();
  });

  it("does not broadcast on disconnect when no projection is returned", async () => {
    const { gateway, broadcast } = createGateway();

    await gateway.handleDisconnect({ id: "sock3" } as Socket);

    expect(broadcast.broadcastAggregate).not.toHaveBeenCalled();
  });

  it("returns the lobby list projection", async () => {
    const { gateway, roomService, server } = createGateway();
    roomService.listJoinableRooms.mockResolvedValueOnce([{ id: "room_1", code: "ROOM01" }]);

    const result = await gateway.handleRoomList();

    expect(result).toEqual([{ id: "room_1", code: "ROOM01" }]);
    expect(server.emit).toHaveBeenCalledWith("ROOM_LIST_UPDATE", [{ id: "room_1", code: "ROOM01" }]);
  });
});
