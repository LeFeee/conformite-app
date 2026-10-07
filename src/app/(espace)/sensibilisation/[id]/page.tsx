"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui";
import { formatDate } from "@/lib/domain";
import { useWorkspace } from "@/lib/store";
import { AUDIENCE_LABELS, METHOD_LABELS, QUIZ } from "@/lib/training";

export default function Attestation() {
  const { id } = useParams<{ id: string }>();
  const { workspace: ws } = useWorkspace();
  if (!ws) return null;
  const t = ws.trainings.find((x) => x.id === id);
  if (!t) {
    return (
      <p>
        Cette attestation n&apos;existe pas ou a été retirée.{" "}
        <Link href="/sensibilisation" className="underline">
          Retour au registre
        </Link>
      </p>
    );
  }

  const org = ws.answers.organizationName || "l'organisation";
  const topics = QUIZ.map((q) => q.id);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/sensibilisation" className="text-sm text-ink-soft hover:text-ink">
          ← Registre de sensibilisation
        </Link>
        <Button onClick={() => window.print()}>Imprimer ou enregistrer en PDF</Button>
      </div>

      <article className="mx-auto max-w-2xl rounded-lg border border-line bg-surface p-10 print:max-w-none print:border-0 print:p-0">
        <p className="text-sm uppercase tracking-[0.12em] text-ink-soft">{org}</p>
        <h1 className="mt-6 text-3xl font-bold tracking-[-0.01em]">Attestation de sensibilisation à la sécurité de l&apos;information</h1>

        <p className="mt-8 leading-relaxed">
          Nous attestons que <strong>{t.person}</strong> ({AUDIENCE_LABELS[t.audience].toLowerCase()}) a suivi une
          sensibilisation à la sécurité de l&apos;information le <strong>{formatDate(t.date)}</strong>.
        </p>

        <dl className="mt-8 grid grid-cols-[11rem_1fr] gap-y-2 text-sm">
          <dt className="text-ink-soft">Modalité</dt>
          <dd>{METHOD_LABELS[t.method]}</dd>
          {t.score !== null && (
            <>
              <dt className="text-ink-soft">Résultat</dt>
              <dd className="tabular">{t.score} bonnes réponses sur 10</dd>
            </>
          )}
          {t.notes && (
            <>
              <dt className="text-ink-soft">Sujet ou organisme</dt>
              <dd>{t.notes}</dd>
            </>
          )}
          <dt className="text-ink-soft">Valable jusqu&apos;au</dt>
          <dd>{formatDate(t.validUntil)}</dd>
          <dt className="text-ink-soft">Exigences couvertes</dt>
          <dd>
            ISO/IEC 27001:2022 §7.3 et mesure A.6.3
            {t.audience === "dirigeant" ? " ; directive NIS2, article 20 §2" : " ; directive NIS2, article 21 §2 g"}
          </dd>
        </dl>

        {t.method === "quiz" && (
          <p className="mt-8 text-sm text-ink-soft">
            Thèmes abordés : hameçonnage, mots de passe, double authentification, supports amovibles, fraude au faux RIB,
            faux support technique, Wi-Fi public, verrouillage du poste, mises à jour, signalement des erreurs et violations de
            données ({topics.length} situations).
          </p>
        )}

        <div className="mt-16 grid grid-cols-2 gap-10 text-sm">
          <div>
            <p className="text-ink-soft">Signature de la personne</p>
            <div className="mt-12 border-t border-line-strong" />
          </div>
          <div>
            <p className="text-ink-soft">Pour {org}</p>
            <div className="mt-12 border-t border-line-strong" />
          </div>
        </div>

        <p className="mt-10 text-xs text-ink-faint">Référence {t.id} · document généré le {formatDate(new Date().toISOString())}</p>
      </article>
    </>
  );
}
