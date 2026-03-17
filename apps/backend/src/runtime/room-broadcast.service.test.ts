import { RoomBroadcastService } from "./room-broadcast.service";

describe("RoomBroadcastService", () => {
  it("broadcasts room projections and errors once a server is bound", () => {
    const to = jest.fn().mockReturnValue({ emit: jest.fn() });
    const server = { to } as unknown as Parameters<RoomBroadcastService["bindServer"]>[0];
    const service = new RoomBroadcastService();

    service.bindServer(server);
    service.broadcastRoom({
      id: "room_1",
      code: "ROOM01",
      visibility: "public",
      phase: "WAITING",
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
    });
    service.broadcastRoomError("room_1", "ERR", "message");

    expect(to).toHaveBeenCalledWith("room_1");
  });

  it("broadcasts personalized room projections to participant sockets", () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const server = { to } as unknown as Parameters<RoomBroadcastService["bindServer"]>[0];
    const service = new RoomBroadcastService();

    service.bindServer(server);
    service.broadcastAggregate({
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
          reconnectToken: "token1",
          botControlled: false,
          joinedAtIso: "",
          updatedAtIso: "",
        },
      ],
      spectators: [],
      match: {
        id: "match_1",
        startedAtIso: "",
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
      createdAtIso: "",
      updatedAtIso: "",
    });

    expect(to).toHaveBeenCalledWith("sock1");
    expect(emit).toHaveBeenCalledWith(
      "ROOM_STATE_UPDATE",
      expect.objectContaining({
        viewerPlayerId: "p1",
        hand: [expect.objectContaining({ id: "organ-heart-1" })],
      }),
    );
  });
});
