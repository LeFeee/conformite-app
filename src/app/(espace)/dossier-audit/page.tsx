"use client";

import type { ReactNode } from "react";
import { Button, StatusBadge } from "@/components/ui";
import { CONTROLS } from "@/lib/catalog/controls";
import { STATUS_LABELS, type ControlStatus } from "@/lib/catalog/types";
import { DOC_TEMPLATES } from "@/lib/documents";
import {
  computeAlerts,
  EVIDENCE_KIND_LABELS,
  evidenceFor,
  formatDate,
  frameworkScores,
  isEvidenceValid,
  scoreOf,
  today,
} from "@/lib/domain";
import { INCIDENT_STATUS_LABELS } from "@/lib/incidents";
import { IMPACT_LABELS, LIKELIHOOD_LABELS, RISK_LEVEL_LABELS, riskLevel, TREATMENT_LABELS } from "@/lib/risks";
import { useWorkspace } from "@/lib/store";
import { CRITICALITY_LABELS, DATA_ACCESS_LABELS, questionnaireScore } from "@/lib/suppliers";
import { AUDIENCE_LABELS, METHOD_LABELS, trainingStatus } from "@/lib/training";

function Chapter({ n, title, children, first }: { n: number; title: string; children: ReactNode; first?: boolean }) {
  return (
    <section className={first ? "mt-10" : "mt-14 print:break-before-page print:mt-0"}>
      <h2 className="border-b border-ink pb-2 text-xl font-bold">
        {n}. {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const th = "border-b border-line-strong py-2 pr-3 text-left font-semibold align-bottom";
const td = "border-b border-line py-2 pr-3 align-top";

export default function DossierAudit() {
  const { workspace: ws } = useWorkspace();
  if (!ws) return null;

  const total = scoreOf(ws, CONTROLS);
  const fws = frameworkScores(ws);
  const alerts = computeAlerts(ws);
  const annex = CONTROLS.filter((c) => c.id.startsWith("A."));
  const governance = CONTROLS.filter((c) => !c.id.startsWith("A.") && ws.controls[c.id]?.applicable);
  const withEvidence = CONTROLS.filter((c) => evidenceFor(ws, c.id).length > 0);
  const signedDocs = DOC_TEMPLATES.filter((t) => evidenceFor(ws, t.controlIds[0]).some((e) => e.title === t.title));
  const statusCounts = (["conforme", "en_cours", "a_faire"] as ControlStatus[]).map((s) => [
    s,
    CONTROLS.filter((c) => ws.controls[c.id]?.applicable && ws.controls[c.id].status === s).length,
  ] as const);
  const training = trainingStatus(ws.trainings, today());
  const targets = [ws.answers.targetIso27001 && "ISO/IEC 27001:2022", ws.answers.targetNis2 && "Directive NIS2"]
    .filter(Boolean)
    .join(" et ");

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="max-w-xl text-sm text-ink-soft">
          Le dossier à remettre à l&apos;auditeur ou à un client qui demande des garanties. Il se met à jour tout seul avec
          vos données.
        </p>
        <Button onClick={() => window.print()}>Imprimer ou enregistrer en PDF</Button>
      </div>

      <article className="rounded-lg border border-line bg-surface px-8 py-10 text-sm sm:px-12 print:border-0 print:p-0">
        <header className="border-b border-line pb-8">
          <p className="text-ink-soft">Dossier de conformité</p>
          <h1 className="mt-1 text-[2rem] font-bold leading-tight">{ws.answers.organizationName}</h1>
          <dl className="mt-6 grid grid-cols-[12rem_1fr] gap-y-1.5">
            <dt className="text-ink-soft">Activité</dt>
            <dd>{ws.answers.activity || "—"}</dd>
            <dt className="text-ink-soft">Référentiels visés</dt>
            <dd>{targets}</dd>
            <dt className="text-ink-soft">Situation NIS2</dt>
            <dd>{ws.nis2.label}</dd>
            <dt className="text-ink-soft">Édité le</dt>
            <dd>{formatDate(new Date().toISOString())}</dd>
          </dl>
        </header>

        <Chapter n={1} title="Synthèse" first>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-4xl font-bold tabular">{total.percent} %</p>
              <p className="text-ink-soft">de conformité prouvée</p>
            </div>
            {fws.map(({ framework, score }) => (
              <div key={framework.id}>
                <p className="text-4xl font-bold tabular">{score.percent} %</p>
                <p className="text-ink-soft">{framework.shortName}</p>
              </div>
            ))}
          </div>
          <table className="mt-6 w-full max-w-md">
            <tbody>
              {statusCounts.map(([s, n]) => (
                <tr key={s}>
                  <td className={td}>{STATUS_LABELS[s]}</td>
                  <td className={`${td} text-right tabular`}>{n}</td>
                </tr>
              ))}
              <tr>
                <td className={td}>Contrôles exclus (justifiés)</td>
                <td className={`${td} text-right tabular`}>{CONTROLS.length - total.applicable}</td>
              </tr>
              <tr>
                <td className={td}>Alertes en cours</td>
                <td className={`${td} text-right tabular`}>{alerts.length}</td>
              </tr>
              <tr>
                <td className={`${td} pl-4 text-ink-soft`}>dont critiques</td>
                <td className={`${td} text-right tabular`}>{alerts.filter((a) => a.severity === "critique").length}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-4 text-ink-soft">
            Méthode : un contrôle compte pour 100 % s&apos;il est conforme et appuyé par une preuve valide, 50 % s&apos;il est
            déclaré conforme sans preuve valide, 25 % s&apos;il est en cours.
          </p>
        </Chapter>

        {ws.answers.targetIso27001 && (
          <Chapter n={2} title="Déclaration d'applicabilité (annexe A)">
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Réf.</th>
                  <th className={th}>Mesure</th>
                  <th className={th}>Appl.</th>
                  <th className={th}>Justification</th>
                  <th className={th}>Statut</th>
                  <th className={`${th} text-right`}>Preuves</th>
                </tr>
              </thead>
              <tbody>
                {annex.map((c) => {
                  const oc = ws.controls[c.id];
                  const applicable = oc.applicable && oc.status !== "non_applicable";
                  return (
                    <tr key={c.id} className="break-inside-avoid">
                      <td className={`${td} tabular text-ink-soft`}>{c.id}</td>
                      <td className={td}>{c.title}</td>
                      <td className={td}>{applicable ? "Oui" : "Non"}</td>
                      <td className={`${td} text-ink-soft`}>
                        {applicable ? "Mesure retenue pour traiter les risques identifiés." : oc.exclusionReason}
                      </td>
                      <td className={td}>{applicable ? STATUS_LABELS[oc.status] : "—"}</td>
                      <td className={`${td} text-right tabular`}>{evidenceFor(ws, c.id).length || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Chapter>
        )}

        <Chapter n={3} title="Système de management et obligations NIS2">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Réf.</th>
                <th className={th}>Exigence</th>
                <th className={th}>Statut</th>
                <th className={th}>Responsable</th>
                <th className={`${th} text-right`}>Preuves</th>
              </tr>
            </thead>
            <tbody>
              {governance.map((c) => (
                <tr key={c.id} className="break-inside-avoid">
                  <td className={`${td} tabular text-ink-soft`}>{c.id}</td>
                  <td className={td}>{c.title}</td>
                  <td className={td}>
                    <StatusBadge status={ws.controls[c.id].status} />
                  </td>
                  <td className={td}>{ws.controls[c.id].owner ?? "—"}</td>
                  <td className={`${td} text-right tabular`}>{evidenceFor(ws, c.id).length || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Chapter>

        <Chapter n={4} title="Preuves">
          {withEvidence.length === 0 ? (
            <p className="text-ink-soft">Aucune preuve enregistrée pour le moment.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Contrôle</th>
                  <th className={th}>Preuve</th>
                  <th className={th}>Type</th>
                  <th className={th}>Ajoutée</th>
                  <th className={th}>Validité</th>
                </tr>
              </thead>
              <tbody>
                {withEvidence.flatMap((c) =>
                  evidenceFor(ws, c.id).map((e, i) => (
                    <tr key={e.id} className="break-inside-avoid">
                      <td className={`${td} tabular text-ink-soft`}>{i === 0 ? c.id : ""}</td>
                      <td className={td}>
                        {e.title}
                        {e.fileName && <span className="block text-xs text-ink-faint">{e.fileName}</span>}
                      </td>
                      <td className={td}>{EVIDENCE_KIND_LABELS[e.kind]}</td>
                      <td className={`${td} tabular`}>{formatDate(e.addedAt)}</td>
                      <td className={`${td} tabular ${isEvidenceValid(e) ? "" : "text-signal"}`}>
                        {e.validUntil ? `${isEvidenceValid(e) ? "Jusqu'au" : "Expirée le"} ${formatDate(e.validUntil)}` : "Sans limite"}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          )}
          {signedDocs.length > 0 && (
            <>
              <h3 className="mt-6 font-semibold">Documents signés</h3>
              <ul className="mt-2 list-disc pl-5">
                {signedDocs.map((t) => (
                  <li key={t.slug}>{t.title}</li>
                ))}
              </ul>
            </>
          )}
        </Chapter>

        <Chapter n={5} title="Registre des risques">
          {ws.risks.length === 0 ? (
            <p className="text-ink-soft">Aucun risque enregistré.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Risque</th>
                  <th className={th}>Probabilité</th>
                  <th className={th}>Impact</th>
                  <th className={th}>Niveau</th>
                  <th className={th}>Décision</th>
                  <th className={th}>Mesures en place</th>
                </tr>
              </thead>
              <tbody>
                {[...ws.risks]
                  .sort((a, b) => b.likelihood * b.impact - a.likelihood * a.impact)
                  .map((r) => {
                    const linked = r.controlIds.filter((id) => ws.controls[id]?.applicable);
                    const done = linked.filter((id) => ws.controls[id].status === "conforme").length;
                    return (
                      <tr key={r.id} className="break-inside-avoid">
                        <td className={td}>
                          {r.threat}
                          <span className="block text-xs text-ink-faint">{r.asset}</span>
                        </td>
                        <td className={td}>{LIKELIHOOD_LABELS[r.likelihood]}</td>
                        <td className={td}>{IMPACT_LABELS[r.impact]}</td>
                        <td className={`${td} font-semibold`}>{RISK_LEVEL_LABELS[riskLevel(r.likelihood, r.impact)]}</td>
                        <td className={td}>{TREATMENT_LABELS[r.treatment].split(" (")[0]}</td>
                        <td className={`${td} tabular`}>
                          {done}/{linked.length}
                          {linked.length > 0 && <span className="block text-xs text-ink-faint">{linked.join(", ")}</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </Chapter>

        <Chapter n={6} title="Registre des incidents">
          {ws.incidents.length === 0 ? (
            <p className="text-ink-soft">Aucun incident enregistré.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Détecté</th>
                  <th className={th}>Incident</th>
                  <th className={th}>Important</th>
                  <th className={th}>Notifications</th>
                  <th className={th}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {ws.incidents.map((i) => (
                  <tr key={i.id} className="break-inside-avoid">
                    <td className={`${td} tabular`}>{formatDate(i.detectedAt)}</td>
                    <td className={td}>
                      {i.title}
                      {i.lessons && <span className="block text-xs text-ink-faint">Retour d&apos;expérience : {i.lessons}</span>}
                    </td>
                    <td className={td}>{i.significant ? "Oui" : "Non"}</td>
                    <td className={`${td} text-xs`}>
                      {i.significant
                        ? [
                            ["Alerte", i.earlyWarningAt],
                            ["Notification", i.notificationAt],
                            ["Rapport final", i.finalReportAt],
                          ]
                            .map(([l, d]) => `${l} : ${d ? formatDate(d) : "non envoyé"}`)
                            .join(" · ")
                        : "—"}
                    </td>
                    <td className={td}>{INCIDENT_STATUS_LABELS[i.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Chapter>

        <Chapter n={7} title="Fournisseurs">
          {ws.suppliers.length === 0 ? (
            <p className="text-ink-soft">Aucun fournisseur recensé.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>Fournisseur</th>
                  <th className={th}>Criticité</th>
                  <th className={th}>Données</th>
                  <th className={th}>Contrat</th>
                  <th className={th}>Questionnaire</th>
                </tr>
              </thead>
              <tbody>
                {ws.suppliers.map((sup) => {
                  const score = questionnaireScore(sup.answers);
                  return (
                    <tr key={sup.id} className="break-inside-avoid">
                      <td className={td}>
                        {sup.name}
                        <span className="block text-xs text-ink-faint">
                          {sup.service}
                          {sup.certifications && ` · ${sup.certifications}`}
                        </span>
                      </td>
                      <td className={td}>{CRITICALITY_LABELS[sup.criticality]}</td>
                      <td className={td}>{DATA_ACCESS_LABELS[sup.dataAccess]}</td>
                      <td className={`${td} text-xs`}>
                        Clauses sécurité : {sup.hasSecurityClauses ? "oui" : "non"}
                        <br />
                        Accord RGPD : {sup.hasDpa ? "oui" : "non"}
                      </td>
                      <td className={`${td} tabular`}>
                        {score !== null ? `${score} %` : sup.questionnaireSentAt ? "Envoyé, sans réponse" : "Non envoyé"}
                        {sup.answeredAt && <span className="block text-xs text-ink-faint">{formatDate(sup.answeredAt)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Chapter>

        <Chapter n={8} title="Sensibilisation des équipes">
          {training.latestByPerson.length === 0 ? (
            <p className="text-ink-soft">Aucune sensibilisation enregistrée.</p>
          ) : (
            <>
              <p className="mb-4 text-ink-soft">
                {training.valid.length} personne{training.valid.length > 1 ? "s" : ""} à jour, {training.expired.length} à
                renouveler. Validité d&apos;une sensibilisation : un an.
              </p>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Personne</th>
                    <th className={th}>Fonction</th>
                    <th className={th}>Modalité</th>
                    <th className={th}>Date</th>
                    <th className={th}>Valable jusqu&apos;au</th>
                  </tr>
                </thead>
                <tbody>
                  {training.latestByPerson.map((t) => (
                    <tr key={t.id} className="break-inside-avoid">
                      <td className={td}>{t.person}</td>
                      <td className={td}>{AUDIENCE_LABELS[t.audience]}</td>
                      <td className={td}>
                        {METHOD_LABELS[t.method]}
                        {t.score !== null && ` (${t.score}/10)`}
                        {t.notes && <span className="block text-xs text-ink-faint">{t.notes}</span>}
                      </td>
                      <td className={`${td} tabular`}>{formatDate(t.date)}</td>
                      <td className={`${td} tabular`}>
                        {formatDate(t.validUntil)}
                        {t.validUntil < today() && <span className="block text-xs font-semibold">Expirée</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Chapter>

        <Chapter n={9} title="Journal des dernières actions">
          <table className="w-full">
            <tbody>
              {ws.activity.slice(0, 40).map((a) => (
                <tr key={a.id} className="break-inside-avoid">
                  <td className={`${td} w-40 tabular text-ink-soft`}>
                    {new Date(a.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className={td}>{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Chapter>
      </article>
    </>
  );
}
