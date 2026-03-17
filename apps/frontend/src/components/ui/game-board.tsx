"use client";

import type { PlayerCardView, RoomPlayerView, RoomProjection, TableOrganView } from "@wirus/shared-types";
import clsx from "clsx";

import { Card } from "./card";

type GameBoardProps = {
  room: RoomProjection;
};

function getLocalPlayer(room: RoomProjection): RoomPlayerView | null {
  return room.players.find((player) => player.id === room.viewerPlayerId) ?? room.players[0] ?? null;
}

function getOpponents(room: RoomProjection, localPlayerId: string | null) {
  return room.players.filter((player) => player.id !== localPlayerId);
}

function getOrganStatus(organ: TableOrganView) {
  if (organ.isImmunized) {
    return "uodporniony" as const;
  }

  if (organ.isInfected || organ.virusCount > 0) {
    return "zakazony" as const;
  }

  if (organ.medicineCount > 0) {
    return "chroniony" as const;
  }

  return "zdrowy" as const;
}

function getHandCardSubtitle(card: PlayerCardView) {
  switch (card.kind) {
    case "organ":
      return "Organ";
    case "virus":
      return "Wirus";
    case "medicine":
      return "Szczepionka";
    case "treatment":
      return "Akcja specjalna";
    default:
      return "";
  }
}

function getOpponentOffset(index: number, total: number) {
  if (total <= 1) {
    return 0;
  }

  const midpoint = (total - 1) / 2;
  return Math.abs(index - midpoint) * 20;
}

function getActionLines(room: RoomProjection) {
  const lines = room.chat
    .slice(-5)
    .map((message) => `${message.displayName}: ${message.message}`);

  if (lines.length > 0) {
    return lines;
  }

  return ["SYSTEM: Oczekiwanie na pierwszy ruch.", "SYSTEM: Terminal bio-areny gotowy."];
}

