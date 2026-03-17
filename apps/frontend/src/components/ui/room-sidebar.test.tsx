/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";

import { RoomSidebar } from "./room-sidebar";

describe("RoomSidebar", () => {
  it("renders spectators and chat state", () => {
    render(
      <RoomSidebar
        room={{
          id: "room_1",
          code: "ROOM01",
          visibility: "public",
          phase: "PLAYING",
          hostPlayerId: "p1",
          viewerPlayerId: "p1",
          viewerReconnectToken: "token_1",
          invitePath: "/invite/x",
          hand: [],
          players: [
            {
              id: "p1",
              displayName: "Alice",
              role: "PLAYER",
              seatIndex: 0,
              isReady: false,
              isConnected: true,
              handCount: 2,
              organCount: 1,
              organs: [],
            },
          ],
          spectators: [
            {
              id: "s1",
              displayName: "Spec",
              role: "SPECTATOR",
              seatIndex: null,
              isReady: false,
              isConnected: true,
              handCount: 0,
              organCount: 0,
              organs: [],
            },
          ],
          match: null,
          chat: [
            {
              id: "c1",
              roomId: "room_1",
              playerId: "p1",
              displayName: "Alice",
              message: "Hello",
              createdAtIso: "",
            },
          ],
          reconnectDeadlineIso: null,
          createdAtIso: "",
          updatedAtIso: "",
        }}
      />,
    );

    expect(screen.getByText("Spec")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("renders empty placeholders when no room is available", () => {
    render(<RoomSidebar room={null} />);

    expect(screen.getByText("Czekamy na dane pokoju.")).toBeInTheDocument();
    expect(screen.getByText("Czat jest jeszcze pusty.")).toBeInTheDocument();
  });
});
