import type {
  ClientGameIntent,
  CreateRoomInput,
  ReconnectRoomInput,
  RoomProjection,
  ServerEventEnvelope,
} from "./index";

describe("shared-types", () => {
  it("accepts the room creation contract shape", () => {
    const input: CreateRoomInput = {
      displayName: "Alice",
      visibility: "public",
    };

    expect(input.visibility).toBe("public");
  });

  it("accepts client intent and room projection shapes", () => {
    const intent: ClientGameIntent = {
      type: "draw_card",
      roomId: "room_1",
      playerId: "player_1",
    };

    const projection: RoomProjection = {
      id: "room_1",
      code: "ABC123",
      visibility: "private",
      phase: "PLAYING",
      hostPlayerId: "player_1",
      viewerPlayerId: "player_1",
      viewerReconnectToken: "token_1",
      invitePath: "/invite/token",
      hand: [],
      players: [],
      spectators: [],
      match: null,
      chat: [],
      reconnectDeadlineIso: null,
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    };

    const envelope: ServerEventEnvelope = {
      type: "ROOM_STATE_UPDATE",
      payload: projection,
    };

    expect(intent.type).toBe("draw_card");
    expect(envelope.payload.id).toBe("room_1");
  });

  it("accepts the reconnect payload shape", () => {
    const reconnect: ReconnectRoomInput = {
      roomId: "room_9",
      reconnectToken: "token_9",
    };

    expect(reconnect.reconnectToken).toContain("token");
  });
});
