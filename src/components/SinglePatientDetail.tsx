import React, { useState } from 'react';
import {
  ArrowLeft,
  User,
  CheckCircle2,
  FileText,
  Bookmark,
  Calendar,
  Clock,
  Search,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Activity,
  Droplet,
  Moon,
  Camera,
  MapPin,
  Plus,
  LogOut,
  Bell,
  Sparkles,
  X
} from 'lucide-react';
import { SkipRoundModal } from './SkipRoundModal';
import { EndTrackingModal } from './EndTrackingModal';
import { StartIvMonitoring } from './StartIvMonitoring';
import { RemoveNeedleModal } from './RemoveNeedleModal';

const PhlebitisIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
    <path d="M12 4c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
    <path d="M15.5 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
  </svg>
);

interface SinglePatientDetailProps {
  patientName?: string;
  hnAn?: string;
  isSkippedRoundInitial?: boolean;
  onBack?: () => void;
  onViewSummaryReport?: () => void;
  onViewGradeHistory?: () => void;
  onViewTrackingHistory?: () => void;
  onViewInfiltrationDetail?: () => void;
  onViewPhlebitisDetail?: () => void;
  onInspectNeedleNow?: () => void;
  onAddNewIvSite?: () => void;
}

export const SinglePatientDetail: React.FC<SinglePatientDetailProps> = ({
  patientName = 'ชื่อ-นามสกุล-คนไข้',
  hnAn = 'HN56789012 · AN26081004',
  isSkippedRoundInitial = true,
  onBack,
  onViewSummaryReport,
  onViewGradeHistory,
  onViewTrackingHistory,
  onViewInfiltrationDetail,
  onViewPhlebitisDetail,
  onInspectNeedleNow,
  onAddNewIvSite
}) => {
  const [viewMode, setViewMode] = useState<'single_site' | 'all_sites' | 'all_images'>('single_site');
  const [isSkippedRound, setIsSkippedRound] = useState<boolean>(isSkippedRoundInitial);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState<boolean>(false);
  const [isEndTrackingModalOpen, setIsEndTrackingModalOpen] = useState<boolean>(false);
  const [removeNeedleItem, setRemoveNeedleItem] = useState<{ needleNumber: string; location: string } | null>(null);
  const [removedNeedles, setRemovedNeedles] = useState<Record<string, boolean>>({
    'เข็ม #1': true,
    'เข็ม #2': false,
    'เข็ม #3': false
  });
  const [isDischarged, setIsDischarged] = useState<boolean>(false);
  const [isAddingIvSite, setIsAddingIvSite] = useState<boolean>(false);
  const [skipReasonText, setSkipReasonText] = useState<string>('ผู้ป่วยหลับ');
  const [previewImage, setPreviewImage] = useState<{
    isOpen: boolean;
    title: string;
    dateText: string;
    src: string;
    overlayPill: string;
  } | null>(null);

  const handleSkipConfirmSuccess = () => {
    setIsSkippedRound(true);
  };

  if (isAddingIvSite) {
    return (
      <StartIvMonitoring
        patientData={{
          name: patientName,
          hnAn: hnAn,
          ward: 'PICU',
          room: 'ห้อง A-01',
          bed: 'เตียง C32'
        }}
        onBack={() => setIsAddingIvSite(false)}
        onCancel={() => setIsAddingIvSite(false)}
        onContinue={() => {
          setIsAddingIvSite(false);
          setViewMode('all_sites');
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Modal for Ending Tracking */}
      {isEndTrackingModalOpen && (
        <EndTrackingModal
          patientName={patientName}
          onClose={() => setIsEndTrackingModalOpen(false)}
          onConfirmSuccess={() => {
            setIsEndTrackingModalOpen(false);
            setIsDischarged(true);
            setViewMode('all_sites');
          }}
        />
      )}

      {/* Modal for Removing Needle */}
      {removeNeedleItem && (
        <RemoveNeedleModal
          needleNumber={removeNeedleItem.needleNumber}
          location={removeNeedleItem.location}
          onClose={() => setRemoveNeedleItem(null)}
          onConfirmSuccess={() => {
            if (removeNeedleItem) {
              setRemovedNeedles(prev => ({ ...prev, [removeNeedleItem.needleNumber]: true }));
            }
            setRemoveNeedleItem(null);
          }}
        />
      )}

      {/* Modal for Skipping Round */}
      {isSkipModalOpen && (
        <SkipRoundModal
          patientName={patientName}
          hnAn={hnAn}
          ward="PICU"
          room="ห้อง A-01"
          bed="เตียง C32"
          dueTime="14:00 น."
          onClose={() => setIsSkipModalOpen(false)}
          onConfirmSuccess={handleSkipConfirmSuccess}
        />
      )}

      {/* Modal for Previewing IV Site Image */}
      {previewImage && previewImage.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-[640px] w-full p-6 sm:p-7 space-y-5 shadow-2xl relative border border-slate-100 max-h-[92vh] overflow-y-auto">
            {/* Close X Button */}
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">
                PEDIVEINCARE AI
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                ดูรูปภาพ IV Site
              </h2>
              <p className="text-slate-500 text-[13px] font-medium mt-0.5">
                {patientName} · {hnAn.split('·')[0].trim()} · PICU / ห้อง A-01 / เตียง C32
              </p>
            </div>

            {/* Image Preview Container */}
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
                <img
                  src={previewImage.src}
                  alt={previewImage.title}
                  className="w-full h-80 sm:h-96 object-cover rounded-2xl"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/70 backdrop-blur-xs text-white px-4 py-1.5 rounded-full text-center text-[12px] font-semibold shadow-xs">
                  {previewImage.overlayPill}
                </div>
              </div>

              <div className="pt-1">
                <div className="font-bold text-slate-900 text-[15px]">
                  {previewImage.title}
                </div>
                <div className="text-slate-500 text-[13px] font-medium mt-0.5">
                  {previewImage.dateText}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setPreviewImage(null)}
                className="px-7 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-xl font-bold text-[14px] shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 1: ALL IV SITES OVERVIEW ("IV Site ทั้งหมดของผู้ป่วย")                */}
      {/* ========================================================================= */}
      {viewMode === 'all_sites' ? (
        <>
          {/* Top Back Navigation Link */}
          <div>
            <button
              onClick={onBack}
              className="text-[#1E58E6] font-semibold text-[13.5px] hover:underline inline-flex items-center gap-1.5 cursor-pointer mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับรายชื่อผู้ป่วย</span>
            </button>

            {/* Patient Identity Header Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0 shadow-2xs">
                  <User className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                      {patientName}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#10B981] font-semibold text-[11px]">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      <span>ยืนยันจาก HIS</span>
                    </span>
                  </div>
                  <div className="text-[13px] text-slate-500 font-medium">
                    {hnAn} · 4 ปี 8 เดือน · เพศหญิง
                  </div>
                  <div className="text-[12px] text-slate-400 font-normal flex items-center gap-3 flex-wrap pt-0.5">
                    <span>🏢 PICU</span>
                    <span>ห้อง A-01</span>
                    <span>🛏️ เตียง C32</span>
                    <span>🩺 ชื่อ-นามสกุลแพทย์เจ้าของไข้</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Green Discharged Banner Card */}
            {isDischarged && (
              <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-2xl p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs mt-3 animate-fadeIn">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#059669] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileText className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-[#065F46] leading-snug">
                      สิ้นสุดการติดตาม · ผู้ป่วยจำหน่ายกลับบ้าน
                    </h3>
                    <p className="text-[13px] text-[#047857] font-medium mt-0.5">
                      ระบบคงเวลาสะสม รอบตรวจ ภาพ ผล AI และ Grade ตามข้อมูลจริงของ IV Site นี้ไว้ครบถ้วน
                    </p>
                  </div>
                </div>

                <button
                  onClick={onViewSummaryReport}
                  className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 self-end sm:self-auto"
                >
                  <FileText className="w-4 h-4" />
                  <span>ดูรายงานสรุป</span>
                </button>
              </div>
            )}
          </div>

          {/* Section Header & Action Buttons */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[12px] font-bold text-[#1E58E6] tracking-wide uppercase">
                  แยกการติดตามเข็มอย่างอิสระ
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  IV Site ทั้งหมดของผู้ป่วย
                </h2>
                <p className="text-[13px] text-slate-500 font-normal mt-1 leading-relaxed">
                  ผู้ป่วย 1 คนมีหลาย IV Site ได้ แต่ละเข็มมีรอบ เวลา ภาพ ผล Infiltration, Phlebitis และ Grade ของตัวเอง
                </p>
              </div>

              {/* Action Buttons */}
              {!isDischarged && (
                <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                  <button
                    onClick={() => setIsEndTrackingModalOpen(true)}
                    className="bg-[#FF7A00] hover:bg-orange-600 text-white font-bold text-[13.5px] px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 rotate-180" />
                    <span>สิ้นสุดการติดตาม</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onAddNewIvSite) {
                        onAddNewIvSite();
                      } else {
                        setIsAddingIvSite(true);
                      }
                    }}
                    className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>เพิ่ม IV Site ใหม่</span>
                  </button>
                </div>
              )}
            </div>

            {/* 3 Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-bold text-slate-900 block">ทั้งหมด</span>
                  <span className="text-[11.5px] text-slate-400 font-normal block mt-0.5">IV Site</span>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">2</div>
              </div>

              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-bold text-slate-900 block">กำลังใช้งาน</span>
                  <span className="text-[11.5px] text-slate-400 font-normal block mt-0.5">ติดตามทุก 2 ชม.</span>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">2</div>
              </div>

              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[13px] font-bold text-slate-900 block">ถอดแล้ว</span>
                  <span className="text-[11.5px] text-slate-400 font-normal block mt-0.5">ติดตามต่อทุก 8 ชม.</span>
                </div>
                <div className="text-3xl font-extrabold text-slate-900">0</div>
              </div>
            </div>

            {/* Needle Card Grid */}
            <div className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Needle Card #1 */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-[#1E58E6]">
                      <Activity className="w-5 h-5 stroke-[2.2]" />
                      <span className="text-[15px] font-extrabold">IV เข็ม #1</span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] rounded-full text-[12px] font-semibold shadow-2xs">
                      {isDischarged ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] stroke-[2.5]" />
                          <span>ครบกำหนดติดตาม</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-[#DC2626]" />
                          <span>เกินกำหนด 00:18:24</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[14px] font-bold text-slate-900">หลังมือซ้าย</div>
                      <div className="text-[12px] text-slate-400 font-normal">หลังมือซ้ายAntebrachial vein</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-3.5 space-y-1">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#1E58E6] flex items-center justify-center shrink-0 mb-1">
                        <Droplet className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">
                        INFILTRATION
                      </span>
                      <div className="text-[14px] font-bold text-[#059669]">Grade 0</div>
                      <div className="text-[11.5px] text-slate-400 font-normal">ผล AI ล่าสุด - 96%</div>
                    </div>

                    <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-2xl p-3.5 space-y-1">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-[#DC2626] flex items-center justify-center shrink-0 mb-1">
                        <PhlebitisIcon className="w-4 h-4 text-[#DC2626]" />
                      </div>
                      <span className="text-[11px] font-bold text-[#DC2626] tracking-wider uppercase block">
                        PHLEBITIS
                      </span>
                      <div className="text-[14px] font-bold text-slate-800">ยังไม่ยืนยัน Grade</div>
                      <div className="text-[11.5px] text-slate-400 font-normal">ผล AI ล่าสุด - 94%</div>
                    </div>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 grid grid-cols-3 gap-2 text-left">
                    <div>
                      <span className="text-[11.5px] text-slate-400 block font-normal">ความถี่</span>
                      <div className="text-[14px] font-bold text-slate-900 mt-0.5">
                        {removedNeedles['เข็ม #1'] ? '8 ชม.' : '2 ชม.'}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                        {removedNeedles['เข็ม #1'] ? 'ติดตามทุก 8 ชั่วโมง' : 'ติดตามทุก 2 ชั่วโมง'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11.5px] text-slate-400 block font-normal">รอบปัจจุบัน</span>
                      <div className="text-[14px] font-bold text-slate-900 mt-0.5">รอบ 49</div>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">นับต่อจากข้อมูลเดิม</span>
                    </div>

                    <div>
                      <span className="text-[11.5px] text-slate-400 block font-normal">สะสม</span>
                      <div className="text-[14px] font-bold text-slate-900 mt-0.5">98/168 ชม.</div>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">08:00 น.</span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-7/12 h-full bg-[#1E58E6] rounded-full" />
                  </div>

                  {removedNeedles['เข็ม #1'] && !isDischarged && (
                    <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-2.5 flex items-center gap-2 text-[#D97706] text-[12px] font-medium shadow-2xs">
                      <span className="text-[#F59E0B] text-sm shrink-0">⚡</span>
                      <span>ถอดเข็มแล้วแต่ยังคงประวัติและนับเวลาเดิมต่อไป รอบถัดไปทุก 8 ชั่วโมง</span>
                    </div>
                  )}

                  <div className="pt-1">
                    {removedNeedles['เข็ม #1'] || isDischarged ? (
                      <button
                        onClick={() => setViewMode('single_site')}
                        className="w-full bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer text-center"
                      >
                        {isDischarged ? 'ดูประวัติเข็ม #1' : 'เปิดดูการติดตามเข็มนี้'}
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setViewMode('single_site')}
                          className="w-full bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[12.5px] py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer text-center"
                        >
                          เปิดดูการติดตามเข็มนี้
                        </button>
                        <button
                          onClick={() => setRemoveNeedleItem({ needleNumber: 'เข็ม #1', location: 'หลังมือซ้าย' })}
                          className="w-full bg-[#FFFBEB] border border-[#FCD34D] hover:bg-amber-100 text-[#D97706] font-bold text-[12.5px] py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                        >
                          <span>🔗 บันทึกถอดเข็ม</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Needle Card #2 */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-[#1E58E6]">
                      <Activity className="w-5 h-5 stroke-[2.2]" />
                      <span className="text-[15px] font-extrabold">IV เข็ม #2</span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EFF6FF] text-[#1E58E6] border border-[#BFDBFE] rounded-full text-[12px] font-semibold shadow-2xs">
                      {isDischarged ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] stroke-[2.5]" />
                          <span>ครบกำหนดติดตาม</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-[#1E58E6]" />
                          <span>ใกล้ถึงกำหนด</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[14px] font-bold text-slate-900">หลังมือขวา</div>
                      <div className="text-[12px] text-slate-400 font-normal">หลังมือขวาAntebrachial vein</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-3.5 space-y-1">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#1E58E6] flex items-center justify-center shrink-0 mb-1">
                        <Droplet className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">
                        INFILTRATION
                      </span>
                      <div className="text-[14px] font-bold text-slate-800">รอดำเนินการ</div>
                      <div className="text-[11.5px] text-slate-400 font-normal">ผล AI ล่าสุด - 0%</div>
                    </div>

                    <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-2xl p-3.5 space-y-1">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-[#DC2626] flex items-center justify-center shrink-0 mb-1">
                        <PhlebitisIcon className="w-4 h-4 text-[#DC2626]" />
                      </div>
                      <span className="text-[11px] font-bold text-[#DC2626] tracking-wider uppercase block">
                        PHLEBITIS
                      </span>
                      <div className="text-[14px] font-bold text-slate-800">รอดำเนินการ</div>
                      <div className="text-[11.5px] text-slate-400 font-normal">ผล AI ล่าสุด - 0%</div>
                    </div>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 grid grid-cols-3 gap-2 text-left">
                    <div>
                      <span className="text-[11.5px] text-slate-400 block font-normal">ความถี่</span>
                      <div className="text-[14px] font-bold text-slate-900 mt-0.5">
                        {removedNeedles['เข็ม #2'] ? '8 ชม.' : '2 ชม.'}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                        {removedNeedles['เข็ม #2'] ? 'ติดตามทุก 8 ชั่วโมง' : 'ติดตามทุก 2 ชั่วโมง'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11.5px] text-slate-400 block font-normal">รอบปัจจุบัน</span>
                      <div className="text-[14px] font-bold text-slate-900 mt-0.5">รอบ 1</div>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">นับต่อจากข้อมูลเดิม</span>
                    </div>

                    <div>
                      <span className="text-[11.5px] text-slate-400 block font-normal">สะสม</span>
                      <div className="text-[14px] font-bold text-slate-900 mt-0.5">0/168 ชม.</div>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">08:00 น.</span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-1/12 h-full bg-[#1E58E6] rounded-full" />
                  </div>

                  {removedNeedles['เข็ม #2'] && !isDischarged && (
                    <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-2.5 flex items-center gap-2 text-[#D97706] text-[12px] font-medium shadow-2xs">
                      <span className="text-[#F59E0B] text-sm shrink-0">⚡</span>
                      <span>ถอดเข็มแล้วแต่ยังคงประวัติและนับเวลาเดิมต่อไป รอบถัดไปทุก 8 ชั่วโมง</span>
                    </div>
                  )}

                  <div className="pt-1">
                    {removedNeedles['เข็ม #2'] || isDischarged ? (
                      <button
                        onClick={() => setViewMode('single_site')}
                        className="w-full bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer text-center"
                      >
                        {isDischarged ? 'ดูประวัติเข็ม #2' : 'เปิดดูการติดตามเข็มนี้'}
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setViewMode('single_site')}
                          className="w-full bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[12.5px] py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer text-center"
                        >
                          เปิดดูการติดตามเข็มนี้
                        </button>
                        <button
                          onClick={() => setRemoveNeedleItem({ needleNumber: 'เข็ม #2', location: 'หลังมือขวา' })}
                          className="w-full bg-[#FFFBEB] border border-[#FCD34D] hover:bg-amber-100 text-[#D97706] font-bold text-[12.5px] py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                        >
                          <span>🔗 บันทึกถอดเข็ม</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Needle Card #3 */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-[#1E58E6]">
                      <Activity className="w-5 h-5 stroke-[2.2]" />
                      <span className="text-[15px] font-extrabold">IV เข็ม #3</span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EFF6FF] text-[#1E58E6] border border-[#BFDBFE] rounded-full text-[12px] font-semibold shadow-2xs">
                      {isDischarged ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] stroke-[2.5]" />
                          <span>ครบกำหนดติดตาม</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-[#1E58E6]" />
                          <span>ใกล้ถึงกำหนด</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[14px] font-bold text-slate-900">หลังมือขวา</div>
                      <div className="text-[12px] text-slate-400 font-normal">หลังมือขวาAntebrachial vein</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-3.5 space-y-1">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#1E58E6] flex items-center justify-center shrink-0 mb-1">
                        <Droplet className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">
                        INFILTRATION
                      </span>
                      <div className="text-[14px] font-bold text-slate-800">รอดำเนินการ</div>
                      <div className="text-[11.5px] text-slate-400 font-normal">ผล AI ล่าสุด - 0%</div>
                    </div>

                    <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-2xl p-3.5 space-y-1">
                      <div className="w-7 h-7 rounded-lg bg-rose-100 text-[#DC2626] flex items-center justify-center shrink-0 mb-1">
                        <PhlebitisIcon className="w-4 h-4 text-[#DC2626]" />
                      </div>
                      <span className="text-[11px] font-bold text-[#DC2626] tracking-wider uppercase block">
                        PHLEBITIS
                      </span>
                      <div className="text-[14px] font-bold text-slate-800">รอดำเนินการ</div>
                      <div className="text-[11.5px] text-slate-400 font-normal">ผล AI ล่าสุด - 0%</div>
                    </div>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 grid grid-cols-3 gap-2 text-left">
                    <div>
                      <span className="text-[11.5px] text-slate-400 block font-normal">ความถี่</span>
                      <div className="text-[14px] font-bold text-slate-900 mt-0.5">
                        {removedNeedles['เข็ม #3'] ? '8 ชม.' : '2 ชม.'}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                        {removedNeedles['เข็ม #3'] ? 'ติดตามทุก 8 ชั่วโมง' : 'ติดตามทุก 2 ชั่วโมง'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11.5px] text-slate-400 block font-normal">รอบปัจจุบัน</span>
                      <div className="text-[14px] font-bold text-slate-900 mt-0.5">รอบ 1</div>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">นับต่อจากข้อมูลเดิม</span>
                    </div>

                    <div>
                      <span className="text-[11.5px] text-slate-400 block font-normal">สะสม</span>
                      <div className="text-[14px] font-bold text-slate-900 mt-0.5">0/168 ชม.</div>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">08:00 น.</span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="w-1/12 h-full bg-[#1E58E6] rounded-full" />
                  </div>

                  {removedNeedles['เข็ม #3'] && !isDischarged && (
                    <div className="bg-[#FFF7ED] border border-[#FFEDD5] rounded-xl p-2.5 flex items-center gap-2 text-[#D97706] text-[12px] font-medium shadow-2xs">
                      <span className="text-[#F59E0B] text-sm shrink-0">⚡</span>
                      <span>ถอดเข็มแล้วแต่ยังคงประวัติและนับเวลาเดิมต่อไป รอบถัดไปทุก 8 ชั่วโมง</span>
                    </div>
                  )}

                  <div className="pt-1">
                    {removedNeedles['เข็ม #3'] || isDischarged ? (
                      <button
                        onClick={() => setViewMode('single_site')}
                        className="w-full bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer text-center"
                      >
                        {isDischarged ? 'ดูประวัติเข็ม #3' : 'เปิดดูการติดตามเข็มนี้'}
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setViewMode('single_site')}
                          className="w-full bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[12.5px] py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer text-center"
                        >
                          เปิดดูการติดตามเข็มนี้
                        </button>
                        <button
                          onClick={() => setRemoveNeedleItem({ needleNumber: 'เข็ม #3', location: 'หลังมือขวา' })}
                          className="w-full bg-[#FFFBEB] border border-[#FCD34D] hover:bg-amber-100 text-[#D97706] font-bold text-[12.5px] py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                        >
                          <span>🔗 บันทึกถอดเข็ม</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Disclaimer Banner */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950 mt-6">
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
        </>
      ) : viewMode === 'single_site' ? (
        /* ========================================================================= */
        /* MODE 2: SINGLE IV SITE MONITORING DETAIL VIEW                              */
        /* ========================================================================= */
        <>
          {/* Top Back Link Navigation */}
          <div>
            <button
              onClick={() => setViewMode('all_sites')}
              className="text-[#1E58E6] font-semibold text-[13.5px] hover:underline inline-flex items-center gap-1.5 cursor-pointer mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับไปหน้ารวม IV Site</span>
            </button>

            {/* Patient Identity Header Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0 shadow-2xs">
                  <User className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                      {patientName}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#10B981] font-semibold text-[11px]">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      <span>ยืนยันจาก HIS</span>
                    </span>
                  </div>
                  <div className="text-[13px] text-slate-500 font-medium">
                    {hnAn} · 4 ปี 8 เดือน · เพศหญิง
                  </div>
                  <div className="text-[12px] text-slate-400 font-normal flex items-center gap-3 flex-wrap pt-0.5">
                    <span>🏢 PICU</span>
                    <span>ห้อง A-01</span>
                    <span>🛏️ เตียง C32</span>
                    <span>🩺 ชื่อ-นามสกุลแพทย์เจ้าของไข้</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* IV Site Monitoring Main Section Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
            {/* Top IV Site Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0 shadow-2xs">
                  <Activity className="w-5.5 h-5.5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-[#1E58E6] tracking-wide">
                    เข็ม #1 · ระยะติดตามของเข็มนี้ 7 วัน
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                    การติดตาม IV Site
                  </h2>
                  <p className="text-[12.5px] text-slate-500 mt-0.5">
                    ตรวจทุก 2 ชั่วโมง · Baseline แยกจาก Follow-up
                  </p>
                </div>
              </div>

              {/* Status Pill Header Badge (Top Right) */}
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#1E58E6] text-[12px] font-bold self-start sm:self-auto shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-[#1E58E6]" />
                <span>ใกล้ถึงเวลา</span>
              </span>
            </div>

            {/* Accent Horizontal Blue Line */}
            <div className="w-full h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div className="w-7/12 h-full bg-[#1E58E6] rounded-full" />
            </div>

            {/* 4 Metric Columns & Right Action Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-1">
              {/* 4 Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1">
                <div className="space-y-0.5">
                  <span className="text-[12px] text-slate-500 font-medium block">
                    ระยะเวลาที่ติดตามแล้ว
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900">
                    98 / 168
                  </div>
                  <span className="text-[11.5px] text-slate-400 font-normal block">
                    ชั่วโมงของเข็ม
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[12px] text-slate-500 font-medium block">
                    รอบตรวจปัจจุบัน
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900">
                    รอบ 49
                  </div>
                  <span className="text-[11.5px] text-slate-400 font-normal block">
                    ตรวจทุก 2 ชั่วโมง
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[12px] text-slate-500 font-medium block">
                    กำหนดตรวจรอบถัดไป
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900">
                    08:00 น.
                  </div>
                  <span className="text-[11.5px] text-slate-400 font-normal block">
                    นับต่อจากรอบเดิม
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[12px] text-slate-500 font-medium block">
                    สถานะเวลา
                  </span>
                  <div className="text-2xl font-extrabold text-slate-900">
                    เหลือ 01:42:10
                  </div>
                  <span className="text-[11.5px] text-slate-400 font-normal block">
                    ครบเมื่อเข็มสะสม 168 ชั่วโมง
                  </span>
                </div>
              </div>

              {/* Top Right Buttons: Detect Now & Skip Round */}
              <div className="flex items-center gap-3 self-end lg:self-center shrink-0 pt-2 lg:pt-0">
                <button
                  onClick={onInspectNeedleNow}
                  className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] px-4.5 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>ตรวจ IV Site ตอนนี้</span>
                </button>

                <button
                  onClick={() => setIsSkipModalOpen(true)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-[13.5px] px-4.5 py-2.5 rounded-xl flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
                >
                  <Moon className="w-4 h-4 text-slate-500" />
                  <span>ข้ามรอบ</span>
                </button>
              </div>
            </div>

            {/* DARK BLUE BANNER FOR ACTIVE SKIPPED ROUND NOTIFICATION */}
            {isSkippedRound && (
              <div className="bg-[#012351] border border-[#0A3166] rounded-2xl p-4.5 sm:p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeIn">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#0A3166] text-blue-300 flex items-center justify-center shrink-0 shadow-inner">
                    <Moon className="w-5.5 h-5.5 text-blue-200 fill-blue-200/30" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-[16.5px] font-bold text-white leading-snug">
                      บันทึกข้ามรอบตรวจเวลา 14:00 น. เนื่องจาก{skipReasonText}
                    </h3>
                    <p className="text-[13px] text-blue-200/90 font-normal mt-0.5 leading-relaxed">
                      ไม่นับเป็นรอบตรวจที่ดำเนินการแล้ว ไม่เริ่มนับระยะเวลา 96 ชั่วโมงใหม่ และกำหนดรอบถัดไปคงเดิม
                    </p>
                  </div>
                </div>

                <button
                  onClick={onInspectNeedleNow}
                  className="shrink-0 px-4.5 py-2.5 bg-[#1E58E6] hover:bg-blue-600 text-white rounded-xl font-bold text-[13.5px] shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 self-start md:self-auto"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>บันทึกการตรวจเพิ่มเติมหลังผู้ป่วยตื่น</span>
                </button>
              </div>
            )}
          </div>

          {/* 2 Columns: HIS Info & Image Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Box: HIS Patient Data */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900">ข้อมูลผู้ป่วยจาก HIS</h3>
                  <p className="text-[11.5px] text-slate-400">อัปเดตอัตโนมัติเมื่อ Admit / Transfer / Discharge</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[13px] pt-1 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 text-[12px] block">วันเกิด</span>
                  <span className="font-bold text-slate-800">18 ธ.ค. 2564</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[12px] block">การวินิจฉัย</span>
                  <span className="font-bold text-slate-800">Cephalic vein</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[12px] block">แพทย์เจ้าของไข้</span>
                  <span className="font-bold text-slate-800">ชื่อ-นามสกุล-แพทย์เจ้าของไข้</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[12px] block">สถานะการรับรักษา</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#10B981] font-semibold text-[11px] mt-0.5">
                    <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                    <span>รับรักษา • แผนกเด็ก</span>
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[12px] block">ตำแหน่ง IV Site</span>
                  <span className="font-bold text-slate-800">ท่อนแขนซ้าย</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[12px] block">เริ่มการติดตาม</span>
                  <span className="font-bold text-slate-800">9 ส.ค. 2569 • 08:00</span>
                </div>
              </div>
            </div>

            {/* Right Box: Image Comparison */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900">ภาพเปรียบเทียบ</h3>
                    <p className="text-[11.5px] text-slate-400">Baseline และภาพรอบล่าสุด</p>
                  </div>
                </div>
                <button
                  onClick={() => setViewMode('all_images')}
                  className="text-[#1E58E6] text-[12.5px] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>ดูภาพทั้งหมด</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Baseline Image */}
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                  <img
                    src="/iv_baseline.png"
                    alt="Baseline IV Site"
                    className="w-full h-36 object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <button
                    onClick={() => setPreviewImage({
                      isOpen: true,
                      title: 'ภาพอ้างอิงเริ่มต้น',
                      dateText: '9 ส.ค. 2569 · 08:00 น.',
                      src: '/iv_baseline.png',
                      overlayPill: 'ภาพอ้างอิงเริ่มต้น'
                    })}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent p-2 text-white">
                    <div className="text-[11px] font-semibold">ภาพอ้างอิงเริ่มต้น</div>
                    <div className="text-[9.5px] text-slate-200">9 ส.ค. 2569 08:00 น.</div>
                  </div>
                </div>

                {/* Latest Image */}
                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-200 group flex items-center justify-center">
                  <img
                    src="/iv_latest.png"
                    alt="Latest IV Site"
                    className="w-full h-36 object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <button
                    onClick={() => setPreviewImage({
                      isOpen: true,
                      title: 'ภาพล่าสุด',
                      dateText: '10 ส.ค. 2569 · 12:05 น.',
                      src: '/iv_latest.png',
                      overlayPill: 'ภาพรอบล่าสุด'
                    })}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent p-2 text-white">
                    <div className="text-[11px] font-semibold">ภาพรอบล่าสุด</div>
                    <div className="text-[9.5px] text-slate-200">10 ส.ค. 2569 12:05 น.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grade & Risk Summary Section Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#4F46E5] flex items-center justify-center shrink-0">
                  <Bookmark className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                    Grade และระดับความเสี่ยงล่าสุด
                  </h2>
                  <p className="text-[12.5px] text-slate-400 font-normal mt-0.5">
                    แสดงแยกตาม Infiltration และ Phlebitis โดยใช้ข้อมูลที่บุคลากรทางการแพทย์ยืนยันแล้ว
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E6F4EA] text-[#10B981] text-[12.5px] font-semibold self-start sm:self-auto shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-[#10B981]" />
                <span>ปรับปรุงล่าสุด 14:03 น.</span>
              </span>
            </div>

            {/* 2 Cards Grid: Infiltration & Phlebitis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Sub-card 1: INFILTRATION */}
              <div className="border border-[#BFDBFE]/80 rounded-2xl p-5 bg-white shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
                      <Droplet className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-[#1E58E6] uppercase tracking-wider block">
                        INFILTRATION
                      </span>
                      <h3 className="text-[15px] sm:text-[16px] font-extrabold text-slate-900 leading-tight">
                        ภาวะสารน้ำรั่วออกนอกหลอดเลือด
                      </h3>
                    </div>
                  </div>

                  <span className="px-3 py-0.5 rounded-full bg-[#E6F4EA] border border-[#A7F3D0] text-[#10B981] font-semibold text-[12px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
                    <span>ยืนยันแล้ว</span>
                  </span>
                </div>

                {/* 3 Metrics Box */}
                <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 grid grid-cols-3 gap-2 text-left">
                  <div>
                    <span className="text-[11.5px] text-slate-400 block font-normal">Grade</span>
                    <div className="text-[20px] font-extrabold text-[#1E58E6] mt-0.5">Grade 0</div>
                    <span className="text-[10.5px] text-slate-400 block font-normal mt-0.5">บุคลากรทางการแพทย์ยืนยัน</span>
                  </div>
                  <div>
                    <span className="text-[11.5px] text-slate-400 block font-normal">ระดับความเสี่ยง</span>
                    <div className="text-[20px] font-extrabold text-[#10B981] mt-0.5">ต่ำ</div>
                    <span className="text-[10.5px] text-slate-400 block font-normal mt-0.5">ข้อมูลจากผลที่ได้รับการยืนยัน</span>
                  </div>
                  <div>
                    <span className="text-[11.5px] text-slate-400 block font-normal">ระดับความเชื่อมั่นของ AI</span>
                    <div className="text-[20px] font-extrabold text-[#1E58E6] mt-0.5">96%</div>
                    <span className="text-[10.5px] text-slate-400 block font-normal mt-0.5">ค่าความมั่นใจของ AI</span>
                  </div>
                </div>

                {/* 4-Segment Risk Level Bar with Indicator Knob */}
                <div className="space-y-1">
                  <div className="grid grid-cols-4 text-center text-[11px] font-medium text-slate-400 px-1">
                    <span>ต่ำ</span>
                    <span>ปานกลาง</span>
                    <span>สูง</span>
                    <span>วิกฤต</span>
                  </div>
                  <div className="relative pt-0.5">
                    <div className="grid grid-cols-4 gap-1.5 h-2 w-full rounded-full overflow-hidden">
                      <div className="bg-[#059669] h-full rounded-xs" />
                      <div className="bg-[#F59E0B] h-full rounded-xs" />
                      <div className="bg-[#EA580C] h-full rounded-xs" />
                      <div className="bg-[#DC2626] h-full rounded-xs" />
                    </div>
                    {/* Position Knob Indicator on Low */}
                    <div className="absolute left-1.5 -top-[1px] w-3.5 h-3.5 rounded-full bg-white border-[2.5px] border-[#059669] shadow-xs" />
                  </div>
                </div>

                {/* Footer Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[13px]">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>ชื่อ-นามสกุลผู้ตรวจ · 12:05 น.</span>
                  </div>

                  <button
                    onClick={onViewInfiltrationDetail}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-[13px] rounded-xl px-3.5 py-2 inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>ดูรายละเอียด Infiltration</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-card 2: PHLEBITIS */}
              <div className="border border-[#BFDBFE]/80 rounded-2xl p-5 bg-white shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                      <PhlebitisIcon className="w-4.5 h-4.5 text-rose-500" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">
                        PHLEBITIS
                      </span>
                      <h3 className="text-[15px] sm:text-[16px] font-extrabold text-slate-900 leading-tight">
                        ภาวะหลอดเลือดดำอักเสบ
                      </h3>
                    </div>
                  </div>

                  <span className="px-3 py-0.5 rounded-full bg-[#FEE2E2] border border-rose-200 text-[#DC2626] font-semibold text-[12px] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-[#DC2626]" />
                    <span>รอการทบทวน</span>
                  </span>
                </div>

                {/* 3 Metrics Box */}
                <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 grid grid-cols-3 gap-2 text-left">
                  <div>
                    <span className="text-[11.5px] text-slate-400 block font-normal">Grade</span>
                    <div className="text-[17px] sm:text-[19px] font-extrabold text-[#1E58E6] mt-0.5 leading-snug">
                      ยังไม่ระบุ Grade
                    </div>
                    <span className="text-[10.5px] text-slate-400 block font-normal mt-0.5">บุคลากรทางการแพทย์ยืนยัน</span>
                  </div>
                  <div>
                    <span className="text-[11.5px] text-slate-400 block font-normal">ระดับความเสี่ยง</span>
                    <div className="text-[17px] sm:text-[19px] font-extrabold text-[#EA580C] mt-0.5 leading-snug">
                      รอการยืนยัน
                    </div>
                    <span className="text-[10.5px] text-slate-400 block font-normal mt-0.5">ข้อมูลจากผลที่ได้รับการยืนยัน</span>
                  </div>
                  <div>
                    <span className="text-[11.5px] text-slate-400 block font-normal">ระดับความเชื่อมั่นของ AI</span>
                    <div className="text-[20px] font-extrabold text-[#1E58E6] mt-0.5">94%</div>
                    <span className="text-[10.5px] text-slate-400 block font-normal mt-0.5">ค่าความมั่นใจของ AI</span>
                  </div>
                </div>

                {/* 4-Segment Risk Level Bar (Muted) */}
                <div className="space-y-1">
                  <div className="grid grid-cols-4 text-center text-[11px] font-medium text-slate-400 px-1">
                    <span>ต่ำ</span>
                    <span>ปานกลาง</span>
                    <span>สูง</span>
                    <span>วิกฤต</span>
                  </div>
                  <div className="pt-0.5">
                    <div className="grid grid-cols-4 gap-1.5 h-2 w-full rounded-full overflow-hidden">
                      <div className="bg-[#A7F3D0]/60 h-full rounded-xs" />
                      <div className="bg-[#FDE68A]/60 h-full rounded-xs" />
                      <div className="bg-[#FDBA74]/60 h-full rounded-xs" />
                      <div className="bg-[#FCA5A5]/60 h-full rounded-xs" />
                    </div>
                  </div>
                </div>

                {/* Footer Row */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[13px]">
                  <div className="flex items-center gap-1.5 text-orange-600 font-medium">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                    <span>พบข้อสังเกตจากภาพ · 14:03 น.</span>
                  </div>

                  <button
                    onClick={onViewPhlebitisDetail}
                    className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] rounded-xl px-4.5 py-2 inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <span>ทบทวนผล Phlebitis</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2 Bottom Columns: Grade History & 96 Hours History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left Box: Grade History */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900">ประวัติ Grade และระดับความเสี่ยง</h3>
                    <p className="text-[11.5px] text-slate-400">แสดงผลยืนยันล่าสุดและรายการที่ยังรอการทบทวน</p>
                  </div>
                </div>
                <button
                  onClick={onViewGradeHistory}
                  className="text-[#1E58E6] text-[12.5px] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>ดูทั้งหมด</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 pt-1">
                <div className="py-2.5 flex items-center justify-between text-[12.5px]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-800">12:00</span>
                    <div>
                      <span className="font-bold text-slate-900 block">Infiltration · Grade 0</span>
                      <span className="text-[11px] text-slate-400">ระดับความเสี่ยงต่ำ · ยืนยันโดย ชื่อ-นามสกุลผู้ตรวจ</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#10B981] font-semibold text-[11px]">
                    ✓ ยืนยันแล้ว
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between text-[12.5px]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-bold text-slate-800">14:03</span>
                    <div>
                      <span className="font-bold text-slate-900 block">Phlebitis · รอการทบทวน</span>
                      <span className="text-[11px] text-slate-400">พบข้อสังเกตจากภาพ · ยังไม่ระบุ Grade และระดับความเสี่ยง</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 font-semibold text-[11px]">
                    ⚠ รอยืนยัน
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between text-[12.5px]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-800">14:00</span>
                    <div>
                      <span className="font-bold text-slate-900 block">Infiltration · Grade 0</span>
                      <span className="text-[11px] text-slate-400">ระดับความเสี่ยงต่ำ · ยืนยันโดย ชื่อ-นามสกุลผู้ตรวจ</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#10B981] font-semibold text-[11px]">
                    ✓ ยืนยันแล้ว
                  </span>
                </div>

                <div className="py-2.5 flex items-center justify-between text-[12.5px]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-800">16:03</span>
                    <div>
                      <span className="font-bold text-slate-900 block">Phlebitis · รอการทบทวน</span>
                      <span className="text-[11px] text-slate-400">ระดับความเสี่ยงต่ำ · ยืนยันโดย ชื่อ-นามสกุลผู้ตรวจ</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#10B981] font-semibold text-[11px]">
                    ✓ ยืนยันแล้ว
                  </span>
                </div>
              </div>
            </div>

            {/* Right Box: 96 Hours History */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-slate-900">ประวัติการติดตาม 96 ชั่วโมง</h3>
                    <p className="text-[11.5px] text-slate-400">กดแต่ละรายการเพื่อดูภาพ ผล AI ผู้ตรวจ และเวลา</p>
                  </div>
                </div>
                <button
                  onClick={onViewTrackingHistory}
                  className="text-[#1E58E6] text-[12.5px] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>ดูทั้งหมด</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 pt-1">
                {/* 12:00 */}
                <div className="py-3 flex items-center justify-between text-[12.5px] hover:bg-slate-50/70 transition-colors px-2 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-800 w-12">12:00</span>
                    <div>
                      <span className="font-bold text-slate-900 block">รอบ 2 / 48 · ตรวจแล้ว</span>
                      <span className="text-[11.5px] text-slate-500">เวลาจริง 12:04 น. · พว. ศุภกานต์ นาคดี</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* 14:00 - SKIPPED ROUND */}
                <div className="py-3 flex items-center justify-between text-[12.5px] bg-slate-50/80 hover:bg-slate-100/80 transition-colors px-2 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                    <span className="font-bold text-slate-800 w-12">14:00</span>
                    <div>
                      <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                        <span>รอบ 3 / 48 · ข้าม — ผู้ป่วยหลับ</span>
                      </span>
                      <span className="text-[11.5px] text-slate-500">เวลาจริง 14:05 น. · พว. ศุภกานต์ นาคดี</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* 14:47 */}
                <div className="py-3 flex items-center justify-between text-[12.5px] hover:bg-slate-50/70 transition-colors px-2 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="font-bold text-slate-800 w-12">14:47</span>
                    <div>
                      <span className="font-bold text-slate-900 block">ตรวจเพิ่มเติม · ผู้ป่วยตื่น</span>
                      <span className="text-[11.5px] text-slate-500">เวลาจริง 14:47 น. · พว. ศุภกานต์ นาคดี</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* 16:00 */}
                <div className="py-3 flex items-center justify-between text-[12.5px] hover:bg-slate-50/70 transition-colors px-2 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-800 w-12">16:00</span>
                    <div>
                      <span className="font-bold text-slate-900 block">รอบ 4 / 48 · ตรวจแล้ว</span>
                      <span className="text-[11.5px] text-slate-500">เวลาจริง 16:01 น. · พว. ศุภกานต์ นาคดี</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* 18:00 */}
                <div className="py-3 flex items-center justify-between text-[12.5px] hover:bg-slate-50/70 transition-colors px-2 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="font-bold text-slate-800 w-12">18:00</span>
                    <div>
                      <span className="font-bold text-slate-900 block">รอบ 5 / 48 · AI พบสิ่งที่ควรตรวจสอบ</span>
                      <span className="text-[11.5px] text-slate-500">เวลาจริง 18:04 น. · พว. สาวิตรี จันทร์เพ็ญ</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
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
        </>
      ) : (
        /* ========================================================================= */
        /* MODE 3: ALL IMAGES COMPARISON GALLERY VIEW ("ภาพเปรียบเทียบ ทั้งหมด")       */
        /* ========================================================================= */
        <>
          {/* Top Back Link Navigation */}
          <div>
            <button
              onClick={() => setViewMode('single_site')}
              className="text-[#1E58E6] font-semibold text-[13.5px] hover:underline inline-flex items-center gap-1.5 cursor-pointer mb-2 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>กลับรายชื่อผู้ป่วย</span>
            </button>

            {/* Patient Identity Header Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0 shadow-2xs">
                  <User className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                      {patientName}
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6F4EA] text-[#10B981] font-semibold text-[11px]">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      <span>ยืนยันจาก HIS</span>
                    </span>
                  </div>
                  <div className="text-[13px] text-slate-500 font-medium">
                    {hnAn} · 4 ปี 8 เดือน · เพศหญิง
                  </div>
                  <div className="text-[12px] text-slate-400 font-normal flex items-center gap-3 flex-wrap pt-0.5">
                    <span>🏢 PICU</span>
                    <span>ห้อง A-01</span>
                    <span>🛏️ เตียง C32</span>
                    <span>🩺 ชื่อ-นามสกุลแพทย์เจ้าของไข้</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Comparison Section Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-6">
            {/* Header Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  ภาพเปรียบเทียบ
                </h2>
                <p className="text-[12.5px] text-slate-400 font-normal mt-0.5">
                  Baseline และภาพรอบล่าสุด
                </p>
              </div>
            </div>

            {/* Grid of 12 Cards (4 cols x 3 rows) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: ภาพอ้างอิงเริ่มต้น */}
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs h-40">
                  <img
                    src="/iv_baseline.png"
                    alt="Baseline IV Site"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <button
                    onClick={() => setPreviewImage({
                      isOpen: true,
                      title: 'ภาพอ้างอิงเริ่มต้น',
                      dateText: '9 ส.ค. 2569 · 08:00 น.',
                      src: '/iv_baseline.png',
                      overlayPill: 'ภาพอ้างอิงเริ่มต้น'
                    })}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-2.5 left-4 right-4 bg-slate-900/70 backdrop-blur-xs text-white py-1 rounded-full text-center text-[11px] font-semibold">
                    ภาพอ้างอิงเริ่มต้น
                  </div>
                </div>
                <div className="flex items-start justify-between text-[12.5px] px-0.5">
                  <div>
                    <div className="font-bold text-slate-900">ภาพอ้างอิงเริ่มต้น</div>
                    <div className="text-[11.5px] text-slate-400">9 ส.ค. 2569</div>
                  </div>
                  <div className="text-right text-[11.5px] text-slate-400 pt-0.5">
                    08:00 น.
                  </div>
                </div>
              </div>

              {/* Card 2: ภาพล่าสุด (1/48) - Active Green Border & Red Circle */}
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-100 group shadow-2xs h-40">
                  <img
                    src="/iv_latest.png"
                    alt="Latest IV Site"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {/* Overlay Red Circle Marker */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <ellipse cx="70" cy="45" rx="16" ry="22" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeDasharray="none" />
                  </svg>
                  <button
                    onClick={() => setPreviewImage({
                      isOpen: true,
                      title: 'ภาพล่าสุด',
                      dateText: '9 ส.ค. 2569 · 08:00 น.',
                      src: '/iv_latest.png',
                      overlayPill: 'ภาพรอบล่าสุด'
                    })}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-slate-900/60 hover:bg-slate-900/80 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-2.5 left-4 right-4 bg-slate-900/70 backdrop-blur-xs text-white py-1 rounded-full text-center text-[11px] font-semibold">
                    ภาพรอบล่าสุด
                  </div>
                </div>
                <div className="flex items-start justify-between text-[12.5px] px-0.5">
                  <div>
                    <div className="font-bold text-slate-900">ภาพล่าสุด</div>
                    <div className="text-[11.5px] text-slate-400">9 ส.ค. 2569</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 text-[12.5px]">1/48</div>
                    <div className="text-[11.5px] text-slate-400">08:00 น.</div>
                  </div>
                </div>
              </div>

              {/* Cards 3 to 12 Placeholder Cards */}
              {[
                { round: '2/48' },
                { round: '3/48' },
                { round: '4/48' },
                { round: '5/48' },
                { round: '6/48' },
                { round: '7/48' },
                { round: '8/48' },
                { round: '9/48' },
                { round: '10/48' },
                { round: '11/48' }
              ].map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="rounded-2xl border border-slate-200/80 bg-[#CBD5E1]/70 h-40 flex flex-col items-center justify-center relative p-4">
                    <Camera className="w-7 h-7 text-slate-400 stroke-[1.5]" />
                    <div className="absolute bottom-3 px-3 py-1 rounded-full bg-slate-300/80 text-slate-700 text-[11px] font-semibold shadow-2xs">
                      รอดำเนินการ
                    </div>
                  </div>
                  <div className="flex items-start justify-between text-[12.5px] px-0.5">
                    <div>
                      <div className="font-bold text-slate-900">ข้อมูลไม่ได้ระบุ</div>
                      <div className="text-[11.5px] text-slate-400">รอดำเนินการ</div>
                    </div>
                    <div className="font-bold text-slate-900 text-[12.5px]">
                      {item.round}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Footer Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 text-[13px]">
              <div className="text-slate-500 font-medium">
                Showing 10 of 10 Historical Log
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3.5 py-1.5 border border-slate-200 text-slate-400 rounded-xl font-medium cursor-not-allowed bg-slate-50">
                  Previous
                </button>
                <button className="px-3.5 py-1.5 bg-[#1E58E6] text-white rounded-xl font-bold shadow-2xs">
                  1
                </button>
                <button className="px-3.5 py-1.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 cursor-pointer">
                  2
                </button>
              </div>
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
        </>
      )}
    </div>
  );
};
