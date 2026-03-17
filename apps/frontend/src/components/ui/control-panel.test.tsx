/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";

const emit = jest.fn();
jest.mock("../../lib/socket", () => ({
  getRoomSocket: () => ({ emit }),
}));

import { ControlPanel, emitGameAction, emitRoomStart } from "./control-panel";
import { useSessionStore } from "../../store/session-store";

describe("ControlPanel", () => {
  beforeEach(() => {
    emit.mockClear();
    useSessionStore.setState({ displayName: "Gracz", playerId: null, roomId: null, reconnectToken: null } as any);
  });

  it("emits start, draw, end, and rematch intents", () => {
    const room = {
      id: "room_1",
      code: "ROOM01",
      visibility: "public" as const,
      phase: "WAITING" as const,
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
    const { rerender } = render(<ControlPanel room={room} />);
    fireEvent.click(screen.getByText("Rozpocznij partię"));
    expect(emit).toHaveBeenCalledWith("ROOM_START", expect.objectContaining({ roomId: "room_1" }));

    rerender(<ControlPanel room={{ ...room, phase: "PLAYING" }} />);
    fireEvent.click(screen.getByText("Dobierz kartę"));
    fireEvent.click(screen.getByText("Zakończ turę"));
    expect(emit).toHaveBeenCalledWith("GAME_ACTION", expect.objectContaining({ type: "draw_card" }));
    expect(emit).toHaveBeenCalledWith("GAME_ACTION", expect.objectContaining({ type: "end_turn" }));

    rerender(<ControlPanel room={{ ...room, phase: "FINISHED" }} />);
    fireEvent.click(screen.getByText("Głosuj za rewanżem"));
    expect(emit).toHaveBeenCalledWith("GAME_ACTION", expect.objectContaining({ type: "request_rematch" }));
  });

  it("does nothing when no room is provided", () => {
    render(<ControlPanel room={null} />);
    fireEvent.click(screen.getByText("Rozpocznij partię"));
    fireEvent.click(screen.getByText("Dobierz kartę"));
    fireEvent.click(screen.getByText("Zakończ turę"));
    fireEvent.click(screen.getByText("Głosuj za rewanżem"));
    expect(emit).not.toHaveBeenCalled();
  });

  it("prefers the session player id over the host id when emitting", () => {
    useSessionStore.setState({ playerId: "session-player" } as any);
    const room = {
      id: "room_1",
      code: "ROOM01",
      visibility: "public" as const,
      phase: "PLAYING" as const,
      hostPlayerId: "host-player",
      viewerPlayerId: "session-player",
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

    render(<ControlPanel room={room} />);
    fireEvent.click(screen.getByText("Dobierz kartę"));

    expect(emit).toHaveBeenCalledWith("GAME_ACTION", expect.objectContaining({ playerId: "session-player" }));
  });

  it("covers the null-room helper branches directly", () => {
    emitRoomStart(null, null);
    emitGameAction(null, null, "draw_card");

    expect(emit).not.toHaveBeenCalled();
  });
});
