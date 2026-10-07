"use client";

import Link from "next/link";
import { Button, PageHeader } from "@/components/ui";
import { useWorkspace } from "@/lib/store";

export default function Journal() {
  const { workspace: ws, reset, mode } = useWorkspace();
  if (!ws) return null;

  return (
    <>
      <PageHeader
        title="Journal"
        description="Toutes les actions réalisées dans l'espace. C'est votre piste d'audit."
        actions={
          mode === "demo" && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm("Supprimer l'espace de démonstration et recommencer le cadrage ?")) reset();
              }}
            >
              Recommencer le cadrage
            </Button>
          )
        }
      />
      <ol className="divide-y divide-line rounded-lg border border-line bg-surface">
        {ws.activity.map((a) => (
          <li key={a.id} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[11rem_1fr]">
            <time className="text-ink-faint tabular" dateTime={a.at}>
              {new Date(a.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
            </time>
            <span>
              <span className="text-ink-soft">{a.actor} · </span>
              {a.controlId ? (
                <Link href={`/controles/${encodeURIComponent(a.controlId)}`} className="hover:underline">
                  {a.message}
                </Link>
              ) : (
                a.message
              )}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
