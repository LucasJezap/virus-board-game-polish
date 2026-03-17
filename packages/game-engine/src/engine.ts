import { BASE_DECK_BY_ID } from "./cards";
import { GameEngineError } from "./errors";
import type { CardDefinition } from "./cards";
import type {
  ContagionTransfer,
  CreateGameInput,
  DrawCardAction,
  DomainEvent,
  EndTurnAction,
  EngineResult,
  GameAction,
  GameState,
  OrganSlot,
  PlayCardAction,
  PlayCardTarget,
  PlayerId,
  PlayerState,
  ResolvedMoveAction,
  ValidPlay,
} from "./types";
import { canColorAffectTarget, isHealthyOrgan, isImmunized } from "./types";

function assert(condition: unknown, code: string, message: string): asserts condition {
  if (!condition) {
    throw new GameEngineError(code, message);
  }
}

function getPlayerIndex(state: GameState, playerId: PlayerId): number {
  const index = state.players.findIndex((player) => player.id === playerId);
  assert(index !== -1, "PLAYER_NOT_FOUND", `Unknown player ${playerId}`);
  return index;
}

function getPlayer(state: GameState, playerId: PlayerId): PlayerState {
  return state.players[getPlayerIndex(state, playerId)] as PlayerState;
}

function clonePlayers(players: readonly PlayerState[]): PlayerState[] {
  return players.map((player) => ({
    ...player,
    hand: [...player.hand],
    organs: player.organs.map((organ) => ({
      organ: organ.organ,
      medicines: [...organ.medicines],
      viruses: [...organ.viruses],
    })),
  }));
}

function findCardInHand(player: PlayerState, cardId: string) {
  const index = player.hand.findIndex((card) => card.id === cardId);
  assert(index !== -1, "CARD_NOT_IN_HAND", `Player ${player.id} does not hold card ${cardId}`);
  return {
    card: player.hand[index]!,
    handIndex: index,
  };
}

function removeCardFromHand(player: PlayerState, cardId: string) {
  const { card, handIndex } = findCardInHand(player, cardId);
  const nextHand = [...player.hand.slice(0, handIndex), ...player.hand.slice(handIndex + 1)];
  return {
    card,
    player: {
      ...player,
      hand: nextHand,
    },
  };
}

function replacePlayer(players: PlayerState[], player: PlayerState) {
  const index = players.findIndex((candidate) => candidate.id === player.id);
  assert(index !== -1, "PLAYER_NOT_FOUND", `Unknown player ${player.id}`);
  players[index] = player;
}

function findOrganSlotIndex(player: PlayerState, organType: OrganSlot["organ"]["organType"]): number {
  return player.organs.findIndex((organ) => organ.organ.organType === organType);
}

function getOrganSlot(player: PlayerState, organType: OrganSlot["organ"]["organType"]): OrganSlot {
  const index = findOrganSlotIndex(player, organType);
  assert(index !== -1, "ORGAN_NOT_FOUND", `Player ${player.id} does not have organ ${organType}`);
  return player.organs[index]!;
}

function replaceOrganSlot(player: PlayerState, organType: OrganSlot["organ"]["organType"], nextSlot: OrganSlot): PlayerState {
  const index = findOrganSlotIndex(player, organType);
  assert(index !== -1, "ORGAN_NOT_FOUND", `Player ${player.id} does not have organ ${organType}`);
  return {
    ...player,
    organs: player.organs.map((organ, candidateIndex) => (candidateIndex === index ? nextSlot : organ)),
  };
}

function removeOrganSlot(player: PlayerState, organType: OrganSlot["organ"]["organType"]): { player: PlayerState; removed: OrganSlot } {
  const index = findOrganSlotIndex(player, organType);
  assert(index !== -1, "ORGAN_NOT_FOUND", `Player ${player.id} does not have organ ${organType}`);
  return {
    removed: player.organs[index]!,
    player: {
      ...player,
      organs: [...player.organs.slice(0, index), ...player.organs.slice(index + 1)],
    },
  };
}

function countHealthyOrgans(player: PlayerState): number {
  return player.organs.filter(isHealthyOrgan).length;
}

