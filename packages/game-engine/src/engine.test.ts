import { BASE_DECK_BY_ID, createBaseDeck } from "./cards";
import { applyAction, createGame, listValidPlays } from "./engine";
import { GameEngineError } from "./errors";
import type { CardDefinition } from "./cards";
import { isVaccinated } from "./types";
import type { GameState, PlayerState } from "./types";

function deckFromTop(cardIds: readonly string[]): CardDefinition[] {
  const baseDeck = createBaseDeck();
  const pinned = new Set(cardIds);
  const prioritized = cardIds.map((cardId) => {
    const card = BASE_DECK_BY_ID.get(cardId);
    if (!card) {
      throw new Error(`Unknown card ${cardId}`);
    }
    return { ...card };
  });
  return [...prioritized, ...baseDeck.filter((card) => !pinned.has(card.id))];
}

function createTestGame(cardIds: readonly string[]): GameState {
  return createGame({
    playerIds: ["p1", "p2", "p3"],
    orderedPlayerIds: ["p1", "p2", "p3"],
    orderedDeck: deckFromTop(cardIds),
  });
}

function player(state: GameState, playerId: string): PlayerState {
  const result = state.players.find((candidate) => candidate.id === playerId);
  if (!result) {
    throw new Error(`Unknown player ${playerId}`);
  }
  return result;
}

function completeTurn(state: GameState): GameState {
  let nextState = state;
  while (nextState.turnStage === "DRAW") {
    nextState = applyAction(nextState, {
      type: "DRAW_CARD",
      playerId: nextState.activePlayerId,
    }).state;
  }
  if (nextState.turnStage === "END" && nextState.winnerId === null) {
    nextState = applyAction(nextState, {
      type: "END_TURN",
      playerId: nextState.activePlayerId,
    }).state;
  }
  return nextState;
}

function card(cardId: string): CardDefinition {
  const found = BASE_DECK_BY_ID.get(cardId);
  if (!found) {
    throw new Error(`Unknown card ${cardId}`);
  }
  return { ...found };
}

