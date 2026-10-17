import React, { useState } from 'react';
import executiveBannerGraphic from '../assets/executive-banner-graphic.png';
import {
  Calendar,
  Download,
  CheckCircle2,
  ChevronRight,
  Clock,
  ClipboardList,
  Database,
  ShieldCheck,
  Users,
  Sparkles,
  Copy,
  FileSpreadsheet,
  FileText,
  X,
  Lock,
  Check
} from 'lucide-react';

interface ExecutiveSummaryProps {
  onNavigate?: (nav: string) => void;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ onNavigate }) => {
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | '3m'>('30d');
  const [gradeFilter, setGradeFilter] = useState<'all' | 'infill' | 'phleb'>('all');

  const currentGradeData = React.useMemo(() => {
    const rawData = [
      { grade: 'Grade 1', infill: 1, phleb: 0 },
      { grade: 'Grade 2', infill: 0, phleb: 0 },
      { grade: 'Grade 3', infill: 0, phleb: 1 },
      { grade: 'Grade 4', infill: 0, phleb: 0 },
    ];

    let total = 0;
    if (gradeFilter === 'all') {
      total = rawData.reduce((acc, g) => acc + g.infill + g.phleb, 0);
    } else if (gradeFilter === 'infill') {
      total = rawData.reduce((acc, g) => acc + g.infill, 0);
    } else {
      total = rawData.reduce((acc, g) => acc + g.phleb, 0);
    }

    const subtitle =
      gradeFilter === 'all'
        ? 'รายการที่ได้รับการยืนยันแล้ว · ทุกหมวด'
        : gradeFilter === 'infill'
        ? 'รายการที่ได้รับการยืนยันแล้ว · เฉพาะ Infiltration'
        : 'รายการที่ได้รับการยืนยันแล้ว · เฉพาะ Phlebitis';

    const grades = rawData.map((g) => {
      let count = 0;
      let infillWidth = 0;
      let phlebWidth = 0;

      if (gradeFilter === 'all') {
        count = g.infill + g.phleb;
        infillWidth = total > 0 ? (g.infill / total) * 100 : 0;
        phlebWidth = total > 0 ? (g.phleb / total) * 100 : 0;
      } else if (gradeFilter === 'infill') {
        count = g.infill;
        infillWidth = total > 0 ? (g.infill / total) * 100 : 0;
      } else {
        count = g.phleb;
        phlebWidth = total > 0 ? (g.phleb / total) * 100 : 0;
      }

      const percent = total > 0 && count > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0%';

      return {
        grade: g.grade,
        count,
        percent,
        infillWidth,
        phlebWidth,
      };
    });

    return { total, subtitle, grades };
  }, [gradeFilter]);

  // Export Modal States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [detailLevel, setDetailLevel] = useState('ข้อมูลสรุปทุกหมวด');
  const [patientDataHandling, setPatientDataHandling] = useState('ไม่รวมข้อมูลระบุตัวผู้ป่วย');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExecuteExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setIsExportModalOpen(false);
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
      }, 4000);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* PAGE HEADER                                                               */}
      {/* ========================================================================= */}
      <div>
        <span className="text-[12px] font-bold text-blue-600 tracking-wide uppercase">
          EXECUTIVE SUMMARY • PEDIVEINCARE AI
        </span>
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight mt-0.5">
          รายงานสรุปภาพรวมทั้งระบบ
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          ภาพรวมผลการดำเนินงานรายงานสำหรับผู้บริหาร โดยไม่แสดงข้อมูลที่สามารถระบุตัวผู้ป่วย
        </p>
      </div>

      {/* ========================================================================= */}
      {/* DATE RANGE FILTER BAR CARD                                                */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
            <Calendar className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-slate-900">
              ช่วงข้อมูล: 30 วันล่าสุด
            </div>
            <div className="text-[12px] text-slate-500 font-medium">
              12 ก.ค. - 10 ส.ค. 2569 • อัปเดตข้อมูลล่าสุด 10 ส.ค. 2569 เวลา 14:32 น.
            </div>
          </div>
        </div>

        {/* Filter Buttons & Export */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${timeRange === 'today'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              วันนี้
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${timeRange === '7d'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              7 วันล่าสุด
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${timeRange === '30d'
                ? 'bg-[#1E58E6] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              30 วันล่าสุด
            </button>
            <button
              onClick={() => setTimeRange('3m')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${timeRange === '3m'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              3 เดือนล่าสุด
            </button>
          </div>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-xl font-bold text-[13px] shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออกรายงาน</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE BLUE BANNER CARD WITH ILLUSTRATION                             */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#011C40] via-[#023373] to-[#0A4B94] p-6 text-white shadow-md">

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="text-[12px] text-blue-200 font-medium">
              ข้อมูล ณ วันที่ 10 ส.ค. 2569 เวลา 14:32 น.
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              ดำเนินการตรวจตรงตามกำหนด <span className="text-[#38BDF8]">92%</span>
            </h2>
            <p className="text-[13px] text-blue-100 font-normal">
              รอบตรวจหลัก • ตรวจทุก 2 ชั่วโมง • ระยะติดตาม 96 ชั่วโมง
            </p>

            {/* 3 Metric Pills */}
            <div className="pt-2 flex items-center gap-2 flex-wrap text-[12px]">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-400/40 text-blue-100 font-semibold backdrop-blur-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-300" />
                <span>มีความครอบคลุม 89.7%</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-400/40 text-blue-100 font-semibold backdrop-blur-xs">
                <Database className="w-3.5 h-3.5 text-blue-300" />
                <span>ข้อมูล HIS สมบูรณ์ 98%</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-400/40 text-blue-100 font-semibold backdrop-blur-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                <span>ภาพรวมความตรง <span className="text-[#38BDF8] font-bold">92%</span></span>
              </div>
            </div>
          </div>

          {/* Medical Illustration Graphic */}
          <div className="shrink-0 flex justify-center md:justify-end">
            <img
              src={executiveBannerGraphic}
              alt="PediVeinCare AI IV Site Monitoring"
              className="h-32 sm:h-36 md:h-40 w-auto object-contain rounded-xl drop-shadow-md"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3 METRIC SUMMARY CARDS GRID                                               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">0</div>
            <div className="text-[12px] text-slate-500 font-medium mt-1">
              ผู้ป่วยย้ายหอ/ยกเลิก
            </div>
            <div className="text-[11px] text-slate-400 font-normal">ต่ำสุด 10 คน/วัน</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">0</div>
            <div className="text-[12px] text-slate-500 font-medium mt-1">
              IV Site ติดตามครบ 168 ชม.
            </div>
            <div className="text-[11px] text-slate-400 font-normal">ส่งออกรายงานผล</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 text-purple-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">0</div>
            <div className="text-[12px] text-slate-500 font-medium mt-1">
              ผล AI รอการทบทวน
            </div>
            <div className="text-[11px] text-slate-400 font-normal">เฝ้าระวังและประเมินซ้ำโดยพยาบาล</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TWO CONDITION CARDS: INFILTRATION vs PHLEBITIS                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* INFILTRATION CARD */}
        <div
          onClick={() => onNavigate && onNavigate('infiltration')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow"
        >
          <div>
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-black uppercase text-blue-600 tracking-wider">
                INFILTRATION
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <g clipPath="url(#clip0_37_6609_exec)">
                  <path
                    d="M30 0H10C4.47715 0 0 4.47715 0 10V30C0 35.5228 4.47715 40 10 40H30C35.5228 40 40 35.5228 40 30V10C40 4.47715 35.5228 0 30 0Z"
                    fill="url(#paint0_linear_37_6609_exec)"
                  />
                  <path
                    d="M23.3453 21C23.3595 23.2284 22.2478 24.3284 21.2031 25.1021"
                    stroke="#2563EB"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21.2938 13.125C23.4313 16.0625 25.2875 18.5 25.2875 21.4375C25.2875 24.625 23.0375 27.125 20.1688 27.125C18.0875 27.125 16.2875 25.8125 15.5 23.875"
                    stroke="#2563EB"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21.2937 13.125C21.2937 13.125 20.5625 14.375 19.8875 15.5"
                    stroke="#2563EB"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17.525 15.375C18.7062 17 19.55 18.25 19.55 19.5625C19.55 20.325 19.2774 21.0563 18.7921 21.5954C18.3069 22.1346 17.6487 22.4375 16.9625 22.4375C16.2763 22.4375 15.6181 22.1346 15.1329 21.5954C14.6476 21.0563 14.375 20.325 14.375 19.5625C14.375 18.25 15.2187 17 16.4 15.375C16.7375 14.875 17.1875 14.875 17.525 15.375Z"
                    stroke="#2563EB"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <defs>
                  <linearGradient id="paint0_linear_37_6609_exec" x1="20" y1="20" x2="20" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#EAF8FF" />
                    <stop offset="1" stopColor="#9CD0EA" />
                  </linearGradient>
                  <clipPath id="clip0_37_6609_exec">
                    <rect width="40" height="40" fill="white" />
                  </clipPath>
                </defs>
              </svg>

              <div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  ภาวะสารน้ำรั่วออกนอกหลอดเลือด
                </h3>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  บวม • เย็น • ตึง • สารน้ำไหลช้า
                </p>
              </div>
            </div>

            {/* Sub Stats Row */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-gradient-to-b from-[#0086FF] to-[#005099] text-white rounded-xl p-2.5 text-center shadow-2xs">
                <div className="text-[11px] opacity-90 font-medium">รายการทั้งหมด</div>
                <div className="text-xl font-bold">4</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-medium">
                  อยู่ระหว่างเฝ้าระวัง
                </div>
                <div className="text-xl font-bold text-slate-800">3</div>
              </div>
              <div className="bg-red-50 rounded-xl p-2.5 text-center border border-red-200">
                <div className="text-[11px] text-red-600 font-semibold">
                  รอยืนยันเร่งด่วน
                </div>
                <div className="text-xl font-bold text-red-600">1</div>
              </div>
            </div>

            {/* Trend Area Chart */}
            <div className="mt-4 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="font-bold text-slate-800">แนวโน้ม</span>
                <span className="font-bold text-slate-900">+12.4%</span>
              </div>
              <div className="w-full h-12 pt-1">
                <svg className="w-full h-full" viewBox="0 0 250 45" preserveAspectRatio="none" fill="none">
                  <defs>
                    <linearGradient id="exec-infill-trend-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0070F3" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#0070F3" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,35 L 45,32 L 90,34 L 145,22 L 195,28 L 250,10 L 250,45 L 0,45 Z"
                    fill="url(#exec-infill-trend-grad)"
                  />
                  <path
                    d="M 0,35 L 45,32 L 90,34 L 145,22 L 195,28 L 250,10"
                    stroke="#0070F3"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="250" cy="10" r="3.5" fill="#0070F3" />
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom Footer Link */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[12px]">
            <span className="text-slate-500 font-medium">
              รายงานตรวจที่ประเมินเป็นเร่งด่วนแรก
            </span>
            <button className="text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
              <span>ชื่อ-นามสกุลคนไข้ • ผล AI รอการทบทวน</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* PHLEBITIS CARD */}
        <div
          onClick={() => onNavigate && onNavigate('phlebitis')}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow"
        >
          <div>
            <div className="flex items-start justify-between">
              <span className="text-[11px] font-black uppercase text-red-600 tracking-wider">
                PHLEBITIS
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <g clipPath="url(#clip0_37_6965_exec)">
                  <path
                    d="M30 0H10C4.47715 0 0 4.47715 0 10V30C0 35.5228 4.47715 40 10 40H30C35.5228 40 40 35.5228 40 30V10C40 4.47715 35.5228 0 30 0Z"
                    fill="url(#paint0_linear_37_6965_exec)"
                  />
                  <path
                    d="M19.8757 12.3669C18.0519 14.1284 18.0519 15.9633 19.8757 17.578C21.6995 19.1926 21.6995 21.0275 19.8757 22.789C18.0519 24.5504 18.0519 26.3853 19.8757 28"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M26.632 12C24.8082 13.7615 24.8082 15.5963 26.632 17.211C28.4559 18.8257 28.4559 20.6606 26.632 22.422C24.8082 24.1835 24.8082 26.0183 26.632 27.633"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 14.9358H15.4819M12 19.4129H15.4819M12 23.8899H15.4819"
                    stroke="#EF4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <defs>
                  <linearGradient id="paint0_linear_37_6965_exec" x1="20" y1="20" x2="20" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FEF2F2" />
                    <stop offset="1" stopColor="#F6B6B6" />
                  </linearGradient>
                  <clipPath id="clip0_37_6965_exec">
                    <rect width="40" height="40" fill="white" />
                  </clipPath>
                </defs>
              </svg>

              <div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  ภาวะหลอดเลือดดำอักเสบ
                </h3>
                <p className="text-[12px] text-slate-500 mt-0.5">
                  แดง • อุ่น • กดเจ็บ • เปลี่ยนแปลงตามแนวหลอดเลือด
                </p>
              </div>
            </div>

            {/* Sub Stats Row */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="bg-gradient-to-b from-[#0086FF] to-[#005099] text-white rounded-xl p-2.5 text-center shadow-2xs">
                <div className="text-[11px] opacity-90 font-medium">รายการทั้งหมด</div>
                <div className="text-xl font-bold">4</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 text-center border border-slate-200/80">
                <div className="text-[11px] text-slate-500 font-medium">
                  อยู่ระหว่างเฝ้าระวัง
                </div>
                <div className="text-xl font-bold text-slate-800">3</div>
              </div>
              <div className="bg-red-50 rounded-xl p-2.5 text-center border border-red-200">
                <div className="text-[11px] text-red-600 font-semibold">
                  รอยืนยันเร่งด่วน
                </div>
                <div className="text-xl font-bold text-red-600">1</div>
              </div>
            </div>

            {/* Trend Area Chart */}
            <div className="mt-4 bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="font-bold text-slate-800">แนวโน้ม</span>
                <span className="font-bold text-slate-900">+8.7%</span>
              </div>
              <div className="w-full h-12 pt-1">
                <svg className="w-full h-full" viewBox="0 0 250 45" preserveAspectRatio="none" fill="none">
                  <defs>
                    <linearGradient id="exec-phleb-trend-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#DC2626" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#DC2626" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,35 L 50,31 L 90,33 L 140,20 L 190,26 L 250,12 L 250,45 L 0,45 Z"
                    fill="url(#exec-phleb-trend-grad)"
                  />
                  <path
                    d="M 0,35 L 50,31 L 90,33 L 140,20 L 190,26 L 250,12"
                    stroke="#DC2626"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="250" cy="12" r="3.5" fill="#DC2626" />
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom Footer Link */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[12px]">
            <span className="text-slate-500 font-medium">
              รายงานตรวจที่ประเมินเป็นเร่งด่วนแรก
            </span>
            <button className="text-red-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer">
              <span>ชื่อ-นามสกุลคนไข้ • ผล AI รอการทบทวน</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEVERITY GRADE DISTRIBUTION CARD                                          */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        {/* Header row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-[#E8EDFB] flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-[#4F46E5]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-slate-900 leading-snug">
                สัดส่วนระดับความรุนแรง (Grade) โดยรวม
              </h3>
              <p className="text-[12px] text-slate-500 font-normal mt-0.5 leading-normal">
                เฉพาะผลประเมินความรุนแรงที่บุคลากรทางการแพทย์ยืนยันแล้ว แยกตาม Infiltration และ Phlebitis
              </p>
            </div>
          </div>

          {/* Right Tab Pills Container */}
          <div className="bg-[#F1F5F9] p-1 rounded-xl flex items-center gap-1 shrink-0 self-start lg:self-auto max-w-full overflow-x-auto no-scrollbar">
            <button
              onClick={() => setGradeFilter('all')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 text-[13px] font-semibold cursor-pointer shrink-0 transition-all ${gradeFilter === 'all'
                ? 'bg-[#1E58E6] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span>รวม</span>
              <span className={`font-extrabold text-[11px] px-1.5 py-0.5 rounded-md leading-none ${gradeFilter === 'all' ? 'bg-white text-[#1E58E6]' : 'bg-slate-200/80 text-slate-600'
                }`}>
                2
              </span>
            </button>

            <button
              onClick={() => setGradeFilter('infill')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 text-[13px] font-semibold cursor-pointer shrink-0 transition-all ${gradeFilter === 'infill'
                ? 'bg-[#1E58E6] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span>Infiltration</span>
              <span className={`font-extrabold text-[11px] px-1.5 py-0.5 rounded-md leading-none ${gradeFilter === 'infill' ? 'bg-white text-[#1E58E6]' : 'bg-slate-200/80 text-slate-600'
                }`}>
                1
              </span>
            </button>

            <button
              onClick={() => setGradeFilter('phleb')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-2 text-[13px] font-semibold cursor-pointer shrink-0 transition-all ${gradeFilter === 'phleb'
                ? 'bg-[#1E58E6] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span>Phlebitis</span>
              <span className={`font-extrabold text-[11px] px-1.5 py-0.5 rounded-md leading-none ${gradeFilter === 'phleb' ? 'bg-white text-[#1E58E6]' : 'bg-slate-200/80 text-slate-600'
                }`}>
                1
              </span>
            </button>
          </div>
        </div>

        {/* Total Count & Legend Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pt-1">
          <div>
            <div className="text-4xl font-extrabold text-slate-900 leading-none transition-all">
              {currentGradeData.total}
            </div>
            <div className="text-[12px] text-slate-500 font-medium mt-1">
              {currentGradeData.subtitle}
            </div>
          </div>

          {/* Infiltration / Phlebitis Legend */}
          <div className="flex items-center gap-5 text-[13px] self-start sm:self-auto">
            <div className={`flex items-center gap-2 transition-opacity duration-300 ${gradeFilter === 'phleb' ? 'opacity-35' : 'opacity-100'}`}>
              <span className="w-3.5 h-3.5 rounded-xs bg-[#0EA5E9] inline-block shadow-2xs"></span>
              <span className="font-semibold text-slate-700">Infiltration</span>
            </div>
            <div className={`flex items-center gap-2 transition-opacity duration-300 ${gradeFilter === 'infill' ? 'opacity-35' : 'opacity-100'}`}>
              <span className="w-3.5 h-3.5 rounded-xs bg-[#EF4444] inline-block shadow-2xs"></span>
              <span className="font-semibold text-slate-700">Phlebitis</span>
            </div>
          </div>
        </div>

        {/* Grade Bars Stack */}
        <div className="space-y-3.5 pt-1">
          {currentGradeData.grades.map((item) => (
            <div key={item.grade} className="flex items-center gap-3 text-[13px]">
              <span className="w-16 font-medium text-slate-700 shrink-0">{item.grade}</span>
              <div className="flex-1 bg-[#F1F5F9] h-3.5 rounded-full overflow-hidden flex p-0.5 border border-slate-100 shadow-inner">
                {item.infillWidth > 0 && (
                  <div
                    style={{ width: `${item.infillWidth}%` }}
                    className="bg-[#0EA5E9] h-full rounded-full transition-all duration-500 ease-out"
                  ></div>
                )}
                {item.phlebWidth > 0 && (
                  <div
                    style={{ width: `${item.phlebWidth}%` }}
                    className="bg-[#EF4444] h-full rounded-full transition-all duration-500 ease-out"
                  ></div>
                )}
              </div>
              <span className="w-6 font-bold text-slate-900 text-right shrink-0">{item.count}</span>
              <span className="w-12 text-[12px] text-slate-500 text-right shrink-0">{item.percent}</span>
            </div>
          ))}
        </div>

        {/* Bottom Footer Note & Action */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px] text-slate-500">
          <div>
            AI ไม่กำหนดระดับความรุนแรง (Grade) · แสดงเฉพาะผลที่บุคลากรทางการแพทย์ยืนยันแล้ว
          </div>
          <button
            onClick={() => {
              if (onNavigate) {
                if (gradeFilter === 'infill') {
                  onNavigate('infiltration');
                } else if (gradeFilter === 'phleb') {
                  onNavigate('phlebitis');
                } else {
                  onNavigate('history');
                }
              }
            }}
            className="text-[#1E58E6] font-semibold hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>
              {gradeFilter === 'infill'
                ? 'ดูรายละเอียด Infiltration'
                : gradeFilter === 'phleb'
                ? 'ดูรายละเอียด Phlebitis'
                : 'ดูรายละเอียดแต่ละประเภท'}
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TWO BOTTOM WIDGETS GRID (TIMELINESS vs DATA READINESS)                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT WIDGET: ความตรงต่อเวลาของรอบตรวจ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F3E8FF] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-[#9333EA]" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">
                  ความตรงต่อเวลาของรอบตรวจ
                </h3>
                <p className="text-[12px] text-slate-500 font-normal mt-0.5">
                  คำนวณตามรอบตรวจทุก 2 ชั่วโมงตลอดระยะติดตาม 96 ชั่วโมง
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('rounds')}
              className="text-[12px] text-[#1E58E6] font-semibold hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>ดูรายการทั้งหมด</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center pt-1">
            {/* Donut Graphic */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <defs>
                    <linearGradient id="exec-donut-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4F46E5" />
                      <stop offset="100%" stopColor="#2C277F" />
                    </linearGradient>
                  </defs>
                  <path
                    className="text-slate-100"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    stroke="url(#exec-donut-gradient)"
                    strokeDasharray="92, 100"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-slate-900 leading-none">
                    92%
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 mt-1">
                    คำนวณจากทั้งหมด
                  </span>
                </div>
              </div>
            </div>

            {/* Horizontal Bars & Counts List */}
            <div className="sm:col-span-7 space-y-3 text-[13px]">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#F1F5F9] h-3.5 rounded-full overflow-hidden flex p-0.5 border border-slate-100 shadow-inner">
                  <div className="bg-gradient-to-r from-[#EF4444] to-[#892727] h-full w-[25%] rounded-full shadow-2xs"></div>
                </div>
                <span className="text-slate-600 font-medium shrink-0 text-[12px] min-w-[100px] text-right">เกินกำหนด</span>
                <span className="font-bold text-slate-900 shrink-0 w-5 text-right">3</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#F1F5F9] h-3.5 rounded-full overflow-hidden flex p-0.5 border border-slate-100 shadow-inner">
                  <div className="bg-gradient-to-r from-[#F97316] to-[#C2410C] h-full w-[45%] rounded-full shadow-2xs"></div>
                </div>
                <span className="text-slate-600 font-medium shrink-0 text-[12px] min-w-[100px] text-right">ครบกำหนดตรวจวันนี้</span>
                <span className="font-bold text-slate-900 shrink-0 w-5 text-right">7</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#F1F5F9] h-3.5 rounded-full overflow-hidden flex p-0.5 border border-slate-100 shadow-inner">
                  <div className="bg-gradient-to-r from-[#A855F7] to-[#633291] h-full w-[65%] rounded-full shadow-2xs"></div>
                </div>
                <span className="text-slate-600 font-medium shrink-0 text-[12px] min-w-[100px] text-right">รอดำเนินการ</span>
                <span className="font-bold text-slate-900 shrink-0 w-5 text-right">18</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#F1F5F9] h-3.5 rounded-full overflow-hidden flex p-0.5 border border-slate-100 shadow-inner">
                  <div className="bg-gradient-to-r from-[#22C55E] to-[#14532D] h-full w-[85%] rounded-full shadow-2xs"></div>
                </div>
                <span className="text-slate-600 font-medium shrink-0 text-[12px] min-w-[100px] text-right">ดำเนินการครบถ้วน</span>
                <span className="font-bold text-slate-900 shrink-0 w-5 text-right">42</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT WIDGET: ความพร้อมของข้อมูล */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">
                  ความพร้อมของข้อมูล
                </h3>
                <p className="text-[12px] text-slate-500 font-normal mt-0.5">
                  ความครบถ้วนของข้อมูลที่นำมาประมวลผล
                </p>
              </div>
            </div>
            <button className="text-[12px] text-[#1E58E6] font-semibold hover:underline flex items-center gap-1 cursor-pointer shrink-0">
              <span>สถานะ HIS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 pt-2 text-[13px]">
            {/* Bar 1: ข้อมูล HIS สมบูรณ์ */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[12px]">
                <span className="font-semibold text-slate-700">ข้อมูล HIS สมบูรณ์</span>
                <span className="font-bold text-slate-900">98%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-100">
                <div className="bg-gradient-to-r from-[#10B981] to-[#047857] h-full w-[98%] rounded-full shadow-2xs"></div>
              </div>
            </div>

            {/* Bar 2: การบันทึกการติดตาม */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[12px]">
                <span className="font-semibold text-slate-700">การบันทึกการติดตาม</span>
                <span className="font-bold text-slate-900">92%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-100">
                <div className="bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] h-full w-[92%] rounded-full shadow-2xs"></div>
              </div>
            </div>

            {/* Bar 3: ผล AI ได้รับการทบทวน */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[12px]">
                <span className="font-semibold text-slate-700">ผล AI ได้รับการทบทวน</span>
                <span className="font-bold text-slate-900">77%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-100">
                <div className="bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] h-full w-[77%] rounded-full shadow-2xs"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HISTORICAL SUMMARY TABLE: สรุปผลย้อนหลัง                                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">
                สรุปผลย้อนหลัง
              </h3>
              <p className="text-[12px] text-slate-500 font-normal mt-0.5">
                ข้อมูลรวมแยกรายเดือน ย้อนหลังสูงสุด 12 เดือน
              </p>
            </div>
          </div>

          <button className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-slate-700 rounded-xl font-semibold text-[12px] transition-all cursor-pointer self-start sm:self-auto">
            <Copy className="w-3.5 h-3.5 text-slate-600" />
            <span>คัดลอกข้อมูลย้อนหลัง</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[12px] font-semibold text-slate-500">
                <th className="py-2.5 px-3">ช่วงเวลา</th>
                <th className="py-2.5 px-3">ผู้ป่วยได้รับการประเมิน</th>
                <th className="py-2.5 px-3">ตรงตามกำหนด</th>
                <th className="py-2.5 px-3">อัตราตรงเวลา</th>
                <th className="py-2.5 px-3">ผล AI รอการทบทวน</th>
                <th className="py-2.5 px-3">แนวโน้ม</th>
                <th className="py-2.5 px-3 text-right">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {/* Row 1 */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-bold text-slate-900">
                  1-10 ส.ค. 2569
                </td>
                <td className="py-3 px-3 text-slate-600">46 ราย</td>
                <td className="py-3 px-3 text-slate-600">41 ราย</td>
                <td className="py-3 px-3 font-bold text-[#1E58E6]">92%</td>
                <td className="py-3 px-3 text-slate-600">5 รายการ</td>
                <td className="py-3 px-3 font-bold text-emerald-600">+2.4%</td>
                <td className="py-3 px-3 text-right">
                  <button className="px-3 py-1 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-lg font-semibold text-[12px] transition-all shadow-2xs cursor-pointer">
                    ส่งออก
                  </button>
                </td>
              </tr>

              {/* Row 2 */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-bold text-slate-900">
                  ก.ค. 2569
                </td>
                <td className="py-3 px-3 text-slate-600">133 ราย</td>
                <td className="py-3 px-3 text-slate-600">118 ราย</td>
                <td className="py-3 px-3 font-bold text-[#1E58E6]">90%</td>
                <td className="py-3 px-3 text-slate-600">18 รายการ</td>
                <td className="py-3 px-3 font-bold text-emerald-600">+3.2%</td>
                <td className="py-3 px-3 text-right">
                  <button className="px-3 py-1 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-lg font-semibold text-[12px] transition-all shadow-2xs cursor-pointer">
                    ส่งออก
                  </button>
                </td>
              </tr>

              {/* Row 3 */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-bold text-slate-900">
                  มิ.ย. 2569
                </td>
                <td className="py-3 px-3 text-slate-600">121 ราย</td>
                <td className="py-3 px-3 text-slate-600">105 ราย</td>
                <td className="py-3 px-3 font-bold text-[#1E58E6]">87%</td>
                <td className="py-3 px-3 text-slate-600">22 รายการ</td>
                <td className="py-3 px-3 font-bold text-emerald-600">+1.1%</td>
                <td className="py-3 px-3 text-right">
                  <button className="px-3 py-1 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-lg font-semibold text-[12px] transition-all shadow-2xs cursor-pointer">
                    ส่งออก
                  </button>
                </td>
              </tr>

              {/* Row 4 */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-bold text-slate-900">
                  พ.ค. 2569
                </td>
                <td className="py-3 px-3 text-slate-600">116 ราย</td>
                <td className="py-3 px-3 text-slate-600">101 ราย</td>
                <td className="py-3 px-3 font-bold text-[#1E58E6]">86%</td>
                <td className="py-3 px-3 text-slate-600">24 รายการ</td>
                <td className="py-3 px-3 text-slate-400 font-medium">ฐานเปรียบเทียบ</td>
                <td className="py-3 px-3 text-right">
                  <button className="px-3 py-1 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-lg font-semibold text-[12px] transition-all shadow-2xs cursor-pointer">
                    ส่งออก
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM DISCLAIMER BANNER                                                  */}
      {/* ========================================================================= */}
      <div className="bg-[#EBF5FF] border border-sky-200/80 rounded-2xl p-4 flex items-center gap-4 text-sky-950">
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
        <div className="text-[13px]">
          <div className="font-bold text-sky-900">
            AI เป็นเครื่องมือสนับสนุนการตรวจสุขภาพ
          </div>
          <p className="text-sky-700 mt-0.5 text-[12px]">
            ผล AI ไม่ใช่การวินิจฉัย ผลการบันทึกต้องได้รับการยืนยันโดยแพทย์/พยาบาล
          </p>
        </div>
      </div>
      {/* Toast Alert for Export Success */}
      {exportSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0" />
          <div className="text-[13px]">
            <span className="font-bold">ส่งออกรายงานสำเร็จ!</span>
            <span className="block text-[12px] opacity-90">
              {exportFormat === 'pdf' ? 'ไฟล์ PDF เปิดเอกสารเรียบร้อยแล้ว' : 'ไฟล์ .csv ถูกดาวน์โหลดเรียบร้อยแล้ว'}
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXPORT REPORT MODAL                                                       */}
      {/* ========================================================================= */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-[640px] w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">
                  PEDIVEINCARE AI
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                  ส่งออกรายงาน
                </h3>
                <p className="text-[13px] text-slate-500 font-normal mt-0.5">
                  รายงานสรุปภาพรวม PediVeinCare AI · 30 วันล่าสุด · 12 ก.ค.–10 ส.ค. 2569
                </p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Info Box (Report Target) */}
            <div className="bg-[#F0F7FF] border border-[#BFDBFE] rounded-xl p-4 flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-lg bg-blue-100/80 text-[#1E58E6] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="text-[12px] text-slate-500 font-normal block">
                  รายงานที่จะส่งออก
                </span>
                <span className="text-[13px] font-bold text-[#1E58E6] leading-snug">
                  รายงานสรุปภาพรวม PediVeinCare AI · 30 วันล่าสุด · 12 ก.ค.–10 ส.ค. 2569
                </span>
              </div>
            </div>

            {/* Format Selection Cards (2 Cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: PDF */}
              <div
                onClick={() => setExportFormat('pdf')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${exportFormat === 'pdf'
                    ? 'border-[#1E58E6] bg-[#F0F7FF] shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${exportFormat === 'pdf'
                      ? 'border-[#1E58E6] bg-[#1E58E6]'
                      : 'border-slate-300 bg-white'
                    }`}
                >
                  {exportFormat === 'pdf' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-[#1E58E6] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 text-[14px] leading-tight">
                    PDF สำหรับผู้บริหาร
                  </h4>
                  <p className="text-[12px] text-slate-500 font-normal mt-0.5 leading-snug">
                    เปิดเอกสารสำหรับพิมพ์หรือบันทึกเป็น PDF
                  </p>
                </div>
              </div>

              {/* Option 2: Excel / CSV */}
              <div
                onClick={() => setExportFormat('csv')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 ${exportFormat === 'csv'
                    ? 'border-[#1E58E6] bg-[#F0F7FF] shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${exportFormat === 'csv'
                      ? 'border-[#1E58E6] bg-[#1E58E6]'
                      : 'border-slate-300 bg-white'
                    }`}
                >
                  {exportFormat === 'csv' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 text-[14px] leading-tight">
                    Excel-compatible (.csv)
                  </h4>
                  <p className="text-[12px] text-slate-500 font-normal mt-0.5 leading-snug">
                    ดาวน์โหลดข้อมูลสรุปเพื่อนำไปวิเคราะห์ต่อ
                  </p>
                </div>
              </div>
            </div>

            {/* Dropdown Options (2 Cols) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13px]">
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  ระดับรายละเอียด
                </label>
                <select
                  value={detailLevel}
                  onChange={(e) => setDetailLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="ข้อมูลสรุปทุกหมวด">ข้อมูลสรุปทุกหมวด</option>
                  <option value="เฉพาะสถิติสำคัญ">เฉพาะสถิติสำคัญ</option>
                  <option value="ข้อมูลเชิงลึกแยกตามรอบ">ข้อมูลเชิงลึกแยกตามรอบ</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  การจัดการข้อมูลระบุตัวผู้ป่วย
                </label>
                <select
                  value={patientDataHandling}
                  onChange={(e) => setPatientDataHandling(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white text-slate-800 font-medium cursor-pointer"
                >
                  <option value="ไม่รวมข้อมูลระบุตัวผู้ป่วย">ไม่รวมข้อมูลระบุตัวผู้ป่วย</option>
                  <option value="แสดงรหัสอ้างอิง HN">แสดงรหัสอ้างอิง HN</option>
                  <option value="แสดงข้อมูลครบถ้วน">แสดงข้อมูลครบถ้วน</option>
                </select>
              </div>
            </div>

            {/* Included Content Box */}
            <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 space-y-2 text-[13px]">
              <h4 className="font-bold text-slate-900 leading-snug">
                เนื้อหาที่รวมในรายงาน
              </h4>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-[#10B981] stroke-[3] shrink-0" />
                  <span>ตัวชี้วัดหลักและแนวโน้มตามช่วงเวลา</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-[#10B981] stroke-[3] shrink-0" />
                  <span>ผลยืนยัน Infiltration, Phlebitis และสัดส่วน Grade</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-700 font-medium">
                  <Check className="w-4 h-4 text-[#10B981] stroke-[3] shrink-0" />
                  <span>ความพร้อมของข้อมูล HIS และคุณภาพของภาพ</span>
                </div>
              </div>
            </div>

            {/* Audit Notice Card */}
            <div className="bg-[#F0F7FF] border border-[#BFDBFE] rounded-xl p-3.5 flex items-center gap-3 text-[#1E58E6]">
              <Lock className="w-4 h-4 shrink-0 text-[#1E58E6]" />
              <p className="text-[12px] font-medium leading-normal">
                ระบบจะบันทึกผู้ส่งออก วัน-เวลา รูปแบบไฟล์ และขอบเขตข้อมูลไว้สำหรับการตรวจสอบย้อนหลัง
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl font-medium text-slate-600 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteExport}
                disabled={isExporting}
                className="px-5 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-xl font-medium shadow-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-75"
              >
                <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                <span>
                  {isExporting
                    ? 'กำลังประมวลผล...'
                    : exportFormat === 'pdf'
                      ? 'เปิดเอกสาร PDF'
                      : 'ดาวน์โหลดไฟล์ .csv'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