function findWinner(state: GameState): PlayerId | null {
  const winner = state.players.find((player) => countHealthyOrgans(player) >= 4);
  return winner?.id ?? null;
}

function recycleDiscardIntoDraw(
  drawPile: GameState["drawPile"],
  discardPile: GameState["discardPile"],
) {
  if (drawPile.length > 0) {
    return { drawPile: [...drawPile], discardPile: [...discardPile] };
  }

  assert(discardPile.length > 0, "DECK_EMPTY", "Cannot draw: both draw and discard piles are empty");
  return {
    drawPile: [...discardPile],
    discardPile: [],
  };
}

function drawOne(state: GameState, playerId: PlayerId): GameState {
  const players = clonePlayers(state.players);
  const playerIndex = getPlayerIndex(state, playerId);
  const recycled = recycleDiscardIntoDraw(state.drawPile, state.discardPile);
  const card = recycled.drawPile[0]!;
  players[playerIndex] = {
    ...players[playerIndex]!,
    hand: [...players[playerIndex]!.hand, card],
  };

  return {
    ...state,
    players,
    drawPile: recycled.drawPile.slice(1),
    discardPile: recycled.discardPile,
    pendingDraws: Math.max(0, state.pendingDraws - 1),
  };
}

function getNextPlayerId(state: GameState, currentPlayerId: PlayerId): PlayerId {
  const currentIndex = getPlayerIndex(state, currentPlayerId);
  const nextIndex = (currentIndex + 1) % state.players.length;
  return state.players[nextIndex]!.id;
}

function createOrganSlot(organ: Extract<(typeof BASE_DECK_BY_ID extends ReadonlyMap<string, infer T> ? T : never), { kind: "organ" }>): OrganSlot {
  return {
    organ,
    medicines: [],
    viruses: [],
  };
}

function assertActionWindow(state: GameState, playerId: PlayerId, stage: GameState["turnStage"]) {
  assert(state.winnerId === null, "GAME_FINISHED", "Game is already finished");
  assert(state.activePlayerId === playerId, "NOT_ACTIVE_PLAYER", `It is not player ${playerId}'s turn`);
  assert(state.turnStage === stage, "INVALID_TURN_STAGE", `Expected stage ${stage}, got ${state.turnStage}`);
}

function discardCards(state: GameState, playerId: PlayerId, cardIds: readonly string[]): EngineResult {
  assertActionWindow(state, playerId, "ACTION");
  const players = clonePlayers(state.players);
  const player = players[getPlayerIndex(state, playerId)]!;
  const uniqueCardIds = new Set(cardIds);
  assert(uniqueCardIds.size === cardIds.length, "DUPLICATE_CARD", "Cannot discard the same card twice");
  let nextPlayer = player;
  const discardedCards = cardIds.map((cardId) => {
    const removed = removeCardFromHand(nextPlayer, cardId);
    nextPlayer = removed.player;
    return removed.card;
  });
  players[getPlayerIndex(state, playerId)] = {
    ...nextPlayer,
  };
  const pendingDraws = Math.max(0, 3 - nextPlayer.hand.length);
  return {
    state: {
      ...state,
      players,
      discardPile: [...state.discardPile, ...discardedCards],
      turnStage: pendingDraws === 0 ? "END" : "DRAW",
      pendingDraws,
      lastActionBy: playerId,
    },
    events: [{ type: "CARDS_DISCARDED", playerId, cardIds }],
  };
}

function validateOrganPlacement(player: PlayerState, cardId: string) {
  const card = BASE_DECK_BY_ID.get(cardId);
  assert(card?.kind === "organ", "INVALID_CARD_KIND", "Expected an organ card");
  assert(
    !player.organs.some((organ) => organ.organ.organType === card.organType),
    "DUPLICATE_ORGAN",
    `Player ${player.id} already has organ ${card.organType}`,
  );
}

