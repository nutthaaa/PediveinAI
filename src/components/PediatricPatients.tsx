import React, { useState, useRef } from 'react';
import { SinglePatientDetail } from './SinglePatientDetail';
import { CreateTrackingGroupModal } from './CreateTrackingGroupModal';
import { RegisterPatientModal } from './RegisterPatientModal';
import { api } from '../api/client';
import { useAuth } from '../api/auth';
import { useApi } from '../api/useApi';
import { fmtTime, pct } from '../api/format';
import { hnAn, selectPatient, type SiteSelection } from '../api/selection';
import type { Patient } from '../api/types';
import { StartIvMonitoring } from './StartIvMonitoring';
import {
  Search,
  Users,
  Calendar,
  Activity,
  FileText,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

const PhlebitisIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
    <path d="M12 4c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
    <path d="M15.5 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
  </svg>
);

interface PediatricPatientsProps {
  onAddFirstIvSite?: (patient: SiteSelection) => void;
  onInspectNeedle?: (patient: SiteSelection) => void;
  onOpenPatient?: (patient: SiteSelection) => void;
  onNavigate?: (nav: string) => void;
  /** Kept by the parent so returning from a patient reopens the same tab. */
  tab?: 'all' | 'my_patients';
  onTabChange?: (tab: 'all' | 'my_patients') => void;
}

