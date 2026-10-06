// Registre des incidents et échéances NIS2 art. 23 :
// alerte précoce sous 24 h, notification sous 72 h, rapport final sous 1 mois
// après la notification. Logique pure.

export type IncidentStatus = "ouvert" | "en_traitement" | "clos";

export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  ouvert: "Ouvert",
  en_traitement: "En traitement",
  clos: "Clos",
};

export interface Incident {
  id: string;
  title: string;
  description: string;
  detectedAt: string; // ISO date-heure
  significant: boolean; // incident important au sens de NIS2
  earlyWarningAt: string | null;
  notificationAt: string | null;
  finalReportAt: string | null;
  status: IncidentStatus;
  lessons: string;
  createdAt: string;
}

export type DeadlineKey = "earlyWarningAt" | "notificationAt" | "finalReportAt";

export interface Deadline {
  key: DeadlineKey;
  label: string;
  due: Date;
  doneAt: string | null;
  state: "fait" | "a_faire" | "en_retard";
  /** millisecondes restantes (négatif si dépassé) */
  remainingMs: number;
}

const H = 3_600_000;

export function incidentDeadlines(i: Incident, now = new Date()): Deadline[] {
  if (!i.significant) return [];
  const detected = new Date(i.detectedAt);
  const notifDue = new Date(detected.getTime() + 72 * H);
  const notifRef = i.notificationAt ? new Date(i.notificationAt) : notifDue;
  const finalDue = new Date(notifRef);
  finalDue.setMonth(finalDue.getMonth() + 1);

  const defs: [DeadlineKey, string, Date][] = [
    ["earlyWarningAt", "Alerte précoce (24 h)", new Date(detected.getTime() + 24 * H)],
    ["notificationAt", "Notification d'incident (72 h)", notifDue],
    ["finalReportAt", "Rapport final (1 mois)", finalDue],
  ];
  return defs.map(([key, label, due]) => {
    const doneAt = i[key];
    const remainingMs = due.getTime() - now.getTime();
    return {
      key,
      label,
      due,
      doneAt,
      remainingMs,
      state: doneAt ? "fait" : remainingMs < 0 ? "en_retard" : "a_faire",
    };
  });
}

export function formatRemaining(ms: number): string {
  const abs = Math.abs(ms);
  const d = Math.floor(abs / (24 * H));
  const h = Math.floor((abs % (24 * H)) / H);
  const m = Math.floor((abs % H) / 60_000);
  const txt = d > 0 ? `${d} j ${h} h` : h > 0 ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
  return ms < 0 ? `en retard de ${txt}` : `reste ${txt}`;
}