function applyVirus(
  targetPlayer: PlayerState,
  target: Extract<PlayCardTarget, { type: "virus" }>["target"],
  cardId: string,
  discardPile: GameState["discardPile"],
): { targetPlayer: PlayerState; discardPile: GameState["discardPile"] } {
  const card = BASE_DECK_BY_ID.get(cardId);
  assert(card?.kind === "virus", "INVALID_CARD_KIND", "Expected virus card");
  const slot = getOrganSlot(targetPlayer, target.targetOrganType);
  assert(!isImmunized(slot), "IMMUNIZED_TARGET", "Cannot infect an immunized organ");
  assert(
    canColorAffectTarget(card.color, slot.organ.color),
    "COLOR_MISMATCH",
    "Virus color does not match the target organ",
  );

  if (slot.viruses.length === 1) {
    const removed = removeOrganSlot(targetPlayer, target.targetOrganType);
    return {
      targetPlayer: removed.player,
      discardPile: [...discardPile, removed.removed.organ, ...removed.removed.medicines, ...removed.removed.viruses, card],
    };
  }

  if (slot.medicines.length === 1) {
    return {
      targetPlayer: replaceOrganSlot(targetPlayer, target.targetOrganType, {
        ...slot,
        medicines: [],
      }),
      discardPile: [...discardPile, slot.medicines[0]!, card],
    };
  }

  assert(slot.medicines.length === 0, "IMMUNIZED_TARGET", "Cannot affect an immunized organ");
  return {
    targetPlayer: replaceOrganSlot(targetPlayer, target.targetOrganType, {
      ...slot,
      viruses: [card],
    }),
    discardPile: [...discardPile],
  };
}

function applyMedicine(
  actor: PlayerState,
  target: Extract<PlayCardTarget, { type: "medicine" }>["target"],
  cardId: string,
  discardPile: GameState["discardPile"],
): { actor: PlayerState; discardPile: GameState["discardPile"] } {
  const card = BASE_DECK_BY_ID.get(cardId);
  assert(card?.kind === "medicine", "INVALID_CARD_KIND", "Expected medicine card");
  assert(actor.id === target.targetPlayerId, "MEDICINE_TARGET", "Medicine can only be played on your own organs");
  const slot = getOrganSlot(actor, target.targetOrganType);
  assert(!isImmunized(slot), "IMMUNIZED_TARGET", "Cannot affect an immunized organ");
  assert(
    canColorAffectTarget(card.color, slot.organ.color),
    "COLOR_MISMATCH",
    "Medicine color does not match the target organ",
  );

  if (slot.viruses.length === 1) {
    return {
      actor: replaceOrganSlot(actor, target.targetOrganType, {
        ...slot,
        viruses: [],
      }),
      discardPile: [...discardPile, slot.viruses[0]!, card],
    };
  }

  assert(slot.medicines.length < 2, "IMMUNIZED_TARGET", "Organ is already fully protected");
  return {
    actor: replaceOrganSlot(actor, target.targetOrganType, {
      ...slot,
      medicines: [...slot.medicines, card],
    }),
    discardPile: [...discardPile],
  };
}

function assertPlayerCanAcceptOrgan(player: PlayerState, organType: OrganSlot["organ"]["organType"]) {
  assert(
    !player.organs.some((organ) => organ.organ.organType === organType),
    "DUPLICATE_ORGAN",
    `Player ${player.id} cannot hold a second ${organType} organ`,
  );
}

function getPlayerFromPlayers(players: readonly PlayerState[], playerId: PlayerId): PlayerState {
  const player = players.find((candidate) => candidate.id === playerId);
  assert(player, "PLAYER_NOT_FOUND", `Unknown player ${playerId}`);
  return player;
}

function applyTransplant(players: PlayerState[], target: Extract<PlayCardTarget, { type: "transplant" }>["target"]) {
  assert(target.firstPlayerId !== target.secondPlayerId, "TRANSPLANT_TARGET", "Transplant requires two distinct players");
  const first = getPlayerFromPlayers(players, target.firstPlayerId);
  const second = getPlayerFromPlayers(players, target.secondPlayerId);
  const firstSlot = getOrganSlot(first, target.firstOrganType);
  const secondSlot = getOrganSlot(second, target.secondOrganType);
  assert(!isImmunized(firstSlot) && !isImmunized(secondSlot), "IMMUNIZED_TARGET", "Cannot transplant immunized organs");

  if (firstSlot.organ.organType !== secondSlot.organ.organType) {
    assert(
      !first.organs.some(
        (candidate) => candidate.organ.organType === secondSlot.organ.organType && candidate.organ.organType !== firstSlot.organ.organType,
      ),
      "DUPLICATE_ORGAN",
      `Player ${first.id} cannot receive duplicate organ ${secondSlot.organ.organType}`,
    );
    assert(
      !second.organs.some(
        (candidate) => candidate.organ.organType === firstSlot.organ.organType && candidate.organ.organType !== secondSlot.organ.organType,
      ),
      "DUPLICATE_ORGAN",
      `Player ${second.id} cannot receive duplicate organ ${firstSlot.organ.organType}`,
    );
  }

  replacePlayer(players, replaceOrganSlot(first, target.firstOrganType, secondSlot));
  replacePlayer(players, replaceOrganSlot(second, target.secondOrganType, firstSlot));
}

