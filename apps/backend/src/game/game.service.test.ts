import type { ClientGameIntent } from "@wirus/shared-types";

import type { RoomAggregate } from "../backend.types";
import { ClockService } from "../common/clock.service";
import { IdFactory } from "../common/id.factory";
import { RandomService } from "../common/random.service";
import { GameService } from "./game.service";

function createRoomAggregate(): RoomAggregate {
  const nowIso = new Date("2026-01-01T00:00:00.000Z").toISOString();
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
        reconnectToken: "r1",
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
        reconnectToken: "r2",
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

describe("GameService", () => {
  let service: GameService;

  beforeEach(() => {
    service = new GameService(new ClockService(), new IdFactory(), new RandomService());
  });

  it("starts a match with seated players only", () => {
    const room = createRoomAggregate();
    room.spectators.push({
      ...room.players[0],
      playerId: "spectator_1",
      role: "SPECTATOR",
      seatIndex: null,
    });

    const match = service.startMatch(room);

    expect(match.state.players.map((player: { id: string }) => player.id)).toEqual(["p1", "p2"]);
    expect(match.turnDeadlineIso).toBeNull();
  });

  it("sorts seated players even when a seat index is missing", () => {
    const room = createRoomAggregate();
    room.players[0]!.seatIndex = null;

    const match = service.startMatch(room);

    expect(match.state.players).toHaveLength(2);
  });

  it("applies player intents through the engine", () => {
    const room = createRoomAggregate();
    const match = service.startMatch(room);
    const organCardId = match.state.players[0]?.hand.find((card: { kind: string; id: string }) => card.kind === "organ")?.id;
    if (!organCardId) {
      throw new Error("Expected an organ in player hand");
    }

    const intent: ClientGameIntent = {
      type: "play_card",
      roomId: room.id,
      playerId: "p1",
      cardId: organCardId,
      target: { type: "organ" },
    };

    const updated = service.applyIntent(match, intent);

    expect(updated.state.players[0]?.organs).toHaveLength(1);
    expect(updated.actionLog.at(-1)?.type).toBe("PLAY_CARD");
  });

  it("falls back to a legal bot/auto move", () => {
    const room = createRoomAggregate();
    const match = service.startMatch(room);
    const moved = service.applyAutoMove(match, "p1", "AUTO_MOVE");

    expect(moved.actionLog.at(-1)?.type).toBe("AUTO_MOVE");
    expect(moved.state.players[0]?.hand.length).toBeLessThanOrEqual(3);
  });

  it("maps all intent variants and rejects rematch as an engine action", () => {
    const room = createRoomAggregate();
    const match = service.startMatch(room);
    const drawReady = { ...match, state: { ...match.state, turnStage: "DRAW" as const, pendingDraws: 1 } };
    const draw = service.applyIntent(drawReady, { type: "draw_card", roomId: room.id, playerId: "p1" });
    const endReady = { ...draw, state: { ...draw.state, turnStage: "END" as const, pendingDraws: 0 } };
    const ended = service.applyIntent(endReady, { type: "end_turn", roomId: room.id, playerId: "p1" });
    const discarded = service.applyIntent(ended, { type: "discard_cards", roomId: room.id, playerId: "p2", cardIds: [] });
    const botReady = { ...discarded, state: { ...discarded.state, activePlayerId: "p2", turnStage: "ACTION" as const } };
    const bot = service.applyAutoMove(botReady, "p2", "BOT_MOVE");

    expect(bot.actionLog.map((entry) => entry.type)).toEqual(
      expect.arrayContaining(["DRAW_CARD", "END_TURN", "DISCARD_CARDS", "BOT_MOVE"]),
    );
    expect(() => service.applyIntent(match, { type: "request_rematch", roomId: room.id, playerId: "p1" })).toThrow(
      "Rematch is handled at room level",
    );
  });

  it("falls back to discard or empty discard when no legal play exists", () => {
    const room = createRoomAggregate();
    const base = service.startMatch(room);
    const noPlayMatch = {
      ...base,
      state: {
        ...base.state,
        activePlayerId: "p1",
        turnStage: "ACTION" as const,
        players: [
          {
            id: "p1",
            hand: [{ id: "treatment-contagion-1", kind: "treatment", treatmentType: "contagion" }],
            organs: [],
          },
          ...base.state.players.slice(1),
        ],
      },
    };

    const discarded = service.applyAutoMove(noPlayMatch as any, "p1", "AUTO_MOVE");
    const emptyHand = service.applyAutoMove(
      {
        ...noPlayMatch,
        state: {
          ...noPlayMatch.state,
          players: [{ ...noPlayMatch.state.players[0]!, hand: [] }, ...noPlayMatch.state.players.slice(1)],
        },
      } as any,
      "p1",
      "AUTO_MOVE",
    );

    expect(discarded.actionLog.at(-1)?.type).toBe("AUTO_MOVE");
    expect(emptyHand.actionLog.at(-1)?.type).toBe("AUTO_MOVE");
  });
});
