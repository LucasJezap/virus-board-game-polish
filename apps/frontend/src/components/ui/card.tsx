"use client";

import type { PlayerCardView, TableOrganView } from "@wirus/shared-types";
import clsx from "clsx";
import type { CSSProperties } from "react";

type CardTone = PlayerCardView["accentColor"] | TableOrganView["accentColor"] | "slot";

type CardStatus = "zdrowy" | "zakazony" | "chroniony" | "uodporniony" | "pusty";

type CardProps = {
  title: string;
  icon: string;
  tone: CardTone;
  status?: CardStatus;
  subtitle?: string;
  compact?: boolean;
  empty?: boolean;
  className?: string;
  style?: CSSProperties;
};

const toneClasses: Record<CardTone, string> = {
  blue: "border-[#00f3ff]/55 bg-[linear-gradient(180deg,rgba(5,22,32,0.88),rgba(4,10,18,0.78))] text-[#ecfeff] shadow-[0_0_24px_rgba(0,243,255,0.16)]",
  yellow: "border-[#fdf5e6]/42 bg-[linear-gradient(180deg,rgba(37,31,13,0.88),rgba(16,12,7,0.78))] text-[#fffbea] shadow-[0_0_24px_rgba(253,245,230,0.12)]",
  red: "border-[#ff073a]/52 bg-[linear-gradient(180deg,rgba(40,7,15,0.9),rgba(20,6,10,0.82))] text-[#fff0f3] shadow-[0_0_28px_rgba(255,7,58,0.18)]",
  green: "border-[#39ff14]/48 bg-[linear-gradient(180deg,rgba(9,31,12,0.88),rgba(6,15,8,0.82))] text-[#efffea] shadow-[0_0_28px_rgba(57,255,20,0.16)]",
  wild: "border-white/28 bg-[linear-gradient(180deg,rgba(30,34,50,0.9),rgba(12,14,22,0.82))] text-[#f7f8ff] shadow-[0_0_24px_rgba(255,255,255,0.12)]",
  treatment: "border-[#9fd4ff]/28 bg-[linear-gradient(180deg,rgba(20,26,40,0.92),rgba(7,11,18,0.84))] text-[#eff7ff] shadow-[0_0_24px_rgba(159,212,255,0.12)]",
  slot: "border-white/12 bg-white/4 text-white/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]",
};

const statusChipClasses: Record<Exclude<CardStatus, "pusty">, string> = {
  zdrowy: "border-[#39ff14]/35 bg-[#39ff14]/10 text-[#d7ffd0]",
  zakazony: "border-[#ff073a]/38 bg-[#ff073a]/12 text-[#ffccd6]",
  chroniony: "border-[#00f3ff]/38 bg-[#00f3ff]/12 text-[#d3fdff]",
  uodporniony: "border-[#fdf5e6]/26 bg-white/12 text-[#fff7e4]",
};

function getStatusChip(status: CardStatus) {
  if (status === "pusty") {
    return null;
  }

  return (
    <div className={clsx("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em]", statusChipClasses[status])}>
      {status}
    </div>
  );
}

export function Card({ title, icon, tone, status = "zdrowy", subtitle, compact = false, empty = false, className, style }: CardProps) {
  return (
    <article
      className={clsx(
        "group relative aspect-[2/3] overflow-hidden rounded-[24px] border backdrop-blur-xl [animation:bio-card-rise_240ms_ease-out]",
        compact ? "min-h-[132px] rounded-[20px]" : "min-h-[220px] rounded-[26px]",
        toneClasses[tone],
        status === "zakazony" && "bio-cracked",
        status === "chroniony" && "bio-shielded",
        status === "uodporniony" && "bio-frozen",
        empty && "border-dashed",
        className,
      )}
      style={style}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_34%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/16" />

      <div className="relative flex h-full flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <p className={clsx("font-semibold uppercase tracking-[0.18em] text-white/88", compact ? "text-[10px]" : "text-[11px]")}>{title}</p>
          {getStatusChip(status)}
        </div>

        <div className={clsx("flex flex-1 items-center justify-center", compact ? "py-2" : "py-3")}>
          <div
            className={clsx(
              "flex items-center justify-center rounded-[20px] border border-white/10 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
              compact ? "h-[70%] w-[78%] text-4xl" : "h-[72%] w-[82%] text-7xl",
              empty && "border-dashed text-white/24",
            )}
          >
            {icon}
          </div>
        </div>

        <div className="min-h-[1.5rem]">
          {subtitle ? <p className={clsx("text-white/65", compact ? "text-[10px]" : "text-xs")}>{subtitle}</p> : null}
        </div>
      </div>
    </article>
  );
}
