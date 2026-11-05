import type { Condition, NextRound, ScheduleStatus } from './types';

const TZ = 'Asia/Bangkok';

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) + ' น.';
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return `${fmtDate(iso)} · ${fmtTime(iso)}`;
}

export function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '-' : `${Math.round(value * 100)}%`;
}

/** "HH:MM:SS" between now and ``iso`` (absolute value). */
export function countdown(iso: string, now: number = Date.now()): string {
  const total = Math.abs(Math.floor((new Date(iso).getTime() - now) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export const scheduleLabel: Record<ScheduleStatus, string> = {
  overdue: 'เกินกำหนด',
  due: 'ถึงกำหนดตรวจ',
  upcoming: 'ใกล้ถึงกำหนด',
};

export function scheduleText(round: NextRound | null): string {
  if (!round) return 'ไม่มีรอบตรวจคงเหลือ';
  const time = fmtTime(round.due_at);
  if (round.schedule_status === 'overdue') return `${time} เกินกำหนด ${countdown(round.due_at)}`;
  if (round.schedule_status === 'due') return `${time} ถึงกำหนดตรวจ`;
  return `${time} เหลือ ${countdown(round.due_at)}`;
}

export const conditionName: Record<Condition, string> = {
  infiltration: 'Infiltration',
  phlebitis: 'Phlebitis',
};

export const conditionThai: Record<Condition, string> = {
  infiltration: 'ภาวะสารน้ำรั่วออกนอกหลอดเลือด',
  phlebitis: 'ภาวะหลอดเลือดดำอักเสบ',
};

export const riskByGrade: Record<number, string> = { 0: 'ไม่พบ', 1: 'ต่ำ', 2: 'ปานกลาง', 3: 'สูง', 4: 'วิกฤต' };

export const qualityCheckLabels: Record<string, string> = {
  file_readable: 'เปิดไฟล์ภาพได้',
  color_image: 'เป็นภาพสี',
  short_side: 'ความละเอียดเพียงพอ',
  brightness_mean: 'แสงเพียงพอ',
  underexposure_fraction: 'ไม่มืดเกินไป',
  overexposure_fraction: 'ไม่สว่างจ้าเกินไป',
  brightness_std: 'คอนทราสต์เพียงพอ',
  dynamic_range_p95_p5: 'ช่วงแสงเหมาะสม',
  sharpness: 'ภาพคมชัด',
  arm_framing: 'เห็น IV Site ครบถ้วน',
};

export const holdReasonThai: Record<string, string> = {
  NO_ARM_CANDIDATE: 'ไม่พบแขนในภาพ กรุณาถ่ายภาพใหม่ให้เห็นแขนชัดเจน',
  MORE_THAN_FOUR_ARM_CANDIDATES: 'พบแขนในภาพมากเกินไป กรุณาถ่ายเฉพาะแขนที่มี IV Site',
  TARGET_SELECTION_AMBIGUOUS: 'ระบบไม่แน่ใจว่าแขนใดคือ IV Site กรุณาเลือกแขน',
  INVALID_MANUAL_TARGET_SELECTION: 'แขนที่เลือกไม่ถูกต้อง',
  NO_SAM2_PASS_CANDIDATE: 'ไม่สามารถแยกขอบเขตแขนได้ กรุณาถ่ายภาพใหม่',
  TARGET_SCORE_BELOW_FROZEN_THRESHOLD: 'ภาพแขนไม่ชัดเจนพอ กรุณาถ่ายภาพใหม่',
  LARGE_ROTATION: 'มุมกล้องเอียงมากเกินไป กรุณาถ่ายภาพใหม่',
};

export function holdMessage(reason: string | null | undefined): string {
  if (!reason) return 'AI ไม่สามารถออกผลได้ กรุณาถ่ายภาพใหม่';
  return holdReasonThai[reason] ?? `AI ไม่สามารถออกผลได้ (${reason}) กรุณาถ่ายภาพใหม่`;
}
