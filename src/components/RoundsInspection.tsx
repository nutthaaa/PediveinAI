import React, { useState, useRef } from 'react';
import {
  Clock,
  Calendar,
  BedDouble,
  AlertTriangle,
  Search,
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

import { SkipRoundModal } from './SkipRoundModal';
import { api } from '../api/client';
import { useApi, useNow } from '../api/useApi';
import { countdown, fmtTime, pct, scheduleLabel } from '../api/format';
import { hnAn, selectRow, type SiteSelection } from '../api/selection';
import type { BoardRow } from '../api/types';

interface RoundsInspectionProps {
  onBack?: () => void;
  onInspectNeedle?: (item: SiteSelection) => void;
  onOpenPatient?: (item: SiteSelection) => void;
}

export const RoundsInspection: React.FC<RoundsInspectionProps> = ({ onInspectNeedle, onOpenPatient }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSkipPatient, setSelectedSkipPatient] = useState<any | null>(null);

  // Drag-to-scroll handlers
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

  const board = useApi(() => api.get<BoardRow[]>('/api/rounds/board'), []);
  const now = useNow(1000);

  const inspectionRows = (board.data ?? []).map((source) => {
    const round = source.next_round;
    const latest = source.latest_analysis;
    const schedule = round?.schedule_status ?? 'upcoming';
    const flaggedReview = (condition: 'infiltration' | 'phlebitis') => {
      const view = latest?.conditions[condition];
      if (!view) return 'normal';
      if (view.review) return view.review.finding === 'observation_found' ? 'review_confirmed' : 'normal';
      return view.flagged ? 'review_pending' : 'normal';
    };
    return {
      id: String(source.id),
      source,
      name: source.patient.full_name,
      hnAn: hnAn(source.patient),
      room: source.patient.ward,
      bed: source.patient.bed ?? '-',
      progress: `${Math.floor(source.elapsed_hours)} / ${source.duration_hours} ชม.`,
      roundText: round ? `รอบ ${round.round_no} / ${source.total_rounds}` : 'ไม่มีรอบคงเหลือ',
      usageStatus: `ใช้งานอยู่ · ทุก ${source.interval_hours} ชม.`,
      ivSiteTitle: source.location,
      ivSiteSub: `${source.label} · ${source.vein}`,
      scheduleStatus: schedule,
      scheduleTitle: scheduleLabel[schedule],
      scheduleText: round
        ? `${fmtTime(round.due_at)} · ${schedule === 'overdue' ? 'เกินกำหนด' : schedule === 'due' ? 'ถึงกำหนด' : 'เหลือ'}`
        : '-',
      scheduleTime: round && schedule !== 'due' ? countdown(round.due_at, now) : '',
      infStatus: flaggedReview('infiltration'),
      phleStatus: flaggedReview('phlebitis'),
      confidence: latest?.prediction_issued ? pct(latest.confidence) : '-',
      confidenceTime: latest ? `วิเคราะห์เวลา ${fmtTime(latest.created_at)}` : 'ยังไม่มีผล AI',
      needleBtnText: `ตรวจเข็ม #${source.needle_no}`,
      needleBtnStyle: schedule === 'upcoming' ? 'secondary' : 'primary'
    };
  });

  const counts = {
    due: inspectionRows.filter((r) => r.scheduleStatus === 'due').length,
    upcoming: inspectionRows.filter((r) => r.scheduleStatus === 'upcoming').length,
    skipped: (board.data ?? []).reduce((sum, r) => sum + r.skipped_rounds, 0),
    overdue: inspectionRows.filter((r) => r.scheduleStatus === 'overdue').length
  };

  const filteredRows = inspectionRows.filter((r) => {
    const matchSearch =
      r.name.includes(searchQuery) ||
      r.hnAn.includes(searchQuery) ||
      r.room.includes(searchQuery) ||
      r.bed.includes(searchQuery) ||
      r.ivSiteTitle.includes(searchQuery);

    if (statusFilter === 'overdue') return matchSearch && r.scheduleStatus === 'overdue';
    if (statusFilter === 'upcoming') return matchSearch && r.scheduleStatus === 'upcoming';
    if (statusFilter === 'due') return matchSearch && r.scheduleStatus === 'due';
    if (statusFilter === 'ai_review') return matchSearch && r.source.latest_analysis?.review_status === 'pending_review';
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <span className="text-[12px] font-bold text-blue-600 tracking-wide uppercase">
          คิวงานแยกตาม IV Site
        </span>
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight mt-0.5">
          รายการตรวจ IV Site ตามกำหนด
        </h1>
        <p className="text-slate-500 text-[13px] mt-1">
          ผู้ป่วยหนึ่งคนอาจมีหลายรายการ แต่ละเข็มแสดงหมายเลข ตำแหน่ง และช่วงติดตาม 2 หรือ 8 ชั่วโมงอย่างชัดเจน
        </p>
      </div>

      {/* 4 Summary Banner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Banner 1: ถึงกำหนดตรวจ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{counts.due}</div>
              <div className="text-[12px] text-slate-500 font-medium mt-1">ถึงกำหนดตรวจ</div>
            </div>
          </div>
        </div>

        {/* Banner 2: ใกล้ถึงกำหนด */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#14B8A6] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{counts.upcoming}</div>
              <div className="text-[12px] text-slate-500 font-medium mt-1">ใกล้ถึงกำหนด</div>
            </div>
          </div>
        </div>

        {/* Banner 3: ผู้ป่วยข้ามรอบ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#334155] text-white flex items-center justify-center shrink-0 shadow-xs">
              <BedDouble className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{counts.skipped}</div>
              <div className="text-[12px] text-slate-500 font-medium mt-1">รอบที่ข้าม (IV Site ที่ใช้งาน)</div>
            </div>
          </div>
        </div>

        {/* Banner 4: เกินกำหนด */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EF4444] text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900 leading-none">{counts.overdue}</div>
              <div className="text-[12px] text-slate-500 font-medium mt-1">เกินกำหนด</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ / HN / AN / Ward / เตียง"
            className="pl-9 pr-4 py-2 w-full rounded-xl border border-slate-200 text-[14px] bg-white focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 text-[14px] text-slate-600 self-end sm:self-auto">
          <span>สถานะ:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">ทั้งหมด</option>
            <option value="overdue">เกินกำหนด</option>
            <option value="upcoming">ใกล้ถึงกำหนด</option>
            <option value="due">ถึงกำหนดตรวจ</option>
            <option value="ai_review">รอทบทวนผล AI</option>
          </select>
        </div>
      </div>

      {/* Main Data Table Card */}
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
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1250px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[13px] font-bold text-slate-700">
                <th className="py-3.5 px-4 text-left">ผู้ป่วย</th>
                <th className="py-3.5 px-4">หอผู้ป่วย / เตียง</th>
                <th className="py-3.5 px-4">ความคืบหน้า</th>
                <th className="py-3.5 px-4">IV SITE</th>
                <th className="py-3.5 px-4">กำหนดตรวจ</th>
                <th className="py-3.5 px-4 text-center">ผล AI ล่าสุด INFILTRATION</th>
                <th className="py-3.5 px-4 text-center">ผล AI ล่าสุด PHLEBITIS</th>
                <th className="py-3.5 px-4 text-center">ระดับความเชื่อมั่น ของ AI ล่าสุด</th>
                <th className="py-3.5 px-4 text-center">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[14px]">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* ผู้ป่วย */}
                  <td className="py-4 px-4">
                    <button
                      onClick={() => !draggedFar && onOpenPatient?.(selectRow(row.source))}
                      className="font-bold text-slate-900 hover:text-[#1E58E6] hover:underline cursor-pointer text-left"
                    >
                      {row.name}
                    </button>
                    <div className="text-[12px] text-slate-400 font-normal mt-0.5">{row.hnAn}</div>
                    <span className="inline-flex items-center gap-1.5 bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full text-[11px] font-medium mt-1.5 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] stroke-[2.5]" />
                      <span>{row.source.patient.age_text ?? 'ลงทะเบียนแล้ว'}</span>
                    </span>
                  </td>

                  {/* หอผู้ป่วย / เตียง */}
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900">{row.room}</div>
                    <div className="text-[12px] text-slate-400 font-normal mt-0.5">{row.bed}</div>
                  </td>

                  {/* ความคืบหน้า */}
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900">{row.progress}</div>
                    <div className="text-[12px] text-[#2563EB] font-semibold mt-0.5">{row.roundText}</div>
                    {row.usageStatus.includes('ถอดแล้ว') ? (
                      <span className="inline-flex items-center gap-1 bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] px-3 py-0.5 rounded-full text-[11px] font-semibold mt-1.5 shadow-2xs">
                        {row.usageStatus}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] px-3 py-0.5 rounded-full text-[11px] font-semibold mt-1.5 shadow-2xs">
                        {row.usageStatus}
                      </span>
                    )}
                  </td>

                  {/* IV SITE */}
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900">{row.ivSiteTitle}</div>
                    {row.ivSiteSub && (
                      <div className="text-[12px] text-slate-400 font-normal mt-0.5">{row.ivSiteSub}</div>
                    )}
                  </td>

                  {/* กำหนดตรวจ */}
                  <td className="py-4 px-4">
                    {row.scheduleStatus === 'overdue' ? (
                      <div>
                        <span className="inline-flex items-center gap-1.5 bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] px-3 py-1 rounded-full text-[12px] font-semibold shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-[#DC2626] stroke-[2.2]" />
                          <span>{row.scheduleTitle}</span>
                        </span>
                        <div className="text-[12px] text-slate-500 font-normal mt-1.5">
                          {row.scheduleText} <span className="font-bold text-[#DC2626]">{row.scheduleTime}</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="inline-flex items-center gap-1.5 bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] px-3 py-1 rounded-full text-[12px] font-semibold shadow-2xs">
                          <Calendar className="w-3.5 h-3.5 text-[#2563EB] stroke-[2.2]" />
                          <span>{row.scheduleTitle}</span>
                        </span>
                        <div className="text-[12px] text-slate-500 font-normal mt-1.5">
                          {row.scheduleText} <span className="font-bold text-[#2563EB]">{row.scheduleTime}</span>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* ผล AI ล่าสุด INFILTRATION */}
                  <td className="py-4 px-4 text-center">
                    {row.infStatus === 'normal' ? (
                      <span className="bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] px-3.5 py-1.5 rounded-full text-[12px] font-semibold inline-flex items-center gap-2 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] stroke-[2]" />
                        <span>Infiltration ไม่พบข้อสังเกต</span>
                      </span>
                    ) : (
                      <button className="bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] hover:bg-[#DBEAFE] px-3.5 py-1.5 rounded-full text-[12px] font-bold inline-flex items-center gap-2 transition-all shadow-2xs cursor-pointer">
                        <Sparkles className="w-3.5 h-3.5 text-[#2563EB] stroke-[2]" />
                        <span>{row.infStatus === 'review_confirmed' ? 'Infiltration ยืนยันพบ' : 'Infiltration ควรตรวจสอบ'}</span>
                      </button>
                    )}
                  </td>

                  {/* ผล AI ล่าสุด PHLEBITIS */}
                  <td className="py-4 px-4 text-center">
                    {row.phleStatus === 'normal' ? (
                      <span className="bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] px-3.5 py-1.5 rounded-full text-[12px] font-semibold inline-flex items-center gap-2 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] stroke-[2]" />
                        <span>Phlebitis ไม่พบข้อสังเกต</span>
                      </span>
                    ) : (
                      <button className="bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] hover:bg-[#FEE2E2] px-3.5 py-1.5 rounded-full text-[12px] font-bold inline-flex items-center gap-2 transition-all shadow-2xs cursor-pointer">
                        <PhlebitisIcon className="w-3.5 h-3.5 text-[#DC2626]" />
                        <span>{row.phleStatus === 'review_confirmed' ? 'Phlebitis ยืนยันพบ' : 'Phlebitis ควรตรวจสอบ'}</span>
                      </button>
                    )}
                  </td>

                  {/* ระดับความเชื่อมั่น ของ AI ล่าสุด */}
                  <td className="py-4 px-4 text-center">
                    <div>
                      <div className="font-bold text-[#1E58E6] text-[14px]">{row.confidence}</div>
                      <div className="text-[11.5px] text-[#2563EB] font-normal mt-0.5">{row.confidenceTime}</div>
                    </div>
                  </td>

                  {/* การดำเนินการ */}
                  <td className="py-4 px-4 text-center w-36">
                    {row.needleBtnStyle === 'primary' ? (
                      <button
                        onClick={() => !draggedFar && onInspectNeedle?.(selectRow(row.source))}
                        className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13px] px-4 py-1.5 rounded-xl block w-full text-center shadow-xs cursor-pointer mb-1.5 transition-all"
                      >
                        {row.needleBtnText}
                      </button>
                    ) : (
                      <button
                        onClick={() => !draggedFar && onInspectNeedle?.(selectRow(row.source))}
                        className="bg-[#93C5FD] hover:bg-blue-400 text-white font-bold text-[13px] px-4 py-1.5 rounded-xl block w-full text-center shadow-xs cursor-pointer mb-1.5 transition-all"
                      >
                        {row.needleBtnText}
                      </button>
                    )}
                    <button
                      onClick={() => !draggedFar && setSelectedSkipPatient(row)}
                      className="border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-[13px] px-4 py-1.5 rounded-xl block w-full text-center shadow-2xs cursor-pointer bg-white transition-colors"
                    >
                      ข้ามรอบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            {board.loading ? 'กำลังโหลด...' : board.error ? <span className="text-red-600">{board.error}</span> : `ทั้งหมด ${filteredRows.length} รายการ`}
          </div>
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

      {/* Skip Round Modal */}
      {selectedSkipPatient && (
        <SkipRoundModal
          roundId={selectedSkipPatient.source.next_round?.id}
          patientName={selectedSkipPatient.name}
          ward={selectedSkipPatient.source.patient.ward}
          room={selectedSkipPatient.source.patient.room ?? '-'}
          bed={selectedSkipPatient.bed}
          dueTime={fmtTime(selectedSkipPatient.source.next_round?.due_at)}
          onClose={() => setSelectedSkipPatient(null)}
          onConfirmSuccess={() => {
            setSelectedSkipPatient(null);
            board.reload();
          }}
        />
      )}
    </div>
  );
};
