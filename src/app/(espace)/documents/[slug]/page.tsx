"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { TEMPLATES_BY_SLUG, type Block } from "@/lib/documents";
import { addDays, evidenceFor, formatDate, today } from "@/lib/domain";
import { useWorkspace } from "@/lib/store";

function RenderBlock({ b }: { b: Block }) {
  if (b.kind === "p") return <p className="mt-3 leading-relaxed">{b.text}</p>;
  const Tag = b.kind === "steps" ? "ol" : "ul";
  return (
    <Tag className={`mt-3 space-y-1.5 pl-5 leading-relaxed ${b.kind === "steps" ? "list-decimal" : "list-disc"}`}>
      {b.items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </Tag>
  );
}

export default function DocumentPage() {
  const { slug } = useParams<{ slug: string }>();
  const tpl = TEMPLATES_BY_SLUG.get(slug);
  const { workspace: ws, addEvidence } = useWorkspace();
  const [justSigned, setJustSigned] = useState(false);

  if (!ws) return null;
  if (!tpl) {
    return (
      <p>
        Ce modèle n&apos;existe pas. <Link href="/documents" className="underline">Voir les modèles</Link>
      </p>
    );
  }

  const sections = tpl.render(ws);
  const targets = tpl.controlIds.filter((id) => ws.controls[id]?.applicable);
  const alreadySigned = evidenceFor(ws, tpl.controlIds[0]).some((e) => e.title === tpl.title);

  const markSigned = () => {
    for (const controlId of targets) {
      addEvidence({
        controlId,
        title: tpl.title,
        kind: "document",
        fileName: `${tpl.slug}-signe.pdf`,
        url: null,
        validUntil: addDays(today(), 365),
      });
    }
    setJustSigned(true);
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <nav className="text-sm text-ink-soft">
          <Link href="/documents" className="hover:underline">Modèles de documents</Link> / {tpl.title}
        </nav>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => window.print()}>
            Imprimer ou enregistrer en PDF
          </Button>
          <Button onClick={markSigned} disabled={alreadySigned || justSigned || targets.length === 0}>
            {alreadySigned || justSigned ? "Enregistré comme preuve" : "J'ai signé ce document"}
          </Button>
        </div>
      </div>
      {(justSigned || alreadySigned) && (
        <p className="mb-6 text-sm text-ink-soft print:hidden">
          Preuve ajoutée aux contrôles {targets.join(", ")}, valable un an. En mode démo, pensez à conserver le PDF signé de votre côté.
        </p>
      )}

      <article className="mx-auto max-w-[44rem] rounded-lg border border-line bg-surface px-8 py-10 text-[0.95rem] sm:px-14 print:max-w-none print:border-0 print:p-0">
        <p className="text-sm text-ink-soft">{ws.answers.organizationName}</p>
        <h1 className="mt-1 text-[1.75rem] font-bold leading-tight">{tpl.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">Version du {formatDate(today())} · Revue annuelle</p>

        {sections.map((s) => (
          <section key={s.heading} className="mt-8 break-inside-avoid">
            <h2 className="text-lg font-semibold">{s.heading}</h2>
            {s.blocks.map((b, i) => (
              <RenderBlock key={i} b={b} />
            ))}
          </section>
        ))}

        <div className="mt-12 grid gap-8 border-t border-line pt-6 text-sm sm:grid-cols-2">
          {tpl.signer === "direction" ? (
            <div>
              <p className="font-semibold">Pour la direction</p>
              <p className="mt-1 text-ink-soft">Nom, fonction, date et signature</p>
              <div className="mt-10 border-b border-line-strong" />
            </div>
          ) : (
            <>
              <div>
                <p className="font-semibold">Lu et approuvé par</p>
                <p className="mt-1 text-ink-soft">Nom, prénom, date et signature</p>
                <div className="mt-10 border-b border-line-strong" />
              </div>
              <div>
                <p className="font-semibold">Pour l&apos;entreprise</p>
                <p className="mt-1 text-ink-soft">Nom, fonction, date et signature</p>
                <div className="mt-10 border-b border-line-strong" />
              </div>
            </>
          )}
        </div>
      </article>
      <p className="mx-auto mt-4 max-w-[44rem] text-xs text-ink-faint print:hidden">
        Modèle générique à relire et adapter à votre situation avant signature. Les champs entre crochets sont à compléter.
      </p>
    </>
  );
}
