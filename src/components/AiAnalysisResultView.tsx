import React, { useState } from 'react';
import {
  ArrowLeft,
  Image as ImageIcon,
  Droplet,
  AlertTriangle,
  ChevronRight,
  Bell,
  CheckCircle2,
  ShieldCheck,
  Check
} from 'lucide-react';
import { AiReviewDetailModal } from './AiReviewDetailModal';
import { AssignReviewerModal } from './AssignReviewerModal';

const PhlebitisIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
    <path d="M12 4c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
    <path d="M15.5 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
  </svg>
);

interface AiAnalysisResultViewProps {
  onBack?: () => void;
  onNavigateHistory?: () => void;
}

export const AiAnalysisResultView: React.FC<AiAnalysisResultViewProps> = ({
  onBack,
  onNavigateHistory
}) => {
  const [selectedReviewItem, setSelectedReviewItem] = useState<any | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* Top Back Navigation Link */}
      <div>
        <button
          onClick={onBack}
          className="text-[#1E58E6] font-semibold text-[14px] hover:underline inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับรายชื่อผู้ป่วย</span>
        </button>

        {/* Page Title & Subtitle */}
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight mt-1.5">
          ผลการวิเคราะห์ภาพ IV Site ด้วย AI
        </h1>
        <p className="text-slate-500 text-[13px] mt-1 font-normal">
          รอบตรวจ 16 · บันทึกภาพเวลา 14:03 น. · ประมวลผลแล้วเสร็จภายใน 6.8 วินาที
        </p>
      </div>

      {/* Main Grid: Left Column (Images) vs Right Column (2 Analysis Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: 4 COLS (Images for Comparison) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                  ภาพสำหรับเปรียบเทียบ
                </h3>
                <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                  เลือกภาพเพื่อดูรายละเอียดขนาดใหญ่
                </p>
              </div>
            </div>

            {/* Image 1: Previous Round */}
            <div>
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3] group shadow-2xs">
                <img
                  src="/iv_baseline.png"
                  alt="ภาพรอบก่อนหน้า"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="mt-2 text-left">
                <div className="text-[14px] font-bold text-slate-900">ภาพรอบก่อนหน้า</div>
                <div className="text-[12px] text-slate-400 font-normal">10 ส.ค. 2569 · 08:00 น.</div>
              </div>
            </div>

            {/* Image 2: Latest Round with Circle Highlight Overlay */}
            <div>
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3] group shadow-2xs">
                <img
                  src="/iv_latest.png"
                  alt="ภาพปัจจุบันตำแหน่งที่ AI เน้น"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* SVG Highlight Circle Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <circle
                      cx="140"
                      cy="95"
                      r="26"
                      fill="rgba(239, 68, 68, 0.15)"
                      stroke="#EF4444"
                      strokeWidth="3.5"
                      strokeDasharray="4 2"
                      className="animate-pulse"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-2 text-left">
                <div className="text-[14px] font-bold text-slate-900">ภาพปัจจุบันตำแหน่งที่ AI เน้น</div>
                <div className="text-[12px] text-slate-400 font-normal">10 ส.ค. 2569 · 10:00 น.</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 8 COLS (2 Analysis Cards: Infiltration & Phlebitis) */}
        <div className="lg:col-span-8 space-y-5">
          {/* CARD 1: INFILTRATION */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4 shadow-2xs">
            {/* Header Row */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
                  <Droplet className="w-5 h-5 text-[#1E58E6]" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">
                    INFILTRATION
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    ภาวะสารน้ำรั่วออกนอกหลอดเลือด
                  </h3>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-full text-[12px] font-semibold shadow-2xs shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>รอยืนยัน</span>
              </span>
            </div>

            {/* Status Headline */}
            <div>
              <h4 className="text-[15px] font-bold text-[#10B981]">
                ไม่พบข้อสังเกตจากภาพ
              </h4>
              <p className="text-[13px] text-slate-500 font-normal mt-0.5">
                ระบบไม่พบพื้นที่บวมหรือการเปลี่ยนแปลงของผิวหนังที่ควรนำเสนอเพื่อทบทวน
              </p>
            </div>

            {/* 4 Metric Columns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 rounded-2xl p-4 border border-slate-100">
              <div>
                <span className="text-[12px] text-slate-500 font-medium block">Grade</span>
                <div className="text-xl font-bold text-[#1E58E6] mt-0.5">Grade 0</div>
                <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">บุคลากรทางการแพทย์ยืนยัน</span>
              </div>

              <div>
                <span className="text-[12px] text-slate-500 font-medium block">ระดับความเสี่ยง</span>
                <div className="text-xl font-bold text-[#10B981] mt-0.5">ต่ำ</div>
                <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">ข้อมูลสภาพผลที่ได้รับการยืนยัน</span>
              </div>

              <div>
                <span className="text-[12px] text-slate-500 font-medium block">ระดับความเชื่อมั่นของ AI</span>
                <div className="text-xl font-bold text-[#1E58E6] mt-0.5">96%</div>
                <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">ค่าความเชื่อมั่นของ AI</span>
              </div>

              <div>
                <span className="text-[12px] text-slate-500 font-medium block">ระยะเวลาประมวลผล</span>
                <div className="text-xl font-bold text-[#1E58E6] mt-0.5">3.2 วินาที</div>
                <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">ระยะเวลาประมวลผล AI</span>
              </div>
            </div>

            {/* 4 Segment Risk Bar */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-4 text-center text-[11.5px] font-medium text-slate-400">
                <span>ต่ำ</span>
                <span>ปานกลาง</span>
                <span>สูง</span>
                <span>วิกฤต</span>
              </div>
              <div className="relative h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100">
                <div className="w-1/4 bg-[#10B981] h-full relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#10B981] shadow-xs" />
                </div>
                <div className="w-1/4 bg-[#F59E0B] h-full" />
                <div className="w-1/4 bg-[#F97316] h-full" />
                <div className="w-1/4 bg-[#991B1B] h-full" />
              </div>
            </div>

            {/* Card Action Footer */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-[12.5px] text-slate-500 font-normal">
                พบความเสี่ยงในระบบ กรุณาทบทวน/ตรวจสอบผลการวิเคราะห์ (โดยผู้เชี่ยวชาญ)
              </span>
              <button
                onClick={() => setSelectedReviewItem({ type: 'infiltration', title: 'INFILTRATION' })}
                className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13px] px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <span>ทบทวนผล Infiltration</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CARD 2: PHLEBITIS */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-4 shadow-2xs">
            {/* Header Row */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-[#EF4444] flex items-center justify-center shrink-0">
                  <PhlebitisIcon className="w-5 h-5 text-[#EF4444]" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#EF4444] tracking-wider uppercase block">
                    PHLEBITIS
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    ภาวะหลอดเลือดดำอักเสบ
                  </h3>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-full text-[12px] font-semibold shadow-2xs shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>รอยืนยัน</span>
              </span>
            </div>

            {/* Status Headline */}
            <div>
              <h4 className="text-[15px] font-bold text-[#EF4444]">
                พบข้อสังเกตจากภาพ รอยืนยัน
              </h4>
              <p className="text-[13px] text-slate-500 font-normal mt-0.5">
                AI เน้นบริเวณรอยแดงตามแนวหลอดเลือดเมื่อเปรียบเทียบกับภาพรอบก่อนหน้า
              </p>
            </div>

            {/* 4 Metric Columns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/60 rounded-2xl p-4 border border-slate-100">
              <div>
                <span className="text-[12px] text-slate-500 font-medium block">Grade</span>
                <div className="text-xl font-bold text-[#EF4444] mt-0.5">พบความเสี่ยง</div>
                <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">บุคลากรทางการแพทย์ยืนยัน</span>
              </div>

              <div>
                <span className="text-[12px] text-slate-500 font-medium block">ระดับความเสี่ยง</span>
                <div className="text-xl font-bold text-[#EF4444] mt-0.5">พบความเสี่ยง</div>
                <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">ข้อมูลสภาพผลที่ได้รับการยืนยัน</span>
              </div>

              <div>
                <span className="text-[12px] text-slate-500 font-medium block">ระดับความเชื่อมั่นของ AI</span>
                <div className="text-xl font-bold text-[#1E58E6] mt-0.5">97%</div>
                <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">ค่าความเชื่อมั่นของ AI</span>
              </div>

              <div>
                <span className="text-[12px] text-slate-500 font-medium block">ระยะเวลาประมวลผล</span>
                <div className="text-xl font-bold text-[#1E58E6] mt-0.5">3.6 วินาที</div>
                <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">ระยะเวลาประมวลผล AI</span>
              </div>
            </div>

            {/* 4 Segment Risk Bar */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-4 text-center text-[11.5px] font-medium text-slate-400">
                <span>ต่ำ</span>
                <span>ปานกลาง</span>
                <span>สูง</span>
                <span>วิกฤต</span>
              </div>
              <div className="relative h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100 opacity-60">
                <div className="w-1/4 bg-[#10B981]/50 h-full" />
                <div className="w-1/4 bg-[#F59E0B]/50 h-full" />
                <div className="w-1/4 bg-[#F97316]/50 h-full" />
                <div className="w-1/4 bg-[#991B1B]/50 h-full" />
              </div>
            </div>

            {/* Card Action Footer */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-[12.5px] text-slate-500 font-normal">
                พบความเสี่ยงในระบบ กรุณาทบทวน/ตรวจสอบผลการวิเคราะห์ (โดยผู้เชี่ยวชาญ)
              </span>
              <button
                onClick={() => setSelectedReviewItem({ type: 'phlebitis', title: 'PHLEBITIS' })}
                className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13px] px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <span>ทบทวนผล Phlebitis</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer Row */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-6">
        {/* Left Notice Text Box */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[13.5px] font-bold text-slate-900 leading-tight">
              บุคลากรทางการแพทย์ผู้รับผิดชอบต้องทบทวนและยืนยันก่อนบันทึก
            </h4>
            <p className="text-[12px] text-slate-400 font-normal mt-0.5">
              ผลจาก AI เป็นข้อมูลสนับสนุน มิใช้การวินิจฉัย และไม่กำหนดระดับความรุนแรง (Grade)
            </p>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[13.5px] shadow-2xs flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Bell className="w-4 h-4 text-slate-500" />
            <span>มอบหมายผู้ทบทวน</span>
          </button>

          <button
            disabled={!isSaved}
            className={`px-5 py-2.5 rounded-xl font-bold text-[13.5px] shadow-md flex items-center gap-2 transition-all ${
              isSaved
                ? 'bg-[#1E58E6] hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                : 'bg-[#93C5FD] text-white opacity-85 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4.5 h-4.5" />
            <span>บันทึกผลการตรวจ</span>
          </button>
        </div>
      </div>

      {/* Bottom Disclaimer Banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950 mt-4">
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

      {/* AI Review Detail Modal Popup */}
      {selectedReviewItem && (
        <AiReviewDetailModal
          item={selectedReviewItem}
          onClose={() => setSelectedReviewItem(null)}
          onSaveSuccess={() => {
            setIsSaved(true);
            if (onNavigateHistory) onNavigateHistory();
          }}
        />
      )}

      {/* Assign Reviewer Modal */}
      {showAssignModal && (
        <AssignReviewerModal
          onClose={() => setShowAssignModal(false)}
          onConfirmSuccess={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
};
