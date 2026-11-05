import React, { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplet,
  FileText,
  LogOut,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  X
} from 'lucide-react';
import { SkipRoundModal } from './SkipRoundModal';
import { EndTrackingModal } from './EndTrackingModal';
import { StartIvMonitoring } from './StartIvMonitoring';
import { RemoveNeedleModal } from './RemoveNeedleModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { useAuth } from '../api/auth';
import { api } from '../api/client';
import { useApi, useNow } from '../api/useApi';
import { countdown, fmtDateTime, fmtTime, pct, riskByGrade, scheduleLabel } from '../api/format';
import { hnAn, selectPatient, selectSite, type SiteSelection } from '../api/selection';
import type { Analysis, Condition, Patient, RoundBrief, Site, SiteBrief } from '../api/types';

const PhlebitisIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
    <path d="M12 4c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
    <path d="M15.5 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
  </svg>
);

type RoundRow = RoundBrief & { site: SiteBrief; analysis: Analysis | null };

interface SinglePatientDetailProps {
  patientId?: number;
  onBack?: () => void;
  onViewSummaryReport?: () => void;
  onViewGradeHistory?: () => void;
  onViewTrackingHistory?: () => void;
  onViewInfiltrationDetail?: () => void;
  onViewPhlebitisDetail?: () => void;
  onInspectNeedleNow?: (selection: SiteSelection) => void;
  onAddNewIvSite?: () => void;
}

const RISK_COLORS = ['#10B981', '#10B981', '#F59E0B', '#F97316', '#DC2626'];

const genderText: Record<string, string> = { male: 'เพศชาย', female: 'เพศหญิง', other: 'เพศอื่นๆ' };

const statusPill = (site: Site, now: number) => {
  if (site.status === 'completed') {
    return { cls: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]', text: 'ครบกำหนดติดตาม' };
  }
  const round = site.next_round;
  if (!round) return { cls: 'bg-slate-50 text-slate-500 border-slate-200', text: 'ไม่มีรอบคงเหลือ' };
  if (round.schedule_status === 'overdue') {
    return { cls: 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]', text: `เกินกำหนด ${countdown(round.due_at, now)}` };
  }
  if (round.schedule_status === 'due') {
    return { cls: 'bg-orange-50 text-amber-800 border-orange-200', text: 'ถึงกำหนดตรวจ' };
  }
  return { cls: 'bg-blue-50 text-[#1E58E6] border-blue-200', text: `${fmtTime(round.due_at)} · เหลือ ${countdown(round.due_at, now)}` };
};

/** Latest clinician-confirmed result (or pending AI flag) of a condition for one site. */
const conditionSummary = (analyses: Analysis[], siteId: number, condition: Condition) => {
  const forSite = analyses.filter((a) => a.site.id === siteId);
  const reviewed = forSite.find((a) => a.conditions[condition].review);
  const latest = forSite[0];
  return {
    review: reviewed?.conditions[condition].review ?? null,
    latestView: latest?.conditions[condition] ?? null,
    latest
  };
};

