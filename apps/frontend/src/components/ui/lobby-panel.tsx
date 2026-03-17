"use client";

import type { RoomLobbyEntry, RoomPhase } from "@wirus/shared-types";

import { getRoomSocket } from "../../lib/socket";
import { useRoomStore } from "../../store/room-store";
import { useSessionStore } from "../../store/session-store";

const phaseLabels: Record<RoomPhase, string> = {
  WAITING: "Oczekiwanie",
  STARTING: "Start",
  PLAYING: "W trakcie",
  FINISHED: "Zakończona",
};

function describeRoom(room: RoomLobbyEntry): string {
  return `${room.playerCount}/6 graczy · ${room.spectatorCount} widzów`;
}

export function LobbyPanel() {
  const displayName = useSessionStore((state) => state.displayName);
  const setDisplayName = useSessionStore((state) => state.setDisplayName);
  const room = useRoomStore((state) => state.room);
  const lobbyRooms = useRoomStore((state) => state.lobbyRooms);

  const isInRoom = Boolean(room);

  function createRoom(visibility: "public" | "private") {
    if (isInRoom) {
      return;
    }
    getRoomSocket().emit("ROOM_CREATE", { displayName, visibility });
  }

  function quickJoin() {
    if (isInRoom) {
      return;
    }
    getRoomSocket().emit("ROOM_QUICK_JOIN", { displayName });
  }

  function joinRoom(roomCode: string) {
    if (isInRoom) {
      return;
    }
    getRoomSocket().emit("ROOM_JOIN", { displayName, roomCode });
  }

  return (
    <aside className="rounded-[32px] border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]">
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Lobby</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.03em]">Pokoje i dołączanie</h2>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm text-[var(--muted)]">Nazwa gracza</span>
          <input
            className="w-full rounded-[24px] border border-[var(--line)] bg-white px-4 py-3 outline-none ring-0 transition focus:border-[var(--virus-red)]"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Jak mamy Cię wyświetlać?"
          />
        </label>

        <div className="grid gap-3">
          <button
            className="rounded-[24px] bg-[var(--virus-red)] px-4 py-3 text-left text-sm font-semibold text-white shadow-[0_16px_28px_rgba(162,42,34,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => createRoom("public")}
            type="button"
            disabled={isInRoom}
          >
            Utwórz pokój publiczny
          </button>
          <button
            className="rounded-[24px] border border-[var(--line)] bg-white px-4 py-3 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => createRoom("private")}
            type="button"
            disabled={isInRoom}
          >
            Utwórz pokój prywatny
          </button>
          <button
            className="rounded-[24px] border border-[var(--line)] bg-[var(--panel-strong)] px-4 py-3 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            onClick={quickJoin}
            type="button"
            disabled={isInRoom}
          >
            Szybkie dołączanie
          </button>
        </div>

        <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/50 p-4 text-sm text-[var(--muted)]">
          {room ? (
            <>
              <p className="font-semibold text-[var(--ink)]">Obecny pokój</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-black/8 px-3 py-1 font-semibold text-[var(--ink)]">Kod {room.code}</span>
                <span className="rounded-full bg-black/8 px-3 py-1">
                  {room.visibility === "public" ? "Publiczny" : "Prywatny"}
                </span>
                <span className="rounded-full bg-black/8 px-3 py-1">Status {phaseLabels[room.phase]}</span>
              </div>
            </>
          ) : (
            <p>Wybierz pokój i usiądź przy stole.</p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Lista otwartych pokoi</p>
            <h3 className="mt-2 text-xl font-semibold">Dołącz do innych graczy</h3>
          </div>
          {lobbyRooms.length > 0 ? (
            <div className="space-y-3">
              {lobbyRooms.map((lobbyRoom) => (
                <article
                  key={lobbyRoom.id}
                  className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4 shadow-[0_10px_24px_rgba(48,33,19,0.06)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">Pokój {lobbyRoom.code}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{describeRoom(lobbyRoom)}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">Status: {phaseLabels[lobbyRoom.phase]}</p>
                    </div>
                    <button
                      className="rounded-xl bg-[var(--virus-red)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => joinRoom(lobbyRoom.code)}
                      type="button"
                      disabled={isInRoom}
                    >
                      Dołącz
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/60 p-4 text-sm text-[var(--muted)]">
              Brak otwartych pokojów. Utwórz pierwszy albo użyj szybkiego dołączania.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