function applyOrganThief(players: PlayerState[], actorId: PlayerId, target: Extract<PlayCardTarget, { type: "organ_thief" }>["target"]) {
  assert(actorId !== target.targetPlayerId, "ORGAN_THIEF_TARGET", "Cannot steal from yourself");
  const actor = getPlayerFromPlayers(players, actorId);
  const source = getPlayerFromPlayers(players, target.targetPlayerId);
  const slot = getOrganSlot(source, target.targetOrganType);
  assert(!isImmunized(slot), "IMMUNIZED_TARGET", "Cannot steal an immunized organ");
  assertPlayerCanAcceptOrgan(actor, slot.organ.organType);

  const removed = removeOrganSlot(source, target.targetOrganType);
  replacePlayer(players, removed.player);
  replacePlayer(players, {
    ...actor,
    organs: [...actor.organs, removed.removed],
  });
}

function applyContagion(players: PlayerState[], actorId: PlayerId, transfers: readonly ContagionTransfer[]) {
  const seenSources = new Set<string>();
  for (const transfer of transfers) {
    const actor = getPlayerFromPlayers(players, actorId);
    const targetPlayer = getPlayerFromPlayers(players, transfer.targetPlayerId);
    assert(actorId !== transfer.targetPlayerId, "CONTAGION_TARGET", "Contagion must target another player");
    const sourceKey = `${transfer.sourceOrganType}`;
    assert(!seenSources.has(sourceKey), "CONTAGION_DUPLICATE_SOURCE", "Each infected organ can only transfer once");
    seenSources.add(sourceKey);

    const sourceSlot = getOrganSlot(actor, transfer.sourceOrganType);
    const targetSlot = getOrganSlot(targetPlayer, transfer.targetOrganType);
    assert(sourceSlot.viruses.length === 1, "CONTAGION_SOURCE", "Source organ must be infected");
    assert(targetSlot.viruses.length === 0, "CONTAGION_TARGET", "Target organ must be virus-free");
    assert(targetSlot.medicines.length === 0, "CONTAGION_TARGET", "Target organ must be free of medicine");
    assert(
      canColorAffectTarget(sourceSlot.viruses[0]!.color, targetSlot.organ.color),
      "COLOR_MISMATCH",
      "Transferred virus cannot affect the target organ",
    );

    replacePlayer(players, replaceOrganSlot(actor, transfer.sourceOrganType, { ...sourceSlot, viruses: [] }));
    replacePlayer(players, replaceOrganSlot(targetPlayer, transfer.targetOrganType, { ...targetSlot, viruses: [sourceSlot.viruses[0]!] }));
  }
}

function applyLatexGlove(players: PlayerState[], actorId: PlayerId, discardPile: GameState["discardPile"]) {
  let nextDiscardPile = [...discardPile];
  for (const player of players) {
    if (player.id === actorId) {
      continue;
    }
    nextDiscardPile = [...nextDiscardPile, ...player.hand];
    replacePlayer(players, {
      ...player,
      hand: [],
    });
  }
  return nextDiscardPile;
}

