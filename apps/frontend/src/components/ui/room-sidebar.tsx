"use client";

import type { RoomProjection } from "@wirus/shared-types";

type RoomSidebarProps = {
  room: RoomProjection | null;
};

export function RoomSidebar({ room }: RoomSidebarProps) {
  return (
    <aside className="space-y-6">
      <section className="rounded-[32px] border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Obecność</p>
        <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.03em]">Miejsca i widzowie</h2>
        <div className="mt-5 space-y-3">
          {(room?.players ?? []).map((player) => (
            <div key={player.id} className="rounded-[24px] border border-[var(--line)] bg-white/80 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{player.displayName}</span>
                <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  miejsce {player.seatIndex ?? "?"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]">
                <span className="rounded-full bg-[var(--virus-green)]/12 px-3 py-1 text-[var(--virus-green-dark)]">
                  {player.isConnected ? "online" : "offline"}
                </span>
                <span className="rounded-full bg-black/6 px-3 py-1">karty {player.handCount}</span>
                <span className="rounded-full bg-black/6 px-3 py-1">organy {player.organCount}</span>
              </div>
            </div>
          ))}
          {(room?.spectators ?? []).map((spectator) => (
            <div key={spectator.id} className="rounded-[24px] border border-dashed border-[var(--line)] bg-white/60 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{spectator.displayName}</span>
                <span className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">widz</span>
              </div>
            </div>
          ))}
          {!room ? <p className="text-sm text-[var(--muted)]">Czekamy na dane pokoju.</p> : null}
        </div>
      </section>

      <section className="rounded-[32px] border border-[var(--line-strong)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Chat</p>
        <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.03em]">Czat pokoju</h2>
        <div className="mt-5 space-y-3">
          {(room?.chat ?? []).slice(-6).map((message) => (
            <div key={message.id} className="rounded-[24px] border border-[var(--line)] bg-white/80 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{message.displayName}</div>
              <p className="mt-2 text-sm">{message.message}</p>
            </div>
          ))}
          {!room?.chat.length ? <p className="text-sm text-[var(--muted)]">Czat jest jeszcze pusty.</p> : null}
        </div>
      </section>
    </aside>
  );
}
