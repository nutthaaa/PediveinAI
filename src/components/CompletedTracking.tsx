import React, { useState } from 'react';
import { SinglePatientDetail } from './SinglePatientDetail';
import {
  FileText,
  LogOut,
  Archive,
  ArrowLeft,
  User,
  Home,
  RotateCcw,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { fmtDateTime } from '../api/format';
import { hnAn } from '../api/selection';
import type { CompletedRow } from '../api/types';

interface CompletedTrackingProps {
  onNavigate?: (nav: string) => void;
}

// Final review per condition that is still unconfirmed (AI flagged but not reviewed) for the site.
const pendingReviews = (row: CompletedRow, condition: 'any' | 'infiltration' | 'phlebitis') => {
  const latest = row.latest_analysis;
  if (!latest || latest.review_status !== 'pending_review') return 0;
  const missing = (['infiltration', 'phlebitis'] as const).filter((c) => !latest.conditions[c].review);
  return condition === 'any' ? missing.length : missing.filter((c) => c === condition).length;
};

export const CompletedTracking: React.FC<CompletedTrackingProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSummaryItem, setSelectedSummaryItem] = useState<any | null>(null);
  const [showRoundsHistory, setShowRoundsHistory] = useState(false);
  const [showPatientDetail, setShowPatientDetail] = useState(false);

  const completed = useApi(() => api.get<CompletedRow[]>('/api/tracking-completed'), []);

  const completedItems = (completed.data ?? []).map((source) => {
    const early = source.elapsed_hours < source.duration_hours;
    return {
      id: String(source.id),
      source,
      early,
      patientName: source.patient.full_name,
      hnAn: hnAn(source.patient),
      hisConfirmed: false,
      site: source.location,
      vein: `${source.label} · ${source.vein}`,
      duration: `${Math.floor(source.elapsed_hours)} / ${source.duration_hours} ชั่วโมง`,
      inspectionDetail: `ตรวจแล้ว ${source.completed_rounds} · ข้าม ${source.skipped_rounds} · พลาด ${source.missed_rounds} รอบ`,
      statusText: early ? 'สิ้นสุดก่อนกำหนด' : 'ครบ 168 ชั่วโมง'
    };
  });
  const fullCount = completedItems.filter((i) => !i.early).length;
  const earlyCount = completedItems.filter((i) => i.early).length;

  const filteredItems = completedItems.filter((item) => {
    const matchesSearch =
      item.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hnAn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.site.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'early') return matchesSearch && item.early;
    if (statusFilter === 'full') return matchesSearch && !item.early;
    return matchesSearch;
  });

  if (showPatientDetail || showRoundsHistory) {
    return (
      <SinglePatientDetail
        patientId={selectedSummaryItem?.source.patient.id}
        onBack={() => {
          setShowPatientDetail(false);
          setShowRoundsHistory(false);
        }}
        onViewSummaryReport={() => onNavigate?.('reports')}
        onViewGradeHistory={() => onNavigate?.('history')}
      />
    );
  }

  if (selectedSummaryItem) {
    return (
      <div className="space-y-6">
        {/* Top Back Link Navigation */}
        <div>
          <button
            onClick={() => setSelectedSummaryItem(null)}
            className="text-[#1E58E6] font-semibold text-[13px] hover:underline inline-flex items-center gap-1.5 cursor-pointer mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>รายการสิ้นสุดการติดตาม</span>
          </button>

          <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900 tracking-tight">
            {selectedSummaryItem.early ? 'สรุปการสิ้นสุดก่อนกำหนด' : 'สรุปการติดตามครบกำหนด'}
          </h1>
        </div>

        {/* Patient Identity Header Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0 shadow-2xs">
              <User className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {selectedSummaryItem.patientName}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#10B981] font-semibold text-[11px]">
                  <span>{selectedSummaryItem.source.label} · {selectedSummaryItem.site}</span>
                </span>
              </div>
              <div className="text-[13px] text-slate-500 font-medium">
                {selectedSummaryItem.hnAn}
                {selectedSummaryItem.source.patient.age_text ? ` · ${selectedSummaryItem.source.patient.age_text}` : ''}
              </div>
              <div className="text-[12px] text-slate-400 font-normal flex items-center gap-3 flex-wrap pt-0.5">
                <span>🏢 {selectedSummaryItem.source.patient.ward}</span>
                <span>{selectedSummaryItem.source.patient.room ?? '-'}</span>
                <span>🛏️ {selectedSummaryItem.source.patient.bed ?? '-'}</span>
                <span>สิ้นสุด {fmtDateTime(selectedSummaryItem.source.ended_at)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Green Main Discontinuation Banner */}
        <div className="bg-[#E6F9F0] border border-[#BBF7D0] rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0 text-[#047857]">
              <FileText className="w-5.5 h-5.5 text-[#047857]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#065F46] leading-tight">
                {selectedSummaryItem.early ? 'สิ้นสุดการติดตามก่อนกำหนด · ผู้ป่วยจำหน่ายกลับบ้าน' : 'ติดตามครบ 168 ชั่วโมง'}
              </h3>
              <p className="text-[13px] text-[#059669] font-normal mt-0.5">
                ชั่วโมงและรอบของทุก IV Site ถูกหยุดตามเวลาที่จำหน่าย โดยไม่ปรับยอดให้ครบ 168 ชั่วโมง
              </p>
            </div>
          </div>

          <div className="shrink-0 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#A7F3D0] text-blue-700 rounded-full text-[12px] font-bold shadow-2xs">
              <Home className="w-3.5 h-3.5 text-[#1E58E6]" />
              <span>จำหน่ายกลับบ้าน</span>
            </span>
          </div>
        </div>

        {/* 7 Summary Metric Cards Grid (Equal Sized Boxes) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <span className="text-[12px] text-slate-500 font-medium block">กำหนดตรวจทั้งหมด</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {selectedSummaryItem.source.total_rounds} <span className="text-[13px] font-normal text-slate-500">รอบ</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <span className="text-[12px] text-slate-500 font-medium block">ดำเนินการตรวจแล้ว</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {selectedSummaryItem.source.completed_rounds} <span className="text-[13px] font-normal text-slate-500">รอบ</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <span className="text-[12px] text-slate-500 font-medium block">ข้ามรอบ</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {selectedSummaryItem.source.skipped_rounds} <span className="text-[13px] font-normal text-slate-500">รอบ</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <span className="text-[12px] text-slate-500 font-medium block">ไม่ได้ตรวจตามรอบ</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {selectedSummaryItem.source.missed_rounds} <span className="text-[13px] font-normal text-slate-500">รอบ</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <span className="text-[12px] text-slate-500 font-medium block">ผล AI รอการทบทวน</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {pendingReviews(selectedSummaryItem.source, 'any')} <span className="text-[13px] font-normal text-slate-500">ครั้ง</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <span className="text-[12px] text-slate-500 font-medium block">Infiltration รอการทบทวน</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {pendingReviews(selectedSummaryItem.source, 'infiltration')} <span className="text-[13px] font-normal text-slate-500">ครั้ง</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <span className="text-[12px] text-slate-500 font-medium block">Phlebitis รอการทบทวน</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {pendingReviews(selectedSummaryItem.source, 'phlebitis')} <span className="text-[13px] font-normal text-slate-500">ครั้ง</span>
            </div>
          </div>
        </div>

        {/* Bottom Action Footer Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-[16px] font-bold text-slate-900 leading-snug">
              บันทึกการสิ้นสุดก่อนกำหนดเรียบร้อยแล้ว
            </h4>
            <p className="text-[13px] text-slate-500 font-normal mt-0.5">
              ข้อมูลก่อนจำหน่ายยังคงเรียกดูและตรวจสอบย้อนหลังได้
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
            <button
              onClick={() => setShowRoundsHistory(true)}
              className="px-4 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-slate-700 text-[13px] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>ดูประวัติการติดตามทั้งหมด</span>
            </button>
            <button
              onClick={() => setShowPatientDetail(true)}
              className="px-5 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-xl font-bold text-[13px] shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              กลับไปดูข้อมูลผู้ป่วย
            </button>
          </div>
        </div>

        {/* Bottom Disclaimer Banner */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950">
          <svg width="44" height="44" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
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
            <p className="text-blue-700 mt-0.5 text-[12px]">
              ผล AI ไม่ใช่การวินิจฉัย และทุกการบันทึกต้องได้รับการยืนยันโดยเจ้าหน้าที่
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <span className="text-[12px] font-bold text-blue-600 tracking-wide uppercase">
          สรุปการสิ้นสุดแยกตาม IV Site
        </span>
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight mt-0.5">
          รายการสิ้นสุดการติดตาม
        </h1>
        <p className="text-slate-500 text-[13px] mt-1">
          แยก IV Site ที่ครบ 168 ชั่วโมงจากการสิ้นสุดก่อนกำหนดเนื่องจากผู้ป่วยจำหน่ายกลับบ้าน โดยคงเวลาสะสมจริงของแต่ละเข็ม
        </p>
      </div>

      {/* 3 Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-2xl sm:text-[28px] font-bold text-slate-900 leading-none">
                {fullCount}
              </div>
            </div>
          </div>
          <span className="text-[13px] text-slate-500 font-medium">
            IV Site ครบ 168 ชั่วโมง
          </span>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#F97316] text-white flex items-center justify-center shrink-0 shadow-xs">
              <LogOut className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-2xl sm:text-[28px] font-bold text-slate-900 leading-none">
                {earlyCount}
              </div>
            </div>
          </div>
          <span className="text-[13px] text-slate-500 font-medium">
            IV Site สิ้นสุดก่อนกำหนด
          </span>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Archive className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-2xl sm:text-[28px] font-bold text-slate-900 leading-none">
                {completedItems.length}
              </div>
            </div>
          </div>
          <span className="text-[13px] text-slate-500 font-medium">
            จัดเก็บทั้งหมด
          </span>
        </div>
      </div>

      {/* Patients List Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Search & Filter Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ / HN / AN / Ward / เตียง"
              className="pl-9 pr-4 py-2 w-full rounded-xl border border-slate-200 text-[13px] bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 text-[13px] bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="all">สถานะ: ทั้งหมด</option>
                <option value="full">ครบกำหนด 168 ชม.</option>
                <option value="early">สิ้นสุดก่อนกำหนด</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* List Rows */}
        <div className="divide-y divide-slate-100">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
            >
              {/* Col 1: Patient Name & HN/AN */}
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                  {item.patientName}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[12px] text-slate-400 font-medium">
                    {item.hnAn}
                  </span>
                  {item.hisConfirmed && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#10B981] font-semibold text-[11px]">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      <span>ยืนยันจาก HIS</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Col 2: Site & Vein info */}
              <div className="md:w-52 shrink-0">
                <div className="font-bold text-slate-800 text-[13px]">
                  {item.site}
                </div>
                <div className="text-[12px] text-slate-500 mt-0.5">
                  {item.vein}
                </div>
              </div>

              {/* Col 3: Duration & Inspection Detail */}
              <div className="md:w-44 shrink-0">
                <div className="font-bold text-slate-900 text-[14px]">
                  {item.duration}
                </div>
                <div className="text-[12px] text-slate-500 mt-0.5">
                  {item.inspectionDetail}
                </div>
              </div>

              {/* Col 4: Status Pill Tag */}
              <div className="shrink-0 flex items-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4EA] text-[#10B981] font-medium text-[12px]">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{item.statusText}</span>
                </span>
              </div>

              {/* Col 5: Action Link */}
              <div className="shrink-0 flex items-center justify-end">
                <button
                  onClick={() => setSelectedSummaryItem(item)}
                  className="text-[#1E58E6] font-semibold text-[13px] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>ดูรายงานสรุป</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Table Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>{completed.loading ? 'กำลังโหลด...' : completed.error ? completed.error : `ทั้งหมด ${filteredItems.length} รายการ`}</div>
        </div>
      </div>

      {/* Bottom Disclaimer Banner */}
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
    </div>
  );
};
