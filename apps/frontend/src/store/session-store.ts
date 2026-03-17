"use client";

import { create } from "zustand";

const STORAGE_KEY = "wirus.session";

type PersistedSessionState = {
  displayName: string;
  playerId: string | null;
  roomId: string | null;
  reconnectToken: string | null;
};

function readInitialState(): PersistedSessionState {
  if (typeof window === "undefined") {
    return {
      displayName: "Gracz",
      playerId: null,
      roomId: null,
      reconnectToken: null,
    };
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return {
      displayName: "Gracz",
      playerId: null,
      roomId: null,
      reconnectToken: null,
    };
  }

  try {
    return JSON.parse(stored) as PersistedSessionState;
  } catch {
    return {
      displayName: "Gracz",
      playerId: null,
      roomId: null,
      reconnectToken: null,
    };
  }
}

function persistState(state: PersistedSessionState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

type SessionState = {
  displayName: string;
  playerId: string | null;
  roomId: string | null;
  reconnectToken: string | null;
  setDisplayName: (value: string) => void;
  setSession: (input: { playerId: string | null; roomId: string | null; reconnectToken: string | null }) => void;
  clearSession: () => void;
};

const initialState = readInitialState();

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initialState,
  setDisplayName: (displayName) =>
    set(() => {
      const nextState = {
        displayName,
        playerId: get().playerId,
        roomId: get().roomId,
        reconnectToken: get().reconnectToken,
      };
      persistState(nextState);
      return { displayName };
    }),
  setSession: ({ playerId, roomId, reconnectToken }) =>
    set(() => {
      const nextState = {
        displayName: get().displayName,
        playerId,
        roomId,
        reconnectToken,
      };
      persistState(nextState);
      return {
        playerId,
        roomId,
        reconnectToken,
      };
    }),
  clearSession: () =>
    set(() => {
      const nextState = {
        displayName: get().displayName,
        playerId: null,
        roomId: null,
        reconnectToken: null,
      };
      persistState(nextState);
      return {
        playerId: null,
        roomId: null,
        reconnectToken: null,
      };
    }),
}));
