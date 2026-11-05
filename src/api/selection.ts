import { countdown, fmtTime, scheduleLabel } from './format';
import type { BoardRow, PatientBrief, Site } from './types';

/** Patient/IV-site context passed between screens (rounds -> inspect -> patient detail). */
export interface SiteSelection {
  patientId: number;
  siteId?: number;
  roundId?: number;
  name: string;
  hnAn: string;
  ward: string;
  room: string;
  bed: string;
  needle?: string;
  vein?: string;
  site?: string;
  progress?: string;
  round?: string;
  dueTimeText?: string;
  dueHighlight?: string;
}

export function hnAn(patient: PatientBrief): string {
  return patient.an ? `${patient.hn} · ${patient.an}` : patient.hn;
}

export function selectPatient(patient: PatientBrief): SiteSelection {
  return {
    patientId: patient.id,
    name: patient.full_name,
    hnAn: hnAn(patient),
    ward: patient.ward,
    room: patient.room ?? '-',
    bed: patient.bed ?? '-',
  };
}

export function selectSite(patient: PatientBrief, site: Site): SiteSelection {
  const round = site.next_round;
  return {
    ...selectPatient(patient),
    siteId: site.id,
    roundId: round?.id,
    needle: site.label,
    vein: site.vein,
    site: site.location,
    progress: `${Math.floor(site.elapsed_hours)} / ${site.duration_hours}`,
    round: round ? `รอบ ${round.round_no} / ${site.total_rounds}` : undefined,
    dueTimeText: round ? `กำหนดตรวจ ${fmtTime(round.due_at)} · ${scheduleLabel[round.schedule_status]}` : undefined,
    dueHighlight: round && round.schedule_status !== 'due' ? countdown(round.due_at) : undefined,
  };
}

export function selectRow(row: BoardRow): SiteSelection {
  return selectSite(row.patient, row);
}