function OpponentSeat({ player, index, total, isActive }: { player: RoomPlayerView; index: number; total: number; isActive: boolean }) {
  const translateY = getOpponentOffset(index, total);

  return (
    <article
      style={{ transform: `translateY(${translateY}px)` }}
      className={clsx(
        "min-w-[150px] flex-1 rounded-[28px] border p-3 text-[#fdf5e6] backdrop-blur-xl [animation:bio-card-rise_260ms_ease-out] sm:min-w-[180px]",
        isActive
          ? "border-[#39ff14]/55 bg-[linear-gradient(180deg,rgba(14,28,17,0.9),rgba(7,12,10,0.82))] shadow-[0_0_28px_rgba(57,255,20,0.18)]"
          : "border-white/10 bg-[linear-gradient(180deg,rgba(16,20,30,0.88),rgba(8,10,16,0.8))]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold uppercase tracking-[0.12em] text-white">{player.displayName}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/62">
            {player.isConnected ? "Połączony" : "Offline"} · karty {player.handCount}
          </p>
        </div>
        {isActive ? (
          <span className="rounded-full border border-[#39ff14]/35 bg-[#39ff14]/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8ffd0]">
            Ruch
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, slotIndex) => {
          const organ = player.organs[slotIndex];
          return organ ? (
            <Card
              key={organ.id}
              compact
              title={organ.title}
              icon={organ.icon}
              tone={organ.accentColor}
              status={getOrganStatus(organ)}
            />
          ) : (
            <Card key={`slot-${player.id}-${slotIndex}`} compact title="Slot" icon="+" tone="slot" status="pusty" empty />
          );
        })}
      </div>
    </article>
  );
}

export function GameBoard({ room }: GameBoardProps) {
  const localPlayer = getLocalPlayer(room);
  const opponents = getOpponents(room, localPlayer?.id ?? null);
  const actionLines = getActionLines(room);
  const localBody = localPlayer?.organs ?? [];
  const isLocalTurn = room.match?.activePlayerId === localPlayer?.id;

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#06090f]/94 p-3 text-[#fdf5e6] shadow-[0_30px_90px_rgba(0,0,0,0.5)] sm:p-5 lg:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,243,255,0.08),transparent_28%),radial-gradient(circle_at_bottom,rgba(57,255,20,0.07),transparent_30%)]" />

      <div className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#00f3ff]/78">Bio-Arena</p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white sm:text-3xl">Arena zakażeń</h2>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <div className="rounded-[20px] border border-white/10 bg-black/24 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/54">Gracze</p>
              <p className="mt-1 text-lg font-black text-white">{room.players.length}</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-black/24 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/54">Odrzucone</p>
              <p className="mt-1 text-lg font-black text-white">{room.match?.discardPileCount ?? 0}</p>
            </div>
            <div className="rounded-[20px] border border-white/10 bg-black/24 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/54">Etap</p>
              <p className="mt-1 text-sm font-black uppercase tracking-[0.12em] text-white">{room.match?.turnStage ?? "Brak"}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-start gap-3 px-1 pt-1 md:min-w-0 md:justify-center">
            {opponents.map((player, index) => (
              <OpponentSeat
                key={player.id}
                player={player}
                index={index}
                total={opponents.length}
                isActive={room.match?.activePlayerId === player.id}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="relative rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,17,25,0.82),rgba(5,8,12,0.9))] p-4 sm:p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,243,255,0.05),transparent_34%)]" />
            <div className="relative flex min-h-[220px] flex-col items-center justify-center gap-5 sm:min-h-[280px] sm:flex-row sm:gap-10">
              <div className="flex flex-col items-center gap-3" style={{ animation: "bio-card-rise 260ms ease-out" }}>
                <div className="flex h-[140px] w-[96px] items-center justify-center rounded-[26px] border border-[#39ff14]/34 bg-[linear-gradient(180deg,rgba(57,255,20,0.1),rgba(8,10,12,0.88))] shadow-[0_0_26px_rgba(57,255,20,0.16)] sm:h-[190px] sm:w-[128px]">
                  <span className="text-5xl sm:text-6xl">🧬</span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/76">Talia dobierania</p>
              </div>

              <div className="text-center">
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#00f3ff]/70">Stół centralny</p>
                <h3 className="mt-2 text-xl font-black uppercase tracking-[0.08em] text-white">Strefa zabiegowa</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/68">
                  Tu trafiają organy, wirusy i szczepionki. Zadbaj o 4 zdrowe organy w swoim ciele, zanim przeciwnicy
                  przejmą kontrolę.
                </p>
              </div>

              <div className="flex flex-col items-center gap-3" style={{ animation: "bio-card-rise 260ms ease-out" }}>
                <div className="flex h-[140px] w-[96px] items-center justify-center rounded-[26px] border border-[#ff073a]/34 bg-[linear-gradient(180deg,rgba(255,7,58,0.1),rgba(12,8,10,0.88))] shadow-[0_0_26px_rgba(255,7,58,0.16)] sm:h-[190px] sm:w-[128px]">
                  <span className="text-5xl sm:text-6xl">🧫</span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/76">Odrzucone {room.match?.discardPileCount ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-black/26 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#00f3ff]/74">Parametry tury</p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/58">Aktywny gracz</p>
                <p className="mt-2 text-lg font-black text-white">
                  {room.players.find((player) => player.id === room.match?.activePlayerId)?.displayName ?? "Brak"}
                </p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/58">Dobrania do wykonania</p>
                <p className="mt-2 text-lg font-black text-white">{room.match?.pendingDraws ?? 0}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/58">Twój stan</p>
                <p className={clsx("mt-2 text-lg font-black", isLocalTurn ? "text-[#39ff14]" : "text-white")}>
                  {isLocalTurn ? "Twój ruch" : "Czekaj na turę"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {localPlayer ? (
          <div className="relative rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(14,18,28,0.9),rgba(7,8,13,0.96))] p-4 shadow-[0_0_44px_rgba(0,243,255,0.08)] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#39ff14]/76">Twoja strefa</p>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-[0.08em] text-white">{localPlayer.displayName}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  Karty {room.hand.length}
                </span>
                <span className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  Organy {localBody.length}/4
                </span>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Ciało</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => {
                  const organ = localBody[index];
                  return organ ? (
                    <Card
                      key={organ.id}
                      title={organ.title}
                      icon={organ.icon}
                      tone={organ.accentColor}
                      status={getOrganStatus(organ)}
                      subtitle={`Wirusy ${organ.virusCount} · Szczepionki ${organ.medicineCount}`}
                    />
                  ) : (
                    <Card key={`local-slot-${index}`} title="Wolny slot" icon="+" tone="slot" status="pusty" empty />
                  );
                })}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Ręka</p>
              <div className="mt-4 overflow-x-auto pb-2">
                <div className="flex min-w-max items-end pl-1 pr-6">
                  {room.hand.map((card, index) => (
                    <div
                      key={card.id}
                      className="-ml-7 first:ml-0 sm:-ml-10"
                      style={{
                        animation: "bio-card-rise 280ms ease-out",
                        transform: `rotate(${(index - (room.hand.length - 1) / 2) * 3}deg)`,
                      }}
                    >
                      <Card
                        title={card.title}
                        icon={card.icon}
                        tone={card.accentColor}
                        subtitle={getHandCardSubtitle(card)}
                        className="w-[132px] transition-transform duration-200 hover:-translate-y-2 hover:rotate-0 sm:w-[156px]"
                      />
                    </div>
                  ))}

                  {room.hand.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-white/12 bg-white/4 px-5 py-8 text-sm text-white/56">
                      Karty pojawią się tutaj po rozpoczęciu partii.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative mt-4 lg:mt-0">
        <div className="terminal-panel lg:absolute lg:bottom-4 lg:left-4 lg:w-[320px]">
          <div className="rounded-[24px] border border-[#39ff14]/18 bg-[rgba(3,7,4,0.84)] p-4 font-mono text-sm text-[#d8ffd0] backdrop-blur-xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#39ff14]">Terminal akcji</p>
            <div className="mt-3 space-y-2">
              {actionLines.map((line, index) => (
                <p key={`${line}-${index}`} className="leading-5 text-[#d8ffd0]">
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