function applyMedicalError(players: PlayerState[], actorId: PlayerId, targetPlayerId: PlayerId) {
  assert(actorId !== targetPlayerId, "MEDICAL_ERROR_TARGET", "Medical error requires another player");
  const actor = getPlayerFromPlayers(players, actorId);
  const target = getPlayerFromPlayers(players, targetPlayerId);

  const actorOrgans = actor.organs.map((organ) => ({
    organ: organ.organ,
    medicines: [...organ.medicines],
    viruses: [...organ.viruses],
  }));
  const targetOrgans = target.organs.map((organ) => ({
    organ: organ.organ,
    medicines: [...organ.medicines],
    viruses: [...organ.viruses],
  }));
  replacePlayer(players, { ...actor, organs: targetOrgans });
  replacePlayer(players, { ...target, organs: actorOrgans });
}

function buildPrimaryActionResult(
  state: GameState,
  players: PlayerState[],
  discardPile: GameState["discardPile"],
  playerId: PlayerId,
  actionCardId: string,
): EngineResult {
  const pendingDraws = Math.max(0, 3 - getPlayerFromPlayers(players, playerId).hand.length);
  const interimState: GameState = {
    ...state,
    players,
    discardPile,
    turnStage: pendingDraws === 0 ? "END" : "DRAW",
    pendingDraws,
    lastActionBy: playerId,
  };
  const winnerId = findWinner(interimState);
  const nextState = winnerId
    ? {
        ...interimState,
        winnerId,
        turnStage: "END" as const,
        pendingDraws: 0,
      }
    : interimState;
  const events: DomainEvent[] = [{ type: "CARD_PLAYED", playerId, cardId: actionCardId }];
  if (winnerId) {
    events.push({ type: "WINNER_DECLARED", playerId: winnerId });
  }
  return { state: nextState, events };
}

function applyPlayCard(state: GameState, action: PlayCardAction): EngineResult {
  assertActionWindow(state, action.playerId, "ACTION");
  const players = clonePlayers(state.players);
  let discardPile: GameState["discardPile"] = [...state.discardPile];
  const playerIndex = getPlayerIndex(state, action.playerId);
  const removed = removeCardFromHand(players[playerIndex]!, action.cardId);
  let actor: PlayerState = { ...removed.player };
  players[playerIndex] = actor;

  switch (action.target.type) {
    case "organ": {
      validateOrganPlacement(actor, action.cardId);
      const card = BASE_DECK_BY_ID.get(action.cardId);
      assert(card?.kind === "organ", "INVALID_CARD_KIND", "Expected an organ card");
      actor = {
        ...actor,
        organs: [...actor.organs, createOrganSlot(card)],
      };
      replacePlayer(players, actor);
      break;
    }
    case "virus": {
      const targetPlayer = getPlayerFromPlayers(players, action.target.target.targetPlayerId);
      const result = applyVirus(targetPlayer, action.target.target, action.cardId, discardPile);
      discardPile = result.discardPile;
      replacePlayer(players, result.targetPlayer);
      break;
    }
    case "medicine": {
      const result = applyMedicine(actor, action.target.target, action.cardId, discardPile);
      actor = result.actor;
      discardPile = result.discardPile;
      replacePlayer(players, actor);
      break;
    }
    case "transplant":
      discardPile = [...discardPile, BASE_DECK_BY_ID.get(action.cardId)!];
      applyTransplant(players, action.target.target);
      break;
    case "organ_thief":
      discardPile = [...discardPile, BASE_DECK_BY_ID.get(action.cardId)!];
      applyOrganThief(players, action.playerId, action.target.target);
      break;
    case "contagion":
      discardPile = [...discardPile, BASE_DECK_BY_ID.get(action.cardId)!];
      applyContagion(players, action.playerId, action.target.transfers);
      break;
    case "latex_glove":
      discardPile = [...discardPile, BASE_DECK_BY_ID.get(action.cardId)!];
      discardPile = applyLatexGlove(players, action.playerId, discardPile);
      break;
    case "medical_error":
      discardPile = [...discardPile, BASE_DECK_BY_ID.get(action.cardId)!];
      applyMedicalError(players, action.playerId, action.target.targetPlayerId);
      break;
  }

  return buildPrimaryActionResult(state, players, discardPile, action.playerId, action.cardId);
}

