import React, { useState } from 'react';
import {
  FileText,
  List,
  Eye,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  ChevronDown,
  Clock,
  Calendar,
  Droplet,
  X,
  Droplets,
  Sparkles
} from 'lucide-react';

const PhlebitisIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
    <path d="M12 4c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
    <path d="M15.5 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
  </svg>
);

interface PhlebitisTrackingProps {
  onNavigate?: (nav: string) => void;
  onInspectNeedle?: (patient: any) => void;
}

export const PhlebitisTracking: React.FC<PhlebitisTrackingProps> = ({
  onNavigate,
  onInspectNeedle
}) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);

  // Drag-to-scroll states
  const tableContainerRef = React.useRef<HTMLDivElement>(null);
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

  const rows = [
    {
      id: '1',
      patientName: 'ชื่อ-นามสกุลคนไข้ A1',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      ward: 'PICU',
      bed: 'เตียง A02',
      progress: '98 / 168 ชม.',
      round: 'รอบ 49',
      usageStatus: 'ใช้งานอยู่ · ทุก 2 ชม.',
      usageType: 'active',
      site: 'หลังมือซ้าย',
      vein: 'Cephalic vein',
      dueType: 'overdue',
      dueTimePrefix: '14:00 น. · เกินกำหนด ',
      dueHighlight: '00:18:24',
      aiType: 'review',
      aiText: 'Phlebitis ควรตรวจสอบ',
      aiConfidence: '91%',
      aiTime: 'วิเคราะห์เวลา 14:03 น.',
      needleBtn: 'ตรวจเข็ม # 1',
      needleBtnClass: 'bg-[#1E58E6] hover:bg-blue-700 text-white'
    },
    {
      id: '2',
      patientName: 'ชื่อ-นามสกุลคนไข้ A1',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      ward: 'PICU',
      bed: 'เตียง A02',
      progress: '0 / 168 ชม.',
      round: 'รอบ 1',
      usageStatus: 'ถอดแล้ว · ทุก 8 ชม.',
      usageType: 'removed',
      site: 'หลังมือขวา',
      vein: 'Metacarpal vein',
      dueType: 'near_due',
      dueTimePrefix: '16:00 น. · เหลือ ',
      dueHighlight: '07:42:10',
      aiType: 'normal',
      aiText: 'Phlebitis ไม่พบข้อสังเกต',
      aiConfidence: '91%',
      aiTime: 'วิเคราะห์เวลา 14:03 น.',
      needleBtn: 'ตรวจเข็ม # 2',
      needleBtnClass: 'bg-[#60A5FA] hover:bg-blue-500 text-white'
    },
    {
      id: '3',
      patientName: 'ชื่อ-นามสกุลคนไข้ A1',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      ward: 'PICU',
      bed: 'เตียง A02',
      progress: '0 / 168 ชม.',
      round: 'รอบ 1',
      usageStatus: 'ถอดแล้ว · ทุก 8 ชม.',
      usageType: 'removed',
      site: 'หลังมือซ้าย',
      vein: 'Cephalic vein',
      dueType: 'near_due',
      dueTimePrefix: '16:00 น. · เหลือ ',
      dueHighlight: '07:42:10',
      aiType: 'normal',
      aiText: 'Phlebitis ไม่พบข้อสังเกต',
      aiConfidence: '91%',
      aiTime: 'วิเคราะห์เวลา 14:03 น.',
      needleBtn: 'ตรวจเข็ม # 3',
      needleBtnClass: 'bg-[#60A5FA] hover:bg-blue-500 text-white'
    },
    {
      id: '4',
      patientName: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      ward: 'PICU',
      bed: 'เตียง C12',
      progress: '30 / 168 ชม.',
      round: 'รอบ 15',
      usageStatus: 'ใช้งานอยู่ · ทุก 2 ชม.',
      usageType: 'active',
      site: 'ตำแหน่ง IV Site',
      vein: '',
      dueType: 'near_due',
      dueTimePrefix: '16:00 น. · เหลือ ',
      dueHighlight: '01:42:10',
      aiType: 'normal',
      aiText: 'Phlebitis ไม่พบข้อสังเกต',
      aiConfidence: '96%',
      aiTime: 'วิเคราะห์เวลา 14:03 น.',
      needleBtn: 'ตรวจเข็ม # 1',
      needleBtnClass: 'bg-[#60A5FA] hover:bg-blue-500 text-white'
    },
    {
      id: '5',
      patientName: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      ward: 'PICU',
      bed: 'เตียง B12',
      progress: '14 / 168 ชม.',
      round: 'รอบ 7',
      usageStatus: 'ใช้งานอยู่ · ทุก 2 ชม.',
      usageType: 'active',
      site: 'ตำแหน่ง IV Site',
      vein: '',
      dueType: 'near_due',
      dueTimePrefix: '16:00 น. · เหลือ ',
      dueHighlight: '01:42:10',
      aiType: 'normal',
      aiText: 'Phlebitis ไม่พบข้อสังเกต',
      aiConfidence: '98%',
      aiTime: 'วิเคราะห์เวลา 14:03 น.',
      needleBtn: 'ตรวจเข็ม # 1',
      needleBtnClass: 'bg-[#60A5FA] hover:bg-blue-500 text-white'
    },
    {
      id: '6',
      patientName: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      ward: 'PICU',
      bed: 'เตียง B12',
      progress: '14 / 168 ชม.',
      round: 'รอบ 7',
      usageStatus: 'ใช้งานอยู่ · ทุก 2 ชม.',
      usageType: 'active',
      site: 'ตำแหน่ง IV Site',
      vein: '',
      dueType: 'near_due',
      dueTimePrefix: '16:00 น. · เหลือ ',
      dueHighlight: '01:42:10',
      aiType: 'normal',
      aiText: 'Phlebitis ไม่พบข้อสังเกต',
      aiConfidence: '98%',
      aiTime: 'วิเคราะห์เวลา 14:03 น.',
      needleBtn: 'ตรวจเข็ม # 1',
      needleBtnClass: 'bg-[#60A5FA] hover:bg-blue-500 text-white'
    },
    {
      id: '7',
      patientName: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890 · AN26080918',
      hisConfirmed: true,
      ward: 'PICU',
      bed: 'เตียง B12',
      progress: '14 / 168 ชม.',
      round: 'รอบ 7',
      usageStatus: 'ใช้งานอยู่ · ทุก 2 ชม.',
      usageType: 'active',
      site: 'ตำแหน่ง IV Site',
      vein: '',
      dueType: 'near_due',
      dueTimePrefix: '16:00 น. · เหลือ ',
      dueHighlight: '01:42:10',
      aiType: 'normal',
      aiText: 'Phlebitis ไม่พบข้อสังเกต',
      aiConfidence: '98%',
      aiTime: 'วิเคราะห์เวลา 14:03 น.',
      needleBtn: 'ตรวจเข็ม # 1',
      needleBtnClass: 'bg-[#60A5FA] hover:bg-blue-500 text-white'
    }
  ];

  const filteredRows = rows.filter((r) => {
    if (statusFilter === 'overdue') return r.dueType === 'overdue';
    if (statusFilter === 'due') return r.dueType === 'near_due';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[12px] font-bold text-red-600 tracking-wide uppercase">
            การติดตามแยกตามประเภท • PHLEBITIS
          </span>
          <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight mt-0.5">
            การติดตามภาวะหลอดเลือดดำอักเสบ
          </h1>
          <p className="text-slate-500 text-[13px] mt-1">
            แสดงข้อมูลเฉพาะ Phlebitis · ผลจาก AI เป็นข้อมูลสนับสนุนและต้องได้รับการทบทวนโดยบุคลากรทางการแพทย์ผู้รับผิดชอบ
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          <button
            onClick={() => onNavigate?.('infiltration')}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-[13px] rounded-xl flex items-center gap-2 shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Droplet className="w-4 h-4 text-blue-600" />
            <span>ดูข้อมูล Infiltration</span>
          </button>
          <button className="px-4 py-2 bg-[#1E58E6] hover:bg-blue-700 text-white font-semibold text-[13px] rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer">
            <FileText className="w-4 h-4" />
            <span>ดูรายงานสรุปรวม</span>
          </button>
        </div>
      </div>

      {/* Overview Condition Banner Card + Trend Chart */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0 mt-0.5">
            <PhlebitisIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-black text-[#DC2626] tracking-wider uppercase">
              PHLEBITIS
            </span>
            <h3 className="text-[17px] font-bold text-slate-900 mt-0.5 leading-snug">
              ภาวะหลอดเลือดดำอักเสบ
            </h3>
            <p className="text-[12px] text-slate-500 mt-0.5">
              แดง • อุ่น • กดเจ็บ • เปลี่ยนแปลงตามแนวหลอดเลือด
            </p>
          </div>
        </div>

        {/* Sparkline Trend Graphic */}
        <div className="w-full md:w-[420px] bg-white rounded-xl p-3 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-[13px] mb-1">
            <span className="font-medium text-slate-600">แนวโน้ม</span>
            <span className="font-bold text-slate-900">+8.7%</span>
          </div>
          <div className="w-full h-12 pt-1">
            <svg className="w-full h-full" viewBox="0 0 350 45" preserveAspectRatio="none" fill="none">
              <defs>
                <linearGradient id="phleb-page-trend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#DC2626" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d="M 0,35 L 50,32 L 100,34 L 180,22 L 270,28 L 346,8 L 346,45 L 0,45 Z"
                fill="url(#phleb-page-trend)"
              />
              <path
                d="M 0,35 L 50,32 L 100,34 L 180,22 L 270,28 L 346,8"
                stroke="#DC2626"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="346" cy="8" r="4" fill="#DC2626" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3 Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center shrink-0">
              <List className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-none">7</div>
          </div>
          <div className="text-[13px] text-slate-500 font-medium">IV Site ทั้งหมด</div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#FEF3E7] text-[#D97706] flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-none">6</div>
          </div>
          <div className="text-[13px] text-slate-500 font-medium">อยู่ระหว่างเฝ้าระวัง</div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-none">1</div>
          </div>
          <div className="text-[13px] text-slate-500 font-medium">รอทบทวนเร่งด่วน</div>
        </div>
      </div>

      {/* Severity Grade Distribution Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        {/* Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-[#E8EDFB] text-[#4F46E5] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <ClipboardList className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                สัดส่วนระดับความรุนแรง (Grade) โดยรวม
              </h3>
              <p className="text-[12px] text-slate-500 font-normal mt-0.5 leading-normal">
                แสดงเฉพาะระดับความรุนแรงที่บุคลากรทางการแพทย์ยืนยันแล้ว แยกตาม Infiltration และ Phlebitis
              </p>
            </div>
          </div>

          {/* Right Tab Pills Container */}
          <div className="bg-[#F1F5F9] p-1 rounded-xl flex items-center gap-1 shrink-0 self-start lg:self-auto max-w-full overflow-x-auto no-scrollbar">
            <button className="text-slate-600 font-medium text-[13px] px-3.5 py-1.5 rounded-lg flex items-center gap-2 hover:text-slate-900 cursor-pointer shrink-0">
              <span>รวม</span>
              <span className="bg-slate-200/80 text-slate-600 font-semibold text-[11px] px-1.5 py-0.5 rounded-md leading-none">
                2
              </span>
            </button>
            <button
              onClick={() => onNavigate?.('infiltration')}
              className="text-slate-600 font-medium text-[13px] px-3.5 py-1.5 rounded-lg flex items-center gap-2 hover:text-slate-900 cursor-pointer shrink-0"
            >
              <span>Infiltration</span>
              <span className="bg-slate-200/80 text-slate-600 font-semibold text-[11px] px-1.5 py-0.5 rounded-md leading-none">
                1
              </span>
            </button>
            <button className="bg-[#EF4444] text-white font-semibold text-[13px] px-3.5 py-1.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer shrink-0">
              <span>Phlebitis</span>
              <span className="bg-white text-[#EF4444] font-extrabold text-[11px] px-1.5 py-0.5 rounded-md leading-none">
                1
              </span>
            </button>
          </div>
        </div>

        {/* Total Count & Legend Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-1">
          <div>
            <div className="text-4xl font-extrabold text-slate-900 leading-none">1</div>
            <div className="text-[12px] text-slate-500 font-medium mt-1">
              รายการที่ได้รับการยืนยันแล้ว · Phlebitis
            </div>
          </div>

          <div className="flex items-center gap-2 text-[13px] self-start sm:self-auto">
            <span className="w-3.5 h-2 rounded-full bg-[#EF4444] inline-block shadow-2xs"></span>
            <span className="font-semibold text-slate-700">Phlebitis</span>
          </div>
        </div>

        {/* Grade Bars Stack */}
        <div className="space-y-3.5 pt-1">
          {/* Grade 1 */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="w-16 font-medium text-slate-700 shrink-0">Grade 1</span>
            <div className="flex-1 bg-[#F1F5F9] h-4 rounded-full overflow-hidden flex items-center p-0.5 border border-slate-100 shadow-inner">
              <div className="w-1.5 h-full bg-[#EF4444]/40 rounded-full shrink-0"></div>
            </div>
            <span className="w-6 font-bold text-slate-900 text-right shrink-0">0</span>
            <span className="w-12 text-[12px] text-slate-500 text-right shrink-0">0.0%</span>
          </div>

          {/* Grade 2 */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="w-16 font-medium text-slate-700 shrink-0">Grade 2</span>
            <div className="flex-1 bg-[#F1F5F9] h-4 rounded-full overflow-hidden flex items-center p-0.5 border border-slate-100 shadow-inner">
              <div className="w-1.5 h-full bg-[#EF4444]/40 rounded-full shrink-0"></div>
            </div>
            <span className="w-6 font-bold text-slate-900 text-right shrink-0">0</span>
            <span className="w-12 text-[12px] text-slate-500 text-right shrink-0">0.0%</span>
          </div>

          {/* Grade 3 */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="w-16 font-medium text-slate-700 shrink-0">Grade 3</span>
            <div className="flex-1 bg-[#F1F5F9] h-4 rounded-full overflow-hidden flex p-0.5 border border-slate-100 shadow-inner">
              <div className="bg-gradient-to-r from-[#F87171] via-[#EF4444] to-[#B91C1C] h-full w-[65%] rounded-full shadow-sm shadow-red-500/30 transition-all duration-500"></div>
            </div>
            <span className="w-6 font-bold text-slate-900 text-right shrink-0">1</span>
            <span className="w-12 text-[12px] text-slate-500 text-right shrink-0">100.0%</span>
          </div>

          {/* Grade 4 */}
          <div className="flex items-center gap-3 text-[13px]">
            <span className="w-16 font-medium text-slate-700 shrink-0">Grade 4</span>
            <div className="flex-1 bg-[#F1F5F9] h-4 rounded-full overflow-hidden flex items-center p-0.5 border border-slate-100 shadow-inner">
              <div className="w-1.5 h-full bg-[#EF4444]/40 rounded-full shrink-0"></div>
            </div>
            <span className="w-6 font-bold text-slate-900 text-right shrink-0">0</span>
            <span className="w-12 text-[12px] text-slate-500 text-right shrink-0">0.0%</span>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="pt-3 border-t border-slate-100 text-[12px] text-slate-500">
          AI ไม่กำหนดระดับความรุนแรง (Grade) · แสดงเฉพาะผลที่บุคลากรทางการแพทย์ยืนยันแล้ว
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center shrink-0">
              <PhlebitisIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                รายการติดตาม Phlebitis
              </h3>
              <p className="text-[12px] text-slate-500 font-normal mt-0.5">
                จัดลำดับผล AI ที่รอการทบทวนและรายการเกินกำหนดไว้ก่อน
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3.5 pr-9 py-1.5 rounded-xl border border-slate-200 text-[13px] bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
              >
                <option value="all">สถานะ: ทั้งหมด</option>
                <option value="overdue">เกินกำหนด</option>
                <option value="due">ใกล้ถึงกำหนด</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              onClick={() => setStatusFilter('all')}
              className="text-[13px] text-[#1E58E6] font-semibold hover:underline cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Table Content with Drag-to-Scroll */}
        <div
          ref={tableContainerRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className={`overflow-x-auto max-w-full custom-scrollbar select-none cursor-grab ${isDragging ? 'cursor-grabbing' : ''
            }`}
        >
          <table className="w-full text-left border-collapse whitespace-nowrap min-w-[1300px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[13px] font-bold text-slate-700">
                <th className="py-3.5 px-4 font-bold">ผู้ป่วย</th>
                <th className="py-3.5 px-4 font-bold">หอผู้ป่วย / เตียง</th>
                <th className="py-3.5 px-4 font-bold">ความคืบหน้า</th>
                <th className="py-3.5 px-4 font-bold uppercase">IV SITE</th>
                <th className="py-3.5 px-4 font-bold">กำหนดตรวจ</th>
                <th className="py-3.5 px-4 font-bold">ผล AI ล่าสุด PHLEBITIS</th>
                <th className="py-3.5 px-4 font-bold">ระดับความเชื่อมั่นของ AI ล่าสุด</th>
                <th className="py-3.5 px-4 text-center font-bold">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13.5px]">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Patient Column */}
                  <td className="py-4.5 px-4 align-top">
                    <button
                      onClick={() => !draggedFar && setSelectedPatient(row)}
                      className="font-bold text-slate-900 hover:text-[#1E58E6] text-[14px] text-left hover:underline cursor-pointer transition-colors block"
                    >
                      {row.patientName}
                    </button>
                    <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                      {row.hnAn}
                    </div>
                    {row.hisConfirmed && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                          <span>ยืนยันจาก HIS</span>
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Ward / Bed Column */}
                  <td className="py-4.5 px-4 align-top">
                    <div className="font-bold text-slate-900 text-[14px]">
                      {row.ward}
                    </div>
                    <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                      {row.bed}
                    </div>
                  </td>

                  {/* Progress Column */}
                  <td className="py-4.5 px-4 align-top">
                    <div className="font-bold text-slate-900 text-[14px]">
                      {row.progress}
                    </div>
                    <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                      {row.round}
                    </div>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[11.5px] font-bold border ${row.usageType === 'active'
                            ? 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]'
                            : 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                          }`}
                      >
                        {row.usageStatus}
                      </span>
                    </div>
                  </td>

                  {/* IV Site Column */}
                  <td className="py-4.5 px-4 align-top">
                    <div className="font-bold text-slate-900 text-[14px]">
                      {row.site}
                    </div>
                    {row.vein && (
                      <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                        {row.vein}
                      </div>
                    )}
                  </td>

                  {/* Due Time Column */}
                  <td className="py-4.5 px-4 align-top">
                    {row.dueType === 'overdue' ? (
                      <>
                        <span className="bg-[#FEE2E2] text-[#DC2626] font-bold text-[12px] px-3 py-1 rounded-full border border-[#FECACA] inline-flex items-center gap-1.5 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-[#DC2626]" />
                          <span>เกินกำหนด</span>
                        </span>
                        <div className="text-[12px] text-slate-500 font-normal mt-2">
                          {row.dueTimePrefix}
                          <span className="text-[#DC2626] font-bold">{row.dueHighlight}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="bg-[#E0F2FE] text-[#0284C7] font-bold text-[12px] px-3 py-1 rounded-full border border-[#BAE6FD] inline-flex items-center gap-1.5 shadow-2xs">
                          <Calendar className="w-3.5 h-3.5 text-[#0284C7]" />
                          <span>ใกล้ถึงกำหนด</span>
                        </span>
                        <div className="text-[12px] text-slate-500 font-normal mt-2">
                          {row.dueTimePrefix}
                          <span className="text-[#0284C7] font-bold">{row.dueHighlight}</span>
                        </div>
                      </>
                    )}
                  </td>

                  {/* AI Latest Result Column */}
                  <td className="py-4.5 px-4 align-top">
                    {row.aiType === 'review' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] font-bold text-[12px] shadow-2xs">
                        <PhlebitisIcon className="w-3.5 h-3.5 text-[#DC2626]" />
                        <span>{row.aiText}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-bold text-[12px] shadow-2xs">
                        <PhlebitisIcon className="w-3.5 h-3.5 text-[#059669]" />
                        <span>{row.aiText}</span>
                      </span>
                    )}
                  </td>

                  {/* AI Confidence Column */}
                  <td className="py-4.5 px-4 align-top">
                    <div className="font-bold text-[#1E58E6] text-[15px]">
                      {row.aiConfidence}
                    </div>
                    <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                      {row.aiTime}
                    </div>
                  </td>

                  {/* Actions Column */}
                  <td className="py-4.5 px-4 align-top">
                    <div className="flex flex-col gap-1.5 items-center">
                      <button
                        onClick={() => {
                          if (!draggedFar) {
                            if (onInspectNeedle) {
                              onInspectNeedle(row);
                            } else if (onNavigate) {
                              onNavigate('start_monitoring');
                            }
                          }
                        }}
                        className={`w-full max-w-[150px] px-3.5 py-1.5 ${row.needleBtnClass} font-bold text-[12px] rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95`}
                      >
                        {row.needleBtn}
                      </button>
                      <button
                        onClick={() => !draggedFar && setSelectedPatient(row)}
                        className="w-full max-w-[150px] px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-[11.5px] rounded-xl transition-all shadow-2xs cursor-pointer"
                      >
                        ดูผลการยืนยันล่าสุด
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
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

      {/* Bottom Disclaimer Banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950 mt-6">
        <svg
          width="64"
          height="64"
          viewBox="0 0 46 46"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
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
                  รายละเอียด PHLEBITIS
                </h3>
                <p className="text-[13px] text-slate-500 font-medium mt-0.5">
                  {selectedPatient.patientName} · {selectedPatient.hnAn || 'HN34567890'} · {selectedPatient.ward || 'PICU'} / ห้อง A-01 / {selectedPatient.bed || 'เตียง A02'}
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
            <div className="bg-white border border-red-100 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <PhlebitisIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-red-600 tracking-wider uppercase block">
                    PHLEBITIS
                  </span>
                  <h4 className="text-[15px] font-bold text-slate-900 leading-snug">
                    ภาวะหลอดเลือดดำอักเสบ
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
                    ภาพรอบล่าสุด
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
                  Grade 4
                </div>
                <span className="text-slate-400 text-[11px] font-normal block">
                  บุคลากรทางการแพทย์ยืนยัน
                </span>
              </div>

              {/* Metric 2 */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 text-[12px] font-semibold block">ระดับความเสี่ยง</span>
                <div className="text-xl sm:text-2xl font-extrabold text-red-600">
                  สูง
                </div>
                <span className="text-slate-400 text-[11px] font-normal block truncate">
                  ข้อมูลจากผลที่ได้รับการยืนยัน
                </span>
              </div>

              {/* Metric 3 */}
              <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 space-y-1">
                <span className="text-slate-400 text-[12px] font-semibold block">ระดับความเชื่อมั่นของ AI</span>
                <div className="text-xl sm:text-2xl font-extrabold text-[#1E58E6]">
                  91%
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
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#EA580C] shadow-md transform -translate-x-1/2"
                  style={{ left: '62.5%' }}
                />
              </div>
            </div>

            {/* Operator Info Footer Card */}
            <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px]">
              <div>
                <span className="font-bold text-slate-900 block">
                  ผู้รับผิดชอบ ชื่อ-นามสกุล-ผู้ตรวจ
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
