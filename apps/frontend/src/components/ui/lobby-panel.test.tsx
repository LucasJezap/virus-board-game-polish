/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";

const emit = jest.fn();
jest.mock("../../lib/socket", () => ({
  getRoomSocket: () => ({ emit }),
}));

import { LobbyPanel } from "./lobby-panel";
import { useRoomStore } from "../../store/room-store";
import { useSessionStore } from "../../store/session-store";

describe("LobbyPanel", () => {
  beforeEach(() => {
    emit.mockClear();
    useRoomStore.setState({ room: null, lobbyRooms: [] } as any);
    useSessionStore.setState({ displayName: "Gracz", playerId: null, roomId: null, reconnectToken: null } as any);
  });

  it("emits room creation and quick join events", () => {
    render(<LobbyPanel />);

    fireEvent.click(screen.getByText("Utwórz pokój publiczny"));
    fireEvent.click(screen.getByText("Utwórz pokój prywatny"));
    fireEvent.click(screen.getByText("Szybkie dołączanie"));

    expect(emit).toHaveBeenCalledWith("ROOM_CREATE", expect.objectContaining({ visibility: "public" }));
    expect(emit).toHaveBeenCalledWith("ROOM_CREATE", expect.objectContaining({ visibility: "private" }));
    expect(emit).toHaveBeenCalledWith("ROOM_QUICK_JOIN", expect.any(Object));
  });

  it("renders current room summary when a room is present", () => {
    useRoomStore.setState({
      room: {
        id: "room_1",
        code: "ROOM01",
        visibility: "private",
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
      },
    } as any);

    render(<LobbyPanel />);
    expect(screen.getByText("Kod ROOM01")).toBeInTheDocument();
  });

  it("updates the display name field", () => {
    render(<LobbyPanel />);

    fireEvent.change(screen.getByPlaceholderText("Jak mamy Cię wyświetlać?"), { target: { value: "Alice" } });

    expect(useSessionStore.getState().displayName).toBe("Alice");
  });

  it("renders the room list and emits join by room code", () => {
    useRoomStore.setState({
      lobbyRooms: [
        {
          id: "room_1",
          code: "ROOM01",
          visibility: "public",
          phase: "WAITING",
          playerCount: 4,
          spectatorCount: 1,
          hasActiveMatch: false,
          createdAtIso: "",
          updatedAtIso: "",
        },
      ],
    } as any);

    render(<LobbyPanel />);
    fireEvent.click(screen.getByText("Dołącz"));

    expect(screen.getByText("Pokój ROOM01")).toBeInTheDocument();
    expect(emit).toHaveBeenCalledWith("ROOM_JOIN", expect.objectContaining({ roomCode: "ROOM01" }));
  });
});
