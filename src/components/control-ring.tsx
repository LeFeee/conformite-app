"use client";

// L'anneau de contrôles : chaque contrôle applicable est un trait,
// coloré selon son statut. On lit d'un coup d'œil l'état de toute la démarche.

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Control, ControlStatus } from "@/lib/catalog/types";
import { STATUS_LABELS } from "@/lib/catalog/types";
import { STATUS_COLOR } from "./ui";

interface Tick {
  control: Control;
  status: ControlStatus;
  proven: boolean;
}

export function ControlRing({
  ticks,
  percent,
  size = 280,
}: {
  ticks: Tick[];
  percent: number;
  size?: number;
}) {
  const router = useRouter();
  const [hover, setHover] = useState<Tick | null>(null);
  const cx = size / 2;
  const rOuter = size / 2 - 6;
  const rInner = rOuter - 34;
  const n = Math.max(ticks.length, 1);
  const step = (2 * Math.PI) / n;
  const width = Math.max(2, Math.min(6, (2 * Math.PI * rInner) / n - 1.5));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Score de conformité ${percent} %, ${ticks.length} contrôles applicables`}
      >
        {ticks.map((t, i) => {
          const a = -Math.PI / 2 + i * step;
          const r1 = t.status === "conforme" && !t.proven ? rInner + 10 : rInner;
          const x1 = cx + r1 * Math.cos(a);
          const y1 = cx + r1 * Math.sin(a);
          const x2 = cx + rOuter * Math.cos(a);
          const y2 = cx + rOuter * Math.sin(a);
          return (
            <line
              key={t.control.id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={STATUS_COLOR[t.status]}
              strokeWidth={hover?.control.id === t.control.id ? width + 2 : width}
              strokeLinecap="round"
              className="cursor-pointer"
              onMouseEnter={() => setHover(t)}
              onMouseLeave={() => setHover(null)}
              onClick={() => router.push(`/controles/${encodeURIComponent(t.control.id)}`)}
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-16 text-center">
        {hover ? (
          <>
            <span className="text-xs font-semibold text-ink-faint tabular">{hover.control.id}</span>
            <span className="mt-1 text-sm font-semibold leading-snug">{hover.control.title}</span>
            <span className="mt-1 text-xs text-ink-soft">
              {STATUS_LABELS[hover.status]}
              {hover.status === "conforme" && !hover.proven ? ", sans preuve" : ""}
            </span>
          </>
        ) : (
          <>
            <span className="text-6xl font-bold tracking-tight tabular">{percent}</span>
            <span className="text-sm text-ink-soft">% de conformité prouvée</span>
          </>
        )}
      </div>
    </div>
  );
}
