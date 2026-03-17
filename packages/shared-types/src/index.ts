export type RoomVisibility = "public" | "private";

export type RoomPhase = "WAITING" | "STARTING" | "PLAYING" | "FINISHED";

export type ParticipantRole = "PLAYER" | "SPECTATOR" | "BOT";

export type PresenceStatus = "CONNECTED" | "DISCONNECTED";

export type RoomId = string;

export type MatchId = string;

export type PlayerId = string;

export type RoomJoinMethod = "code" | "invite" | "quick_join";

export type RoomPlayerView = {
  id: PlayerId;
  displayName: string;
  role: ParticipantRole;
  seatIndex: number | null;
  isReady: boolean;
  isConnected: boolean;
  handCount: number;
  organCount: number;
  organs: TableOrganView[];
};

export type TableOrganView = {
  id: string;
  title: string;
  icon: string;
  accentColor: "blue" | "yellow" | "red" | "green" | "wild";
  medicineCount: number;
  virusCount: number;
  isImmunized: boolean;
  isInfected: boolean;
};

export type ChatMessage = {
  id: string;
  roomId: RoomId;
  playerId: PlayerId;
  displayName: string;
  message: string;
  createdAtIso: string;
};

export type MatchProjection = {
  id: MatchId;
  startedAtIso: string;
  activePlayerId: PlayerId | null;
  turnStage: "ACTION" | "DRAW" | "END" | null;
  pendingDraws: number;
  winnerId: PlayerId | null;
  discardPileCount: number;
  playerHands: Record<PlayerId, number>;
  playerOrgans: Record<PlayerId, number>;
};

export type PlayerCardView = {
  id: string;
  kind: "organ" | "virus" | "medicine" | "treatment";
  title: string;
  subtitle: string;
  description: string;
  accentColor: "blue" | "yellow" | "red" | "green" | "wild" | "treatment";
  icon: string;
};

export type RoomLobbyEntry = {
  id: RoomId;
  code: string;
  visibility: RoomVisibility;
  phase: RoomPhase;
  playerCount: number;
  spectatorCount: number;
  hasActiveMatch: boolean;
  createdAtIso: string;
  updatedAtIso: string;
};

export type RoomProjection = {
  id: RoomId;
  code: string;
  visibility: RoomVisibility;
  phase: RoomPhase;
  hostPlayerId: PlayerId;
  viewerPlayerId: PlayerId | null;
  viewerReconnectToken: string | null;
  invitePath: string;
  hand: PlayerCardView[];
  players: RoomPlayerView[];
  spectators: RoomPlayerView[];
  match: MatchProjection | null;
  chat: ChatMessage[];
  reconnectDeadlineIso: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

export type CreateRoomInput = {
  displayName: string;
  visibility: RoomVisibility;
};

export type JoinRoomInput = {
  displayName: string;
  roomCode?: string;
  inviteToken?: string;
};

export type ReconnectRoomInput = {
  roomId: RoomId;
  reconnectToken: string;
};

export type QuickJoinInput = {
  displayName: string;
};

export type StartMatchInput = {
  roomId: RoomId;
  playerId: PlayerId;
};

export type SendChatInput = {
  roomId: RoomId;
  playerId: PlayerId;
  message: string;
};

export type PlayCardIntent = {
  type: "play_card";
  roomId: RoomId;
  playerId: PlayerId;
  cardId: string;
  target: unknown;
};

export type DiscardCardsIntent = {
  type: "discard_cards";
  roomId: RoomId;
  playerId: PlayerId;
  cardIds: string[];
};

export type DrawCardIntent = {
  type: "draw_card";
  roomId: RoomId;
  playerId: PlayerId;
};

export type EndTurnIntent = {
  type: "end_turn";
  roomId: RoomId;
  playerId: PlayerId;
};

export type RematchIntent = {
  type: "request_rematch";
  roomId: RoomId;
  playerId: PlayerId;
};

export type ClientGameIntent =
  | PlayCardIntent
  | DiscardCardsIntent
  | DrawCardIntent
  | EndTurnIntent
  | RematchIntent;

export type ServerEventEnvelope =
  | {
      type: "ROOM_STATE_UPDATE";
      payload: RoomProjection;
    }
  | {
      type: "ROOM_LIST_UPDATE";
      payload: RoomLobbyEntry[];
    }
  | {
      type: "ROOM_CHAT_MESSAGE";
      payload: ChatMessage;
    }
  | {
      type: "ROOM_ERROR";
      payload: {
        code: string;
        message: string;
      };
    };
