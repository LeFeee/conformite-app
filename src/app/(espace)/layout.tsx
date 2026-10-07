"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, type ReactNode } from "react";
import { APP_NAME } from "@/lib/config";
import { computeAlerts } from "@/lib/domain";
import { useWorkspace } from "@/lib/store";

const NAV = [
  { href: "/tableau-de-bord", label: "Tableau de bord" },
  { href: "/controles", label: "Contrôles" },
  { href: "/risques", label: "Risques" },
  { href: "/incidents", label: "Incidents" },
  { href: "/fournisseurs", label: "Fournisseurs" },
  { href: "/documents", label: "Documents" },
  { href: "/applicabilite", label: "Déclaration d'applicabilité" },
  { href: "/nis2", label: "NIS2" },
  { href: "/certification", label: "Certification" },
  { href: "/dossier-audit", label: "Dossier d'audit" },
  { href: "/journal", label: "Journal" },
];

export default function EspaceLayout({ children }: { children: ReactNode }) {
  const { ready, workspace } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !workspace) router.replace("/demarrer");
  }, [ready, workspace, router]);

  const critical = useMemo(
    () => (workspace ? computeAlerts(workspace).filter((a) => a.severity === "critique").length : 0),
    [workspace],
  );

  if (!ready || !workspace) {
    return <div className="p-10 text-ink-soft">Chargement…</div>;
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr] print:block">
      <aside className="print:hidden border-b border-line bg-surface lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-4 px-5 py-4 lg:block">
          <div>
            <Link href="/" className="font-bold">
              {APP_NAME}
            </Link>
            <p className="mt-0.5 truncate text-sm text-ink-soft">{workspace.answers.organizationName}</p>
          </div>
        </div>
        <nav aria-label="Navigation principale" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-0.5 lg:pb-0">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center justify-between whitespace-nowrap rounded-md px-3 py-2 text-sm",
                  active ? "bg-ink font-semibold text-surface" : "text-ink-soft hover:bg-void hover:text-ink",
                )}
              >
                {item.label}
                {item.href === "/tableau-de-bord" && critical > 0 && (
                  <span className="ml-2 rounded-full bg-signal px-1.5 text-xs font-semibold text-white tabular" aria-label={`${critical} alertes critiques`}>
                    {critical}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 px-5 py-8 sm:px-10 lg:py-10 print:p-0">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