export const PediatricPatients: React.FC<PediatricPatientsProps> = ({
  onAddFirstIvSite,
  onInspectNeedle,
  onOpenPatient,
  tab,
  onTabChange,
}) => {
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [localTab, setLocalTab] = useState<'all' | 'my_patients'>(tab ?? 'all');
  const activeTab = tab ?? localTab;
  const setActiveTab = (next: 'all' | 'my_patients') => {
    setLocalTab(next);
    onTabChange?.(next);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [startMonitoringPatient, setStartMonitoringPatient] = useState<any | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  // Drag-to-scroll states and handlers
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [draggedFar, setDraggedFar] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tableContainerRef.current) return;
    setIsDragging(true);
    setDraggedFar(false);
    setStartX(e.pageX - tableContainerRef.current.offsetLeft);
    setScrollLeftState(tableContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tableContainerRef.current) return;
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    if (Math.abs(walk) > 5) {
      setDraggedFar(true);
    }
    tableContainerRef.current.scrollLeft = scrollLeftState - walk;
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const patients = useApi(() => api.get<Patient[]>('/api/patients?status=all'), []);
  const { user } = useAuth();

  const aiStatus = (patient: Patient, condition: 'infiltration' | 'phlebitis') => {
    const latest = patient.sites
      .map((site) => site.latest_analysis)
      .filter((a) => a?.prediction_issued)
      .sort((a, b) => (a!.created_at < b!.created_at ? 1 : -1))[0];
    if (!latest) return patient.sites.some((s) => s.status === 'active') ? 'normal' : 'none';
    const view = latest.conditions[condition];
    if (view.review) return view.review.finding === 'observation_found' ? (condition === 'infiltration' ? 'review_blue' : 'review_red') : 'normal';
    return view.flagged ? (condition === 'infiltration' ? 'review_blue' : 'review_red') : 'normal';
  };

  const patientRows = (patients.data ?? []).map((patient) => {
    const active = patient.sites.filter((s) => s.status === 'active');
    const primary = active[0] ?? patient.sites[patient.sites.length - 1];
    const latest = patient.sites
      .map((s) => s.latest_analysis)
      .filter((a) => a?.prediction_issued)
      .sort((a, b) => (a!.created_at < b!.created_at ? 1 : -1))[0];
    return {
      id: String(patient.id),
      source: patient,
      name: patient.full_name,
      hnAn: hnAn(patient),
      hisConfirmed: false,
      room: `${patient.ward}${patient.room ? ` ${patient.room}` : ''}`,
      bed: patient.bed ?? '-',
      progress: primary ? `${Math.floor(primary.elapsed_hours)} / ${primary.duration_hours} ชม.` : '-',
      roundText: primary?.next_round
        ? `รอบ ${primary.next_round.round_no} · ทุก ${primary.interval_hours} ชม.`
        : patient.status === 'discharged' ? 'สิ้นสุดการติดตาม' : 'รอบ 0',
      ivSiteText: patient.sites.length === 0 ? 'ยังไม่มี IV Site' : `IV Site ${active.length} ตำแหน่ง (ทั้งหมด ${patient.sites.length})`,
      infStatus: aiStatus(patient, 'infiltration'),
      phleStatus: aiStatus(patient, 'phlebitis'),
      caregiver: patient.attending_nurse?.full_name ?? 'ไม่มีผู้รับผิดชอบ',
      caregiverRole: patient.attending_nurse?.position ?? '',
      confidence: latest ? pct(latest.confidence) : 'รอตรวจสอบ',
      confidenceTime: latest ? `วิเคราะห์เวลา ${fmtTime(latest.created_at)}` : '',
      actionType: patient.sites.length === 0 && patient.status === 'admitted' ? 'add_first' : 'view',
      actionText: patient.sites.length === 0 && patient.status === 'admitted' ? '+ เพิ่ม IV Site แรก' : `ดู ${patient.sites.length} IV Site`
    };
  });

  const myRows = patientRows.filter((r) => r.source.attending_nurse?.id === user.id);
  const counts = {
    notStarted: patientRows.filter((r) => r.source.status === 'admitted' && r.source.active_sites === 0).length,
    tracking: patientRows.filter((r) => r.source.active_sites > 0).length,
    ended: patientRows.filter((r) => r.source.status === 'discharged').length
  };

  const assignSelectedToMe = async () => {
    const ids = patientRows.filter((p) => selectedRows[p.id]).map((p) => p.source.id);
    await Promise.all(ids.map((id) => api.patch(`/api/patients/${id}`, { attending_nurse_id: user.id })));
    setSelectedRows({});
    await patients.reload();
  };

  const filteredRows = patientRows.filter(
    (r) =>
      r.name.includes(searchQuery) ||
      r.hnAn.includes(searchQuery) ||
      r.room.includes(searchQuery) ||
      r.bed.includes(searchQuery)
  );

  const openRow = (row: (typeof patientRows)[number]) => {
    if (onOpenPatient) onOpenPatient(selectPatient(row.source));
    else setSelectedPatient(row);
  };

  if (startMonitoringPatient) {
    return (
      <StartIvMonitoring
        patientData={selectPatient(startMonitoringPatient.source)}
        onBack={() => setStartMonitoringPatient(null)}
        onCancel={() => setStartMonitoringPatient(null)}
        onContinue={() => {
          const patient = startMonitoringPatient;
          setStartMonitoringPatient(null);
          setSelectedPatient(patient);
        }}
      />
    );
  }

  if (selectedPatient) {
    return (
      <SinglePatientDetail
        patientId={selectedPatient.source.id}
        onBack={() => {
          setSelectedPatient(null);
          patients.reload();
        }}
        onInspectNeedleNow={onInspectNeedle}
        onViewSummaryReport={() => setSelectedPatient(null)}
        onAddNewIvSite={() => {
          const patient = selectedPatient;
          setSelectedPatient(null);
          setStartMonitoringPatient(patient);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Header Section */}
      <div>
        <span className="text-[12px] font-bold text-blue-600 tracking-wider uppercase">
          PEDIATRIC PATIENT LIST
        </span>
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight mt-0.5">
          รายชื่อผู้ป่วยเด็ก
        </h1>
        <p className="text-slate-500 text-[13px] mt-1">
          แสดงเฉพาะผู้ป่วยในแผนกเด็ก และรวม Temporary Patient โดยไม่สร้าง HN ซ้ำ
        </p>
      </div>

      {/* 3 Summary Banner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: ยังไม่เริ่ม */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#F97316] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-none">{counts.notStarted}</div>
          </div>
          <div className="text-[13px] text-slate-500 font-medium">ยังไม่เริ่ม</div>
        </div>

        {/* Card 2: อยู่ระหว่างติดตาม */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0070F3] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-none">{counts.tracking}</div>
          </div>
          <div className="text-[13px] text-slate-500 font-medium">อยู่ระหว่างติดตาม</div>
        </div>

        {/* Card 3: สิ้นสุดการติดตาม */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-none">{counts.ended}</div>
          </div>
          <div className="text-[13px] text-slate-500 font-medium">สิ้นสุดการติดตาม</div>
        </div>
      </div>

      {/* Tabs Navigation Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs px-5 py-3 flex items-center gap-8 text-[14px]">
        <button
          onClick={() => setActiveTab('all')}
          className={`pb-1 font-bold transition-colors relative cursor-pointer ${activeTab === 'all'
              ? 'text-blue-600 after:absolute after:bottom-[-12px] after:left-0 after:right-0 after:h-[2.5px] after:bg-blue-600'
              : 'text-slate-500 font-medium hover:text-slate-800'
            }`}
        >
          รายการผู้ป่วยเด็กทั้งหมด ({patientRows.length})
        </button>
        <button
          onClick={() => setActiveTab('my_patients')}
          className={`pb-1 font-bold transition-colors relative cursor-pointer ${activeTab === 'my_patients'
              ? 'text-blue-600 after:absolute after:bottom-[-12px] after:left-0 after:right-0 after:h-[2.5px] after:bg-blue-600'
              : 'text-slate-500 font-medium hover:text-slate-800'
            }`}
        >
          ผู้ป่วยเด็กที่ฉันดูแล ({myRows.length})
        </button>
      </div>

      {/* Search and Action Bar Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input Box */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ / HN / เตียง"
            className="pl-9 pr-4 py-2 w-full rounded-xl border border-slate-200 text-[14px] bg-white focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        {/* Action Button (Visible on All Patients tab) */}
        <div className="flex items-center gap-2">
        <button
          onClick={() => setIsRegisterOpen(true)}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[14px] px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-2xs cursor-pointer"
        >
          <span>+ ลงทะเบียนผู้ป่วย</span>
        </button>
        {activeTab === 'all' && (
          <button
            disabled={!Object.values(selectedRows).some(Boolean)}
            onClick={() => setIsGroupModalOpen(true)}
            className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[14px] px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Users className="w-4 h-4 stroke-[2.2]" />
            <span>สร้างกลุ่มผู้ป่วยติดตาม</span>
          </button>
        )}
        </div>
      </div>

      {/* Main Patients Data Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div
          ref={tableContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className={`overflow-x-auto max-w-full custom-scrollbar select-none cursor-grab ${
            isDragging ? 'cursor-grabbing' : ''
          }`}
        >
          <table className={`w-full text-left border-collapse whitespace-nowrap ${activeTab === 'all' ? 'min-w-[1280px]' : 'min-w-[1180px]'}`}>
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[13px] font-bold text-slate-700">
                {activeTab === 'all' && <th className="py-3.5 px-4 w-10 text-center"></th>}
                <th className="py-3.5 px-4 text-left">ผู้ป่วย</th>
                <th className="py-3.5 px-4">หอผู้ป่วย / เตียง</th>
                <th className="py-3.5 px-4">ความคืบหน้า</th>
                <th className="py-3.5 px-4">IV SITE ทั้งหมด</th>
                <th className="py-3.5 px-4 text-center">ผล AI ล่าสุด INFILTRATION</th>
                <th className="py-3.5 px-4 text-center">ผล AI ล่าสุด PHLEBITIS</th>
                <th className="py-3.5 px-4">ผู้ดูแลคนไข้วันนี้</th>
                <th className="py-3.5 px-4 text-center">ระดับความเชื่อมั่น ของ AI ล่าสุด</th>
                <th className="py-3.5 px-4 text-center">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[14px]">
              {(activeTab === 'my_patients'
                ? myRows
                : filteredRows
              ).map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Custom Checkbox (Only on All Patients tab) */}
                  {activeTab === 'all' && (
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={!!selectedRows[row.id]}
                        onChange={() => toggleRow(row.id)}
                        className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-[#1453C7]"
                      />
                    </td>
                  )}

                  {/* Patient Info */}
                  <td className="py-4 px-4">
                    <button
                      onClick={() => !draggedFar && openRow(row)}
                      className="text-left font-bold text-slate-900 hover:text-[#1E58E6] hover:underline cursor-pointer"
                    >
                      {row.name}
                    </button>
                    <div className="text-[12px] text-slate-400 font-normal mt-0.5">{row.hnAn}</div>
                    {row.hisConfirmed && (
                      <span className="inline-flex items-center gap-1.5 bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full text-[11px] font-medium mt-1.5 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] stroke-[2.5]" />
                        <span>ยืนยันจาก HIS</span>
                      </span>
                    )}
                  </td>

                  {/* Ward / Bed */}
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900">{row.room}</div>
                    <div className="text-[12px] text-slate-400 font-normal mt-0.5">{row.bed}</div>
                  </td>

                  {/* Progress */}
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900">{row.progress}</div>
                    <div
                      className={`text-[12px] font-medium mt-0.5 ${
                        row.roundText.includes('รอบ 0') ? 'text-slate-400 font-normal' : 'text-[#2563EB]'
                      }`}
                    >
                      {row.roundText}
                    </div>
                  </td>

                  {/* IV Site Count */}
                  <td className="py-4 px-4">
                    <div
                      className={`text-[13px] ${
                        row.ivSiteText.includes('ยังไม่มี')
                          ? 'text-slate-400 font-normal'
                          : 'font-bold text-slate-800'
                      }`}
                    >
                      {row.ivSiteText}
                    </div>
                  </td>

                  {/* AI Latest Result: INFILTRATION */}
                  <td className="py-4 px-4 text-center">
                    {row.infStatus === 'none' && (
                      <div className="text-[12px] text-slate-400 font-normal leading-snug">
                        ยังไม่เริ่ม
                        <br />
                        ยังไม่สร้างกำหนดรอบตรวจ
                      </div>
                    )}
                    {row.infStatus === 'normal' && (
                      <span className="bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] px-3.5 py-1.5 rounded-full text-[12px] font-semibold inline-flex items-center gap-2 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] stroke-[2]" />
                        <span>Infiltration ไม่พบข้อสังเกต</span>
                      </span>
                    )}
                    {row.infStatus === 'review_blue' && (
                      <button
                        onClick={() => !draggedFar && openRow(row)}
                        className="bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#DBEAFE] px-3.5 py-1.5 rounded-full text-[12px] font-bold inline-flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#2563EB] stroke-[2]" />
                        <span>Infiltration ควรตรวจสอบ</span>
                      </button>
                    )}
                  </td>

                  {/* AI Latest Result: PHLEBITIS */}
                  <td className="py-4 px-4 text-center">
                    {row.phleStatus === 'none' && (
                      <div className="text-[12px] text-slate-400 font-normal leading-snug">
                        ยังไม่เริ่ม
                        <br />
                        ยังไม่สร้างกำหนดรอบตรวจ
                      </div>
                    )}
                    {row.phleStatus === 'review_red' && (
                      <button
                        onClick={() => !draggedFar && openRow(row)}
                        className="bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] hover:bg-[#FEE2E2] px-3.5 py-1.5 rounded-full text-[12px] font-bold inline-flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
                      >
                        <PhlebitisIcon className="w-3.5 h-3.5 text-[#DC2626]" />
                        <span>Phlebitis ควรตรวจสอบ</span>
                      </button>
                    )}
                    {row.phleStatus === 'normal' && (
                      <span className="bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] px-3.5 py-1.5 rounded-full text-[12px] font-semibold inline-flex items-center gap-2 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] stroke-[2]" />
                        <span>Phlebitis ไม่พบข้อสังเกต</span>
                      </span>
                    )}
                  </td>

                  {/* ผู้ดูแลคนไข้วันนี้ */}
                  <td className="py-4 px-4">
                    {row.caregiver === 'ไม่มีผู้รับผิดชอบ' ? (
                      <div className="text-[13px] text-slate-400 font-normal">ไม่มีผู้รับผิดชอบ</div>
                    ) : (
                      <div>
                        <div className="font-bold text-slate-900 text-[13.5px]">{row.caregiver}</div>
                        <div className="text-[12px] text-slate-400 font-normal mt-0.5">{row.caregiverRole || 'NICU Nurse'}</div>
                      </div>
                    )}
                  </td>

                  {/* ระดับความเชื่อมั่น ของ AI ล่าสุด */}
                  <td className="py-4 px-4 text-center">
                    {row.confidence === 'รอตรวจสอบ' ? (
                      <div className="text-[13px] text-slate-400 font-normal">รอตรวจสอบ</div>
                    ) : (
                      <div>
                        <div className="font-bold text-blue-600 text-[14px]">{row.confidence}</div>
                        <div className="text-[11.5px] text-blue-500 font-normal mt-0.5">{row.confidenceTime}</div>
                      </div>
                    )}
                  </td>

                  {/* การดำเนินการ */}
                  <td className="py-4 px-4 text-center">
                    {row.actionType === 'add_first' ? (
                      <button
                        onClick={() => {
                          if (!draggedFar) {
                            if (onAddFirstIvSite) {
                              onAddFirstIvSite(selectPatient(row.source));
                            } else {
                              setStartMonitoringPatient(row);
                            }
                          }
                        }}
                        className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13px] px-3.5 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
                      >
                        {row.actionText}
                      </button>
                    ) : (
                      <button
                        onClick={() => !draggedFar && openRow(row)}
                        className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[13px] px-3.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer"
                      >
                        {row.actionText}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            {patients.loading ? 'กำลังโหลด...' : patients.error ? <span className="text-red-600">{patients.error}</span> : `ทั้งหมด ${filteredRows.length} รายการ`}
          </div>
        </div>
      </div>
      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950 mt-6">
        <svg width="64" height="64" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
          <path
            d="M22.75 11.375L32.2292 15.1074V22.0391C32.2292 28.4375 28.2006 33.1297 22.75 35.6891C17.2995 33.1297 13.2709 28.4375 13.2709 22.0391V15.1074L22.75 11.375Z"
            stroke="#0369A1"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M18.6029 23.1054L21.3282 25.5581L27.0157 20.2261"
            stroke="#0369A1"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="text-[14px]">
          <div className="font-bold text-blue-900">
            AI เป็นเครื่องมือสนับสนุนการตรวจสอบภาพ
          </div>
          <p className="text-blue-700 mt-0.5">
            ผล AI ไม่ใช่การวินิจฉัย และทุกการบันทึกต้องได้รับการยืนยันโดยเจ้าหน้าที่
          </p>
        </div>
      </div>

      {isRegisterOpen && (
        <RegisterPatientModal
          onClose={() => setIsRegisterOpen(false)}
          onCreated={() => {
            setIsRegisterOpen(false);
            patients.reload();
          }}
        />
      )}

      {/* Modal Confirmation Popup */}
      {isGroupModalOpen && (
        <CreateTrackingGroupModal
          selectedPatients={patientRows.filter((p) => selectedRows[p.id])}
          onConfirmSuccess={assignSelectedToMe}
          onClose={(action) => {
            setIsGroupModalOpen(false);
            if (action === 'confirm_created_group') {
              setActiveTab('my_patients');
            }
          }}
        />
      )}
    </div>
  );
};
