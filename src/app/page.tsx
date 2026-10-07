"use client";

import { ButtonLink } from "@/components/ui";
import { APP_NAME } from "@/lib/config";
import { CONTROLS } from "@/lib/catalog/controls";
import { useWorkspace } from "@/lib/store";

const POINTS: [string, string][] = [
  [
    "Un parcours guidé, pas un tableau vide",
    "Six courtes étapes de questions suffisent pour savoir si NIS2 vous concerne et quelles mesures s'appliquent à vous. Les exclusions sont justifiées automatiquement.",
  ],
  [
    "Une mesure, une preuve, deux référentiels",
    `Les ${CONTROLS.length} contrôles couvrent à la fois ISO 27001 et NIS2. Vous prouvez une fois, la preuve compte partout.`,
  ],
  [
    "Des preuves de terrain acceptées",
    "Registre papier scanné, photo d'une armoire fermée, contrat signé : pas besoin de connecter des outils cloud pour avancer.",
  ],
  [
    "Des alertes avant l'auditeur",
    "Preuve qui expire, échéance dépassée, revue oubliée : vous êtes prévenu avant que ça devienne un écart d'audit.",
  ],
];

export default function Home() {
  const { workspace, ready, mode } = useWorkspace();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 sm:py-16">
      <div className="flex items-center justify-between">
        <span className="font-bold">{APP_NAME}</span>
        {ready && workspace ? (
          <ButtonLink href="/tableau-de-bord" variant="secondary">
            Ouvrir mon espace
          </ButtonLink>
        ) : (
          mode === "supabase" && (
            <ButtonLink href="/connexion" variant="secondary">
              Se connecter
            </ButtonLink>
          )
        )}
      </div>

      <section className="mt-16 max-w-3xl sm:mt-24">
        <h1 className="text-4xl font-bold leading-[1.1] tracking-[-0.02em] sm:text-[3.5rem]">
          ISO 27001 et NIS2, menés comme un dossier bien tenu.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-ink-soft">
          Pour les TPE et PME sans équipe sécurité : vous savez quoi faire, dans quel ordre,
          et vous gardez chaque preuve prête pour l&apos;audit.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={workspace ? "/tableau-de-bord" : "/demarrer"}>
            {workspace ? "Reprendre ma démarche" : "Commencer le cadrage"}
          </ButtonLink>
        </div>
        {mode === "demo" && (
          <p className="mt-3 text-sm text-ink-faint">
            Version de démonstration : vos données restent dans ce navigateur.
          </p>
        )}
      </section>

      <dl className="mt-20 grid gap-x-12 gap-y-10 border-t border-line pt-10 sm:grid-cols-2">
        {POINTS.map(([title, text]) => (
          <div key={title}>
            <dt className="font-semibold">{title}</dt>
            <dd className="mt-2 text-ink-soft">{text}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
