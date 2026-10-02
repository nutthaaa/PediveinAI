import React, { useState, useRef } from 'react';
import { SinglePatientDetail } from './SinglePatientDetail';
import { CreateTrackingGroupModal } from './CreateTrackingGroupModal';
import { AiAnalysisResultView } from './AiAnalysisResultView';
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
  onAddFirstIvSite?: (patient: any) => void;
  onInspectNeedle?: (patient: any) => void;
  onNavigate?: (nav: string) => void;
}

export const PediatricPatients: React.FC<PediatricPatientsProps> = ({
  onAddFirstIvSite,
  onInspectNeedle,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'my_patients'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [startMonitoringPatient, setStartMonitoringPatient] = useState<any | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [showAiResultView, setShowAiResultView] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({
    '1': true,
    '2': true,
    '3': true,
    '4': false,
    '5': false,
    '6': false
  });

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

  const patientRows = [
    {
      id: '1',
      name: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      room: 'PICU ห้อง 901',
      bed: 'เตียง 901',
      progress: '0 / 168 ชม.',
      roundText: 'รอบ 0',
      ivSiteText: 'ยังไม่มี IV Site',
      infStatus: 'none',
      phleStatus: 'none',
      caregiver: 'ไม่มีผู้รับผิดชอบ',
      caregiverRole: '',
      confidence: 'รอตรวจสอบ',
      confidenceTime: '',
      actionType: 'add_first',
      actionText: '+ เพิ่ม IV Site แรก'
    },
    {
      id: '2',
      name: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      room: 'PICU ห้อง 902',
      bed: 'เตียง 902',
      progress: '98 / 168 ชม.',
      roundText: 'รอบ 49 · ทุก 2 ชม.',
      ivSiteText: 'IV Site 2 ตำแหน่ง',
      infStatus: 'normal',
      phleStatus: 'review_red',
      caregiver: 'ชื่อเจ้า-นามสกุล A',
      caregiverRole: 'NICU Nurse',
      confidence: '91%',
      confidenceTime: 'วิเคราะห์เวลา 14:03 น.',
      actionType: 'view',
      actionText: 'ดู 2 IV Site'
    },
    {
      id: '3',
      name: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      room: 'PICU ห้อง 903',
      bed: 'เตียง 903',
      progress: '30 / 168 ชม.',
      roundText: 'รอบ 15 · ทุก 2 ชม.',
      ivSiteText: 'IV Site 1 ตำแหน่ง',
      infStatus: 'review_blue',
      phleStatus: 'normal',
      caregiver: 'ชื่อเจ้า-นามสกุล A',
      caregiverRole: 'NICU Nurse',
      confidence: '96%',
      confidenceTime: 'วิเคราะห์เวลา 14:03 น.',
      actionType: 'view',
      actionText: 'ดู 1 IV Site'
    },
    {
      id: '4',
      name: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      room: 'PICU ห้อง 904',
      bed: 'เตียง 904',
      progress: '14 / 168 ชม.',
      roundText: 'รอบ 7 · ทุก 2 ชม.',
      ivSiteText: 'IV Site 1 ตำแหน่ง',
      infStatus: 'normal',
      phleStatus: 'normal',
      caregiver: 'ชื่อเจ้า-นามสกุล B',
      caregiverRole: 'NICU Nurse',
      confidence: '98%',
      confidenceTime: 'วิเคราะห์เวลา 14:03 น.',
      actionType: 'view',
      actionText: 'ดู 1 IV Site'
    },
    {
      id: '5',
      name: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      room: 'PICU ห้อง 905',
      bed: 'เตียง 905',
      progress: '14 / 168 ชม.',
      roundText: 'รอบ 7 · ทุก 2 ชม.',
      ivSiteText: 'IV Site 1 ตำแหน่ง',
      infStatus: 'normal',
      phleStatus: 'normal',
      caregiver: 'ชื่อเจ้า-นามสกุล B',
      caregiverRole: 'NICU Nurse',
      confidence: '98%',
      confidenceTime: 'วิเคราะห์เวลา 14:03 น.',
      actionType: 'view',
      actionText: 'ดู 1 IV Site'
    },
    {
      id: '6',
      name: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      room: 'PICU ห้อง 906',
      bed: 'เตียง 906',
      progress: '14 / 168 ชม.',
      roundText: 'รอบ 7 · ทุก 2 ชม.',
      ivSiteText: 'IV Site 1 ตำแหน่ง',
      infStatus: 'normal',
      phleStatus: 'normal',
      caregiver: 'ชื่อเจ้า-นามสกุล A',
      caregiverRole: 'NICU Nurse',
      confidence: '98%',
      confidenceTime: 'วิเคราะห์เวลา 14:03 น.',
      actionType: 'view',
      actionText: 'ดู 1 IV Site'
    }
  ];

  const filteredRows = patientRows.filter(
    (r) =>
      r.name.includes(searchQuery) ||
      r.hnAn.includes(searchQuery) ||
      r.room.includes(searchQuery) ||
      r.bed.includes(searchQuery)
  );

  if (startMonitoringPatient) {
    return (
      <StartIvMonitoring
        patientData={{
          name: startMonitoringPatient.name || 'ชื่อ-นามสกุล-คนไข้',
          hnAn: startMonitoringPatient.hnAn || 'HN34567890 · AN26080918',
          ward: 'PICU',
          room: startMonitoringPatient.room || 'ห้อง A-01',
          bed: startMonitoringPatient.bed || 'เตียง C32'
        }}
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

  if (showAiResultView) {
    return (
      <AiAnalysisResultView
        onBack={() => setShowAiResultView(false)}
      />
    );
  }

  if (selectedPatient) {
    return (
      <SinglePatientDetail
        patientName={selectedPatient.name || 'ชื่อ-นามสกุลคนไข้'}
        hnAn={selectedPatient.hnAn || 'HN34567890 · AN26080918'}
        onBack={() => setSelectedPatient(null)}
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
          รายชื่อผู้ป่วยเด็กจาก HIS
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
            <div className="text-2xl font-bold text-slate-900 leading-none">1</div>
          </div>
          <div className="text-[13px] text-slate-500 font-medium">ยังไม่เริ่ม</div>
        </div>

        {/* Card 2: อยู่ระหว่างติดตาม */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0070F3] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-none">4</div>
          </div>
          <div className="text-[13px] text-slate-500 font-medium">อยู่ระหว่างติดตาม</div>
        </div>

        {/* Card 3: สิ้นสุดการติดตาม */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-none">1</div>
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
          รายการผู้ป่วยเด็กทั้งหมด (26)
        </button>
        <button
          onClick={() => setActiveTab('my_patients')}
          className={`pb-1 font-bold transition-colors relative cursor-pointer ${activeTab === 'my_patients'
              ? 'text-blue-600 after:absolute after:bottom-[-12px] after:left-0 after:right-0 after:h-[2.5px] after:bg-blue-600'
              : 'text-slate-500 font-medium hover:text-slate-800'
            }`}
        >
          ผู้ป่วยเด็กที่ฉันดูแล (3)
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
        {activeTab === 'all' && (
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[14px] px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Users className="w-4 h-4 stroke-[2.2]" />
            <span>สร้างกลุ่มผู้ป่วยติดตาม</span>
          </button>
        )}
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
                ? patientRows.slice(0, 3)
                : filteredRows
              ).map((row: any) => (
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
                      onClick={() => !draggedFar && setSelectedPatient(row)}
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
                        onClick={() => !draggedFar && setSelectedPatient(row)}
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
                        onClick={() => !draggedFar && setSelectedPatient(row)}
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
                              onAddFirstIvSite(row);
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
                        onClick={() => !draggedFar && setSelectedPatient(row)}
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
          <div>Showing 10 of 10 Historical Log</div>
          <div className="flex items-center gap-1.5">
            <button className="px-3.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-600 cursor-pointer shadow-2xs">
              Previous
            </button>
            <button className="w-8 h-8 bg-[#1E58E6] text-white font-bold rounded-lg flex items-center justify-center shadow-2xs cursor-pointer">
              1
            </button>
            <button className="w-8 h-8 border border-slate-200 text-slate-600 font-medium rounded-lg flex items-center justify-center bg-white hover:bg-slate-50 shadow-2xs cursor-pointer">
              2
            </button>

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

      {/* Modal Confirmation Popup */}
      {isGroupModalOpen && (
        <CreateTrackingGroupModal
          selectedPatients={patientRows.filter((p) => selectedRows[p.id])}
          onClose={(action) => {
            setIsGroupModalOpen(false);
            if (action === 'show_ai_result') {
              setShowAiResultView(true);
            } else if (action === 'confirm_created_group') {
              setActiveTab('my_patients');
            }
          }}
        />
      )}
    </div>
  );
};