function applyDrawCard(state: GameState, action: DrawCardAction): EngineResult {
  assertActionWindow(state, action.playerId, "DRAW");
  assert(state.pendingDraws > 0, "NO_PENDING_DRAWS", "There are no pending draws");
  const nextState = drawOne(state, action.playerId);
  const currentPlayer = getPlayer(nextState, action.playerId);
  return {
    state: {
      ...nextState,
      turnStage: nextState.pendingDraws === 0 ? "END" : "DRAW",
    },
    events: [{ type: "CARD_DRAWN", playerId: action.playerId, cardId: currentPlayer.hand.at(-1)!.id }],
  };
}

function applyEndTurn(state: GameState, action: EndTurnAction): EngineResult {
  if (state.winnerId !== null) {
    return {
      state,
      events: [],
    };
  }

  assertActionWindow(state, action.playerId, "END");
  const nextPlayerId = getNextPlayerId(state, action.playerId);

  return {
    state: {
      ...state,
      players: clonePlayers(state.players),
      activePlayerId: nextPlayerId,
      turnStage: "ACTION",
      pendingDraws: 0,
      turnNumber: state.turnNumber + 1,
      lastActionBy: action.playerId,
    },
    events: [{ type: "TURN_ENDED", playerId: action.playerId, nextPlayerId }],
  };
}

function applyResolvedMove(state: GameState, action: ResolvedMoveAction): EngineResult {
  return action.type === "PLAY_CARD" ? applyPlayCard(state, action) : discardCards(state, action.playerId, action.cardIds);
}

export function createGame(input: CreateGameInput): GameState {
  assert(input.playerIds.length >= 2 && input.playerIds.length <= 6, "INVALID_PLAYER_COUNT", "Virus supports 2 to 6 players");
  const orderedPlayerIds = input.orderedPlayerIds ?? input.playerIds;
  assert(
    orderedPlayerIds.length === input.playerIds.length &&
      new Set(orderedPlayerIds).size === input.playerIds.length &&
      orderedPlayerIds.every((playerId) => input.playerIds.includes(playerId)),
    "INVALID_PLAYER_ORDER",
    "Ordered player ids must be a permutation of player ids",
  );
  assert(input.orderedDeck.length === BASE_DECK_BY_ID.size, "INVALID_DECK_SIZE", "Ordered deck must contain the entire base deck");
  const deckIds = input.orderedDeck.map((card) => card.id);
  assert(new Set(deckIds).size === deckIds.length, "INVALID_DECK", "Deck contains duplicate card ids");
  assert(deckIds.every((id) => BASE_DECK_BY_ID.has(id)), "INVALID_DECK", "Deck contains unknown card ids");

  let drawPile: CardDefinition[] = [...input.orderedDeck];
  const players: PlayerState[] = orderedPlayerIds.map((id) => ({
    id,
    hand: [] as CardDefinition[],
    organs: [],
  }));

  for (let round = 0; round < 3; round += 1) {
    for (const player of players) {
      const card = drawPile[0]!;
      drawPile = drawPile.slice(1);
      player.hand = [...player.hand, card];
    }
  }

  return {
    players,
    drawPile,
    discardPile: [],
    activePlayerId: orderedPlayerIds[0]!,
    turnStage: "ACTION",
    pendingDraws: 0,
    winnerId: null,
    turnNumber: 1,
    lastActionBy: null,
  };
}

export function applyAction(state: GameState, action: GameAction): EngineResult {
  switch (action.type) {
    case "PLAY_CARD":
      return applyPlayCard(state, action);
    case "DISCARD_CARDS":
      return discardCards(state, action.playerId, action.cardIds);
    case "DRAW_CARD":
      return applyDrawCard(state, action);
    case "END_TURN":
      return applyEndTurn(state, action);
    case "AUTO_MOVE":
    case "BOT_MOVE":
      assert(action.playerId === action.resolvedAction.playerId, "PLAYER_MISMATCH", "Resolved move player mismatch");
      return applyResolvedMove(state, action.resolvedAction);
  }
}

