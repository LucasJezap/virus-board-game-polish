import type { RoomProjection } from "@wirus/shared-types";

import { RoomBroadcastService } from "./room-broadcast.service";
import { RoomRuntimeService } from "./room-runtime.service";

describe("RoomRuntimeService", () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  it("fires scheduled turn and reconnect handlers", async () => {
    const projection: RoomProjection = {
      id: "room_1",
      code: "ROOM01",
      visibility: "public",
      phase: "PLAYING",
      hostPlayerId: "p1",
      viewerPlayerId: "p1",
      viewerReconnectToken: "token_1",
      invitePath: "/invite/x",
      hand: [],
      players: [],
      spectators: [],
      match: null,
      chat: [],
      reconnectDeadlineIso: null,
      createdAtIso: "",
      updatedAtIso: "",
    };
    const roomService = {
      handleTurnTimeout: jest.fn().mockResolvedValue(projection),
      handleReconnectDeadline: jest.fn().mockResolvedValue(projection),
      getRoomAggregate: jest.fn().mockResolvedValue({ id: "room_1" }),
    } as any;
    const broadcast = {
      broadcastAggregate: jest.fn(),
      broadcastRoomError: jest.fn(),
    } as unknown as RoomBroadcastService;
    const service = new RoomRuntimeService(roomService, broadcast);
    const deadline = new Date(Date.now() + 100).toISOString();

    service.syncTurnTimer("room_1", deadline);
    service.syncReconnectTimer("room_1", deadline);
    jest.advanceTimersByTime(150);
    await Promise.resolve();
    await Promise.resolve();

    expect(roomService.handleTurnTimeout).toHaveBeenCalledWith("room_1");
    expect(roomService.handleReconnectDeadline).toHaveBeenCalledWith("room_1");
    expect((broadcast as any).broadcastAggregate).toHaveBeenCalledWith({ id: "room_1" });
  });

  it("broadcasts errors if a scheduled handler fails", async () => {
    const roomService = {
      handleTurnTimeout: jest.fn().mockRejectedValue(new Error("boom")),
      handleReconnectDeadline: jest.fn().mockRejectedValue(new Error("boom")),
      getRoomAggregate: jest.fn(),
    } as any;
    const broadcast = {
      broadcastAggregate: jest.fn(),
      broadcastRoomError: jest.fn(),
    } as unknown as RoomBroadcastService;
    const service = new RoomRuntimeService(roomService, broadcast);
    const deadline = new Date(Date.now() + 100).toISOString();

    service.syncTurnTimer("room_1", deadline);
    service.syncReconnectTimer("room_1", deadline);
    jest.advanceTimersByTime(150);
    await Promise.resolve();
    await Promise.resolve();

    expect((broadcast as any).broadcastRoomError).toHaveBeenCalled();
  });

  it("clears scheduled timers before they fire", () => {
    const roomService = {
      handleTurnTimeout: jest.fn(),
      handleReconnectDeadline: jest.fn(),
      getRoomAggregate: jest.fn(),
    } as any;
    const broadcast = {
      broadcastAggregate: jest.fn(),
      broadcastRoomError: jest.fn(),
    } as unknown as RoomBroadcastService;
    const service = new RoomRuntimeService(roomService, broadcast);
    const deadline = new Date(Date.now() + 100).toISOString();

    service.syncTurnTimer("room_1", deadline);
    service.syncReconnectTimer("room_1", deadline);
    service.clearAll("room_1");
    jest.advanceTimersByTime(150);

    expect(roomService.handleTurnTimeout).not.toHaveBeenCalled();
    expect(roomService.handleReconnectDeadline).not.toHaveBeenCalled();
  });

  it("does not schedule timers for null deadlines", () => {
    const roomService = {
      handleTurnTimeout: jest.fn(),
      handleReconnectDeadline: jest.fn(),
      getRoomAggregate: jest.fn(),
    } as any;
    const broadcast = {
      broadcastAggregate: jest.fn(),
      broadcastRoomError: jest.fn(),
    } as unknown as RoomBroadcastService;
    const service = new RoomRuntimeService(roomService, broadcast);

    service.syncTurnTimer("room_1", null);
    service.syncReconnectTimer("room_1", null);
    jest.advanceTimersByTime(1000);

    expect(roomService.handleTurnTimeout).not.toHaveBeenCalled();
    expect(roomService.handleReconnectDeadline).not.toHaveBeenCalled();
  });
});
