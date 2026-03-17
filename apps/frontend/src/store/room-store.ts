"use client";

import type { ChatMessage, ClientGameIntent, RoomLobbyEntry, RoomProjection } from "@wirus/shared-types";
import { create } from "zustand";

type UiState = {
  selectedCardId: string | null;
  selectedTargetPlayerId: string | null;
};

type RoomStore = {
  room: RoomProjection | null;
  lobbyRooms: RoomLobbyEntry[];
  isConnected: boolean;
  isLoading: boolean;
  errorMessage: string | null;
  pendingIntent: ClientGameIntent | null;
  ui: UiState;
  setRoom: (room: RoomProjection | null) => void;
  setLobbyRooms: (rooms: RoomLobbyEntry[]) => void;
  setConnected: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setError: (message: string | null) => void;
  appendChat: (message: ChatMessage) => void;
  setPendingIntent: (intent: ClientGameIntent | null) => void;
  selectCard: (cardId: string | null) => void;
  selectTargetPlayer: (playerId: string | null) => void;
};

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  lobbyRooms: [],
  isConnected: false,
  isLoading: false,
  errorMessage: null,
  pendingIntent: null,
  ui: {
    selectedCardId: null,
    selectedTargetPlayerId: null,
  },
  setRoom: (room) => set({ room }),
  setLobbyRooms: (lobbyRooms) => set({ lobbyRooms }),
  setConnected: (isConnected) => set({ isConnected }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (errorMessage) => set({ errorMessage }),
  appendChat: (message) =>
    set((state) => ({
      room: state.room
        ? {
            ...state.room,
            chat: [...state.room.chat, message],
          }
        : state.room,
    })),
  setPendingIntent: (pendingIntent) => set({ pendingIntent }),
  selectCard: (cardId) =>
    set((state) => ({
      ui: {
        ...state.ui,
        selectedCardId: cardId,
      },
    })),
  selectTargetPlayer: (playerId) =>
    set((state) => ({
      ui: {
        ...state.ui,
        selectedTargetPlayerId: playerId,
      },
    })),
}));