export function listValidPlays(state: GameState, playerId: PlayerId): readonly ValidPlay[] {
  if (state.winnerId !== null || state.activePlayerId !== playerId || state.turnStage !== "ACTION") {
    return [];
  }

  const player = getPlayer(state, playerId);
  const plays: ValidPlay[] = [];

  for (const card of player.hand) {
    if (card.kind === "organ") {
      if (!player.organs.some((organ) => organ.organ.organType === card.organType)) {
        plays.push({ cardId: card.id, target: { type: "organ" } });
      }
      continue;
    }

    if (card.kind === "medicine") {
      for (const organ of player.organs) {
        if (!isImmunized(organ) && canColorAffectTarget(card.color, organ.organ.color)) {
          plays.push({
            cardId: card.id,
            target: {
              type: "medicine",
              target: { targetPlayerId: playerId, targetOrganType: organ.organ.organType },
            },
          });
        }
      }
      continue;
    }

    if (card.kind === "virus") {
      for (const targetPlayer of state.players) {
        for (const organ of targetPlayer.organs) {
          if (!isImmunized(organ) && canColorAffectTarget(card.color, organ.organ.color)) {
            plays.push({
              cardId: card.id,
              target: {
                type: "virus",
                target: { targetPlayerId: targetPlayer.id, targetOrganType: organ.organ.organType },
              },
            });
          }
        }
      }
      continue;
    }

    if (card.kind !== "treatment") {
      continue;
    }

    switch (card.treatmentType) {
      case "latex_glove":
        plays.push({ cardId: card.id, target: { type: "latex_glove" } });
        break;
      case "medical_error":
        for (const targetPlayer of state.players) {
          if (targetPlayer.id !== playerId) {
            plays.push({ cardId: card.id, target: { type: "medical_error", targetPlayerId: targetPlayer.id } });
          }
        }
        break;
      case "organ_thief":
        for (const targetPlayer of state.players) {
          if (targetPlayer.id === playerId) {
            continue;
          }
          for (const organ of targetPlayer.organs) {
            if (!isImmunized(organ) && !player.organs.some((candidate) => candidate.organ.organType === organ.organ.organType)) {
              plays.push({
                cardId: card.id,
                target: {
                  type: "organ_thief",
                  target: { targetPlayerId: targetPlayer.id, targetOrganType: organ.organ.organType },
                },
              });
            }
          }
        }
        break;
      case "transplant":
        for (const firstPlayer of state.players) {
          for (const secondPlayer of state.players) {
            if (firstPlayer.id === secondPlayer.id) {
              continue;
            }
            for (const firstOrgan of firstPlayer.organs) {
              for (const secondOrgan of secondPlayer.organs) {
                if (isImmunized(firstOrgan) || isImmunized(secondOrgan)) {
                  continue;
                }
                const firstDuplicate =
                  firstOrgan.organ.organType !== secondOrgan.organ.organType &&
                  firstPlayer.organs.some((candidate) => candidate.organ.organType === secondOrgan.organ.organType);
                const secondDuplicate =
                  firstOrgan.organ.organType !== secondOrgan.organ.organType &&
                  secondPlayer.organs.some((candidate) => candidate.organ.organType === firstOrgan.organ.organType);
                if (!firstDuplicate && !secondDuplicate) {
                  plays.push({
                    cardId: card.id,
                    target: {
                      type: "transplant",
                      target: {
                        firstPlayerId: firstPlayer.id,
                        firstOrganType: firstOrgan.organ.organType,
                        secondPlayerId: secondPlayer.id,
                        secondOrganType: secondOrgan.organ.organType,
                      },
                    },
                  });
                }
              }
            }
          }
        }
        break;
      case "contagion": {
        const transfers = player.organs
          .filter((organ) => organ.viruses.length === 1)
          .flatMap((sourceOrgan) =>
            state.players
              .filter((candidate) => candidate.id !== playerId)
              .flatMap((targetPlayer) =>
                targetPlayer.organs
                  .filter(
                    (targetOrgan) =>
                      targetOrgan.viruses.length === 0 &&
                      targetOrgan.medicines.length === 0 &&
                      canColorAffectTarget(sourceOrgan.viruses[0]!.color, targetOrgan.organ.color),
                  )
                  .map((targetOrgan) => ({
                    sourceOrganType: sourceOrgan.organ.organType,
                    targetPlayerId: targetPlayer.id,
                    targetOrganType: targetOrgan.organ.organType,
                  })),
              ),
          );
        if (transfers.length > 0) {
          plays.push({ cardId: card.id, target: { type: "contagion", transfers } });
        }
        break;
      }
    }
  }

  return plays;
}
