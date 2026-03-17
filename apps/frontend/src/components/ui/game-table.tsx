"use client";

import type { RoomPlayerView, RoomProjection, TableOrganView } from "@wirus/shared-types";
import clsx from "clsx";

type GameTableProps = {
  room: RoomProjection | null;
};

const organToneClasses = {
  blue: {
    frame: "border-[#00f3ff]/45 bg-[#031821]/80 text-[#d9feff] shadow-[0_0_24px_rgba(0,243,255,0.14)]",
    glow: "bg-[#00f3ff]/18 text-[#00f3ff]",
  },
  yellow: {
    frame: "border-[#fdf5e6]/36 bg-[#1d1605]/72 text-[#fff8e9] shadow-[0_0_24px_rgba(253,245,230,0.12)]",
    glow: "bg-[#fdf5e6]/16 text-[#fdf5e6]",
  },
  red: {
    frame: "border-[#ff073a]/42 bg-[#22040e]/76 text-[#ffe4ea] shadow-[0_0_28px_rgba(255,7,58,0.16)]",
    glow: "bg-[#ff073a]/18 text-[#ff7b96]",
  },
  green: {
    frame: "border-[#39ff14]/42 bg-[#071b0a]/76 text-[#e9ffe4] shadow-[0_0_28px_rgba(57,255,20,0.16)]",
    glow: "bg-[#39ff14]/18 text-[#72ff58]",
  },
  wild: {
    frame: "border-white/28 bg-[#171a25]/82 text-[#f4f6ff] shadow-[0_0_30px_rgba(255,255,255,0.12)]",
    glow: "bg-white/12 text-white",
  },
} as const;

function getBoardGridClass(playerCount: number) {
  if (playerCount <= 2) {
    return "md:grid-cols-2";
  }

  if (playerCount <= 4) {
    return "md:grid-cols-2";
  }

  return "md:grid-cols-2 xl:grid-cols-3";
}

function getBioStatus(organ: TableOrganView) {
  if (organ.isImmunized) {
    return {
      label: "Immunized",
      chipClass: "border-[#00f3ff]/45 bg-[#00f3ff]/14 text-[#b5fdff]",
      detail: "2 vaccines locked",
    };
  }

  if (organ.isInfected || organ.virusCount > 0) {
    return {
      label: "Infected",
      chipClass: "border-[#ff073a]/45 bg-[#ff073a]/14 text-[#ff9fb1]",
      detail: `${organ.virusCount} virus attached`,
    };
  }

  if (organ.medicineCount > 0) {
    return {
      label: "Protected",
      chipClass: "border-[#00f3ff]/45 bg-[#00f3ff]/14 text-[#b5fdff]",
      detail: `${organ.medicineCount} vaccine shield`,
    };
  }

  return {
    label: "Healthy",
    chipClass: "border-[#39ff14]/45 bg-[#39ff14]/12 text-[#bbffaf]",
    detail: "Stable tissue",
  };
}

function getVirusPressure(player: RoomPlayerView) {
  return player.organs.reduce((total, organ) => total + organ.virusCount, 0);
}

function getHealthyOrganCount(player: RoomPlayerView) {
  const distinctHealthy = new Set(
    player.organs.filter((organ) => !organ.isInfected && organ.virusCount === 0).map((organ) => organ.accentColor),
  );

  return distinctHealthy.size;
}

function getActionLogLines(room: RoomProjection | null) {
  if (!room) {
    return [];
  }

  const logs = room.chat.slice(-5).map(
    (message) => `[SYSTEM ${new Date(message.createdAtIso || Date.now()).toLocaleTimeString("pl-PL")}]: ${message.displayName} ${message.message}`,
  );

  if (logs.length > 0) {
    return logs;
  }

  return ["[SYSTEM]: Awaiting specimen activity...", "[SYSTEM]: Lab feed synchronized with room state."];
}

