import React, { useState } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  Shield,
  Wifi,
  Network,
  Share2
} from 'lucide-react';

interface HisConnectionStatusProps {
  onNavigate?: (nav: string) => void;
}

export const HisConnectionStatus: React.FC<HisConnectionStatusProps> = ({ onNavigate }) => {
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* PAGE HEADER ROW                                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[13px] font-semibold text-[#1E58E6] tracking-tight">
            การเชื่อมต่อระบบสารสนเทศโรงพยาบาล
          </span>
          <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900 tracking-tight mt-0.5">
            สถานะการเชื่อมต่อ HIS
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            HIS เป็นแหล่งข้อมูลหลัก ระบบปรับปรุงหรือสร้างทะเบียนผู้ป่วยเด็กโดยอัตโนมัติและป้องกัน HN ซ้ำ
          </p>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={isTesting}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-xl font-medium text-[13px] shadow-xs transition-all active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-white ${isTesting ? 'animate-spin' : ''}`} />
          <span>ทดสอบการเชื่อมต่อ</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MAIN SYSTEM CONNECTION STATUS BANNER (FULL WIDTH)                         */}
      {/* ========================================================================= */}
      <div className="bg-[#E6F9F0] border border-[#BBF7D0] rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0">
            <Wifi className="w-6 h-6 text-[#10B981]" />
          </div>
          <div>
            <h2 className="text-base sm:text-[18px] font-bold text-[#065F46] leading-tight">
              ระบบเชื่อมต่อ HIS ตามปกติ
            </h2>
            <p className="text-[13px] text-[#059669] font-normal mt-0.5">
              ข้อมูลล่าสุดเมื่อ 12 วินาทีที่ผ่านมา <span className="mx-1">•</span> ไม่มีข้อมูลค้างส่ง
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#A7F3D0] text-[#047857] rounded-full text-[12px] font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
            <span>พร้อมใช้งาน</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 HIS COMPONENT STATUS CARDS GRID (2x2 GRID)                             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: ADT */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-[#E6F9F0] flex items-center justify-center shrink-0 text-[#10B981]">
              <Network className="w-5 h-5 text-[#10B981]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                ข้อมูลการรับไว้รักษาและการจำหน่าย (ADT)
              </h3>
              <p className="text-[12px] text-slate-500 font-normal mt-0.5 truncate">
                HN, AN, การรับไว้รักษา, การย้ายผู้ป่วย และการจำหน่าย
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded-full text-[11px] font-semibold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span>ปกติ</span>
          </span>
        </div>

        {/* Card 2: Pediatric Patient Registry */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-[#E6F9F0] flex items-center justify-center shrink-0 text-[#10B981]">
              <Network className="w-5 h-5 text-[#10B981]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                ทะเบียนผู้ป่วยแผนกเด็ก
              </h3>
              <p className="text-[12px] text-slate-500 font-normal mt-0.5 truncate">
                หอผู้ป่วย ห้อง และเตียง เฉพาะแผนกเด็ก
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded-full text-[11px] font-semibold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span>ปกติ</span>
          </span>
        </div>

        {/* Card 3: Patient Identification */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-[#E6F9F0] flex items-center justify-center shrink-0 text-[#10B981]">
              <Network className="w-5 h-5 text-[#10B981]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                ข้อมูลระบุตัวผู้ป่วย
              </h3>
              <p className="text-[12px] text-slate-500 font-normal mt-0.5 truncate">
                ชื่อ วันเดือนปีเกิด เพศ และข้อมูลการแพ้ยา
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded-full text-[11px] font-semibold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span>ปกติ</span>
          </span>
        </div>

        {/* Card 4: Results Feedback to HIS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-[#E6F9F0] flex items-center justify-center shrink-0 text-[#10B981]">
              <Network className="w-5 h-5 text-[#10B981]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                การส่งผลกลับ HIS
              </h3>
              <p className="text-[12px] text-slate-500 font-normal mt-0.5 truncate">
                ประวัติการติดตาม ผู้ดำเนินการ เวลาตามกำหนด และเวลาที่ดำเนินการจริง
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded-full text-[11px] font-semibold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span>ปกติ</span>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADMISSION / TRANSFER / DISCHARGE RECENT EVENT LOG CARD                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-[#E6F9F0] flex items-center justify-center shrink-0 text-[#10B981]">
            <Network className="w-5 h-5 text-[#10B981]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
              เหตุการณ์รับไว้รักษา ย้ายหอผู้ป่วย และจำหน่ายล่าสุด
            </h3>
            <p className="text-[12px] text-slate-500 font-normal mt-0.5">
              ระบบไม่มีการติดตามหรือย้ายประวัติโดยอัตโนมัติตนกว่าบุคลากรผู้รับผิดชอบจะตรวจสอบ
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate && onNavigate('alerts')}
          className="text-[13px] text-[#1E58E6] font-semibold hover:underline flex items-center gap-1 shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <span>ดูการแจ้งเตือนที่เกี่ยวข้อง</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM DISCLAIMER BANNER                                                  */}
      {/* ========================================================================= */}
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
          <p className="text-blue-700 mt-0.5">
            ผล AI ไม่ใช่การวินิจฉัย และทุกการบันทึกต้องได้รับการยืนยันโดยเจ้าหน้าที่
          </p>
        </div>
      </div>
    </div>
  );
};