export const SinglePatientDetail: React.FC<SinglePatientDetailProps> = ({
  patientId,
  onBack,
  onViewSummaryReport,
  onViewGradeHistory,
  onViewTrackingHistory,
  onViewInfiltrationDetail,
  onViewPhlebitisDetail,
  onInspectNeedleNow,
  onAddNewIvSite
}) => {
  const [viewMode, setViewMode] = useState<'single_site' | 'all_sites' | 'all_images'>('all_sites');
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [isEndTrackingModalOpen, setIsEndTrackingModalOpen] = useState(false);
  const [removeNeedleSite, setRemoveNeedleSite] = useState<Site | null>(null);
  const [isAddingIvSite, setIsAddingIvSite] = useState(false);
  const [isDeletingCase, setIsDeletingCase] = useState(false);
  const { user } = useAuth();
  const [previewImage, setPreviewImage] = useState<{ title: string; dateText: string; src: string } | null>(null);
  const now = useNow(1000);

  const patientQuery = useApi(() => api.get<Patient>(`/api/patients/${patientId}`), [patientId]);
  const roundsQuery = useApi(() => api.get<RoundRow[]>(`/api/patients/${patientId}/rounds`), [patientId]);
  const analysesQuery = useApi(() => api.get<Analysis[]>(`/api/patients/${patientId}/analyses`), [patientId]);

  const reloadAll = () => Promise.all([patientQuery.reload(), roundsQuery.reload(), analysesQuery.reload()]);

  const patient = patientQuery.data;
  const analyses = analysesQuery.data ?? [];
  const rounds = roundsQuery.data ?? [];

  if (!patientId) {
    return <div className="text-slate-500 text-[14px]">กรุณาเลือกผู้ป่วยจากรายการ</div>;
  }
  if (!patient) {
    return (
      <div className="text-[14px] text-slate-500">
        {patientQuery.error ? <span className="text-red-600">{patientQuery.error}</span> : 'กำลังโหลดข้อมูลผู้ป่วย...'}
      </div>
    );
  }

  const site = patient.sites.find((s) => s.id === selectedSiteId) ?? patient.sites.find((s) => s.status !== 'completed') ?? patient.sites[0];
  const isDischarged = patient.status === 'discharged';

  if (isAddingIvSite) {
    return (
      <StartIvMonitoring
        patientData={selectPatient(patient)}
        onBack={() => setIsAddingIvSite(false)}
        onCancel={() => setIsAddingIvSite(false)}
        onContinue={() => {
          setIsAddingIvSite(false);
          setViewMode('all_sites');
          reloadAll();
        }}
      />
    );
  }

  const inspect = (target: Site) => {
    if (onInspectNeedleNow && target.next_round) onInspectNeedleNow(selectSite(patient, target));
  };

  const header = (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0 shadow-2xs">
          <User className="w-6 h-6 stroke-[2]" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">{patient.full_name}</h1>
          <div className="text-[13px] text-slate-500 font-medium">
            {hnAn(patient)}
            {patient.age_text ? ` · ${patient.age_text}` : ''}
            {patient.gender ? ` · ${genderText[patient.gender] ?? patient.gender}` : ''}
            {patient.weight_kg ? ` · ${patient.weight_kg} กก.` : ''}
          </div>
          <div className="text-[12px] text-slate-400 font-normal flex items-center gap-3 flex-wrap pt-0.5">
            <span>🏢 {patient.ward}</span>
            {patient.room && <span>{patient.room}</span>}
            {patient.bed && <span>🛏️ {patient.bed}</span>}
            {patient.attending_nurse && <span>🩺 {patient.attending_nurse.full_name}</span>}
            {patient.diagnosis && <span>Dx: {patient.diagnosis}</span>}
          </div>
        </div>
      </div>
    </div>
  );

  const disclaimer = (
    <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950">
      <ShieldCheck className="w-8 h-8 text-[#1E58E6] shrink-0" />
      <div className="text-[14px]">
        <div className="font-bold text-blue-900">AI เป็นเครื่องมือสนับสนุนการตรวจสอบภาพ</div>
        <p className="text-blue-700 mt-0.5 text-[12px]">ผล AI ไม่ใช่การวินิจฉัย และทุกการบันทึกต้องได้รับการยืนยันโดยเจ้าหน้าที่</p>
      </div>
    </div>
  );

  const modals = (
    <>
      {isEndTrackingModalOpen && (
        <EndTrackingModal
          patientId={patient.id}
          patientName={patient.full_name}
          sites={patient.sites.filter((site) => site.status !== 'completed')}
          pendingReviews={analyses.filter((a) => a.review_status === 'pending_review').length}
          onClose={() => setIsEndTrackingModalOpen(false)}
          onConfirmSuccess={() => {
            setIsEndTrackingModalOpen(false);
            setViewMode('all_sites');
            reloadAll();
          }}
        />
      )}
      {isDeletingCase && (
        <ConfirmDeleteModal
          title="ลบเคสผู้ป่วยทั้งเคส"
          details={[
            { label: 'ผู้ป่วย', value: patient.full_name },
            { label: 'HN', value: patient.hn },
            { label: 'IV Site', value: `${patient.sites.length} ตำแหน่ง` },
            { label: 'ผลวิเคราะห์ AI', value: `${analyses.length} ครั้ง` },
            { label: 'สิ่งที่จะถูกลบ', value: 'IV Site รอบตรวจ ภาพ ผล AI และผลทบทวนทั้งหมด' }
          ]}
          endpoint={`/api/patients/${patient.id}/delete`}
          confirmText={patient.hn}
          onClose={() => setIsDeletingCase(false)}
          onDeleted={() => {
            setIsDeletingCase(false);
            onBack?.();
          }}
        />
      )}
      {removeNeedleSite && (
        <RemoveNeedleModal
          site={removeNeedleSite}
          needleNumber={removeNeedleSite.label}
          location={removeNeedleSite.location}
          onClose={() => setRemoveNeedleSite(null)}
          onConfirmSuccess={reloadAll}
        />
      )}
      {isSkipModalOpen && site?.next_round && (
        <SkipRoundModal
          roundId={site.next_round.id}
          patientName={patient.full_name}
          ward={patient.ward}
          room={patient.room ?? '-'}
          bed={patient.bed ?? '-'}
          dueTime={fmtTime(site.next_round.due_at)}
          onClose={() => setIsSkipModalOpen(false)}
          onConfirmSuccess={reloadAll}
        />
      )}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-5 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">{previewImage.title}</h3>
              <p className="text-[12.5px] text-slate-500">{previewImage.dateText}</p>
            </div>
            <img src={previewImage.src} alt={previewImage.title} className="w-full max-h-[70vh] object-contain rounded-2xl bg-slate-100" />
          </div>
        </div>
      )}
    </>
  );

  // ===========================================================================
  // MODE 1: ALL IV SITES
  // ===========================================================================
  if (viewMode === 'all_sites' || !site) {
    const counts = {
      total: patient.sites.length,
      active: patient.sites.filter((s) => s.status === 'active').length,
      removed: patient.sites.filter((s) => s.status === 'removed').length
    };
    return (
      <div className="space-y-6 animate-fadeIn">
        {modals}
        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <button
              onClick={onBack}
              className="text-[#1E58E6] font-semibold text-[13.5px] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>ย้อนกลับ</span>
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => setIsDeletingCase(true)}
                className="text-red-600 hover:bg-red-50 border border-red-200 font-semibold text-[13px] px-3 py-1.5 rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบเคสนี้</span>
              </button>
            )}
          </div>
          {header}
          {isDischarged && (
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs mt-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#059669] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#065F46] leading-snug">
                    สิ้นสุดการติดตาม · {fmtDateTime(patient.discharged_at)}
                  </h3>
                  <p className="text-[13px] text-[#047857] font-medium mt-0.5">
                    ระบบคงเวลาสะสม รอบตรวจ ภาพ ผล AI และ Grade ของทุก IV Site ไว้ครบถ้วน
                  </p>
                </div>
              </div>
              <button
                onClick={onViewSummaryReport}
                className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span>ดูรายงานสรุป</span>
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[12px] font-bold text-[#1E58E6] tracking-wide uppercase">แยกการติดตามเข็มอย่างอิสระ</span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">IV Site ทั้งหมดของผู้ป่วย</h2>
              <p className="text-[13px] text-slate-500 font-normal mt-1 leading-relaxed">
                แต่ละเข็มมีรอบ เวลา ภาพ ผล Infiltration, Phlebitis และ Grade ของตัวเอง
              </p>
            </div>
            {!isDischarged && (
              <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                <button
                  onClick={() => setIsEndTrackingModalOpen(true)}
                  className="bg-[#FF7A00] hover:bg-orange-600 text-white font-bold text-[13.5px] px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <LogOut className="w-4 h-4 rotate-180" />
                  <span>สิ้นสุดการติดตาม</span>
                </button>
                <button
                  onClick={() => (onAddNewIvSite ? onAddNewIvSite() : setIsAddingIvSite(true))}
                  className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>เพิ่ม IV Site ใหม่</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'ทั้งหมด', sub: 'IV Site', value: counts.total },
              { label: 'กำลังใช้งาน', sub: 'ติดตามตามรอบปกติ', value: counts.active },
              { label: 'ถอดแล้ว', sub: 'ติดตามต่อจนครบระยะ', value: counts.removed }
            ].map((card) => (
              <div key={card.label} className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-bold text-slate-900 block">{card.label}</span>
                  <span className="text-[11.5px] text-slate-400 font-normal block mt-0.5">{card.sub}</span>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">{card.value}</div>
              </div>
            ))}
          </div>

          {patient.sites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-[13px] text-slate-500">
              ยังไม่มี IV Site · กด “เพิ่ม IV Site ใหม่” เพื่อถ่ายภาพ Baseline และเริ่มติดตาม
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {patient.sites.map((s) => {
                const pill = statusPill(s, now);
                const inf = conditionSummary(analyses, s.id, 'infiltration');
                const phl = conditionSummary(analyses, s.id, 'phlebitis');
                const progress = Math.min((s.elapsed_hours / s.duration_hours) * 100, 100);
                return (
                  <div key={s.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 text-[#1E58E6]">
                        <Activity className="w-5 h-5 stroke-[2.2]" />
                        <span className="text-[15px] font-extrabold">IV {s.label}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-full text-[12px] font-semibold shadow-2xs ${pill.cls}`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{pill.text}</span>
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[14px] font-bold text-slate-900">
                          {s.location} · ด้าน{s.body_side}
                        </div>
                        <div className="text-[12px] text-slate-400 font-normal">{s.vein}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {([
                        ['infiltration', inf, 'bg-[#EFF6FF] border-[#BFDBFE]', 'text-[#1E58E6]'],
                        ['phlebitis', phl, 'bg-[#FEF2F2] border-[#FCA5A5]', 'text-[#DC2626]']
                      ] as const).map(([cond, sum, box, color]) => (
                        <div key={cond} className={`border rounded-2xl p-3.5 space-y-1 ${box}`}>
                          <div className={`w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center shrink-0 mb-1 ${color}`}>
                            {cond === 'infiltration' ? <Droplet className="w-4 h-4" /> : <PhlebitisIcon className="w-4 h-4" />}
                          </div>
                          <span className={`text-[11px] font-bold tracking-wider uppercase block ${color}`}>{cond}</span>
                          <div className="text-[14px] font-bold text-slate-800">
                            {sum.review ? `Grade ${sum.review.grade}` : sum.latestView?.flagged ? 'รอยืนยัน Grade' : 'ยังไม่มีข้อสังเกต'}
                          </div>
                          <div className="text-[11.5px] text-slate-400 font-normal">
                            {sum.latestView ? `ผล AI ล่าสุด · ${pct(sum.latestView.probability)}` : 'ยังไม่มีผล AI'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 grid grid-cols-3 gap-2 text-left">
                      <div>
                        <span className="text-[11.5px] text-slate-400 block font-normal">ความถี่</span>
                        <div className="text-[14px] font-bold text-slate-900 mt-0.5">{s.interval_hours} ชม.</div>
                      </div>
                      <div>
                        <span className="text-[11.5px] text-slate-400 block font-normal">รอบปัจจุบัน</span>
                        <div className="text-[14px] font-bold text-slate-900 mt-0.5">
                          {s.next_round ? `รอบ ${s.next_round.round_no}` : '-'}
                        </div>
                      </div>
                      <div>
                        <span className="text-[11.5px] text-slate-400 block font-normal">สะสม</span>
                        <div className="text-[14px] font-bold text-slate-900 mt-0.5">
                          {Math.floor(s.elapsed_hours)}/{s.duration_hours} ชม.
                        </div>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1E58E6] rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    {s.status === 'removed' && (
                      <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-2.5 text-[#D97706] text-[12px] font-medium">
                        ⚡ ถอดเข็มเมื่อ {fmtDateTime(s.removed_at)} · ติดตามต่อทุก {s.interval_hours} ชม. จนครบระยะเดิม
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => {
                          setSelectedSiteId(s.id);
                          setViewMode('single_site');
                        }}
                        className={`w-full bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[12.5px] py-2.5 rounded-xl shadow-2xs cursor-pointer ${
                          s.status !== 'active' ? 'col-span-2' : ''
                        }`}
                      >
                        {s.status === 'completed' ? `ดูประวัติ${s.label}` : 'เปิดดูการติดตามเข็มนี้'}
                      </button>
                      {s.status === 'active' && (
                        <button
                          onClick={() => setRemoveNeedleSite(s)}
                          className="w-full bg-[#FFFBEB] border border-[#FCD34D] hover:bg-amber-100 text-[#D97706] font-bold text-[12.5px] py-2.5 rounded-xl shadow-2xs cursor-pointer"
                        >
                          🔗 บันทึกถอดเข็ม
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {disclaimer}
      </div>
    );
  }

  // ===========================================================================
  // MODE 3: ALL IMAGES OF ONE SITE
  // ===========================================================================
  const siteRounds = rounds.filter((r) => r.site.id === site.id);
  const siteImages = [
    ...(site.baseline_image_url
      ? [{ src: site.baseline_image_url, title: 'ภาพอ้างอิงเริ่มต้น', at: site.started_at, tag: 'Baseline' }]
      : []),
    ...siteRounds
      .filter((r) => r.image_url)
      .slice()
      .reverse()
      .map((r) => ({ src: r.image_url!, title: `รอบ ${r.round_no}`, at: r.completed_at ?? r.due_at, tag: r.analysis?.condition_prediction ?? '' }))
  ];

  const backToSites = (
    <button
      onClick={() => setViewMode(viewMode === 'all_images' ? 'single_site' : 'all_sites')}
      className="text-[#1E58E6] font-semibold text-[13.5px] hover:underline inline-flex items-center gap-1.5 cursor-pointer mb-3"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{viewMode === 'all_images' ? 'กลับไปหน้าการติดตามเข็ม' : 'IV Site ทั้งหมดของผู้ป่วย'}</span>
    </button>
  );

  if (viewMode === 'all_images') {
    return (
      <div className="space-y-6 animate-fadeIn">
        {modals}
        <div>
          {backToSites}
          {header}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
          <div>
            <span className="text-[12px] font-bold text-[#1E58E6] tracking-wide">{site.label} · {site.location}</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">ภาพทั้งหมดของ IV Site</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">ทั้งหมด {siteImages.length} ภาพ · เรียงจากภาพแรก</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {siteImages.map((img) => (
              <button
                key={img.src}
                onClick={() => setPreviewImage({ title: img.title, dateText: fmtDateTime(img.at), src: img.src })}
                className="text-left space-y-1.5 cursor-pointer group"
              >
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-36">
                  <img src={img.src} alt={img.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  {img.tag && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-white/85 text-[10.5px] font-bold text-slate-800">
                      {img.tag}
                    </span>
                  )}
                </div>
                <div className="text-[13px] font-bold text-slate-900">{img.title}</div>
                <div className="text-[11.5px] text-slate-400">{fmtDateTime(img.at)}</div>
              </button>
            ))}
          </div>
        </div>
        {disclaimer}
      </div>
    );
  }

  // ===========================================================================
  // MODE 2: SINGLE SITE
  // ===========================================================================
  const pill = statusPill(site, now);
  const lastRound = siteRounds[0];
  const latestImage = siteRounds.find((r) => r.image_url);
  const progress = Math.min((site.elapsed_hours / site.duration_hours) * 100, 100);
  const gradeHistory = analyses
    .filter((a) => a.site.id === site.id)
    .flatMap((a) =>
      (['infiltration', 'phlebitis'] as const)
        .filter((c) => a.conditions[c].review)
        .map((c) => ({ condition: c, review: a.conditions[c].review!, analysis: a }))
    );

  return (
    <div className="space-y-6 animate-fadeIn">
      {modals}
      <div>
        {backToSites}
        {header}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0 shadow-2xs">
              <Activity className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-[12px] font-bold text-[#1E58E6] tracking-wide">
                {site.label} · {site.location} · {site.vein}
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">การติดตาม IV Site</h2>
              <p className="text-[12.5px] text-slate-500 mt-0.5">
                ตรวจทุก {site.interval_hours} ชั่วโมง · เริ่ม {fmtDateTime(site.started_at)} · ครบระยะ {fmtDateTime(site.ends_at)}
              </p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[12px] font-bold self-start sm:self-auto shadow-2xs ${pill.cls}`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{pill.text}</span>
          </span>
        </div>

        <div className="w-full h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
          <div className="h-full bg-[#1E58E6] rounded-full" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1">
            {[
              ['ระยะเวลาที่ติดตามแล้ว', `${Math.floor(site.elapsed_hours)} / ${site.duration_hours} ชม.`],
              ['รอบตรวจปัจจุบัน', site.next_round ? `รอบ ${site.next_round.round_no} / ${site.total_rounds}` : '-'],
              ['กำหนดตรวจ', site.next_round ? `${fmtTime(site.next_round.due_at)} · ${scheduleLabel[site.next_round.schedule_status]}` : '-'],
              ['ตรวจแล้ว / ข้าม / พลาด', `${site.completed_rounds} / ${site.skipped_rounds} / ${site.missed_rounds}`]
            ].map(([label, value]) => (
              <div key={label} className="space-y-0.5">
                <span className="text-[12px] text-slate-500 font-medium block">{label}</span>
                <div className="text-lg font-extrabold text-slate-900">{value}</div>
              </div>
            ))}
          </div>
          {site.next_round && !isDischarged && (
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => inspect(site)}
                className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>ตรวจเข็มตอนนี้</span>
              </button>
              <button
                onClick={() => setIsSkipModalOpen(true)}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[13.5px] px-4 py-2.5 rounded-xl shadow-2xs cursor-pointer"
              >
                ข้ามรอบ
              </button>
            </div>
          )}
        </div>

        {lastRound?.status === 'skipped' && (
          <div className="bg-[#0B2A5B] text-white rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="text-[13px]">
              <div className="font-bold">รอบ {lastRound.round_no} ถูกข้าม · {lastRound.skip_reason}</div>
              <div className="text-blue-200 text-[12px] mt-0.5">
                บันทึกโดย {lastRound.performed_by?.full_name ?? '-'} · {fmtDateTime(lastRound.completed_at)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3 text-[13px]">
          <h3 className="text-[15px] font-extrabold text-slate-900 border-b border-slate-100 pb-3">ข้อมูลผู้ป่วย</h3>
          {[
            ['HN / AN', hnAn(patient)],
            ['อายุ', patient.age_text ?? '-'],
            ['น้ำหนัก', patient.weight_kg ? `${patient.weight_kg} กก.` : '-'],
            ['การวินิจฉัย', patient.diagnosis ?? '-'],
            ['รับเข้า', fmtDateTime(patient.admitted_at)],
            ['พยาบาลผู้ดูแล', patient.attending_nurse?.full_name ?? '-']
          ].map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-3">
              <span className="text-slate-400">{label}</span>
              <span className="font-bold text-slate-900 text-right">{value}</span>
            </div>
          ))}
        </div>

        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-extrabold text-slate-900">เปรียบเทียบภาพ</h3>
            <button
              onClick={() => setViewMode('all_images')}
              className="text-[12.5px] text-[#1E58E6] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>ดูภาพทั้งหมด ({siteImages.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { src: site.baseline_image_url, title: 'ภาพอ้างอิงเริ่มต้น', at: site.started_at },
              { src: latestImage?.image_url ?? null, title: latestImage ? `ภาพล่าสุด · รอบ ${latestImage.round_no}` : 'ภาพล่าสุด', at: latestImage?.completed_at ?? null }
            ].map((img) => (
              <div key={img.title} className="space-y-1.5">
                <button
                  disabled={!img.src}
                  onClick={() => img.src && setPreviewImage({ title: img.title, dateText: fmtDateTime(img.at), src: img.src })}
                  className="block w-full h-48 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer disabled:cursor-default"
                >
                  {img.src ? (
                    <img src={img.src} alt={img.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[12px] text-slate-400">ยังไม่มีภาพรอบตรวจ</div>
                  )}
                </button>
                <div className="text-[13.5px] font-bold text-slate-900">{img.title}</div>
                <div className="text-[12px] text-slate-400">{fmtDateTime(img.at)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div>
          <h3 className="text-[16px] font-extrabold text-slate-900">Grade และระดับความเสี่ยงล่าสุด</h3>
          <p className="text-[12.5px] text-slate-500 mt-0.5">แสดงผลที่บุคลากรทางการแพทย์ยืนยันล่าสุดของเข็มนี้</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['infiltration', 'phlebitis'] as const).map((cond) => {
            const sum = conditionSummary(analyses, site.id, cond);
            const grade = sum.review?.grade ?? null;
            const isInf = cond === 'infiltration';
            return (
              <div key={cond} className={`rounded-2xl border p-5 space-y-4 ${isInf ? 'border-blue-200 bg-blue-50/30' : 'border-red-200 bg-red-50/30'}`}>
                <div className="flex items-center gap-2.5">
                  {isInf ? <Droplet className="w-5 h-5 text-[#1E58E6]" /> : <PhlebitisIcon className="w-5 h-5 text-[#DC2626]" />}
                  <span className={`text-[12px] font-bold uppercase tracking-wider ${isInf ? 'text-[#1E58E6]' : 'text-[#DC2626]'}`}>{cond}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-left">
                  <div>
                    <span className="text-[11.5px] text-slate-400 block">Grade ที่ยืนยัน</span>
                    <div className="text-lg font-extrabold text-slate-900">{grade !== null ? `Grade ${grade}` : '-'}</div>
                  </div>
                  <div>
                    <span className="text-[11.5px] text-slate-400 block">ความเสี่ยง</span>
                    <div className="text-lg font-extrabold" style={{ color: grade !== null ? RISK_COLORS[grade] : '#94A3B8' }}>
                      {grade !== null ? riskByGrade[grade] : '-'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11.5px] text-slate-400 block">ผล AI ล่าสุด</span>
                    <div className="text-lg font-extrabold text-[#1E58E6]">{pct(sum.latestView?.probability)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[12px] text-slate-500">
                  <span>{sum.review ? `ยืนยันโดย ${sum.review.reviewer?.full_name ?? '-'} · ${fmtDateTime(sum.review.updated_at)}` : 'ยังไม่มีผลที่ยืนยัน'}</span>
                  <button
                    onClick={isInf ? onViewInfiltrationDetail : onViewPhlebitisDetail}
                    className="text-[#1E58E6] font-semibold hover:underline cursor-pointer"
                  >
                    ดูรายละเอียด
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-extrabold text-slate-900">ประวัติ Grade ที่ยืนยัน</h3>
            <button onClick={onViewGradeHistory} className="text-[12.5px] text-[#1E58E6] font-semibold hover:underline cursor-pointer">
              ดูทั้งหมด
            </button>
          </div>
          {gradeHistory.length === 0 ? (
            <div className="text-[13px] text-slate-400 py-4 text-center">ยังไม่มีผลการทบทวน</div>
          ) : (
            <div className="divide-y divide-slate-100 text-[13px]">
              {gradeHistory.slice(0, 8).map(({ condition, review, analysis }) => (
                <div key={`${analysis.id}-${condition}`} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">
                      {condition === 'infiltration' ? 'Infiltration' : 'Phlebitis'} · Grade {review.grade}
                    </div>
                    <div className="text-[11.5px] text-slate-400">
                      {analysis.round ? `รอบ ${analysis.round.round_no} · ` : ''}
                      {review.reviewer?.full_name ?? '-'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold" style={{ color: RISK_COLORS[review.grade] }}>{riskByGrade[review.grade]}</div>
                    <div className="text-[11.5px] text-slate-400">{fmtDateTime(review.updated_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-extrabold text-slate-900">ประวัติรอบตรวจ</h3>
            <button onClick={onViewTrackingHistory} className="text-[12.5px] text-[#1E58E6] font-semibold hover:underline cursor-pointer">
              ดูทั้งหมด
            </button>
          </div>
          {siteRounds.length === 0 ? (
            <div className="text-[13px] text-slate-400 py-4 text-center">ยังไม่มีรอบที่ผ่านมา</div>
          ) : (
            <div className="divide-y divide-slate-100 text-[13px]">
              {siteRounds.slice(0, 10).map((r) => (
                <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {r.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    ) : r.status === 'skipped' ? (
                      <Calendar className="w-4 h-4 text-slate-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-red-500" />
                    )}
                    <div>
                      <div className="font-bold text-slate-900">
                        รอบ {r.round_no} · {fmtTime(r.due_at)}
                      </div>
                      <div className="text-[11.5px] text-slate-400">
                        {r.status === 'completed'
                          ? `ตรวจโดย ${r.performed_by?.full_name ?? '-'}`
                          : r.status === 'skipped'
                            ? `ข้ามรอบ: ${r.skip_reason}`
                            : 'ไม่ได้ตรวจตามกำหนด'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[12px]">
                    {r.analysis?.prediction_issued ? (
                      <span className="font-bold text-slate-700">
                        AI: {r.analysis.condition_prediction} {pct(r.analysis.confidence)}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {disclaimer}
    </div>
  );
};
