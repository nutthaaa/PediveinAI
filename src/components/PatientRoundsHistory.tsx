import React, { useState } from 'react';
import { PatientGradeRiskHistory } from './PatientGradeRiskHistory';
import {
  ArrowLeft,
  Camera,
  Check,
  Moon,
  Plus,
  AlertTriangle,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface PatientRoundsHistoryProps {
  patientName?: string;
  hnAn?: string;
  onBack?: () => void;
  onSwitchToGradeRisk?: () => void;
}

export const PatientRoundsHistory: React.FC<PatientRoundsHistoryProps> = ({
  patientName = 'ชื่อ-นามสกุล-คนไข้',
  hnAn = 'HN56789012 · AN26081004',
  onBack
}) => {
  const [selectedDay, setSelectedDay] = useState(1);
  const [activeFilter, setActiveFilter] = useState('completed');
  const [showGradeRiskHistory, setShowGradeRiskHistory] = useState(false);

  if (showGradeRiskHistory) {
    return (
      <PatientGradeRiskHistory
        patientName={patientName}
        onBack={onBack}
        onSwitchToRounds={() => setShowGradeRiskHistory(false)}
      />
    );
  }

  const historyRounds = [
    {
      id: '1',
      time: '08:00 น.',
      title: 'ภาพอ้างอิงเริ่มต้น (Baseline)',
      subtitle: 'เวลาที่ดำเนินการ 08:03 น. · พว. สาวิตรี จันทร์เพ็ญ',
      type: 'baseline',
      icon: <Camera className="w-4 h-4 text-emerald-600" />,
      iconBg: 'bg-emerald-100'
    },
    {
      id: '2',
      time: '10:00 น.',
      title: 'รอบ 1 / 48 · ดำเนินการตรวจแล้ว',
      subtitle: 'เวลาที่ดำเนินการ 10:02 น. · พว. สาวิตรี จันทร์เพ็ญ',
      type: 'completed',
      icon: <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />,
      iconBg: 'bg-emerald-100'
    },
    {
      id: '3',
      time: '12:00 น.',
      title: 'รอบ 2 / 48 · ดำเนินการตรวจแล้ว',
      subtitle: 'เวลาที่ดำเนินการ 12:05 น. · พว. ศุภกานต์ นาดดี',
      type: 'completed',
      icon: <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />,
      iconBg: 'bg-emerald-100'
    },
    {
      id: '4',
      time: '14:00 น.',
      title: 'รอบ 3 / 48 · ดำเนินการตรวจแล้ว',
      subtitle: 'เวลาที่ดำเนินการ 14:02 น. · พว. ศุภกานต์ นาดดี',
      type: 'completed',
      icon: <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />,
      iconBg: 'bg-emerald-100'
    },
    {
      id: '5',
      time: '16:00 น.',
      title: 'รอบ 3 / 48 · ข้ามรอบตรวจ: ผู้ป่วยหลับ',
      subtitle: 'เวลาที่ดำเนินการ 16:00 น. · พว. ศุภกานต์ นาดดี',
      type: 'skipped',
      icon: <Moon className="w-4 h-4 text-slate-600" />,
      iconBg: 'bg-slate-100'
    },
    {
      id: '6',
      time: '18:47 น.',
      title: 'การตรวจเพิ่มเติมหลังผู้ป่วยตื่น',
      subtitle: 'เวลาที่ดำเนินการ 18:47 น. · พว. ศุภกานต์ นาดดี',
      type: 'additional',
      icon: <Plus className="w-4 h-4 text-purple-600 stroke-[2.5]" />,
      iconBg: 'bg-purple-100'
    },
    {
      id: '7',
      time: '20:00 น.',
      title: 'รอบ 4 / 48 · เกินกำหนด 15 นาที',
      subtitle: 'เวลาที่ดำเนินการ 20:00 น. · พว. ศุภกานต์ นาดดี',
      type: 'overdue',
      icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
      iconBg: 'bg-red-100'
    },
    {
      id: '8',
      time: '20:30 น.',
      title: 'รอบ 4 / 48 · ดำเนินการตรวจแล้ว',
      subtitle: 'เวลาที่ดำเนินการ 12:04 น. · พว. ศุภกานต์ นาดดี',
      type: 'completed',
      icon: <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />,
      iconBg: 'bg-emerald-100'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Back Navigation Link */}
      <div>
        <button
          onClick={onBack}
          className="text-[#1E58E6] font-semibold text-[13px] hover:underline inline-flex items-center gap-1.5 cursor-pointer mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ย้อนกลับหน้าข้อมูลผู้ป่วย</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
              ประวัติรอบการตรวจ
            </h1>
            <p className="text-slate-500 text-[13px] mt-0.5">
              {patientName} · เวลา รอบ ภาพ และผลทบทวนทั้งหมดอยู่ในประวัติของเข็มนี้
            </p>
          </div>

          <button
            onClick={() => setShowGradeRiskHistory(true)}
            className="self-start sm:self-auto px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[12.5px] font-medium shadow-2xs transition-colors cursor-pointer"
          >
            ดูลำดับความเสี่ยง (Grade)
          </button>
        </div>
      </div>

      {/* 5 Equal Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">32</div>
          <div className="text-[12px] text-slate-500 font-medium mt-1">จากระยะติดตาม 96 ชั่วโมง</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">16</div>
          <div className="text-[12px] text-slate-500 font-medium mt-1">จากกำหนดตรวจ 48 รอบ</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">13</div>
          <div className="text-[12px] text-slate-500 font-medium mt-1">ดำเนินการตรวจแล้ว</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">2</div>
          <div className="text-[12px] text-slate-500 font-medium mt-1">ข้ามรอบเนื่องจากผู้ป่วยหลับ</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">1</div>
          <div className="text-[12px] text-slate-500 font-medium mt-1">ผล AI รอการทบทวน</div>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[12.5px] font-medium no-scrollbar">
        <button
          onClick={() => setActiveFilter('completed')}
          className={`px-3 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
            activeFilter === 'completed'
              ? 'bg-[#E6F4EA] border-[#A7F3D0] text-[#10B981] font-semibold'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ✓ ดำเนินการตรวจแล้ว
        </button>

        <button
          onClick={() => setActiveFilter('skipped')}
          className={`px-3 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
            activeFilter === 'skipped'
              ? 'bg-slate-100 border-slate-300 text-slate-700 font-semibold'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ⊘ ข้ามรอบ
        </button>

        <button
          onClick={() => setActiveFilter('overdue')}
          className={`px-3 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
            activeFilter === 'overdue'
              ? 'bg-red-50 border-red-200 text-red-600 font-semibold'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ! เกินกำหนด
        </button>

        <button
          onClick={() => setActiveFilter('near_due')}
          className={`px-3 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
            activeFilter === 'near_due'
              ? 'bg-blue-50 border-blue-200 text-blue-600 font-semibold'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          • ใกล้ถึงกำหนด
        </button>

        <button
          onClick={() => setActiveFilter('due')}
          className={`px-3 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
            activeFilter === 'due'
              ? 'bg-cyan-50 border-cyan-200 text-cyan-700 font-semibold'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          • ถึงกำหนดตรวจ
        </button>

        <button
          onClick={() => setActiveFilter('additional')}
          className={`px-3 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
            activeFilter === 'additional'
              ? 'bg-purple-50 border-purple-200 text-purple-700 font-semibold'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          + การตรวจเพิ่มเติม
        </button>

        <button
          onClick={() => setActiveFilter('ai_pending')}
          className={`px-3 py-1 rounded-full border transition-all shrink-0 cursor-pointer ${
            activeFilter === 'ai_pending'
              ? 'bg-rose-50 border-rose-200 text-rose-600 font-semibold'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          ! ผล AI รอการทบทวน
        </button>
      </div>

      {/* Main White Card Container with Day Tabs & Timeline List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Day Tabs Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                selectedDay === day
                  ? 'bg-[#1E58E6] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              วันที่ {day}
            </button>
          ))}
        </div>

        {/* Timeline Rows */}
        <div className="divide-y divide-slate-100">
          {historyRounds.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className={`w-9 h-9 rounded-full ${item.iconBg} flex items-center justify-center shrink-0`}
                >
                  {item.icon}
                </div>

                <div className="w-20 shrink-0 font-bold text-slate-800 text-[14px]">
                  {item.time}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="text-[14.5px] font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[12.5px] text-slate-500 font-normal mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          ))}
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
};
