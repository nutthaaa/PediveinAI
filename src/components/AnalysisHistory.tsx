import React, { useState, useRef } from 'react';
import { Search, ChevronDown, X, AlertTriangle, Droplets, Activity, CheckCircle2 } from 'lucide-react';

const PhlebitisIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 6c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6" />
    <path d="M12 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6" />
    <path d="M15.5 6c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6" />
  </svg>
);

const InfiltrationIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
  </svg>
);

const HisCheckIcon = () => (
  <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

interface HistoricalLogItem {
  id: string;
  patientName: string;
  hn: string;
  an: string;
  ward: string;
  bed: string;
  type: 'phlebitis' | 'infiltration';
  grade: string;
  aiConfidence: string;
  site: string;
  vein: string;
  needle: string;
  reviewer: string;
  timestamp: string;
  continuousStatus: string;
  riskLevel?: 'ต่ำ' | 'ปานกลาง' | 'สูง' | 'วิกฤต';
}

interface AnalysisHistoryProps {
  onNavigate?: (nav: string) => void;
}

export const AnalysisHistory: React.FC<AnalysisHistoryProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<HistoricalLogItem | null>(null);

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

  const historyLogs: HistoricalLogItem[] = [
    {
      id: '1',
      patientName: 'ชื่อ-นามสกุลคนไข้ A1',
      hn: 'HN34567890',
      an: 'AN26080918',
      ward: 'PICU',
      bed: 'เตียง A02',
      type: 'phlebitis',
      grade: 'Grade 4',
      aiConfidence: 'ความเชื่อมั่น AI 91%',
      site: 'หลังมือซ้าย',
      vein: 'Cephalic vein',
      needle: 'เข็ม #1',
      reviewer: 'เจ้าหน้าที่ ชื่อ-นามสกุล',
      timestamp: '25 ส.ค. 2569 18:45',
      continuousStatus: 'ยืนยันไม่พบข้อสังเกต'
    },
    {
      id: '2',
      patientName: 'ชื่อ-นามสกุลคนไข้ A1',
      hn: 'HN34567890',
      an: 'AN26080918',
      ward: 'PICU',
      bed: 'เตียง A02',
      type: 'infiltration',
      grade: 'Grade 0',
      aiConfidence: 'ความเชื่อมั่น AI 96%',
      site: 'หลังมือขวา',
      vein: 'Cephalic vein',
      needle: 'เข็ม #1',
      reviewer: 'เจ้าหน้าที่ ชื่อ-นามสกุล',
      timestamp: '25 ส.ค. 2569 18:45',
      continuousStatus: 'ยืนยันไม่พบข้อสังเกต'
    },
    {
      id: '3',
      patientName: 'เด็กชายสมชาย ใจดี',
      hn: 'HN56789012',
      an: 'AN26080919',
      ward: 'PICU',
      bed: 'เตียง B04',
      type: 'phlebitis',
      grade: 'Grade 3',
      aiConfidence: 'ความเชื่อมั่น AI 94.8%',
      site: 'ท่อนแขนซ้าย',
      vein: 'Median cubital vein',
      needle: 'เข็ม #1',
      reviewer: 'พว. สมศรี รักษ์ดี',
      timestamp: '25 ส.ค. 2569 16:30',
      continuousStatus: 'ยืนยันไม่พบข้อสังเกต'
    },
    {
      id: '4',
      patientName: 'เด็กหญิงปิยะดา รักษ์ดี',
      hn: 'HN56789013',
      an: 'AN26080920',
      ward: 'PICU',
      bed: 'เตียง A02',
      type: 'infiltration',
      grade: 'Grade 2',
      aiConfidence: 'ความเชื่อมั่น AI 91.2%',
      site: 'หลังมือขวา',
      vein: 'Metacarpal vein',
      needle: 'เข็ม #2',
      reviewer: 'พว. นภา วงศ์สว่าง',
      timestamp: '25 ส.ค. 2569 14:15',
      continuousStatus: 'ยืนยันไม่พบข้อสังเกต'
    },
    {
      id: '5',
      patientName: 'เด็กชายกิตติศักดิ์ มั่นคง',
      hn: 'HN56789014',
      an: 'AN26080921',
      ward: 'PICU',
      bed: 'เตียง C12',
      type: 'infiltration',
      grade: 'Grade 0',
      aiConfidence: 'ความเชื่อมั่น AI 98.7%',
      site: 'หลังมือขวา',
      vein: 'Cephalic vein',
      needle: 'เข็ม #1',
      reviewer: 'พว. อารีรัตน์ มั่นใจ',
      timestamp: '25 ส.ค. 2569 12:00',
      continuousStatus: 'ยืนยันไม่พบข้อสังเกต'
    },
    {
      id: '6',
      patientName: 'เด็กหญิงนภา วงศ์สว่าง',
      hn: 'HN56789015',
      an: 'AN26080922',
      ward: 'PICU',
      bed: 'เตียง B12',
      type: 'phlebitis',
      grade: 'Grade 1',
      aiConfidence: 'ความเชื่อมั่น AI 89.4%',
      site: 'ท่อนแขนขวา',
      vein: 'Basilic vein',
      needle: 'เข็ม #1',
      reviewer: 'พว. นภา วงศ์สว่าง',
      timestamp: '25 ส.ค. 2569 10:00',
      continuousStatus: 'ยืนยันไม่พบข้อสังเกต'
    }
  ];

  // Filtering Logic
  const filteredLogs = historyLogs.filter((log) => {
    if (statusFilter === 'phlebitis' && log.type !== 'phlebitis') return false;
    if (statusFilter === 'infiltration' && log.type !== 'infiltration') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.patientName.toLowerCase().includes(q) ||
        log.hn.toLowerCase().includes(q) ||
        log.an.toLowerCase().includes(q) ||
        log.ward.toLowerCase().includes(q) ||
        log.bed.toLowerCase().includes(q) ||
        log.site.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* SECTION HEADER ROW */}
      <div>
        <span className="text-[13px] font-semibold text-[#1E58E6] tracking-wide block mb-1">
          ประวัติผลที่เชื่อมกับผู้ป่วยและแบบติดตาม
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          ประวัติผลการวิเคราะห์ IV Site
        </h1>
        <p className="text-[13px] text-slate-500 font-normal mt-1.5 leading-relaxed">
          ค้นผลย้อนหลัง แยก Infiltration กับ Phlebitis เปิดภาพและผลเดิม หรือไปต่อยังแบบบันทึกหลังยืนยัน Grade 1–4
        </p>
      </div>

      {/* 4 SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs flex items-center justify-between h-[96px]">
          <div>
            <div className="text-[14px] font-bold text-slate-900 leading-snug">
              ผลที่บันทึกในประวัติ
            </div>
            <div className="text-[12px] text-slate-400 font-normal mt-0.5">
              จากผู้ป่วยในฐานข้อมูลกลาง
            </div>
          </div>
          <div className="text-[36px] font-extrabold text-slate-900 leading-none pl-2">
            2
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs flex items-center justify-between h-[96px]">
          <div>
            <div className="text-[14px] font-bold text-slate-900 leading-snug">
              รอบุคลากรทบทวน
            </div>
            <div className="text-[12px] text-slate-400 font-normal mt-0.5">
              ยังไม่แสดง Grade
            </div>
          </div>
          <div className="text-[36px] font-extrabold text-slate-900 leading-none pl-2">
            0
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs flex items-center justify-between h-[96px]">
          <div>
            <div className="text-[14px] font-bold text-slate-900 leading-snug">
              ยืนยันพบข้อสังเกต
            </div>
            <div className="text-[12px] text-slate-400 font-normal mt-0.5">
              Grade 1–4
            </div>
          </div>
          <div className="text-[36px] font-extrabold text-slate-900 leading-none pl-2">
            1
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs flex items-center justify-between h-[96px]">
          <div>
            <div className="text-[14px] font-bold text-slate-900 leading-snug">
              รอยืนยันแบบติดตาม
            </div>
            <div className="text-[12px] text-slate-400 font-normal mt-0.5">
              ต้องแนบภาพประกอบ
            </div>
          </div>
          <div className="text-[36px] font-extrabold text-slate-900 leading-none pl-2">
            1
          </div>
        </div>
      </div>

      {/* MAIN DATA TABLE CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Search & Status Filter Row */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ / HN / AN / Ward / เตียง"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          {/* Status Dropdown Filter */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <span className="text-[13px] text-slate-600 font-medium">สถานะ:</span>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-[13px] pl-3.5 pr-8 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer shadow-2xs transition-all"
              >
                <option value="all">ทั้งหมด</option>
                <option value="phlebitis">Phlebitis</option>
                <option value="infiltration">Infiltration</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Data Table with Drag-to-Scroll */}
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
                <th className="py-3.5 px-4 text-left font-bold">ผู้ป่วย</th>
                <th className="py-3.5 px-4 font-bold">หอผู้ป่วย / เตียง</th>
                <th className="py-3.5 px-4 font-bold">ประเภท</th>
                <th className="py-3.5 px-4 font-bold">ผลการยืนยัน</th>
                <th className="py-3.5 px-4 font-bold uppercase">IV SITE</th>
                <th className="py-3.5 px-4 font-bold">ผู้ทบทวน/เวลา</th>
                <th className="py-3.5 px-4 font-bold">สถานะต่อเนื่อง</th>
                <th className="py-3.5 px-4 text-center font-bold">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13.5px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    ไม่พบรายการประวัติการวิเคราะห์ที่ค้นหา
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Patient Info Column */}
                    <td className="py-4.5 px-4 align-top">
                      <button
                        onClick={() => !draggedFar && setSelectedPatient(log)}
                        className="font-bold text-slate-900 hover:text-[#1E58E6] text-[14px] text-left hover:underline cursor-pointer transition-colors block"
                      >
                        {log.patientName}
                      </button>
                      <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                        {log.hn} · {log.an}
                      </div>
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[11px] font-bold">
                          <HisCheckIcon />
                          <span>ยืนยันจาก HIS</span>
                        </span>
                      </div>
                    </td>

                    {/* Ward & Bed Column */}
                    <td className="py-4.5 px-4 align-top">
                      <div className="font-bold text-slate-900 text-[14px]">
                        {log.ward}
                      </div>
                      <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                        {log.bed}
                      </div>
                    </td>

                    {/* Type Column */}
                    <td className="py-4.5 px-4 align-top">
                      {log.type === 'phlebitis' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 border border-red-200/80 rounded-full text-[12px] font-bold">
                          <PhlebitisIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                          <span>Phlebitis</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 border border-blue-200/80 rounded-full text-[12px] font-bold">
                          <InfiltrationIcon className="w-3.5 h-3.5" />
                          <span>Infiltration</span>
                        </span>
                      )}
                    </td>

                    {/* Confirmed Result Column */}
                    <td className="py-4.5 px-4 align-top">
                      <div className="font-bold text-slate-900 text-[14px]">
                        {log.grade}
                      </div>
                      <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                        {log.aiConfidence}
                      </div>
                    </td>

                    {/* IV Site Column */}
                    <td className="py-4.5 px-4 align-top">
                      <div className="font-bold text-slate-900 text-[14px]">
                        {log.site}
                      </div>
                      <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                        {log.vein}
                      </div>
                      <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                        {log.needle}
                      </div>
                    </td>

                    {/* Reviewer / Timestamp Column */}
                    <td className="py-4.5 px-4 align-top">
                      <div className="font-bold text-slate-900 text-[14px]">
                        {log.reviewer}
                      </div>
                      <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                        {log.timestamp}
                      </div>
                    </td>

                    {/* Continuous Status Column */}
                    <td className="py-4.5 px-4 align-top">
                      <span className="inline-flex items-center gap-1.5 bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] px-3 py-1 rounded-full text-[12px] font-medium shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] stroke-[2]" />
                        <span>{log.continuousStatus}</span>
                      </span>
                    </td>

                    {/* Action Column */}
                    <td className="py-4.5 px-4 text-center align-top">
                      <button
                        onClick={() => !draggedFar && setSelectedPatient(log)}
                        className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[13px] px-3.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                      >
                        ดูผลการวิเคราะห์
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px]">
          <div className="text-slate-400 font-normal">
            Showing 10 of 10 Historical Log
          </div>
          <div className="flex items-center gap-1.5">
            <button className="px-3.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-600 cursor-pointer shadow-2xs text-[12px]">
              Previous
            </button>
            <button className="w-8 h-8 bg-[#1E58E6] text-white font-bold rounded-lg flex items-center justify-center shadow-2xs cursor-pointer text-[12px]">
              1
            </button>
            <button className="w-8 h-8 border border-slate-200 text-slate-600 font-medium rounded-lg flex items-center justify-center bg-white hover:bg-slate-50 shadow-2xs cursor-pointer text-[12px]">
              2
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PATIENT ANALYSIS DETAIL MODAL                                             */}
      {/* ========================================================================= */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-[720px] w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto no-scrollbar">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">
                  PEDIVEINCARE AI
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5 uppercase">
                  รายละเอียด {selectedPatient.type === 'phlebitis' ? 'PHLEBITIS' : 'INFILTRATION'}
                </h3>
                <p className="text-[13px] text-slate-500 font-medium mt-0.5">
                  {selectedPatient.patientName} · {selectedPatient.hn} · {selectedPatient.ward} / ห้อง A-01 / {selectedPatient.bed}
                </p>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Status Banner Card (White Box with Light Border) */}
            <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">
                    {selectedPatient.type === 'phlebitis' ? 'PHLEBITIS' : 'INFILTRATION'}
                  </span>
                  <h4 className="text-[15px] font-bold text-slate-900 leading-snug">
                    {selectedPatient.type === 'phlebitis'
                      ? 'ภาวะหลอดเลือดดำอักเสบ'
                      : 'ภาวะสารน้ำรั่วออกนอกหลอดเลือด'}
                  </h4>
                  <p className="text-[12px] text-slate-500 font-normal mt-0.5">
                    ไม่พบข้อสังเกตจากภาพ และได้รับการยืนยันผลแล้ว
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start sm:items-end shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 border border-red-200/80 rounded-full text-[12px] font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>รอการทบทวน</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium mt-1">
                  ส่งคิวทบทวน 9 ส.ค. 2569 · 08:10 น.
                </span>
              </div>
            </div>

            {/* Side-by-Side Image Comparison (2 Cols Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Image 1: Baseline */}
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-100 shadow-2xs">
                  <img
                    src="/iv_baseline.png"
                    alt="ภาพอ้างอิงเริ่มต้น"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 px-3 py-1 bg-slate-900/60 backdrop-blur-md text-white rounded-full text-[11px] font-semibold">
                    ภาพอ้างอิงเริ่มต้น
                  </div>
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-[14px]">
                    ภาพอ้างอิงเริ่มต้น
                  </div>
                  <div className="text-[12px] text-slate-400 font-medium">
                    9 ส.ค. 2569 · 08:00 น.
                  </div>
                </div>
              </div>

              {/* Image 2: Latest */}
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-[4/3] bg-slate-100 shadow-2xs">
                  <img
                    src="/iv_latest.png"
                    alt="ภาพล่าสุด"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 px-3 py-1 bg-slate-900/60 backdrop-blur-md text-white rounded-full text-[11px] font-semibold">
                    ภาพล่าสุด
                  </div>
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-[14px]">
                    ภาพล่าสุด
                  </div>
                  <div className="text-[12px] text-slate-400 font-medium">
                    10 ส.ค. 2569 · 12:05 น.
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Metric Summary Cards (Grid of 3) */}
            <div className="grid grid-cols-3 gap-3">
              {/* Metric 1 */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 text-[12px] font-semibold block">Grade</span>
                <div className="text-xl sm:text-2xl font-extrabold text-[#1E58E6]">
                  {selectedPatient.grade}
                </div>
                <span className="text-slate-400 text-[11px] font-normal block">
                  บุคลากรทางการแพทย์ยืนยัน
                </span>
              </div>

              {/* Metric 2 */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 text-[12px] font-semibold block">ระดับความเสี่ยง</span>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-600">
                  ต่ำ
                </div>
                <span className="text-slate-400 text-[11px] font-normal block truncate">
                  ข้อมูลจากผลที่ได้รับการยืนยัน
                </span>
              </div>

              {/* Metric 3 */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 text-[12px] font-semibold block">ระดับความเชื่อมั่นของ AI</span>
                <div className="text-xl sm:text-2xl font-extrabold text-[#1E58E6]">
                  96%
                </div>
                <span className="text-slate-400 text-[11px] font-normal block">
                  ค่าความมั่นใจของ AI
                </span>
              </div>
            </div>

            {/* Risk Gauge Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 px-1">
                <span>ต่ำ</span>
                <span>ปานกลาง</span>
                <span>สูง</span>
                <span>วิกฤต</span>
              </div>
              <div className="relative h-2.5 rounded-full overflow-hidden flex">
                <div className="w-1/4 bg-[#10B981]" />
                <div className="w-1/4 bg-[#F59E0B]" />
                <div className="w-1/4 bg-[#EA580C]" />
                <div className="w-1/4 bg-[#B91C1C]" />

                {/* Slider Dot Pin */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#10B981] shadow-md transform -translate-x-1/2"
                  style={{ left: '12.5%' }}
                />
              </div>
            </div>

            {/* Operator Info Footer Card */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px]">
              <div>
                <span className="font-bold text-slate-900 block">
                  ผู้รับผิดชอบ {selectedPatient.reviewer || 'ชื่อ-นามสกุล-ผู้ตรวจ'}
                </span>
                <span className="text-slate-500 font-normal text-[12px]">
                  เจ้าหน้าที่แผนก - เด็ก
                </span>
              </div>
              <div className="text-slate-400 font-medium text-[12px]">
                ตรวจสอบเสร็จตอน 12:05 น.
              </div>
            </div>

            {/* Footer Close Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-6 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white font-bold rounded-xl text-[14px] shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
