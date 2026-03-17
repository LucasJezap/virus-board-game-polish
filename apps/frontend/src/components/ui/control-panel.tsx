"use client";

import type { RoomProjection } from "@wirus/shared-types";
import clsx from "clsx";

import { getRoomSocket } from "../../lib/socket";
import { useSessionStore } from "../../store/session-store";

type ControlPanelProps = {
  room: RoomProjection | null;
};

export function emitRoomStart(room: RoomProjection | null, playerId: string | null): void {
  if (!room) {
    return;
  }

  getRoomSocket().emit("ROOM_START", {
    roomId: room.id,
    playerId: playerId ?? room.hostPlayerId,
  });
}

export function emitGameAction(
  room: RoomProjection | null,
  playerId: string | null,
  type: "draw_card" | "end_turn" | "request_rematch",
): void {
  if (!room) {
    return;
  }

  getRoomSocket().emit("GAME_ACTION", {
    type,
    roomId: room.id,
    playerId: playerId ?? room.hostPlayerId,
  });
}

export function ControlPanel({ room }: ControlPanelProps) {
  const playerId = useSessionStore((state) => state.playerId);
  const isViewerActive = Boolean(room && room.match?.activePlayerId === (playerId ?? room.viewerPlayerId ?? room.hostPlayerId));
  const canPulseEndTurn = Boolean(room && room.phase === "PLAYING" && isViewerActive && room.match?.turnStage === "END");

  function startMatch() {
    emitRoomStart(room, playerId);
  }

  function emitAction(type: "draw_card" | "end_turn" | "request_rematch") {
    emitGameAction(room, playerId, type);
  }

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#090c12]/92 p-5 text-[#fdf5e6] shadow-[0_22px_70px_rgba(0,0,0,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,243,255,0.08),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(57,255,20,0.08),transparent_32%)]" />
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.32em] text-[#00f3ff]/76">Przełączniki bio-areny</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.08em]">Akcje pokoju i tury</h2>
          <p className="mt-2 max-w-xl text-sm text-white/70">Sterowanie rozgrywką, dobieraniem kart, końcem tury i rewanżem.</p>
        </div>
        <div className="relative flex flex-wrap gap-3">
          <button
            className="rounded-[20px] border border-[#ff073a]/42 bg-[linear-gradient(135deg,rgba(255,7,58,0.2),rgba(255,7,58,0.08))] px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#ffe6ec] shadow-[0_0_24px_rgba(255,7,58,0.18)] disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            onClick={startMatch}
            disabled={!room || room.phase !== "WAITING"}
          >
            Rozpocznij partię
          </button>
          <button
            className="rounded-[20px] border border-[#00f3ff]/35 bg-[linear-gradient(135deg,rgba(0,243,255,0.18),rgba(7,16,24,0.92))] px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#d9fdff] shadow-[0_0_24px_rgba(0,243,255,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            onClick={() => emitAction("draw_card")}
            disabled={!room || room.phase !== "PLAYING"}
          >
            Dobierz kartę
          </button>
          <button
            className={clsx(
              "rounded-[20px] border border-[#39ff14]/32 bg-[linear-gradient(135deg,rgba(57,255,20,0.18),rgba(7,18,10,0.92))] px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#e7ffe1] shadow-[0_0_24px_rgba(57,255,20,0.12)] disabled:cursor-not-allowed disabled:opacity-40",
              canPulseEndTurn && "animate-[bio-switch-pulse_1.8s_ease-in-out_infinite]",
            )}
            type="button"
            onClick={() => emitAction("end_turn")}
            disabled={!room || room.phase !== "PLAYING"}
          >
            Zakończ turę
          </button>
          <button
            className="rounded-[20px] border border-[#fdf5e6]/22 bg-[linear-gradient(135deg,rgba(253,245,230,0.14),rgba(19,18,15,0.92))] px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#fdf5e6] shadow-[0_0_20px_rgba(253,245,230,0.08)] disabled:cursor-not-allowed disabled:opacity-40"
            type="button"
            onClick={() => emitAction("request_rematch")}
            disabled={!room || room.phase !== "FINISHED"}
          >
            Głosuj za rewanżem
          </button>
        </div>
      </div>
    </section>
  );
}
