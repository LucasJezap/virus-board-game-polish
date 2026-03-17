import type { CardColor, CardDefinition, OrganType, TreatmentType } from "./cards";

export type PlayerId = string;

export type TurnStage = "ACTION" | "DRAW" | "END";

export type AttachmentCard = Extract<CardDefinition, { kind: "virus" | "medicine" }>;

export type OrganSlot = {
  organ: Extract<CardDefinition, { kind: "organ" }>;
  medicines: readonly AttachmentCard[];
  viruses: readonly AttachmentCard[];
};

export type PlayerState = {
  id: PlayerId;
  hand: readonly CardDefinition[];
  organs: readonly OrganSlot[];
};

export type DomainEvent =
  | { type: "GAME_STARTED"; playerOrder: readonly PlayerId[] }
  | { type: "CARD_PLAYED"; playerId: PlayerId; cardId: string }
  | { type: "CARDS_DISCARDED"; playerId: PlayerId; cardIds: readonly string[] }
  | { type: "CARD_DRAWN"; playerId: PlayerId; cardId: string }
  | { type: "TURN_ENDED"; playerId: PlayerId; nextPlayerId: PlayerId }
  | { type: "PLAYER_SKIPPED"; playerId: PlayerId }
  | { type: "WINNER_DECLARED"; playerId: PlayerId };

export type GameState = {
  readonly players: readonly PlayerState[];
  readonly drawPile: readonly CardDefinition[];
  readonly discardPile: readonly CardDefinition[];
  readonly activePlayerId: PlayerId;
  readonly turnStage: TurnStage;
  readonly pendingDraws: number;
  readonly winnerId: PlayerId | null;
  readonly turnNumber: number;
  readonly lastActionBy: PlayerId | null;
};

export type CreateGameInput = {
  readonly playerIds: readonly PlayerId[];
  readonly orderedDeck: readonly CardDefinition[];
  readonly orderedPlayerIds?: readonly PlayerId[];
};

export type OrganTarget = {
  targetPlayerId: PlayerId;
  targetOrganType: OrganType;
};

export type VirusOrMedicineTarget = OrganTarget;

export type TransplantTarget = {
  firstPlayerId: PlayerId;
  firstOrganType: OrganType;
  secondPlayerId: PlayerId;
  secondOrganType: OrganType;
};

export type OrganThiefTarget = OrganTarget;

export type ContagionTransfer = {
  sourceOrganType: OrganType;
  targetPlayerId: PlayerId;
  targetOrganType: OrganType;
};

export type PlayCardTarget =
  | {
      type: "organ";
    }
  | {
      type: "virus";
      target: VirusOrMedicineTarget;
    }
  | {
      type: "medicine";
      target: VirusOrMedicineTarget;
    }
  | {
      type: "transplant";
      target: TransplantTarget;
    }
  | {
      type: "organ_thief";
      target: OrganThiefTarget;
    }
  | {
      type: "contagion";
      transfers: readonly ContagionTransfer[];
    }
  | {
      type: "latex_glove";
    }
  | {
      type: "medical_error";
      targetPlayerId: PlayerId;
    };

export type PlayCardAction = {
  type: "PLAY_CARD";
  playerId: PlayerId;
  cardId: string;
  target: PlayCardTarget;
};

export type DiscardCardsAction = {
  type: "DISCARD_CARDS";
  playerId: PlayerId;
  cardIds: readonly string[];
};

export type DrawCardAction = {
  type: "DRAW_CARD";
  playerId: PlayerId;
};

export type EndTurnAction = {
  type: "END_TURN";
  playerId: PlayerId;
};

export type ResolvedMoveAction = PlayCardAction | DiscardCardsAction;

export type AutoMoveAction = {
  type: "AUTO_MOVE";
  playerId: PlayerId;
  resolvedAction: ResolvedMoveAction;
};

export type BotMoveAction = {
  type: "BOT_MOVE";
  playerId: PlayerId;
  resolvedAction: ResolvedMoveAction;
};

export type GameAction =
  | PlayCardAction
  | DiscardCardsAction
  | DrawCardAction
  | EndTurnAction
  | AutoMoveAction
  | BotMoveAction;

export type EngineResult = {
  state: GameState;
  events: readonly DomainEvent[];
};

export type ValidPlay =
  | { cardId: string; target: PlayCardTarget };

export type DeterministicContext = {
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
};

export function isHealthyOrgan(slot: OrganSlot): boolean {
  return slot.viruses.length === 0;
}

export function isImmunized(slot: OrganSlot): boolean {
  return slot.medicines.length >= 2;
}

export function isVaccinated(slot: OrganSlot): boolean {
  return slot.medicines.length === 1;
}

export function canColorAffectTarget(color: CardColor, targetColor: CardColor): boolean {
  return color === "wild" || targetColor === "wild" || color === targetColor;
}