function OrganCard({ organ }: { organ: TableOrganView }) {
  const tone = organToneClasses[organ.accentColor];
  const status = getBioStatus(organ);
  const hasVirus = organ.isInfected || organ.virusCount > 0;
  const hasProtection = organ.medicineCount > 0 || organ.isImmunized;

  return (
    <div className={clsx("bio-card relative overflow-hidden rounded-[28px] border p-4", tone.frame, hasVirus && "bio-glitch")}>
      <div className="absolute inset-x-0 top-0 h-px bg-white/18" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_38%)]" />
      {hasVirus ? <div className="pointer-events-none absolute inset-x-4 bottom-0 h-8 rounded-t-[999px] bg-[radial-gradient(circle_at_bottom,rgba(255,7,58,0.32),transparent_70%)] blur-md" /> : null}
      {hasProtection ? <div className="pointer-events-none absolute -right-4 top-4 h-20 w-20 rounded-full bg-[#00f3ff]/18 blur-2xl" /> : null}

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={clsx("bio-organ-icon flex h-14 w-14 items-center justify-center rounded-[18px] border border-white/12 text-3xl", tone.glow)}>
            {organ.icon}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.34em] text-white/45">Bio-Status</p>
            <h4 className="mt-2 text-lg font-black uppercase tracking-[0.08em]">{organ.title}</h4>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/55">{status.detail}</p>
          </div>
        </div>

        <span className={clsx("rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em]", status.chipClass)}>
          {status.label}
        </span>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/78">
        <div className="rounded-full border border-white/10 bg-black/18 px-3 py-2">Vaccines {organ.medicineCount}</div>
        <div className="rounded-full border border-white/10 bg-black/18 px-3 py-2">Viruses {organ.virusCount}</div>
      </div>
    </div>
  );
}

