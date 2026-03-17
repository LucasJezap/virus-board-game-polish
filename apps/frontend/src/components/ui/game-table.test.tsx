/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";

import { GameTable } from "./game-table";

describe("GameTable", () => {
  it("renders fallback and player cards", () => {
    const { rerender } = render(<GameTable room={null} />);
    expect(screen.getByText(/Awaiting players/i)).toBeInTheDocument();

    rerender(
      <GameTable
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
          spectators: [],
          match: {
            id: "match_1",
            startedAtIso: "",
            activePlayerId: "p1",
            turnStage: "ACTION",
            pendingDraws: 0,
            winnerId: null,
            discardPileCount: 2,
            playerHands: { p1: 2 },
            playerOrgans: { p1: 1 },
          },
          chat: [
            {
              id: "msg_1",
              roomId: "room_1",
              playerId: "p1",
              displayName: "Alice",
              message: "infected Heart of Bob.",
              createdAtIso: "2026-03-17T12:00:00.000Z",
            },
          ],
          reconnectDeadlineIso: null,
          createdAtIso: "",
          updatedAtIso: "",
        }}
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Active Turn")).toBeInTheDocument();
    expect(screen.getByText("Action Log")).toBeInTheDocument();
    expect(screen.getByText(/Alice infected Heart of Bob/i)).toBeInTheDocument();
  });

  it("renders non-active seated players without the active badge and shows bio status", () => {
    render(
      <GameTable
        room={{
          id: "room_1",
          code: "ROOM01",
          visibility: "public",
          phase: "PLAYING",
          hostPlayerId: "p1",
          viewerPlayerId: "p2",
          viewerReconnectToken: "token_2",
          invitePath: "/invite/x",
          hand: [],
          players: [
            {
              id: "p2",
              displayName: "Bob",
              role: "PLAYER",
              seatIndex: 1,
              isReady: false,
              isConnected: false,
              handCount: 3,
              organCount: 2,
              organs: [
                {
                  id: "organ_1",
                  title: "Heart",
                  icon: "🫀",
                  accentColor: "red",
                  medicineCount: 1,
                  virusCount: 0,
                  isImmunized: false,
                  isInfected: false,
                },
              ],
            },
          ],
          spectators: [],
          match: {
            id: "match_1",
            startedAtIso: "",
            activePlayerId: "p1",
            turnStage: "ACTION",
            pendingDraws: 0,
            winnerId: null,
            discardPileCount: 0,
            playerHands: { p2: 3 },
            playerOrgans: { p2: 2 },
          },
          chat: [],
          reconnectDeadlineIso: null,
          createdAtIso: "",
          updatedAtIso: "",
        }}
      />,
    );

    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByText("Active Turn")).not.toBeInTheDocument();
    expect(screen.getByText("Standby")).toBeInTheDocument();
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    expect(screen.getByText("Bio-Status")).toBeInTheDocument();
    expect(screen.getByText("Protected")).toBeInTheDocument();
  });
});
