"use client";

import type { PlayerCardView, RoomProjection } from "@wirus/shared-types";
import clsx from "clsx";

type PlayerHandProps = {
  room: RoomProjection | null;
};

const accentClasses: Record<PlayerCardView["accentColor"], string> = {
  blue: "from-cyan-500 via-sky-500 to-blue-600 text-cyan-50",
  yellow: "from-amber-300 via-yellow-400 to-orange-500 text-stone-950",
  red: "from-rose-500 via-red-500 to-orange-600 text-rose-50",
  green: "from-lime-400 via-emerald-500 to-green-700 text-emerald-50",
  wild: "from-fuchsia-500 via-violet-500 to-cyan-500 text-white",
  treatment: "from-slate-700 via-slate-800 to-black text-slate-50",
};

export function PlayerHand({ room }: PlayerHandProps) {
  const hand = room?.hand ?? [];

  return (
    <section className="relative overflow-hidden rounded-[36px] border border-[var(--line-strong)] bg-[var(--panel)]/95 p-5 shadow-[var(--shadow)] backdrop-blur md:p-6">
      <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-[var(--virus-red)]/16 blur-3xl" />
      <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-[var(--virus-blue)]/12 blur-3xl" />

      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Reka gracza</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.04em]">Twoje karty</h2>
        </div>
        <div className="rounded-full border border-[var(--line)] bg-black/80 px-4 py-2 text-sm font-semibold text-white">
          Kart na rece: {hand.length}
        </div>
      </div>

      {hand.length > 0 ? (
        <div className="relative mt-8 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {hand.map((card, index) => (
            <article
              key={card.id}
              className={clsx(
                "group relative overflow-hidden rounded-[32px] border border-white/18 bg-gradient-to-br p-5 shadow-[0_18px_45px_rgba(0,0,0,0.28)] transition duration-200 hover:-translate-y-1 hover:rotate-0 hover:shadow-[0_24px_50px_rgba(0,0,0,0.34)]",
                accentClasses[card.accentColor],
              )}
              style={{ transform: `rotate(${(index % 3) - 1}deg)` }}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-white/45" />
              <div className="absolute -right-5 -top-6 h-24 w-24 rounded-full bg-white/15 blur-xl" />
              <div className="absolute -bottom-7 -left-4 h-24 w-24 rounded-full bg-black/20 blur-xl" />
              <div className="absolute inset-3 rounded-[24px] border border-white/18 opacity-70" />
              <div className="relative flex min-h-[260px] flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] opacity-80">{card.subtitle}</p>
                    <h3 className="mt-3 text-3xl font-black uppercase leading-tight tracking-[0.03em]">{card.title}</h3>
                  </div>
                  <div className="rounded-[22px] bg-black/20 px-4 py-3 text-4xl shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                    {card.icon}
                  </div>
                </div>
                <div className="mt-5 inline-flex w-fit rounded-full border border-white/22 bg-black/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]">
                  {card.kind}
                </div>
                <p className="mt-5 text-sm leading-6 opacity-95">{card.description}</p>
                <div className="mt-auto flex items-end justify-between gap-3 pt-6">
                  <div className="text-xs uppercase tracking-[0.24em] opacity-75">{card.id}</div>
                  <div className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[11px] uppercase tracking-[0.24em]">
                    Gotowa do zagrania
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-[28px] border border-dashed border-[var(--line)] bg-white/60 p-8 text-sm text-[var(--muted)]">
          Po rozpoczęciu partii Twoja ręka pojawi się tutaj w pełnym widoku.
        </div>
      )}
    </section>
  );
}
