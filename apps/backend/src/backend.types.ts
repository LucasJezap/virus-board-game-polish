import type { GameState } from "@wirus/game-engine";
import type {
  ChatMessage,
  MatchId,
  ParticipantRole,
  PlayerId,
  PresenceStatus,
  RoomId,
  RoomPhase,
  RoomVisibility,
} from "@wirus/shared-types";

export type PlayerSession = {
  playerId: PlayerId;
  sessionId: string;
  socketId: string | null;
  displayName: string;
  role: ParticipantRole;
  presence: PresenceStatus;
  roomId: RoomId;
  seatIndex: number | null;
  reconnectToken: string;
  botControlled: boolean;
  joinedAtIso: string;
  updatedAtIso: string;
};

export type RematchVoteMap = Record<PlayerId, boolean>;

export type MatchAggregate = {
  id: MatchId;
  startedAtIso: string;
  state: GameState;
  turnDeadlineIso: string | null;
  actionLog: Array<{
    type: string;
    playerId: PlayerId;
    createdAtIso: string;
  }>;
};

export type RoomAggregate = {
  id: RoomId;
  code: string;
  visibility: RoomVisibility;
  phase: RoomPhase;
  hostPlayerId: PlayerId;
  inviteToken: string;
  players: PlayerSession[];
  spectators: PlayerSession[];
  match: MatchAggregate | null;
  rematchVotes: RematchVoteMap;
  reconnectDeadlineIso: string | null;
  chat: ChatMessage[];
  version: number;
  createdAtIso: string;
  updatedAtIso: string;
};
