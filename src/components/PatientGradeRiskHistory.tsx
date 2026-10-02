import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Check,
  AlertCircle
} from 'lucide-react';

interface PatientGradeRiskHistoryProps {
  patientName?: string;
  onBack?: () => void;
  onSwitchToRounds?: () => void;
}

export const PatientGradeRiskHistory: React.FC<PatientGradeRiskHistoryProps> = ({
  patientName = 'ชื่อ-นามสกุล-คนไข้',
  onBack,
  onSwitchToRounds
}) => {
  const [selectedGradeTab, setSelectedGradeTab] = useState('Grade 0');

  const gradeItems = [
    {
      id: '1',
      time: '12:00',
      title: 'Infiltration · Grade 0',
      subtitle: 'ระดับความเสี่ยงต่ำ · ยืนยันโดย ชื่อ-นามสกุลผู้ตรวจ',
      status: 'confirmed',
      statusText: 'ยืนยันแล้ว',
      dotColor: 'bg-emerald-500'
    },
    {
      id: '2',
      time: '14:03',
      title: 'Phlebitis · รอการทบทวน',
      subtitle: 'พบข้อสังเกตจากภาพ · ยังไม่ระบุ Grade และระดับความเสี่ยง',
      status: 'pending',
      statusText: 'รอยืนยัน',
      dotColor: 'bg-emerald-500'
    },
    {
      id: '3',
      time: '14:00',
      title: 'Infiltration · Grade 0',
      subtitle: 'ระดับความเสี่ยงต่ำ · ยืนยันโดย ชื่อ-นามสกุลผู้ตรวจ',
      status: 'confirmed',
      statusText: 'ยืนยันแล้ว',
      dotColor: 'bg-emerald-500'
    },
    {
      id: '4',
      time: '16:03',
      title: 'Phlebitis · รอการทบทวน',
      subtitle: 'ระดับความเสี่ยงต่ำ · ยืนยันโดย ชื่อ-นามสกุลผู้ตรวจ',
      status: 'confirmed',
      statusText: 'ยืนยันแล้ว',
      dotColor: 'bg-slate-400'
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
              ประวัติ Grade และระดับความเสี่ยง
            </h1>
            <p className="text-slate-500 text-[13px] mt-0.5">
              {patientName} · บันทึก Grade และความเสี่ยงของคนไข้ทั้งหมด
            </p>
          </div>

          <button
            onClick={onSwitchToRounds}
            className="self-start sm:self-auto px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[12.5px] font-medium shadow-2xs transition-colors cursor-pointer"
          >
            ดูประวัติรอบการติดตาม
          </button>
        </div>
      </div>

      {/* 5 Risk Cards with Left Accent Borders */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {/* Card 1: Grade 0 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 border-l-4 border-l-slate-400 shadow-2xs">
          <div className="text-[12px] text-slate-500 font-medium">ความเสี่ยงต่ำมาก</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug mt-1">6</div>
          <div className="text-[12px] text-slate-400 font-normal">Grade 0</div>
        </div>

        {/* Card 2: Grade 1 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 border-l-4 border-l-emerald-500 shadow-2xs">
          <div className="text-[12px] text-emerald-600 font-medium">ความเสี่ยงต่ำ</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug mt-1">2</div>
          <div className="text-[12px] text-slate-400 font-normal">Grade 1</div>
        </div>

        {/* Card 3: Grade 2 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 border-l-4 border-l-amber-500 shadow-2xs">
          <div className="text-[12px] text-amber-600 font-medium">ความเสี่ยงปานกลาง</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug mt-1">1</div>
          <div className="text-[12px] text-slate-400 font-normal">Grade 2</div>
        </div>

        {/* Card 4: Grade 3 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 border-l-4 border-l-orange-500 shadow-2xs">
          <div className="text-[12px] text-orange-600 font-medium">ความเสี่ยงสูง</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug mt-1">0</div>
          <div className="text-[12px] text-slate-400 font-normal">Grade 3</div>
        </div>

        {/* Card 5: Grade 4 */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 border-l-4 border-l-red-600 shadow-2xs">
          <div className="text-[12px] text-red-600 font-medium">ความเสี่ยงสูงมาก</div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug mt-1">0</div>
          <div className="text-[12px] text-slate-400 font-normal">Grade 4</div>
        </div>
      </div>

      {/* Main Container with Grade Tabs & List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Grade Tabs Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
          {['Grade 0', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4'].map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGradeTab(grade)}
              className={`px-4 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer ${
                selectedGradeTab === grade
                  ? 'bg-[#1E58E6] text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {grade}
            </button>
          ))}
        </div>

        {/* Grade Log Items List */}
        <div className="divide-y divide-slate-100">
          {gradeItems.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-2.5 h-2.5 rounded-full ${item.dotColor} shrink-0`} />

                <div className="w-16 shrink-0 font-bold text-slate-800 text-[14px]">
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

              <div className="flex items-center gap-3 shrink-0">
                {item.status === 'confirmed' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#E6F4EA] border border-[#A7F3D0] text-[#10B981] font-semibold text-[12px]">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{item.statusText}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-semibold text-[12px]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{item.statusText}</span>
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
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
