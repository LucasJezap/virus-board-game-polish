import type { RoomAggregate } from "../backend.types";
import { ClockService } from "../common/clock.service";
import { IdFactory } from "../common/id.factory";
import { GameService } from "../game/game.service";
import { RoomService } from "./room.service";

function createRepositoryMock(room?: RoomAggregate | null) {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    indexRoomCode: jest.fn().mockResolvedValue(undefined),
    addPublicRoom: jest.fn().mockResolvedValue(undefined),
    reserveDisplayName: jest.fn().mockResolvedValue(true),
    releaseDisplayName: jest.fn().mockResolvedValue(undefined),
    findOpenPublicRoom: jest.fn().mockResolvedValue(room ?? null),
    findByCode: jest.fn().mockResolvedValue(room ?? null),
    findById: jest.fn().mockResolvedValue(room ?? null),
    listAllRoomIds: jest.fn().mockResolvedValue(room ? [room.id] : []),
  };
}

function createRoomAggregate(): RoomAggregate {
  const nowIso = "2026-01-01T00:00:00.000Z";
  return {
    id: "room_1",
    code: "ROOM01",
    visibility: "public",
    phase: "WAITING",
    hostPlayerId: "p1",
    inviteToken: "invite",
    players: [
      {
        playerId: "p1",
        sessionId: "s1",
        socketId: "sock1",
        displayName: "Alice",
        role: "PLAYER",
        presence: "CONNECTED",
        roomId: "room_1",
        seatIndex: 0,
        reconnectToken: "token1",
        botControlled: false,
        joinedAtIso: nowIso,
        updatedAtIso: nowIso,
      },
      {
        playerId: "p2",
        sessionId: "s2",
        socketId: "sock2",
        displayName: "Bob",
        role: "PLAYER",
        presence: "CONNECTED",
        roomId: "room_1",
        seatIndex: 1,
        reconnectToken: "token2",
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
}

describe("RoomService", () => {
  const clock = new ClockService();
  const idFactory = new IdFactory();
  const runtime = {
    syncTurnTimer: jest.fn(),
    syncReconnectTimer: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a room and syncs runtime timers", async () => {
    const repository = createRepositoryMock();
    const gameService = {
      startMatch: jest.fn(),
      applyIntent: jest.fn(),
      applyAutoMove: jest.fn(),
    } as unknown as GameService;
    const service = new RoomService(repository as any, idFactory, clock, gameService, runtime);

    const projection = await service.createRoom({ displayName: "Alice", visibility: "public" }, "sock1");

    expect(projection.players).toHaveLength(1);
    expect(repository.save).toHaveBeenCalled();
    expect(runtime.syncTurnTimer).toHaveBeenCalled();
  });

  it("creates private rooms without adding them to the public index", async () => {
    const repository = createRepositoryMock();
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);

    const projection = await service.createRoom({ displayName: "Alice", visibility: "private" });

    expect(projection.visibility).toBe("private");
    expect(repository.addPublicRoom).not.toHaveBeenCalled();
  });

  it("joins existing rooms as player or spectator", async () => {
    const room = createRoomAggregate();
    const repository = createRepositoryMock(room);
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);

    const joined = await service.joinRoom({ displayName: "Charlie", roomCode: room.code }, "sock3");
    room.phase = "PLAYING";
    const spectated = await service.joinRoom({ displayName: "Dana", roomCode: room.code }, "sock4");

    expect(joined.players.length).toBeGreaterThanOrEqual(2);
    expect(spectated.spectators.length).toBeGreaterThanOrEqual(1);
  });

  it("quick joins open rooms or creates a new public room when none exist", async () => {
    const room = createRoomAggregate();
    const openRepository = createRepositoryMock(room);
    const openService = new RoomService(openRepository as any, idFactory, clock, {} as GameService, runtime);
    const joined = await openService.quickJoin({ displayName: "Quick" }, "sock3");

    const emptyRepository = createRepositoryMock(null);
    const emptyService = new RoomService(emptyRepository as any, idFactory, clock, {} as GameService, runtime);
    const created = await emptyService.quickJoin({ displayName: "Fresh" }, "sock4");

    expect(joined.id).toBe(room.id);
    expect(created.visibility).toBe("public");
  });

  it("supports room creation and joining without an explicit socket id", async () => {
    const room = createRoomAggregate();
    const repository = createRepositoryMock(room);
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);
    const emptyRepository = createRepositoryMock(null);
    const createOnlyService = new RoomService(emptyRepository as any, idFactory, clock, {} as GameService, runtime);

    const created = await createOnlyService.createRoom({ displayName: "Alice", visibility: "public" });
    const joined = await service.joinRoom({ displayName: "Charlie", roomCode: room.code });
    const quickJoined = await service.quickJoin({ displayName: "Dana" });

    expect(created.players).toHaveLength(1);
    expect(joined.id).toBe(room.id);
    expect(quickJoined.id).toBe(room.id);
  });

  it("returns the existing participant projection when the same socket joins the same room again", async () => {
    const room = createRoomAggregate();
    const repository = createRepositoryMock(room);
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);

    const projection = await service.joinRoom({ displayName: "Ignored", roomCode: room.code }, "sock1");

    expect(repository.reserveDisplayName).not.toHaveBeenCalled();
    expect(projection.viewerPlayerId).toBe("p1");
    expect(projection.players).toHaveLength(2);
  });

  it("rejects joining a different room with a socket that is already assigned", async () => {
    const room = {
      ...createRoomAggregate(),
      id: "room_2",
      code: "ROOM02",
      players: [
        {
          ...createRoomAggregate().players[0]!,
          roomId: "room_2",
          socketId: "sock-other",
        },
      ],
    };
    const repository = {
      ...createRepositoryMock(room),
      listAllRoomIds: jest.fn().mockResolvedValue(["room_1", "room_2"]),
      findById: jest
        .fn()
        .mockImplementation(async (roomId: string) => (roomId === "room_1" ? createRoomAggregate() : room)),
    };
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);

    await expect(service.joinRoom({ displayName: "Charlie", roomCode: room.code }, "sock1")).rejects.toThrow(
      "To polaczenie jest juz przypisane do innego gracza",
    );
  });

  it("starts matches, applies intents, and marks winners as finished", async () => {
    const room = createRoomAggregate();
    room.match = {
      id: "match_1",
      startedAtIso: room.createdAtIso,
      turnDeadlineIso: null,
      actionLog: [],
      state: {
        players: [],
        drawPile: [],
        discardPile: [],
        activePlayerId: "p1",
        turnStage: "ACTION",
        pendingDraws: 0,
        winnerId: null,
        turnNumber: 1,
        lastActionBy: null,
      },
    };
    const repository = createRepositoryMock(room);
    const gameService = {
      startMatch: jest.fn().mockReturnValue(room.match),
      applyIntent: jest.fn().mockReturnValue({
        ...room.match,
        state: {
          ...room.match.state,
          winnerId: "p1",
        },
      }),
      applyAutoMove: jest.fn(),
    } as unknown as GameService;
    const service = new RoomService(repository as any, idFactory, clock, gameService, runtime);

    await service.startMatch(room.id, room.hostPlayerId);
    const projection = await service.applyGameIntent({
      type: "draw_card",
      roomId: room.id,
      playerId: "p1",
    });

    expect(projection.phase).toBe("FINISHED");
  });

  it("keeps the room in play when an intent does not declare a winner", async () => {
    const room = createRoomAggregate();
    room.phase = "PLAYING";
    room.match = {
      id: "match_1",
      startedAtIso: room.createdAtIso,
      turnDeadlineIso: null,
      actionLog: [],
      state: {
        players: [],
        drawPile: [],
        discardPile: [],
        activePlayerId: "p1",
        turnStage: "ACTION",
        pendingDraws: 0,
        winnerId: null,
        turnNumber: 1,
        lastActionBy: null,
      },
    };
    const repository = createRepositoryMock(room);
    const gameService = {
      applyIntent: jest.fn().mockReturnValue(room.match),
    } as unknown as GameService;
    const service = new RoomService(repository as any, idFactory, clock, gameService, runtime);

    const projection = await service.applyGameIntent({
      type: "draw_card",
      roomId: room.id,
      playerId: "p1",
    });

    expect(projection.phase).toBe("PLAYING");
    expect(runtime.syncTurnTimer).toHaveBeenCalledWith(room.id, expect.any(String));
  });

  it("handles reconnects and disconnects", async () => {
    const room = createRoomAggregate();
    const repository = createRepositoryMock(room);
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);

    const disconnected = await service.disconnectPlayerBySocket("sock1");
    const reconnected = await service.reconnectPlayer({ roomId: room.id, reconnectToken: "token1" }, "sock-new");

    expect(disconnected?.players.find((player: { id: string }) => player.id === "p1")?.isConnected).toBe(false);
    expect(reconnected.players.find((player: { id: string }) => player.id === "p1")?.isConnected).toBe(true);
  });

  it("handles turn timeout and reconnect deadline room expiry", async () => {
    const room = createRoomAggregate();
    room.phase = "PLAYING";
    room.players[0]!.botControlled = true;
    room.match = {
      id: "match_1",
      startedAtIso: room.createdAtIso,
      turnDeadlineIso: new Date(Date.now() + 1000).toISOString(),
      actionLog: [],
      state: {
        players: [],
        drawPile: [],
        discardPile: [],
        activePlayerId: "p1",
        turnStage: "ACTION",
        pendingDraws: 0,
        winnerId: null,
        turnNumber: 1,
        lastActionBy: null,
      },
    };
    room.reconnectDeadlineIso = new Date(Date.now() + 1000).toISOString();
    room.players.forEach((player) => {
      player.presence = "DISCONNECTED";
      player.socketId = null;
    });
    const repository = createRepositoryMock(room);
    const gameService = {
      applyAutoMove: jest.fn().mockReturnValue({
        ...room.match,
        state: {
          ...room.match.state,
          winnerId: null,
        },
      }),
    } as unknown as GameService;
    const service = new RoomService(repository as any, idFactory, clock, gameService, runtime);

    const timeoutProjection = await service.handleTurnTimeout(room.id);
    const expiryProjection = await service.handleReconnectDeadline(room.id);

    expect(timeoutProjection.phase).toBe("PLAYING");
    expect(expiryProjection.phase).toBe("FINISHED");
  });

  it("uses auto move for human timeouts and clears the turn deadline when a timeout wins the match", async () => {
    const room = createRoomAggregate();
    room.phase = "PLAYING";
    room.match = {
      id: "match_1",
      startedAtIso: room.createdAtIso,
      turnDeadlineIso: new Date(Date.now() + 1000).toISOString(),
      actionLog: [],
      state: {
        players: [],
        drawPile: [],
        discardPile: [],
        activePlayerId: "p1",
        turnStage: "ACTION",
        pendingDraws: 0,
        winnerId: null,
        turnNumber: 1,
        lastActionBy: null,
      },
    };
    const repository = createRepositoryMock(room);
    const gameService = {
      applyAutoMove: jest.fn().mockReturnValue({
        ...room.match,
        state: {
          ...room.match.state,
          winnerId: "p1",
        },
      }),
    } as unknown as GameService;
    const service = new RoomService(repository as any, idFactory, clock, gameService, runtime);
    const originalMatch = room.match;

    const projection = await service.handleTurnTimeout(room.id);

    expect(gameService.applyAutoMove).toHaveBeenCalledWith(originalMatch, "p1", "AUTO_MOVE");
    expect(projection.phase).toBe("FINISHED");
    expect(runtime.syncTurnTimer).toHaveBeenCalledWith(room.id, null);
  });

  it("records rematch votes and serves room projections", async () => {
    const room = createRoomAggregate();
    room.match = {
      id: "match_1",
      startedAtIso: room.createdAtIso,
      turnDeadlineIso: null,
      actionLog: [],
      state: {
        players: [],
        drawPile: [],
        discardPile: [],
        activePlayerId: "p1",
        turnStage: "ACTION",
        pendingDraws: 0,
        winnerId: null,
        turnNumber: 1,
        lastActionBy: null,
      },
    };
    const repository = createRepositoryMock(room);
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);

    const projection = await service.applyGameIntent({
      type: "request_rematch",
      roomId: room.id,
      playerId: "p1",
    });
    const fetched = await service.getProjection(room.id);

    expect(projection.id).toBe(room.id);
    expect(fetched.id).toBe(room.id);
  });

  it("throws when a live match is required but missing", async () => {
    const room = createRoomAggregate();
    const repository = createRepositoryMock(room);
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);

    await expect(
      service.applyGameIntent({
        type: "draw_card",
        roomId: room.id,
        playerId: "p1",
      }),
    ).rejects.toThrow("active match");
  });

  it("throws for invalid room code, missing room, wrong host, and missing reconnect token", async () => {
    const room = createRoomAggregate();
    const repository = createRepositoryMock(room);
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);
    const missingRepository = createRepositoryMock(null);
    const missingService = new RoomService(missingRepository as any, idFactory, clock, {} as GameService, runtime);

    await expect(service.joinRoom({ displayName: "Alice" }, "sock")).rejects.toThrow("Room code is required");
    await expect(missingService.joinRoom({ displayName: "Alice", roomCode: "ROOM01" }, "sock")).rejects.toThrow("was not found");
    await expect(service.startMatch(room.id, "other")).rejects.toThrow("Only the host can start");
    await expect(service.reconnectPlayer({ roomId: room.id, reconnectToken: "missing" }, "sock")).rejects.toThrow("Reconnect token");
    await expect(missingService.getProjection("missing")).rejects.toThrow("Room missing was not found");
  });

  it("returns null for unmatched disconnects and clears reconnect deadlines when players remain", async () => {
    const room = createRoomAggregate();
    room.reconnectDeadlineIso = new Date().toISOString();
    const repository = createRepositoryMock(room);
    repository.findOpenPublicRoom.mockResolvedValueOnce(null);
    repository.listAllRoomIds.mockResolvedValueOnce([]);
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);

    await expect(service.disconnectPlayerBySocket("unknown")).resolves.toBeNull();
    const projection = await service.handleReconnectDeadline(room.id);
    expect(projection.reconnectDeadlineIso).toBeNull();
  });

  it("returns existing room state when turn timeout occurs outside active play", async () => {
    const room = createRoomAggregate();
    room.phase = "WAITING";
    const repository = createRepositoryMock(room);
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);

    const projection = await service.handleTurnTimeout(room.id);
    expect(projection.phase).toBe("WAITING");
  });

  it("returns null when a room is found for a socket scan but no player matches the socket", async () => {
    const room = createRoomAggregate();
    const repository = createRepositoryMock(room);
    repository.findOpenPublicRoom.mockResolvedValueOnce({
      ...room,
      players: room.players.map((player) => ({ ...player, socketId: "other" })),
    });
    repository.listAllRoomIds.mockResolvedValueOnce([]);
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);

    await expect(service.disconnectPlayerBySocket("missing-socket")).resolves.toBeNull();
  });

  it("finds rooms through the repository scan and handles non-playing disconnect branches", async () => {
    const room = createRoomAggregate();
    room.phase = "WAITING";
    room.match = {
      id: "match_1",
      startedAtIso: room.createdAtIso,
      turnDeadlineIso: null,
      actionLog: [],
      state: {
        players: [],
        drawPile: [],
        discardPile: [],
        activePlayerId: "p1",
        turnStage: "ACTION",
        pendingDraws: 0,
        winnerId: null,
        turnNumber: 1,
        lastActionBy: null,
      },
    };
    const repository = createRepositoryMock(room);
    repository.findOpenPublicRoom.mockResolvedValueOnce(null);
    repository.listAllRoomIds.mockResolvedValueOnce([room.id]);
    repository.findById.mockResolvedValueOnce(room);
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);

    const projection = await service.disconnectPlayerBySocket("sock1");

    expect(projection?.players.find((player: { id: string }) => player.id === "p1")?.isConnected).toBe(false);
    expect(runtime.syncTurnTimer).toHaveBeenCalledWith(room.id, null);
  });

  it("continues scanning room ids until it finds a matching socket", async () => {
    const firstRoom = {
      ...createRoomAggregate(),
      id: "room_a",
      players: createRoomAggregate().players.map((player) => ({ ...player, roomId: "room_a", socketId: "other" })),
    };
    const secondRoom = {
      ...createRoomAggregate(),
      id: "room_b",
      players: createRoomAggregate().players.map((player) => ({ ...player, roomId: "room_b" })),
    };
    const repository = createRepositoryMock(null);
    repository.findOpenPublicRoom.mockResolvedValueOnce(null);
    repository.listAllRoomIds.mockResolvedValueOnce([firstRoom.id, secondRoom.id]);
    repository.findById.mockResolvedValueOnce(firstRoom).mockResolvedValueOnce(secondRoom);
    const service = new RoomService(repository as any, idFactory, clock, {} as GameService, runtime);

    const projection = await service.disconnectPlayerBySocket("sock1");

    expect(projection?.id).toBe("room_b");
  });
});
