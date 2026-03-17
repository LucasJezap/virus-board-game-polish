"use client";

import { useRoomSocket } from "../hooks/use-room-socket";
import { useRoomStore } from "../store/room-store";
import { useSessionStore } from "../store/session-store";
import { ControlPanel } from "./ui/control-panel";
import { GameBoard } from "./ui/game-board";
import { LobbyPanel } from "./ui/lobby-panel";

export function Shell() {
  useRoomSocket();

  const room = useRoomStore((state) => state.room);
  const isConnected = useRoomStore((state) => state.isConnected);
  const errorMessage = useRoomStore((state) => state.errorMessage);
  const displayName = useSessionStore((state) => state.displayName);

  return (
    <main className="min-h-screen px-4 py-6 text-[var(--ink)] md:px-8 md:py-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <header className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[rgba(8,12,18,0.88)] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl md:p-7">
          <div className="absolute inset-x-0 top-0 h-px bg-white/12" />
          <div className="absolute -left-16 top-6 h-36 w-36 rounded-full bg-[#39ff14]/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[#00f3ff]/10 blur-3xl" />
          <div className="absolute bottom-0 right-20 h-36 w-36 rounded-full bg-[#ff073a]/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#00f3ff]/72">Virus Online</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-none tracking-[0.06em] text-white md:text-6xl">
                Bio-Arena Mode
              </h1>
              <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.22em] text-white/78">
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2">Organy</span>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2">Wirusy</span>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2">Szczepionki</span>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-2">Zabiegi</span>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white">
                <span className={isConnected ? "text-[#cfffbe]" : "text-[#ffd2db]"}>
                  {isConnected ? "Połączono" : "Łączenie"}
                </span>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/40 px-4 py-3 text-sm text-white shadow-[0_18px_35px_rgba(8,12,16,0.28)]">
                Grasz jako <strong className="ml-2 text-[#fdf5e6]">{displayName}</strong>
              </div>
            </div>
          </div>

          {errorMessage ? (
            <div className="relative mt-4 rounded-[24px] border border-[#ff073a]/35 bg-[#ff073a]/10 px-4 py-3 text-sm text-[#ffe3e8]">
              {errorMessage}
            </div>
          ) : null}
        </header>

        {room ? (
          <>
            <GameBoard room={room} />
            <ControlPanel room={room} />
          </>
        ) : (
          <section className="mx-auto w-full max-w-[760px]">
            <LobbyPanel />
          </section>
        )}
      </div>
    </main>
  );
}
