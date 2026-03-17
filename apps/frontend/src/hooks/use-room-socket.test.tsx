/**
 * @jest-environment jsdom
 */

import { renderHook } from "@testing-library/react";

import { useRoomStore } from "../store/room-store";
import { useSessionStore } from "../store/session-store";

const handlers = new Map<string, (...args: any[]) => void>();
const socket = {
  connected: false,
  connect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn((event: string, handler: (...args: any[]) => void) => {
    handlers.set(event, handler);
  }),
  off: jest.fn((event: string) => {
    handlers.delete(event);
  }),
};

jest.mock("../lib/socket", () => ({
  getRoomSocket: () => socket,
}));

import { useRoomSocket } from "./use-room-socket";

describe("useRoomSocket", () => {
  beforeEach(() => {
    handlers.clear();
    socket.connected = false;
    socket.connect.mockClear();
    socket.emit.mockClear();
    socket.on.mockClear();
    socket.off.mockClear();
    useRoomStore.setState({
      room: null,
      lobbyRooms: [],
      isConnected: false,
      isLoading: false,
      errorMessage: null,
      pendingIntent: null,
      ui: {
        selectedCardId: null,
        selectedTargetPlayerId: null,
      },
    } as any);
    useSessionStore.setState({ displayName: "Gracz", playerId: null, roomId: null, reconnectToken: null } as any);
  });

  it("subscribes to socket events and updates the store", () => {
    renderHook(() => useRoomSocket());

    handlers.get("connect")?.();
    handlers.get("ROOM_LIST_UPDATE")?.([
      {
        id: "room_1",
        code: "ROOM01",
        visibility: "public",
        phase: "WAITING",
        playerCount: 2,
        spectatorCount: 0,
        hasActiveMatch: false,
        createdAtIso: "",
        updatedAtIso: "",
      },
    ]);
    handlers.get("ROOM_STATE_UPDATE")?.({
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
    handlers.get("ROOM_CHAT_MESSAGE")?.({
      id: "c1",
      roomId: "room_1",
      playerId: "p1",
      displayName: "Alice",
      message: "hello",
      createdAtIso: "",
    });
    handlers.get("ROOM_ERROR")?.({ code: "ERR", message: "problem" });
    handlers.get("disconnect")?.();

    expect(socket.connect).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith("ROOM_LIST");
    expect(useRoomStore.getState().isConnected).toBe(false);
    expect(useRoomStore.getState().lobbyRooms).toHaveLength(1);
    expect(useRoomStore.getState().room?.id).toBe("room_1");
    expect(useRoomStore.getState().room?.chat).toHaveLength(1);
    expect(useRoomStore.getState().errorMessage).toBe("problem");
    expect(useSessionStore.getState().playerId).toBe("p1");
    expect(useSessionStore.getState().reconnectToken).toBe("token_1");
  });

  it("does not reconnect an already connected socket and unregisters handlers on cleanup", () => {
    socket.connected = true;

    const { unmount } = renderHook(() => useRoomSocket());

    expect(socket.connect).not.toHaveBeenCalled();

    unmount();

    expect(socket.off).toHaveBeenCalledWith("connect", expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith("disconnect", expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith("ROOM_LIST_UPDATE", expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith("ROOM_STATE_UPDATE", expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith("ROOM_CHAT_MESSAGE", expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith("ROOM_ERROR", expect.any(Function));
  });
});
