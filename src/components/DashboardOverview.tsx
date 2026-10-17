import React from 'react';
import {
  RefreshCw,
  ChevronRight,
  Clock,
  AlertTriangle,
  Bell,
  ClipboardList,
  CalendarClock
} from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  hn: string;
  site: string;
  ward: string;
  bed: string;
  progress: string;
  round: string;
  statusType: string;
  statusText: string;
  aiStatus: string;
  aiType: string;
  urgency: string;
}

interface DashboardOverviewProps {
  onNavigate: (nav: string) => void;
  handleRefresh: () => void;
  isRefreshing: boolean;
  filteredPatients: Patient[];
  tableFilter: string;
  setTableFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
  handleRefresh,
  isRefreshing,
  setTableFilter,
}) => {
  const [gradeFilter, setGradeFilter] = React.useState<'all' | 'infill' | 'phleb'>('all');
  const [inspectionFilter, setInspectionFilter] = React.useState<string>('all');

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

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* SECTION HEADER ROW                                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[12px] font-bold text-blue-600 tracking-wide uppercase">
            ภาพรวมการปฏิบัติงาน • แผนกเด็ก
          </span>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            รายการผู้ป่วยที่ต้องดำเนินการตรวจ IV Site
          </h2>
          <p className="text-[13px] text-slate-500 mt-0.5">
            จัดลำดับตามผล AI ที่รอการทบทวน สถานะเกินกำหนด ถึงกำหนด และใกล้ถึงกำหนด เพื่อสนับสนุนการจัดลำดับงานของพยาบาล
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-semibold text-[13px] shadow-2xs transition-all active:scale-95 shrink-0 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>ปรับปรุงข้อมูล</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 7 METRIC CARDS GRID (WITH ORIGINAL CUSTOM SVG LOGOS AND COLOR PALETTE)    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div
          onClick={() => onNavigate('patients')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between h-[128px] cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-semibold text-slate-600">
              ผู้ป่วยอยู่ระหว่างติดตาม
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-3.5 my-1">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <g clipPath="url(#clip0_37_5102)">
                <path d="M30 0H10C4.47715 0 0 4.47715 0 10V30C0 35.5228 4.47715 40 10 40H30C35.5228 40 40 35.5228 40 30V10C40 4.47715 35.5228 0 30 0Z" fill="#0086FF" />
                <path d="M10 21H14L16.4 14L20.6 28L23.7 18L25.7 21H30" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <defs>
                <clipPath id="clip0_37_5102">
                  <rect width="40" height="40" fill="white" />
                </clipPath>
              </defs>
            </svg>

            <div className="text-[30px] text-slate-900 font-bold leading-none">
              4
            </div>
          </div>
          <div className="text-[12px] text-slate-500 font-medium">
            ระยะติดตาม 96 ชั่วโมง
          </div>
        </div>

        {/* Card 2 */}
        <div
          onClick={() => onNavigate('rounds')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between h-[128px] cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-semibold text-slate-600">ถึงกำหนดรอบตรวจ</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-3.5 my-1">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <g clipPath="url(#clip0_37_5181)">
                <path d="M30 0H10C4.47715 0 0 4.47715 0 10V30C0 35.5228 4.47715 40 10 40H30C35.5228 40 40 35.5228 40 30V10C40 4.47715 35.5228 0 30 0Z" fill="#FFAD00" />
                <path d="M20 28C24.4183 28 28 24.4183 28 20C28 15.5817 24.4183 12 20 12C15.5817 12 12 15.5817 12 20C12 24.4183 15.5817 28 20 28Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 15V20L23 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <defs>
                <clipPath id="clip0_37_5181">
                  <rect width="40" height="40" fill="white" />
                </clipPath>
              </defs>
            </svg>

            <div className="text-[30px] text-slate-900 font-bold leading-none">
              1
            </div>
          </div>
          <div className="text-[12px] text-slate-500 font-medium">
            รอบตรวจทุก 2 ชั่วโมง
          </div>
        </div>

        {/* Card 3 (Red Alert) */}
        <div
          onClick={() => onNavigate('rounds')}
          className="bg-white rounded-2xl p-4 border border-red-200 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between h-[128px] bg-red-50/10 cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-semibold text-slate-700">เกินกำหนด</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-3.5 my-1">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <g clipPath="url(#clip0_37_5137)">
                <path d="M30 0H10C4.47715 0 0 4.47715 0 10V30C0 35.5228 4.47715 40 10 40H30C35.5228 40 40 35.5228 40 30V10C40 4.47715 35.5228 0 30 0Z" fill="#FF0000" />
                <path d="M20 12L29 27.5H11L20 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 17.5V22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20 25.5H20.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <defs>
                <clipPath id="clip0_37_5137">
                  <rect width="40" height="40" fill="white" />
                </clipPath>
              </defs>
            </svg>

            <div className="text-[30px] text-slate-900 font-bold leading-none">
              1
            </div>
          </div>
          <div className="text-[12px] text-red-600 font-semibold">
            ต้องดำเนินการเป็นลำดับแรก
          </div>
        </div>

        {/* Card 4 */}
        <div
          onClick={() => onNavigate('rounds')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between h-[128px] cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-semibold text-slate-600">
              ใกล้ถึงกำหนดตรวจ
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-3.5 my-1">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <g clipPath="url(#clip0_37_5194)">
                <path d="M30 0H10C4.47715 0 0 4.47715 0 10V30C0 35.5228 4.47715 40 10 40H30C35.5228 40 40 35.5228 40 30V10C40 4.47715 35.5228 0 30 0Z" fill="#3ED8BE" />
                <path d="M22.5 13H13.5C12.1193 13 11 14.1193 11 15.5V24.5C11 25.8807 12.1193 27 13.5 27H22.5C23.8807 27 25 25.8807 25 24.5V15.5C25 14.1193 23.8807 13 22.5 13Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14.5 11V15M21.5 11V15M11 17.5H25" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M24.5 30C26.9853 30 29 27.9853 29 25.5C29 23.0147 26.9853 21 24.5 21C22.0147 21 20 23.0147 20 25.5C20 27.9853 22.0147 30 24.5 30Z" fill="#3ED8BE" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M24.5 23.3V25.7L26.1 26.7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <defs>
                <clipPath id="clip0_37_5194">
                  <rect width="40" height="40" fill="white" />
                </clipPath>
              </defs>
            </svg>

            <div className="text-[30px] text-slate-900 font-bold leading-none">
              2
            </div>
          </div>
          <div className="text-[12px] text-teal-700 font-semibold">
            ภายใน 30 นาที
          </div>
        </div>

        {/* Card 5 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between h-[128px]">
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-semibold text-slate-600">ข้ามรอบติดตาม</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-3.5 my-1">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <g clipPath="url(#clip0_37_5384)">
                <path d="M30 0H10C4.47715 0 0 4.47715 0 10V30C0 35.5228 4.47715 40 10 40H30C35.5228 40 40 35.5228 40 30V10C40 4.47715 35.5228 0 30 0Z" fill="#475569" />
                <path d="M28.2 23.3C26.6218 24.1856 24.7973 24.5312 23.0046 24.284C21.2118 24.0368 19.5489 23.2104 18.2693 21.9307C16.9896 20.6511 16.1632 18.9882 15.916 17.1954C15.6688 15.4027 16.0144 13.5782 16.9 12C15.6628 12.5784 14.5832 13.4465 13.7526 14.5306C12.922 15.6148 12.3649 16.8831 12.1284 18.2282C11.8919 19.5733 11.983 20.9556 12.394 22.258C12.8051 23.5605 13.5239 24.7447 14.4896 25.7104C15.4553 26.6761 16.6395 27.3949 17.942 27.806C19.2444 28.217 20.6267 28.3081 21.9718 28.0716C23.3169 27.8351 24.5852 27.278 25.6694 26.4474C26.7535 25.6168 27.6216 24.5372 28.2 23.3Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <defs>
                <clipPath id="clip0_37_5384">
                  <rect width="40" height="40" fill="white" />
                </clipPath>
              </defs>
            </svg>

            <div className="text-[30px] text-slate-900 font-bold leading-none">
              0
            </div>
          </div>
          <div className="text-[12px] text-slate-500 font-medium">
            ไม่นับเป็นรอบตรวจที่ดำเนินการแล้ว
          </div>
        </div>

        {/* Card 6 */}
        <div
          onClick={() => onNavigate('ai_review')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between h-[128px] cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-semibold text-slate-600">
              ผล AI รอการทบทวน
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-3.5 my-1">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <g clipPath="url(#clip0_37_5389)">
                <path d="M30 0H10C4.47715 0 0 4.47715 0 10V30C0 35.5228 4.47715 40 10 40H30C35.5228 40 40 35.5228 40 30V10C40 4.47715 35.5228 0 30 0Z" fill="#4B00FF" />
                <path d="M17 15L18.3 18.4L22 20L18.3 21.6L17 25L15.6 21.6L12 20L15.6 18.4L17 15Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M25 21L25.9 23.1L28 24L25.9 24.9L25 27L24.1 24.9L22 24L24.1 23.1L25 21Z" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M24 13L24.7 14.6L26.5 15.3L24.7 16L24 18L23.3 16L21.5 15.3L23.3 14.6L24 13Z" stroke="white" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <defs>
                <clipPath id="clip0_37_5389">
                  <rect width="40" height="40" fill="white" />
                </clipPath>
              </defs>
            </svg>

            <div className="text-[30px] text-slate-900 font-bold leading-none">
              2
            </div>
          </div>
          <div className="text-[12px] text-slate-500 font-medium">
            แยกตามประเภทภาวะ
          </div>
        </div>

        {/* Card 7 */}
        <div
          onClick={() => onNavigate('completed')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between h-[128px] cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <span className="text-[13px] font-semibold text-slate-600">
              ครบกำหนดติดตามวันนี้
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-3.5 my-1">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <g clipPath="url(#clip0_37_5396)">
                <path d="M30 0H10C4.47715 0 0 4.47715 0 10V30C0 35.5228 4.47715 40 10 40H30C35.5228 40 40 35.5228 40 30V10C40 4.47715 35.5228 0 30 0Z" fill="#15803D" />
                <path d="M16.4 12H22.8L26 16V28H14V12H16.4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M22 13V17H26" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 22.5957L19.6418 24L23 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <defs>
                <clipPath id="clip0_37_5396">
                  <rect width="40" height="40" fill="white" />
                </clipPath>
              </defs>
            </svg>

            <div className="text-[30px] text-slate-900 font-bold leading-none">
              1
            </div>
          </div>
          <div className="text-[12px] text-slate-500 font-medium">
            สรุปและปิดการติดตาม
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TWO CONDITION CARDS: INFILTRATION vs PHLEBITIS                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* INFILTRATION CARD */}
        <div
          onClick={() => onNavigate('infiltration')}
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
                <g clipPath="url(#clip0_37_6609)">
                  <path
                    d="M30 0H10C4.47715 0 0 4.47715 0 10V30C0 35.5228 4.47715 40 10 40H30C35.5228 40 40 35.5228 40 30V10C40 4.47715 35.5228 0 30 0Z"
                    fill="url(#paint0_linear_37_6609)"
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
                  <linearGradient id="paint0_linear_37_6609" x1="20" y1="20" x2="20" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#EAF8FF" />
                    <stop offset="1" stopColor="#9CD0EA" />
                  </linearGradient>
                  <clipPath id="clip0_37_6609">
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

            {/* Sub Stats Row with Rich Gradient Pill */}
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
                    <linearGradient id="infill-trend-grad-full" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0070F3" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#0070F3" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,35 L 45,32 L 90,34 L 145,22 L 195,28 L 250,10 L 250,45 L 0,45 Z"
                    fill="url(#infill-trend-grad-full)"
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('infiltration');
              }}
              className="text-blue-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>ชื่อ-นามสกุลคนไข้ • ผล AI รอการทบทวน</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* PHLEBITIS CARD */}
        <div
          onClick={() => onNavigate('phlebitis')}
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
                <g clipPath="url(#clip0_37_6965)">
                  <path
                    d="M30 0H10C4.47715 0 0 4.47715 0 10V30C0 35.5228 4.47715 40 10 40H30C35.5228 40 40 35.5228 40 30V10C40 4.47715 35.5228 0 30 0Z"
                    fill="url(#paint0_linear_37_6965)"
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
                  <linearGradient id="paint0_linear_37_6965" x1="20" y1="20" x2="20" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FEF2F2" />
                    <stop offset="1" stopColor="#F6B6B6" />
                  </linearGradient>
                  <clipPath id="clip0_37_6965">
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

            {/* Sub Stats Row with Rich Gradient Pill */}
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
                    <linearGradient id="phleb-trend-grad-full" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#DC2626" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#DC2626" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,35 L 50,31 L 90,33 L 140,20 L 190,26 L 250,12 L 250,45 L 0,45 Z"
                    fill="url(#phleb-trend-grad-full)"
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('phlebitis');
              }}
              className="text-red-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>ชื่อ-นามสกุลคนไข้ • ผล AI รอการทบทวน</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SEVERITY GRADE DISTRIBUTION CARD (WITH RICH COLOR GRADIENTS)              */}
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

          {/* Infiltration / Phlebitis Gradient Legend */}
          <div className="flex items-center gap-5 text-[13px] self-start sm:self-auto">
            <div className={`flex items-center gap-2 transition-opacity duration-300 ${gradeFilter === 'phleb' ? 'opacity-35' : 'opacity-100'}`}>
              <span className="w-4 h-2 rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#085D83] inline-block shadow-2xs"></span>
              <span className="font-semibold text-slate-700">Infiltration</span>
            </div>
            <div className={`flex items-center gap-2 transition-opacity duration-300 ${gradeFilter === 'infill' ? 'opacity-35' : 'opacity-100'}`}>
              <span className="w-4 h-2 rounded-full bg-gradient-to-r from-[#EF4444] to-[#892727] inline-block shadow-2xs"></span>
              <span className="font-semibold text-slate-700">Phlebitis</span>
            </div>
          </div>
        </div>

        {/* Grade Bars Stack */}
        <div className="space-y-3.5 pt-1">
          {currentGradeData.grades.map((item) => (
            <div key={item.grade} className="flex items-center gap-3 text-[13px]">
              <span className="w-16 font-medium text-slate-700 shrink-0">{item.grade}</span>
              <div className="flex-1 bg-[#F1F5F9] h-4 rounded-full overflow-hidden flex p-0.5 border border-slate-100 shadow-inner">
                {item.infillWidth > 0 && (
                  <div
                    style={{ width: `${item.infillWidth}%` }}
                    className="bg-gradient-to-r from-[#0EA5E9] to-[#085D83] h-full rounded-full shadow-2xs transition-all duration-500 ease-out"
                  ></div>
                )}
                {item.phlebWidth > 0 && (
                  <div
                    style={{ width: `${item.phlebWidth}%` }}
                    className="bg-gradient-to-r from-[#EF4444] to-[#892727] h-full rounded-full shadow-2xs transition-all duration-500 ease-out"
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
              if (gradeFilter === 'infill') {
                onNavigate('infiltration');
              } else if (gradeFilter === 'phleb') {
                onNavigate('phlebitis');
              } else {
                onNavigate('history');
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
      {/* 2-COLUMN MAIN GRID: LEFT (TIMELINESS + PENDING TASKS) | RIGHT (NOTIFICATIONS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 COLS): TIMELINESS + PENDING INSPECTION TASKS */}
        <div className="lg:col-span-7 space-y-6">
          {/* WIDGET 1: ความตรงต่อเวลาของรอบตรวจ */}
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
                onClick={() => onNavigate('rounds')}
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
                      <linearGradient id="donut-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4F46E5" />
                        <stop offset="100%" stopColor="#2C277F" />
                      </linearGradient>
                    </defs>
                    {/* Ring background */}
                    <path
                      className="text-slate-100"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Ring Arc with gradient */}
                    <path
                      stroke="url(#donut-gradient)"
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

              {/* Horizontal Bars & Counts List (With Rich Gradient Bars) */}
              <div className="sm:col-span-7 space-y-3 text-[13px]">
                {/* Overdue */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#F1F5F9] h-3.5 rounded-full overflow-hidden flex p-0.5 border border-slate-100 shadow-inner">
                    <div className="bg-gradient-to-r from-[#EF4444] to-[#892727] h-full w-[25%] rounded-full shadow-2xs"></div>
                  </div>
                  <span className="text-slate-600 font-medium shrink-0 text-[12px] min-w-[100px] text-right">เกินกำหนด</span>
                  <span className="font-bold text-slate-900 shrink-0 w-5 text-right">3</span>
                </div>

                {/* Due Today */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#F1F5F9] h-3.5 rounded-full overflow-hidden flex p-0.5 border border-slate-100 shadow-inner">
                    <div className="bg-gradient-to-r from-[#4F46E5] to-[#2C277F] h-full w-[45%] rounded-full shadow-2xs"></div>
                  </div>
                  <span className="text-slate-600 font-medium shrink-0 text-[12px] min-w-[100px] text-right">ครบกำหนดตรวจวันนี้</span>
                  <span className="font-bold text-slate-900 shrink-0 w-5 text-right">7</span>
                </div>

                {/* Pending */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#F1F5F9] h-3.5 rounded-full overflow-hidden flex p-0.5 border border-slate-100 shadow-inner">
                    <div className="bg-gradient-to-r from-[#A855F7] to-[#633291] h-full w-[65%] rounded-full shadow-2xs"></div>
                  </div>
                  <span className="text-slate-600 font-medium shrink-0 text-[12px] min-w-[100px] text-right">รอดำเนินการ</span>
                  <span className="font-bold text-slate-900 shrink-0 w-5 text-right">18</span>
                </div>

                {/* Completed */}
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

          {/* WIDGET 2: รายการตรวจที่ต้องดำเนินการ (TASKS TABLE) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center font-bold shrink-0">
                  <ClipboardList className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 leading-tight">
                    รายการตรวจที่ต้องดำเนินการ
                  </h3>
                  <p className="text-[12px] text-slate-500 font-normal mt-0.5">
                    เรียงตามระดับความเร่งด่วนและเวลาที่เกินกำหนด
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('rounds')}
                className="text-[12px] text-[#1E58E6] font-semibold hover:underline flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>ดูรายการตรวจทั้งหมด</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => { setInspectionFilter('all'); setTableFilter('all'); }}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-bold shrink-0 transition-all cursor-pointer ${inspectionFilter === 'all'
                  ? 'bg-[#1E58E6] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => { setInspectionFilter('ai_review'); setTableFilter('ai_review'); }}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium shrink-0 transition-all cursor-pointer ${inspectionFilter === 'ai_review'
                  ? 'bg-[#1E58E6] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                ผล AI รอการทบทวน
              </button>
              <button
                onClick={() => { setInspectionFilter('overdue'); setTableFilter('overdue'); }}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium shrink-0 transition-all cursor-pointer ${inspectionFilter === 'overdue'
                  ? 'bg-[#1E58E6] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                เกินกำหนด
              </button>
              <button
                onClick={() => { setInspectionFilter('due'); setTableFilter('due'); }}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium shrink-0 transition-all cursor-pointer ${inspectionFilter === 'due'
                  ? 'bg-[#1E58E6] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                ถึงกำหนด
              </button>
              <button
                onClick={() => { setInspectionFilter('near_due'); setTableFilter('near_due'); }}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium shrink-0 transition-all cursor-pointer ${inspectionFilter === 'near_due'
                  ? 'bg-[#1E58E6] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                ใกล้ถึงกำหนด
              </button>
              <button
                onClick={() => setInspectionFilter('transferred')}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium shrink-0 transition-all cursor-pointer ${inspectionFilter === 'transferred'
                  ? 'bg-[#1E58E6] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                ข้ามรอบ
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border-t border-slate-100 pt-2">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[12px] font-semibold text-slate-500">
                    <th className="py-2.5 px-2">ผู้ป่วย</th>
                    <th className="py-2.5 px-2">หอผู้ป่วย / เตียง</th>
                    <th className="py-2.5 px-2">ความคืบหน้า</th>
                    <th className="py-2.5 px-2">กำหนดตรวจ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[12px]">
                  {/* Row 1 */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-900 text-[13px]">
                        ชื่อ-นามสกุลคนไข้
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        HN56789012 • กุมารเวชกรรม
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-800">PICU</div>
                      <div className="text-[11px] text-slate-500">เตียง B04</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-800">32 / 168 ชม.</div>
                      <div className="text-[11px] text-slate-500">รอบ 16 / 48</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100/80 text-red-900 border border-red-200/80 rounded-full text-[12px] font-bold">
                        <Clock className="w-3.5 h-3.5 text-red-800 shrink-0" />
                        <span>เกินกำหนด</span>
                      </div>
                      <div className="text-[12px] text-slate-500 font-medium mt-1">
                        14:00 น. · เกินกำหนด <span className="text-red-600 font-bold">00:12</span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-900 text-[13px]">
                        ชื่อ-นามสกุลคนไข้
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        HN56789012 • กุมารเวชกรรม
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-800">PICU</div>
                      <div className="text-[11px] text-slate-500">เตียง A02</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-800">28 / 168 ชม.</div>
                      <div className="text-[11px] text-slate-500">รอบ 14 / 48</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100/80 text-amber-950 border border-orange-200/80 rounded-full text-[12px] font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-900 shrink-0" />
                        <span>ถึงกำหนดตรวจ</span>
                      </div>
                      <div className="text-[12px] text-slate-500 font-medium mt-1">
                        14:00 น. · <span className="text-amber-900 font-bold">ถึงกำหนดตรวจ</span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 3 */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-900 text-[13px]">
                        ชื่อ-นามสกุลคนไข้
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        HN56789012 • กุมารเวชกรรม
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-800">PICU</div>
                      <div className="text-[11px] text-slate-500">เตียง C12</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-800">14 / 168 ชม.</div>
                      <div className="text-[11px] text-slate-500">รอบ 7 / 48</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100/80 text-sky-800 border border-sky-200/80 rounded-full text-[12px] font-bold">
                        <CalendarClock className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                        <span>ใกล้ถึงกำหนด</span>
                      </div>
                      <div className="text-[12px] text-slate-500 font-medium mt-1">
                        16:00 น. · เหลือ <span className="text-sky-600 font-bold">01:42:10</span>
                      </div>
                    </td>
                  </tr>

                  {/* Row 4 */}
                  <tr className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-900 text-[13px]">
                        ชื่อ-นามสกุลคนไข้
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        HN56789012 • กุมารเวชกรรม
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-800">PICU</div>
                      <div className="text-[11px] text-slate-500">เตียง B12</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="font-bold text-slate-800">4 / 168 ชม.</div>
                      <div className="text-[11px] text-slate-500">รอบ 2 / 48</div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100/80 text-sky-800 border border-sky-200/80 rounded-full text-[12px] font-bold">
                        <CalendarClock className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                        <span>ใกล้ถึงกำหนด</span>
                      </div>
                      <div className="text-[12px] text-slate-500 font-medium mt-1">
                        14:00 น. · เหลือ <span className="text-sky-600 font-bold">00:42:18</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[12px] text-slate-500">
              <span>Showing 10 of 10 Historical Log</span>
              <div className="flex items-center gap-1">
                <button className="px-2.5 py-1 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                  Previous
                </button>
                <button className="w-7 h-7 bg-[#1E58E6] text-white rounded-lg font-bold flex items-center justify-center">
                  1
                </button>
                <button className="w-7 h-7 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center justify-center">
                  2
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 COLS): การแจ้งเตือนล่าสุด (RECENT NOTIFICATIONS) */}
        <div className="lg:col-span-5 h-full">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between h-full space-y-4">
            <div>
              {/* Header */}
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                  <Bell className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 leading-tight">
                    การแจ้งเตือนล่าสุด
                  </h3>
                  <p className="text-[12px] text-slate-500 font-normal mt-0.5">
                    รายการที่ต้องดำเนินการหรือเฝ้าระวัง
                  </p>
                </div>
              </div>

              {/* Notification Items Stack */}
              <div className="divide-y divide-slate-100 text-[13px] pt-1">
                {/* Item 1 */}
                <div className="py-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Clock className="w-5 h-5 text-amber-600 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-[13px]">
                        ถึงกำหนดรอบตรวจ
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal shrink-0">
                        ถึงกำหนดแล้ว
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                      ชื่อ-นามสกุลคนไข้ · Pediatric 1 A02
                    </p>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="py-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-50 border border-red-200/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8.5 6c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6" />
                      <path d="M12 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6" />
                      <path d="M15.5 6c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-[13px]">
                        ผล AI สำหรับ Phlebitis รอการทบทวน
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal shrink-0">
                        2 นาทีที่แล้ว
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                      ชื่อ-นามสกุลคนไข้ · Pediatric 1 A02
                    </p>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="py-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Clock className="w-5 h-5 text-amber-600 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-[13px]">
                        ถึงกำหนดรอบตรวจ
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal shrink-0">
                        ถึงกำหนดแล้ว
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                      ชื่อ-นามสกุลคนไข้ · Pediatric 1 A02
                    </p>
                  </div>
                </div>

                {/* Item 4 */}
                <div className="py-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-sky-50 border border-sky-200/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <svg className="w-5 h-5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-[13px]">
                        ผล AI สำหรับ Infiltration รอการทบทวน
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal shrink-0">
                        2 นาทีที่แล้ว
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                      ชื่อ-นามสกุลคนไข้ · PICU 004
                    </p>
                  </div>
                </div>

                {/* Item 5 */}
                <div className="py-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-50 border border-red-200/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <AlertTriangle className="w-5 h-5 text-red-600 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-[13px]">
                        เกินกำหนดตรวจ 18 นาที
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal shrink-0">
                        เกินกำหนด
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                      ชื่อ-นามสกุลคนไข้ · PICU B04 รอบ 16 / 48
                    </p>
                  </div>
                </div>

                {/* Item 6 */}
                <div className="py-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#E6F9F0] border border-[#6EE7B7] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <svg className="w-5 h-5 text-[#047857]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 9.5a10 10 0 0 1 14 0" />
                      <path d="M8.5 13.5a6 6 0 0 1 7 0" />
                      <circle cx="12" cy="17.5" r="1.5" fill="#047857" stroke="none" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-[13px]">
                        HIS เชื่อมต่อปกติ
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal shrink-0">
                        ปกติ
                      </span>
                    </div>
                    <p className="text-[12px] text-slate-500 mt-0.5 truncate">
                      ปรับปรุงข้อมูลผู้ป่วยเด็กจาก HIS 128 รายการ · ไม่พบ HN ซ้ำ
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Centered Link */}
            <div className="pt-3 border-t border-slate-100 text-center">
              <button
                onClick={() => onNavigate('alerts')}
                className="text-[13px] text-[#1E58E6] font-semibold hover:underline cursor-pointer inline-flex items-center justify-center gap-1"
              >
                <span>ดูรายการแจ้งเตือนทั้งหมด</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM DISCLAIMER BANNER (WITH ORIGINAL CUSTOM SHIELD SVG)                */}
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
    </div>
  );
};
