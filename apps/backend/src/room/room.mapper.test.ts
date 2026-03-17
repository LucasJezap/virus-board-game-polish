import type { RoomAggregate } from "../backend.types";
import { toRoomProjection } from "./room.mapper";

describe("room mapper", () => {
  it("maps aggregate state into room projection counters", () => {
    const aggregate: RoomAggregate = {
      id: "room_1",
      code: "ROOM01",
      visibility: "public",
      phase: "PLAYING",
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
          joinedAtIso: "2026-01-01T00:00:00.000Z",
          updatedAtIso: "2026-01-01T00:00:00.000Z",
        },
      ],
      spectators: [],
      match: {
        id: "match_1",
        startedAtIso: "2026-01-01T00:00:00.000Z",
        turnDeadlineIso: null,
        actionLog: [],
        state: {
          players: [
            {
              id: "p1",
              hand: [],
              organs: [],
            },
          ],
          drawPile: [],
          discardPile: [],
          activePlayerId: "p1",
          turnStage: "ACTION",
          pendingDraws: 0,
          winnerId: null,
          turnNumber: 1,
          lastActionBy: null,
        },
      },
      rematchVotes: {},
      reconnectDeadlineIso: null,
      chat: [],
      version: 1,
      createdAtIso: "2026-01-01T00:00:00.000Z",
      updatedAtIso: "2026-01-01T00:00:00.000Z",
    };

    const projection = toRoomProjection(aggregate);

    expect(projection.match?.playerHands.p1).toBe(0);
    expect(projection.players[0]?.organCount).toBe(0);
    expect(projection.invitePath).toBe("/invite/invite");
    expect(projection.hand).toEqual([]);
  });

  it("maps the viewer hand only for the requesting player", () => {
    const aggregate: RoomAggregate = {
      id: "room_1",
      code: "ROOM01",
      visibility: "public",
      phase: "PLAYING",
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
          joinedAtIso: "2026-01-01T00:00:00.000Z",
          updatedAtIso: "2026-01-01T00:00:00.000Z",
        },
      ],
      spectators: [],
      match: {
        id: "match_1",
        startedAtIso: "2026-01-01T00:00:00.000Z",
        turnDeadlineIso: null,
        actionLog: [],
        state: {
          players: [
            {
              id: "p1",
              hand: [{ id: "organ-heart-1", kind: "organ", organType: "heart", color: "red" }],
              organs: [],
            },
          ],
          drawPile: [],
          discardPile: [],
          activePlayerId: "p1",
          turnStage: "ACTION",
          pendingDraws: 0,
          winnerId: null,
          turnNumber: 1,
          lastActionBy: null,
        },
      },
      rematchVotes: {},
      reconnectDeadlineIso: null,
      chat: [],
      version: 1,
      createdAtIso: "2026-01-01T00:00:00.000Z",
      updatedAtIso: "2026-01-01T00:00:00.000Z",
    };

    const projection = toRoomProjection(aggregate, aggregate.players[0]!);

    expect(projection.viewerPlayerId).toBe("p1");
    expect(projection.viewerReconnectToken).toBe("r1");
    expect(projection.hand[0]).toMatchObject({
      id: "organ-heart-1",
      title: "Serce",
      kind: "organ",
    });
  });
});
