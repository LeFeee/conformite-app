"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/domain";
import { useWorkspace } from "@/lib/store";
import { TRUST_ANSWER_LABELS, trustSheet, trustSheetText, type TrustAnswer } from "@/lib/trust";

const ANSWER_STYLE: Record<TrustAnswer, string> = {
  oui: "bg-ok-soft text-ok",
  en_cours: "bg-ochre-soft text-ochre-text",
  non: "bg-void text-ink-soft",
  na: "text-ink-faint",
  info: "hidden",
};

export default function FicheSecurite() {
  const { workspace: ws } = useWorkspace();
  const sections = useMemo(() => (ws ? trustSheet(ws) : []), [ws]);
  const [copied, setCopied] = useState(false);
  const [hideGaps, setHideGaps] = useState(false);
  if (!ws) return null;

  const items = sections.flatMap((s) => s.items);
  const yes = items.filter((i) => i.answer === "oui").length;
  const relevant = items.filter((i) => i.answer !== "na" && i.answer !== "info").length;
  const visible = sections
    .map((s) => ({ ...s, items: s.items.filter((i) => !(hideGaps && (i.answer === "non" || i.answer === "na"))) }))
    .filter((s) => s.items.length);

  const copy = async () => {
    const text = trustSheetText(ws, visible);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copiez la fiche :", text);
    }
  };

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title="Fiche sécurité pour vos clients"
          description="Les réponses aux questions que posent les clients et les acheteurs dans leurs questionnaires sécurité, tirées de l'état réel de votre démarche. À envoyer en PDF ou à coller dans un questionnaire."
          actions={
            <>
              <Button variant="secondary" onClick={copy}>
                {copied ? "Copiée" : "Copier en texte"}
              </Button>
              <Button onClick={() => window.print()}>Imprimer ou PDF</Button>
            </>
          }
        />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-5 py-3 text-sm">
          <p>
            <strong className="tabular">{yes}</strong> réponse{yes > 1 ? "s" : ""} positive{yes > 1 ? "s" : ""} sur {relevant}.{" "}
            <span className="text-ink-soft">Chaque réponse se met à jour quand vous avancez sur les contrôles.</span>
          </p>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--ink)]" checked={hideGaps} onChange={(e) => setHideGaps(e.target.checked)} />
            Masquer les points « pas encore » et non applicables
          </label>
        </div>
      </div>

      <article className="rounded-lg border border-line bg-surface px-8 py-10 sm:px-12 print:border-0 print:p-0">
        <header className="border-b border-line pb-6">
          <p className="text-sm uppercase tracking-[0.12em] text-ink-soft">Fiche sécurité</p>
          <h1 className="mt-2 text-[2rem] font-bold leading-tight">{ws.answers.organizationName}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {ws.answers.activity ? `${ws.answers.activity} · ` : ""}Établie le {formatDate(new Date().toISOString())}
          </p>
        </header>

        {visible.map((s) => (
          <section key={s.title} className="mt-8 break-inside-avoid">
            <h2 className="border-b border-ink pb-1.5 text-lg font-bold">{s.title}</h2>
            <dl className="divide-y divide-line">
              {s.items.map((i) => (
                <div key={i.id} className="grid gap-x-6 gap-y-1 py-3 sm:grid-cols-[1fr_9rem]">
                  <dt>
                    <p className="font-medium">{i.question}</p>
                    {i.detail && <p className="mt-0.5 text-sm text-ink-soft">{i.detail}</p>}
                    {i.proof && <p className="mt-0.5 text-xs text-ink-faint">Justificatif disponible sur demande.</p>}
                  </dt>
                  <dd className="sm:text-right">
                    <span className={clsx("inline-block rounded px-2 py-0.5 text-xs font-semibold", ANSWER_STYLE[i.answer])}>
                      {TRUST_ANSWER_LABELS[i.answer]}
                    </span>
                    {i.controlIds.length > 0 && (
                      <span className="mt-1 block text-xs text-ink-faint print:hidden">
                        {i.controlIds.map((id, k) => (
                          <span key={id}>
                            {k > 0 && ", "}
                            <Link href={`/controles/${encodeURIComponent(id)}`} className="hover:underline">
                              {id}
                            </Link>
                          </span>
                        ))}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <p className="mt-10 border-t border-line pt-4 text-xs text-ink-faint">
          Ces informations décrivent les mesures en place à la date indiquée. Elles ne valent pas certification. Pour toute
          question : {ws.controls["SMSI.5.3"]?.owner ?? "[contact sécurité]"}.
        </p>
      </article>
    </>
  );
}
