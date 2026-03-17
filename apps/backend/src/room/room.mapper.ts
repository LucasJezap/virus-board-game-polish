import type { CardDefinition } from "@wirus/game-engine";
import type { MatchProjection, PlayerCardView, RoomPlayerView, RoomProjection, TableOrganView } from "@wirus/shared-types";

import type { MatchAggregate, PlayerSession, RoomAggregate } from "../backend.types";

const organLabels = {
  brain: "Mozg",
  bones: "Kosci",
  heart: "Serce",
  stomach: "Zoladek",
  wild: "Organ joker",
} as const;

const colorLabels = {
  blue: "Niebieski",
  yellow: "Zolty",
  red: "Czerwony",
  green: "Zielony",
  wild: "Wielokolorowy",
} as const;

const treatmentLabels = {
  transplant: {
    title: "Przeszczep",
    description: "Zamienia miejscami dwa nieuodpornione organy nalezace do roznych graczy.",
    icon: "⇄",
  },
  organ_thief: {
    title: "Zlodziej organow",
    description: "Kradnie wybrany nieuodporniony organ przeciwnika i doklada go do Twojego ciala.",
    icon: "🫀",
  },
  contagion: {
    title: "Zarazenie",
    description: "Przenosi wirusy z jednego organu na inne zgodne cele.",
    icon: "☣",
  },
  latex_glove: {
    title: "Lateksowa rekawiczka",
    description: "Czyści stol i zmusza wszystkich do odrzucenia kart z reki.",
    icon: "🧤",
  },
  medical_error: {
    title: "Blad medyczny",
    description: "Miesza organy i dodatki pomiedzy Tobą a wybranym przeciwnikiem.",
    icon: "⚕",
  },
} as const;

function toCardView(card: CardDefinition): PlayerCardView {
  switch (card.kind) {
    case "organ":
      return {
        id: card.id,
        kind: card.kind,
        title: organLabels[card.organType],
        subtitle: `Organ · ${colorLabels[card.color]}`,
        description: card.organType === "wild"
          ? "Joker, ktory moze zastapic dowolny brakujacy organ."
          : `Doklada do ciala organ typu ${organLabels[card.organType].toLowerCase()}.`,
        accentColor: card.color,
        icon: card.organType === "brain" ? "🧠" : card.organType === "bones" ? "🦴" : card.organType === "heart" ? "🫀" : card.organType === "stomach" ? "🫃" : "✳",
      };
    case "virus":
      return {
        id: card.id,
        kind: card.kind,
        title: "Wirus",
        subtitle: colorLabels[card.color],
        description: card.color === "wild"
          ? "Atakuje dowolny organ lub lekarstwo."
          : `Zaraza zgodna z kolorem ${colorLabels[card.color].toLowerCase()}.`,
        accentColor: card.color,
        icon: "☣",
      };
    case "medicine":
      return {
        id: card.id,
        kind: card.kind,
        title: "Lek",
        subtitle: colorLabels[card.color],
        description: card.color === "wild"
          ? "Leczy lub wzmacnia dowolny organ."
          : `Leczy wirusa albo wzmacnia organ w kolorze ${colorLabels[card.color].toLowerCase()}.`,
        accentColor: card.color,
        icon: "💊",
      };
    case "treatment": {
      const treatment = treatmentLabels[card.treatmentType];
      return {
        id: card.id,
        kind: card.kind,
        title: treatment.title,
        subtitle: "Leczenie specjalne",
        description: treatment.description,
        accentColor: "treatment",
        icon: treatment.icon,
      };
    }
  }
}

function toPlayerView(player: RoomAggregate["players"][number]): RoomPlayerView {
  return {
    id: player.playerId,
    displayName: player.displayName,
    role: player.role,
    seatIndex: player.seatIndex,
    isReady: false,
    isConnected: player.presence === "CONNECTED",
    handCount: 0,
    organCount: 0,
    organs: [],
  };
}

function organIcon(organType: keyof typeof organLabels): string {
  if (organType === "brain") {
    return "🧠";
  }
  if (organType === "bones") {
    return "🦴";
  }
  if (organType === "heart") {
    return "🫀";
  }
  if (organType === "stomach") {
    return "🫃";
  }
  return "✳";
}

function toTableOrganView(slot: MatchAggregate["state"]["players"][number]["organs"][number]): TableOrganView {
  return {
    id: slot.organ.id,
    title: organLabels[slot.organ.organType],
    icon: organIcon(slot.organ.organType),
    accentColor: slot.organ.color,
    medicineCount: slot.medicines.length,
    virusCount: slot.viruses.length,
    isImmunized: slot.medicines.length >= 2,
    isInfected: slot.viruses.length > 0,
  };
}

function toMatchProjection(match: MatchAggregate): MatchProjection {
  return {
    id: match.id,
    startedAtIso: match.startedAtIso,
    activePlayerId: match.state.activePlayerId,
    turnStage: match.state.turnStage,
    pendingDraws: match.state.pendingDraws,
    winnerId: match.state.winnerId,
    discardPileCount: match.state.discardPile.length,
    playerHands: Object.fromEntries(match.state.players.map((player) => [player.id, player.hand.length])),
    playerOrgans: Object.fromEntries(match.state.players.map((player) => [player.id, player.organs.length])),
  };
}

export function toRoomProjection(room: RoomAggregate, viewer: PlayerSession | null = null): RoomProjection {
  const viewerMatchPlayer =
    viewer && viewer.role === "PLAYER"
      ? room.match?.state.players.find((candidate) => candidate.id === viewer.playerId) ?? null
      : null;

  return {
    id: room.id,
    code: room.code,
    visibility: room.visibility,
    phase: room.phase,
    hostPlayerId: room.hostPlayerId,
    viewerPlayerId: viewer?.playerId ?? null,
    viewerReconnectToken: viewer?.reconnectToken ?? null,
    invitePath: `/invite/${room.inviteToken}`,
    hand: viewerMatchPlayer ? viewerMatchPlayer.hand.map(toCardView) : [],
    players: room.players.map((player) => {
      const base = toPlayerView(player);
      const matchPlayer = room.match?.state.players.find((candidate) => candidate.id === player.playerId);
      return {
        ...base,
        handCount: matchPlayer?.hand.length ?? 0,
        organCount: matchPlayer?.organs.length ?? 0,
        organs: matchPlayer?.organs.map(toTableOrganView) ?? [],
      };
    }),
    spectators: room.spectators.map(toPlayerView),
    match: room.match ? toMatchProjection(room.match) : null,
    chat: room.chat,
    reconnectDeadlineIso: room.reconnectDeadlineIso,
    createdAtIso: room.createdAtIso,
    updatedAtIso: room.updatedAtIso,
  };
}
