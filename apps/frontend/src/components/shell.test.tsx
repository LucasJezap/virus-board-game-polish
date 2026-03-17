/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";

jest.mock("../hooks/use-room-socket", () => ({
  useRoomSocket: jest.fn(),
}));

import { Shell } from "./shell";
import { useRoomStore } from "../store/room-store";
import { useSessionStore } from "../store/session-store";

describe("Shell", () => {
  beforeEach(() => {
    useRoomStore.setState({ room: null, isConnected: false, errorMessage: null } as any);
    useSessionStore.setState({ displayName: "Gracz", playerId: null, roomId: null, reconnectToken: null } as any);
  });

  it("renders the lobby shell", () => {
    render(<Shell />);

    expect(screen.getByText("Bio-Arena Mode")).toBeInTheDocument();
    expect(screen.getByText("Łączenie")).toBeInTheDocument();
  });

  it("renders error state when the room store contains one", () => {
    useRoomStore.setState({ errorMessage: "problem" } as any);
    render(<Shell />);
    expect(screen.getByText("problem")).toBeInTheDocument();
  });

  it("renders the connected badge when the socket state is online", () => {
    useRoomStore.setState({ isConnected: true } as any);
    useSessionStore.setState({ displayName: "Alice" } as any);

    render(<Shell />);

    expect(screen.getByText("Połączono")).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });
});
