/**
 * @jest-environment jsdom
 */

import type { ChatMessage, RoomProjection } from "@wirus/shared-types";

import { useRoomStore } from "./room-store";

describe("room store", () => {
  it("updates room state, ui state, and chat feed", () => {
    const room: RoomProjection = {
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
    };
    const chat: ChatMessage = {
      id: "c1",
      roomId: "room_1",
      playerId: "p1",
      displayName: "Alice",
      message: "hello",
      createdAtIso: "",
    };

    useRoomStore.getState().setRoom(room);
    useRoomStore.getState().setLobbyRooms([
      {
        id: "room_2",
        code: "ROOM02",
        visibility: "public",
        phase: "WAITING",
        playerCount: 3,
        spectatorCount: 0,
        hasActiveMatch: false,
        createdAtIso: "",
        updatedAtIso: "",
      },
    ]);
    useRoomStore.getState().setConnected(true);
    useRoomStore.getState().setLoading(true);
    useRoomStore.getState().setError("problem");
    useRoomStore.getState().appendChat(chat);
    useRoomStore.getState().setPendingIntent({ type: "draw_card", roomId: "room_1", playerId: "p1" });
    useRoomStore.getState().selectCard("card_1");
    useRoomStore.getState().selectTargetPlayer("p2");

    expect(useRoomStore.getState().room?.chat).toHaveLength(1);
    expect(useRoomStore.getState().lobbyRooms).toHaveLength(1);
    expect(useRoomStore.getState().isConnected).toBe(true);
    expect(useRoomStore.getState().isLoading).toBe(true);
    expect(useRoomStore.getState().errorMessage).toBe("problem");
    expect(useRoomStore.getState().pendingIntent?.type).toBe("draw_card");
    expect(useRoomStore.getState().ui.selectedCardId).toBe("card_1");
    expect(useRoomStore.getState().ui.selectedTargetPlayerId).toBe("p2");
  });

  it("keeps room state null when appending chat before a room exists", () => {
    useRoomStore.setState({ room: null } as any);

    useRoomStore.getState().appendChat({
      id: "c2",
      roomId: "room_2",
      playerId: "p2",
      displayName: "Bob",
      message: "waiting",
      createdAtIso: "",
    });

    expect(useRoomStore.getState().room).toBeNull();
  });
});