function PlayerBoard({ player, isActive, isViewer }: { player: RoomPlayerView; isActive: boolean; isViewer: boolean }) {
  const healthyOrgans = getHealthyOrganCount(player);
  const virusPressure = getVirusPressure(player);
  const activeBadgeClass = isActive
    ? "border-[#39ff14]/60 bg-[#39ff14]/14 text-[#c4ffb8] shadow-[0_0_28px_rgba(57,255,20,0.2)]"
    : "border-white/10 bg-white/6 text-white/54";

  return (
    <article
      className={clsx(
        "bio-board relative overflow-hidden rounded-[32px] border p-5 backdrop-blur-xl",
        isActive
          ? "border-[#39ff14]/62 bg-[linear-gradient(180deg,rgba(14,22,19,0.96),rgba(9,13,18,0.96))] shadow-[0_0_0_1px_rgba(57,255,20,0.25),0_0_42px_rgba(57,255,20,0.18)]"
          : "border-white/10 bg-[linear-gradient(180deg,rgba(15,17,24,0.94),rgba(9,11,16,0.94))] shadow-[0_18px_38px_rgba(0,0,0,0.34)]",
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,243,255,0.08),transparent_42%)]" />
      <div className="absolute -right-10 top-4 h-32 w-32 rounded-full bg-[#00f3ff]/10 blur-3xl" />
      <div className="absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-[#39ff14]/8 blur-3xl" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-black uppercase tracking-[0.08em] text-[#fdf5e6]">{player.displayName}</h3>
            {isViewer ? (
              <span className="rounded-full border border-[#00f3ff]/35 bg-[#00f3ff]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#b8fdff]">
                You
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-white/45">
            {player.role === "PLAYER" ? "Operator" : "Observer"} · {player.isConnected ? "online" : "offline"}
          </p>
        </div>

        <div className={clsx("rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em]", activeBadgeClass)}>
          {isActive ? "Active Turn" : "Standby"}
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-[22px] border border-white/10 bg-black/22 p-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Healthy</p>
          <p className="mt-2 text-2xl font-black text-[#39ff14]">{healthyOrgans}/4</p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/22 p-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Hand</p>
          <p className="mt-2 text-2xl font-black text-[#fdf5e6]">{player.handCount}</p>
        </div>
        <div className="rounded-[22px] border border-white/10 bg-black/22 p-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Virus Load</p>
          <p className={clsx("mt-2 text-2xl font-black", virusPressure >= 2 ? "text-[#ff073a]" : "text-[#00f3ff]")}>{virusPressure}</p>
        </div>
      </div>

      <div className="relative mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.26em] text-white/42">Body Matrix</p>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/30">{player.organs.length} / 4 organs deployed</p>
        </div>

        {player.organs.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {player.organs.map((organ) => (
              <OrganCard key={organ.id} organ={organ} />
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-white/12 bg-black/18 p-5 text-sm text-white/54">
            No organs deployed. Lab tray is empty.
          </div>
        )}
      </div>
    </article>
  );
}

export function GameTable({ room }: GameTableProps) {
  const seatedPlayers = room?.players ?? [];
  const boardGridClass = getBoardGridClass(seatedPlayers.length);
  const viewer = seatedPlayers.find((player) => player.id === room?.viewerPlayerId) ?? null;
  const viewerVirusLoad = viewer ? getVirusPressure(viewer) : 0;
  const actionLogLines = getActionLogLines(room);

  return (
    <section className="bio-shell relative overflow-hidden rounded-[36px] border border-white/10 bg-[#090c12]/92 p-5 text-[#fdf5e6] shadow-[0_22px_70px_rgba(0,0,0,0.48)] md:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,243,255,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(57,255,20,0.08),transparent_34%)]" />
      {viewerVirusLoad >= 2 ? (
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_65px_rgba(255,7,58,0.72)] [animation:bio-alert_2s_ease-in-out_infinite]" />
      ) : null}

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.34em] text-[#00f3ff]/76">Bio-Lab Table</p>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-[0.08em] text-[#fdf5e6]">Virus Containment Grid</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58">
            Dynamic board for 2-6 players. Four distinct healthy organs secure the win. Vaccines protect, viruses mutate,
            immunized tissue locks the specimen.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[22px] border border-white/10 bg-black/24 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Players</p>
            <p className="mt-2 text-2xl font-black text-[#39ff14]">{seatedPlayers.length}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-black/24 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Discard</p>
            <p className="mt-2 text-2xl font-black text-[#00f3ff]">{room?.match?.discardPileCount ?? 0}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-black/24 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Turn Stage</p>
            <p className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-[#fdf5e6]">{room?.match?.turnStage ?? "Idle"}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-black/24 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">Pending Draw</p>
            <p className="mt-2 text-2xl font-black text-[#ff073a]">{room?.match?.pendingDraws ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="relative mt-6 grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className={clsx("grid gap-4", boardGridClass)}>
          {seatedPlayers.length > 0 ? (
            seatedPlayers.map((player) => (
              <PlayerBoard
                key={player.id}
                player={player}
                isActive={room?.match?.activePlayerId === player.id}
                isViewer={room?.viewerPlayerId === player.id}
              />
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-white/14 bg-black/18 p-8 text-sm text-white/54">
              Awaiting players. Occupied stations and organs will appear here once the room is populated.
            </div>
          )}
        </div>

        <aside className="rounded-[30px] border border-[#39ff14]/16 bg-black/34 p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[#39ff14]/80">Terminal</p>
              <h3 className="mt-2 text-xl font-black uppercase tracking-[0.08em] text-[#fdf5e6]">Action Log</h3>
            </div>
            <div className="rounded-full border border-[#39ff14]/18 bg-[#39ff14]/8 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-[#39ff14]">
              Live Feed
            </div>
          </div>

          <div className="terminal-panel mt-4 max-h-[420px] overflow-y-auto rounded-[24px] border border-[#39ff14]/16 bg-[#020402] p-4 font-mono text-sm text-[#39ff14]">
            {actionLogLines.map((line, index) => (
              <p key={`${line}-${index}`} className="leading-6">
                {line}
              </p>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