describe("game-engine", () => {
  it("creates a deterministic initial state from ordered input", () => {
    const state = createTestGame([
      "organ-heart-1",
      "organ-brain-1",
      "organ-bones-1",
      "medicine-heart-1",
      "medicine-brain-1",
      "medicine-bones-1",
      "virus-heart-1",
      "virus-brain-1",
      "virus-bones-1",
    ]);

    expect(state.activePlayerId).toBe("p1");
    expect(player(state, "p1").hand.map((entry) => entry.id)).toEqual([
      "organ-heart-1",
      "medicine-heart-1",
      "virus-heart-1",
    ]);
    expect(player(state, "p2").hand.map((entry) => entry.id)).toEqual([
      "organ-brain-1",
      "medicine-brain-1",
      "virus-brain-1",
    ]);
    expect(player(state, "p3").hand.map((entry) => entry.id)).toEqual([
      "organ-bones-1",
      "medicine-bones-1",
      "virus-bones-1",
    ]);
  });

  it("plays an organ and advances through draw and end phases", () => {
    let state = createTestGame([
      "organ-heart-1",
      "organ-brain-1",
      "organ-bones-1",
      "medicine-heart-1",
      "medicine-brain-1",
      "medicine-bones-1",
      "virus-heart-1",
      "virus-brain-1",
      "virus-bones-1",
      "organ-stomach-1",
    ]);

    const played = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: "organ-heart-1",
      target: { type: "organ" },
    });
    state = played.state;

    expect(player(state, "p1").organs.map((slot) => slot.organ.id)).toEqual(["organ-heart-1"]);
    expect(state.turnStage).toBe("DRAW");
    expect(state.pendingDraws).toBe(1);
    expect(played.events).toEqual([{ type: "CARD_PLAYED", playerId: "p1", cardId: "organ-heart-1" }]);

    state = completeTurn(state);

    expect(player(state, "p1").hand).toHaveLength(3);
    expect(state.activePlayerId).toBe("p2");
    expect(state.turnStage).toBe("ACTION");
  });

  it("applies virus and medicine interactions on organs", () => {
    let state = createTestGame([
      "organ-heart-1",
      "organ-brain-1",
      "organ-bones-1",
      "medicine-heart-1",
      "medicine-brain-1",
      "medicine-bones-1",
      "virus-bones-1",
      "virus-heart-1",
      "virus-brain-1",
      "organ-stomach-1",
    ]);

    state = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: "organ-heart-1",
      target: { type: "organ" },
    }).state;
    state = completeTurn(state);

    state = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p2",
      cardId: "virus-heart-1",
      target: { type: "virus", target: { targetPlayerId: "p1", targetOrganType: "heart" } },
    }).state;
    state = completeTurn(state);

    expect(player(state, "p1").organs[0]?.viruses).toHaveLength(1);

    state = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p3",
      cardId: "organ-bones-1",
      target: { type: "organ" },
    }).state;
    state = completeTurn(state);

    state = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: "medicine-heart-1",
      target: { type: "medicine", target: { targetPlayerId: "p1", targetOrganType: "heart" } },
    }).state;

    expect(player(state, "p1").organs[0]?.viruses).toHaveLength(0);
    expect(state.discardPile.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(["virus-heart-1", "medicine-heart-1"]),
    );
  });

  it("destroys an organ when a second matching virus is played on it", () => {
    let state = createTestGame([
      "organ-heart-1",
      "medicine-brain-1",
      "organ-bones-1",
      "virus-heart-1",
      "virus-heart-2",
      "medicine-bones-1",
      "virus-brain-1",
      "virus-brain-2",
      "medicine-heart-1",
    ]);

    state = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: "organ-heart-1",
      target: { type: "organ" },
    }).state;
    state = completeTurn(state);

    state = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p2",
      cardId: "virus-heart-2",
      target: { type: "virus", target: { targetPlayerId: "p1", targetOrganType: "heart" } },
    }).state;
    state = completeTurn(state);

    state = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p3",
      cardId: "organ-bones-1",
      target: { type: "organ" },
    }).state;
    state = completeTurn(state);

    state = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: "virus-heart-1",
      target: { type: "virus", target: { targetPlayerId: "p1", targetOrganType: "heart" } },
    }).state;

    expect(player(state, "p1").organs).toHaveLength(0);
    expect(state.discardPile.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(["organ-heart-1", "virus-heart-1", "virus-heart-2"]),
    );
  });

  it("immunizes an organ and rejects further viruses on it", () => {
    const state: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "ACTION",
      pendingDraws: 0,
      winnerId: null,
      players: [
        {
          id: "p1",
          hand: [card("medicine-heart-2"), card("virus-brain-1"), card("organ-bones-1")],
          organs: [
            {
              organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [card("medicine-heart-1") as Extract<CardDefinition, { kind: "medicine" }>],
              viruses: [],
            },
          ],
        },
        {
          id: "p2",
          hand: [],
          organs: [],
        },
        {
          id: "p3",
          hand: [],
          organs: [],
        },
      ],
    };

    const result = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: "medicine-heart-2",
      target: { type: "medicine", target: { targetPlayerId: "p1", targetOrganType: "heart" } },
    });

    expect(player(result.state, "p1").organs[0]?.medicines).toHaveLength(2);
    expect(() =>
      applyAction(
        {
          ...result.state,
          activePlayerId: "p1",
          turnStage: "ACTION",
          pendingDraws: 0,
        },
        {
          type: "PLAY_CARD",
          playerId: "p1",
          cardId: "virus-brain-1",
          target: { type: "virus", target: { targetPlayerId: "p1", targetOrganType: "heart" } },
        },
      ),
    ).toThrow(GameEngineError);
  });

  it("supports transplant and organ thief treatment effects", () => {
    const state: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "ACTION",
      pendingDraws: 0,
      winnerId: null,
      players: [
        {
          id: "p1",
          hand: [card("treatment-transplant-1"), card("organ-stomach-1"), card("virus-heart-1")],
          organs: [
            {
              organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
          ],
        },
        {
          id: "p2",
          hand: [card("treatment-organ_thief-1"), card("medicine-heart-1"), card("virus-brain-1")],
          organs: [
            {
              organ: card("organ-brain-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
          ],
        },
        {
          id: "p3",
          hand: [],
          organs: [
            {
              organ: card("organ-bones-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
          ],
        },
      ],
    };

    let nextState = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: "treatment-transplant-1",
      target: {
        type: "transplant",
        target: {
          firstPlayerId: "p1",
          firstOrganType: "heart",
          secondPlayerId: "p3",
          secondOrganType: "bones",
        },
      },
    }).state;

    expect(player(nextState, "p1").organs.map((slot) => slot.organ.organType)).toEqual(["bones"]);

    nextState = applyAction(
      {
        ...nextState,
        activePlayerId: "p2",
        turnStage: "ACTION",
        pendingDraws: 0,
      },
      {
        type: "PLAY_CARD",
        playerId: "p2",
        cardId: "treatment-organ_thief-1",
        target: { type: "organ_thief", target: { targetPlayerId: "p1", targetOrganType: "bones" } },
      },
    ).state;

    expect(player(nextState, "p2").organs.map((slot) => slot.organ.organType)).toEqual(["brain", "bones"]);
    expect(player(nextState, "p1").organs).toHaveLength(0);
  });

  it("applies latex glove, medical error, and contagion deterministically", () => {
    let state = createTestGame([
      "treatment-latex_glove-1",
      "organ-heart-1",
      "organ-bones-1",
      "organ-brain-1",
      "organ-stomach-1",
      "medicine-bones-1",
      "virus-heart-1",
      "virus-brain-1",
      "virus-bones-1",
    ]);

    state = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: "treatment-latex_glove-1",
      target: { type: "latex_glove" },
    }).state;
    state = completeTurn(state);

    expect(player(state, "p2").hand).toHaveLength(0);
    expect(player(state, "p3").hand).toHaveLength(0);

    const swapped = applyAction(
      {
        ...state,
        activePlayerId: "p2",
        turnStage: "ACTION",
        pendingDraws: 0,
        players: [
          {
            id: "p1",
            hand: [],
            organs: [
              {
                organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
                medicines: [],
                viruses: [card("virus-heart-1") as Extract<CardDefinition, { kind: "virus" }>],
              },
            ],
          },
          {
            id: "p2",
            hand: [card("treatment-medical_error-1"), card("treatment-contagion-1"), card("medicine-bones-1")],
            organs: [
              {
                organ: card("organ-brain-1") as Extract<CardDefinition, { kind: "organ" }>,
                medicines: [],
                viruses: [],
              },
            ],
          },
        {
          id: "p3",
          hand: [],
          organs: [
            {
              organ: card("organ-heart-2") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
          ],
          },
        ],
      },
      {
        type: "PLAY_CARD",
        playerId: "p2",
        cardId: "treatment-medical_error-1",
        target: { type: "medical_error", targetPlayerId: "p1" },
      },
    ).state;

    expect(player(swapped, "p2").organs[0]?.organ.organType).toBe("heart");

    const spread = applyAction(
      {
        ...swapped,
        activePlayerId: "p2",
        turnStage: "ACTION",
        pendingDraws: 0,
      },
      {
        type: "PLAY_CARD",
        playerId: "p2",
        cardId: "treatment-contagion-1",
        target: {
          type: "contagion",
          transfers: [{ sourceOrganType: "heart", targetPlayerId: "p3", targetOrganType: "heart" }],
        },
      },
    ).state;

    expect(player(spread, "p2").organs[0]?.viruses).toHaveLength(0);
    expect(player(spread, "p3").organs[0]?.viruses).toHaveLength(1);
  });

  it("declares a winner when a player reaches four healthy organs", () => {
    const state: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "ACTION",
      pendingDraws: 0,
      winnerId: null,
      players: [
        {
          id: "p1",
          hand: [card("organ-stomach-1"), card("virus-heart-1"), card("medicine-heart-1")],
          organs: [
            {
              organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
            {
              organ: card("organ-brain-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
            {
              organ: card("organ-bones-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
          ],
        },
        { id: "p2", hand: [], organs: [] },
        { id: "p3", hand: [], organs: [] },
      ],
    };

    const result = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: "organ-stomach-1",
      target: { type: "organ" },
    });

    expect(result.state.winnerId).toBe("p1");
    expect(result.events).toEqual(
      expect.arrayContaining([
        { type: "CARD_PLAYED", playerId: "p1", cardId: "organ-stomach-1" },
        { type: "WINNER_DECLARED", playerId: "p1" },
      ]),
    );
  });

  it("lists valid plays and rejects invalid actions", () => {
    const state: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "ACTION",
      pendingDraws: 0,
      winnerId: null,
      players: [
        {
          id: "p1",
          hand: [card("medicine-heart-1"), card("treatment-latex_glove-1"), card("virus-heart-1")],
          organs: [
            {
              organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
          ],
        },
        { id: "p2", hand: [], organs: [] },
        { id: "p3", hand: [], organs: [] },
      ],
    };

    const plays = listValidPlays(state, "p1");
    expect(plays).toEqual(
      expect.arrayContaining([
        {
          cardId: "medicine-heart-1",
          target: { type: "medicine", target: { targetPlayerId: "p1", targetOrganType: "heart" } },
        },
        { cardId: "treatment-latex_glove-1", target: { type: "latex_glove" } },
        {
          cardId: "virus-heart-1",
          target: { type: "virus", target: { targetPlayerId: "p1", targetOrganType: "heart" } },
        },
      ]),
    );

    expect(() =>
      applyAction(state, {
        type: "PLAY_CARD",
        playerId: "p2",
        cardId: "medicine-heart-1",
        target: { type: "medicine", target: { targetPlayerId: "p2", targetOrganType: "heart" } },
      }),
    ).toThrow(GameEngineError);

    expect(() =>
      applyAction(state, {
        type: "DRAW_CARD",
        playerId: "p1",
      }),
    ).toThrow(GameEngineError);
  });

  it("replays identical results for auto and bot wrappers around the same resolved action", () => {
    const state = createTestGame([
      "organ-heart-1",
      "organ-brain-1",
      "organ-bones-1",
      "medicine-heart-1",
      "medicine-brain-1",
      "medicine-bones-1",
      "virus-heart-1",
      "virus-brain-1",
      "virus-bones-1",
    ]);

    const autoMoved = applyAction(state, {
      type: "AUTO_MOVE",
      playerId: "p1",
      resolvedAction: {
        type: "PLAY_CARD",
        playerId: "p1",
        cardId: "organ-heart-1",
        target: { type: "organ" },
      },
    });

    const botMoved = applyAction(state, {
      type: "BOT_MOVE",
      playerId: "p1",
      resolvedAction: {
        type: "PLAY_CARD",
        playerId: "p1",
        cardId: "organ-heart-1",
        target: { type: "organ" },
      },
    });

    expect(autoMoved.state).toEqual(botMoved.state);
    expect(autoMoved.events).toEqual(botMoved.events);
  });

  it("recycles the discard pile when drawing from an empty deck", () => {
    const state: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "DRAW",
      pendingDraws: 1,
      drawPile: [],
      discardPile: [card("organ-heart-1")],
      players: [
        { id: "p1", hand: [], organs: [] },
        { id: "p2", hand: [], organs: [] },
        { id: "p3", hand: [], organs: [] },
      ],
    };

    const result = applyAction(state, { type: "DRAW_CARD", playerId: "p1" });
    expect(result.state.players[0]?.hand[0]?.id).toBe("organ-heart-1");
    expect(result.state.discardPile).toHaveLength(0);
  });

  it("rejects draws from a completely empty deck", () => {
    const state: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "DRAW",
      pendingDraws: 1,
      drawPile: [],
      discardPile: [],
      players: [
        { id: "p1", hand: [], organs: [] },
        { id: "p2", hand: [], organs: [] },
        { id: "p3", hand: [], organs: [] },
      ],
    };

    expect(() => applyAction(state, { type: "DRAW_CARD", playerId: "p1" })).toThrow(GameEngineError);
  });

  it("rejects duplicate discard selections and can end immediately after discarding three cards", () => {
    const state = createTestGame([
      "organ-heart-1",
      "organ-brain-1",
      "organ-bones-1",
      "medicine-heart-1",
      "medicine-brain-1",
      "medicine-bones-1",
      "virus-heart-1",
      "virus-brain-1",
      "virus-bones-1",
    ]);

    expect(() =>
      applyAction(state, {
        type: "DISCARD_CARDS",
        playerId: "p1",
        cardIds: ["organ-heart-1", "organ-heart-1"],
      }),
    ).toThrow(GameEngineError);

    const result = applyAction(state, {
      type: "DISCARD_CARDS",
      playerId: "p1",
      cardIds: ["organ-heart-1", "medicine-heart-1", "virus-heart-1"],
    });

    expect(result.state.turnStage).toBe("DRAW");
    expect(result.state.pendingDraws).toBe(3);
  });

  it("uses a virus to strip a vaccinated organ's medicine", () => {
    const state: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "ACTION",
      pendingDraws: 0,
      winnerId: null,
      players: [
        {
          id: "p1",
          hand: [card("virus-heart-1"), card("organ-bones-1"), card("organ-brain-1")],
          organs: [],
        },
        {
          id: "p2",
          hand: [],
          organs: [
            {
              organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [card("medicine-heart-1") as Extract<CardDefinition, { kind: "medicine" }>],
              viruses: [],
            },
          ],
        },
        { id: "p3", hand: [], organs: [] },
      ],
    };

    const result = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: "virus-heart-1",
      target: { type: "virus", target: { targetPlayerId: "p2", targetOrganType: "heart" } },
    });

    expect(player(result.state, "p2").organs[0]?.medicines).toHaveLength(0);
    expect(result.state.discardPile.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(["medicine-heart-1", "virus-heart-1"]),
    );
  });

  it("rejects invalid treatment targets and invalid remapped players", () => {
    const state: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "ACTION",
      pendingDraws: 0,
      winnerId: null,
      players: [
        {
          id: "p1",
          hand: [card("treatment-transplant-1"), card("treatment-organ_thief-1"), card("treatment-contagion-1")],
          organs: [
            {
              organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [card("medicine-heart-1") as Extract<CardDefinition, { kind: "medicine" }>, card("medicine-heart-2") as Extract<CardDefinition, { kind: "medicine" }>],
              viruses: [],
            },
          ],
        },
        {
          id: "p2",
          hand: [],
          organs: [
            {
              organ: card("organ-heart-2") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [card("virus-heart-1") as Extract<CardDefinition, { kind: "virus" }>],
            },
          ],
        },
        { id: "p3", hand: [], organs: [] },
      ],
    };

    expect(() =>
      applyAction(state, {
        type: "PLAY_CARD",
        playerId: "p1",
        cardId: "treatment-transplant-1",
        target: {
          type: "transplant",
          target: {
            firstPlayerId: "p1",
            firstOrganType: "heart",
            secondPlayerId: "p1",
            secondOrganType: "heart",
          },
        },
      }),
    ).toThrow(GameEngineError);

    expect(() =>
      applyAction(
        {
          ...state,
          players: [
            {
              ...state.players[0]!,
              hand: [card("treatment-organ_thief-1"), card("organ-bones-1"), card("organ-brain-1")],
            },
            ...state.players.slice(1),
          ],
        },
        {
          type: "PLAY_CARD",
          playerId: "p1",
          cardId: "treatment-organ_thief-1",
          target: { type: "organ_thief", target: { targetPlayerId: "p2", targetOrganType: "heart" } },
        },
      ),
    ).toThrow(GameEngineError);

    expect(() =>
      applyAction(
        {
          ...state,
          players: [
            {
              ...state.players[0]!,
              hand: [card("treatment-contagion-1"), card("organ-bones-1"), card("organ-brain-1")],
            },
            ...state.players.slice(1),
          ],
        },
        {
          type: "PLAY_CARD",
          playerId: "p1",
          cardId: "treatment-contagion-1",
          target: {
            type: "contagion",
            transfers: [{ sourceOrganType: "heart", targetPlayerId: "p1", targetOrganType: "heart" }],
          },
        },
      ),
    ).toThrow(GameEngineError);
  });

  it("returns unchanged state when ending a finished game", () => {
    const state: GameState = {
      ...createTestGame([]),
      winnerId: "p1",
      activePlayerId: "p1",
      turnStage: "END",
    };

    const result = applyAction(state, { type: "END_TURN", playerId: "p1" });
    expect(result.state).toEqual(state);
    expect(result.events).toEqual([]);
  });

  it("validates createGame inputs and wrapper player mismatches", () => {
    expect(() =>
      createGame({
        playerIds: ["p1"],
        orderedDeck: deckFromTop([]),
      }),
    ).toThrow(GameEngineError);

    expect(() =>
      createGame({
        playerIds: ["p1", "p2"],
        orderedPlayerIds: ["p1", "p1"],
        orderedDeck: deckFromTop([]),
      }),
    ).toThrow(GameEngineError);

    expect(() =>
      createGame({
        playerIds: ["p1", "p2"],
        orderedDeck: deckFromTop([]).slice(0, 10),
      }),
    ).toThrow(GameEngineError);

    const base = createTestGame([]);
    expect(() =>
      applyAction(base, {
        type: "AUTO_MOVE",
        playerId: "p1",
        resolvedAction: {
          type: "DISCARD_CARDS",
          playerId: "p2",
          cardIds: [],
        },
      }),
    ).toThrow(GameEngineError);
  });

  it("lists treatment-specific valid plays and empty results on inactive or finished states", () => {
    const activeState: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "ACTION",
      pendingDraws: 0,
      winnerId: null,
      players: [
        {
          id: "p1",
          hand: [
            card("treatment-medical_error-1"),
            card("treatment-organ_thief-1"),
            card("treatment-transplant-1"),
            card("treatment-contagion-1"),
          ],
          organs: [
            {
              organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [card("virus-heart-1") as Extract<CardDefinition, { kind: "virus" }>],
            },
          ],
        },
        {
          id: "p2",
          hand: [],
          organs: [
            {
              organ: card("organ-brain-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
          ],
        },
        {
          id: "p3",
          hand: [],
          organs: [
            {
              organ: card("organ-heart-2") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
          ],
        },
      ],
    };

    const plays = listValidPlays(activeState, "p1");
    expect(plays.some((play) => play.target.type === "medical_error")).toBe(true);
    expect(plays.some((play) => play.target.type === "organ_thief")).toBe(true);
    expect(plays.some((play) => play.target.type === "transplant")).toBe(true);
    expect(plays.some((play) => play.target.type === "contagion")).toBe(true);

    expect(listValidPlays({ ...activeState, activePlayerId: "p2" }, "p1")).toEqual([]);
    expect(listValidPlays({ ...activeState, winnerId: "p1" }, "p1")).toEqual([]);
  });

  it("reports vaccinated organs", () => {
    expect(
      isVaccinated({
        organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
        medicines: [card("medicine-heart-1") as Extract<CardDefinition, { kind: "medicine" }>],
        viruses: [],
      }),
    ).toBe(true);
  });

  it("skips malformed non-treatment cards and immunized transplant targets when listing plays", () => {
    const state: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "ACTION",
      pendingDraws: 0,
      winnerId: null,
      players: [
        {
          id: "p1",
          hand: [
            { id: "unknown-card", kind: "unknown" } as unknown as CardDefinition,
            card("treatment-transplant-1"),
          ],
          organs: [
            {
              organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [
                card("medicine-heart-1") as Extract<CardDefinition, { kind: "medicine" }>,
                card("medicine-heart-2") as Extract<CardDefinition, { kind: "medicine" }>,
              ],
              viruses: [],
            },
          ],
        },
        {
          id: "p2",
          hand: [],
          organs: [
            {
              organ: card("organ-brain-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
          ],
        },
        {
          id: "p3",
          hand: [],
          organs: [
            {
              organ: card("organ-stomach-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [
                card("medicine-stomach-1") as Extract<CardDefinition, { kind: "medicine" }>,
                card("medicine-stomach-2") as Extract<CardDefinition, { kind: "medicine" }>,
              ],
              viruses: [],
            },
          ],
        },
      ],
    };

    const plays = listValidPlays(state, "p1");

    expect(plays.every((play) => play.cardId !== "unknown-card")).toBe(true);
    expect(
      plays.some(
        (play) =>
          play.target.type === "transplant" &&
          play.target.target.firstPlayerId === "p1" &&
          play.target.target.firstOrganType === "heart",
      ),
    ).toBe(false);
    expect(plays.some((play) => play.target.type === "transplant")).toBe(false);
  });

  it("covers remaining draw and transplant edge branches", () => {
    const drawState: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "DRAW",
      pendingDraws: 2,
      drawPile: [card("organ-bones-1"), card("organ-brain-1")],
      discardPile: [],
      players: [
        { id: "p1", hand: [], organs: [] },
        { id: "p2", hand: [], organs: [] },
        { id: "p3", hand: [], organs: [] },
      ],
    };

    const drawResult = applyAction(drawState, { type: "DRAW_CARD", playerId: "p1" });
    expect(drawResult.state.turnStage).toBe("DRAW");

    const sameTypeTransplantState: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "ACTION",
      pendingDraws: 0,
      winnerId: null,
      players: [
        {
          id: "p1",
          hand: [card("treatment-transplant-1"), card("organ-bones-1"), card("organ-stomach-1"), card("virus-heart-1")],
          organs: [
            {
              organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
            {
              organ: card("organ-bones-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
          ],
        },
        {
          id: "p2",
          hand: [],
          organs: [
            {
              organ: card("organ-heart-2") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
            {
              organ: card("organ-stomach-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
          ],
        },
        { id: "p3", hand: [], organs: [] },
      ],
    };

    const plays = listValidPlays(sameTypeTransplantState, "p1");
    expect(
      plays.some(
        (play) =>
          play.target.type === "transplant" &&
          play.target.target.firstPlayerId === "p1" &&
          play.target.target.firstOrganType === "heart" &&
          play.target.target.secondPlayerId === "p2" &&
          play.target.target.secondOrganType === "heart",
      ),
    ).toBe(true);
    expect(
      plays.some(
        (play) =>
          play.target.type === "transplant" &&
          play.target.target.firstPlayerId === "p1" &&
          play.target.target.firstOrganType === "heart" &&
          play.target.target.secondPlayerId === "p2" &&
          play.target.target.secondOrganType === "stomach",
      ),
    ).toBe(false);

    const replaceState: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "ACTION",
      pendingDraws: 0,
      winnerId: null,
      players: [
        {
          id: "p1",
          hand: [card("medicine-brain-1"), card("organ-stomach-1"), card("virus-heart-1"), card("medicine-heart-1")],
          organs: [
            {
              organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
            {
              organ: card("organ-brain-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [],
              viruses: [],
            },
          ],
        },
        { id: "p2", hand: [], organs: [] },
        { id: "p3", hand: [], organs: [] },
      ],
    };

    const replaceResult = applyAction(replaceState, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: "medicine-brain-1",
      target: { type: "medicine", target: { targetPlayerId: "p1", targetOrganType: "brain" } },
    });
    expect(player(replaceResult.state, "p1").organs[1]?.medicines).toHaveLength(1);

    const noPlayState: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "ACTION",
      pendingDraws: 0,
      winnerId: null,
      players: [
        {
          id: "p1",
          hand: [
            card("organ-heart-2"),
            card("medicine-bones-1"),
            card("virus-stomach-1"),
            card("treatment-transplant-1"),
          ],
          organs: [
            {
              organ: card("organ-heart-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [
                card("medicine-heart-1") as Extract<CardDefinition, { kind: "medicine" }>,
                card("medicine-heart-2") as Extract<CardDefinition, { kind: "medicine" }>,
              ],
              viruses: [],
            },
          ],
        },
        {
          id: "p2",
          hand: [],
          organs: [
            {
              organ: card("organ-brain-1") as Extract<CardDefinition, { kind: "organ" }>,
              medicines: [
                card("medicine-brain-1") as Extract<CardDefinition, { kind: "medicine" }>,
                card("medicine-brain-2") as Extract<CardDefinition, { kind: "medicine" }>,
              ],
              viruses: [],
            },
          ],
        },
        { id: "p3", hand: [], organs: [] },
      ],
    };

    expect(listValidPlays(noPlayState, "p1")).toEqual([]);

    const alreadyThreeCards: GameState = {
      ...createTestGame([]),
      activePlayerId: "p1",
      turnStage: "ACTION",
      pendingDraws: 0,
      winnerId: null,
      players: [
        {
          id: "p1",
          hand: [
            card("organ-stomach-1"),
            card("virus-heart-1"),
            card("medicine-heart-1"),
            card("organ-bones-1"),
          ],
          organs: [],
        },
        { id: "p2", hand: [], organs: [] },
        { id: "p3", hand: [], organs: [] },
      ],
    };

    const alreadyThreeResult = applyAction(alreadyThreeCards, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: "organ-stomach-1",
      target: { type: "organ" },
    });
    expect(alreadyThreeResult.state.turnStage).toBe("END");
  });
});
