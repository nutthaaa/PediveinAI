import React, { useState } from 'react';
import {
  User,
  CheckCircle2,
  Clock,
  Flag,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
  Camera,
  Sparkles,
  Droplets,
  AlertTriangle,
  Upload,
  RotateCcw,
  SlidersHorizontal,
  Image as ImageIcon,
  Bell,
  Activity,
  Pencil,
  Info,
  X
} from 'lucide-react';
import { SkipRoundModal } from './SkipRoundModal';
import { AiReviewDetailModal } from './AiReviewDetailModal';
import { AssignReviewerModal } from './AssignReviewerModal';

interface StartIvMonitoringProps {
  patientData?: {
    name?: string;
    hnAn?: string;
    ward?: string;
    room?: string;
    bed?: string;
    needle?: string;
    vein?: string;
    site?: string;
    progress?: string;
    round?: string;
    dueTimeText?: string;
    dueHighlight?: string;
  };
  onBack?: () => void;
  onCancel?: () => void;
  onContinue?: () => void;
  onConfirmSkip?: () => void;
}

export const StartIvMonitoring: React.FC<StartIvMonitoringProps> = ({
  patientData,
  onBack,
  onCancel,
  onContinue,
  onConfirmSkip
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSkipped, setIsSkipped] = useState<boolean>(false);
  const [showSkipModal, setShowSkipModal] = useState<boolean>(false);
  const [isCaptured, setIsCaptured] = useState<boolean>(false);
  const [reviewModalItem, setReviewModalItem] = useState<any | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [isInfiltrationReviewed, setIsInfiltrationReviewed] = useState<boolean>(false);
  const [isPhlebitisReviewed, setIsPhlebitisReviewed] = useState<boolean>(false);

  // Form selections for Step 1
  const [bodySide, setBodySide] = useState<string>('ซ้าย');
  const [ivSiteLocation, setIvSiteLocation] = useState<string>('หลังมือซ้าย');
  const [selectedVeinId, setSelectedVeinId] = useState<string>('cephalic');

  // AI Analysis Sub-States for Step 3
  const [aiAnalysisState, setAiAnalysisState] = useState<'ready' | 'processing' | 'result'>('ready');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const [previewVeinImage, setPreviewVeinImage] = useState<{ title: string; image: string } | null>(null);

  // Vein selection options
  const veinOptions: { id: string; title: string; sub: string; veinType: string; image?: string }[] = [
    {
      id: 'cephalic',
      title: 'Cephalic vein',
      sub: 'เส้นเลือดดำเซฟาลิก',
      veinType: 'cephalic',
      image: '/cephalic_vein.png'
    },
    {
      id: 'metacarpal',
      title: 'Metacarpal vein',
      sub: 'เส้นเลือดดำเมตาคาร์ปัล',
      veinType: 'metacarpal',
      image: '/metacarpal_vein.png'
    },
    {
      id: 'basilic',
      title: 'Basilic median vein',
      sub: 'เส้นเลือดดำบาซิลิก มีเดียน',
      veinType: 'basilic',
      image: '/basilic_vein.png'
    },
    {
      id: 'antebrachial',
      title: 'Antebrachial vein',
      sub: 'เส้นเลือดดำแอนทีบราเคียล',
      veinType: 'antebrachial',
      image: '/antebrachial_vein.png'
    },
    {
      id: 'accessory',
      title: 'Accessory cephalic vein',
      sub: 'เส้นเลือดดำเซฟาลิกส่วนเสริม',
      veinType: 'accessory',
      image: '/accessory_cephalic_vein.png'
    },
    {
      id: 'other',
      title: 'Other (ระบุ)',
      sub: 'เส้นเลือดตำแหน่งอื่น',
      veinType: 'other',
      image: '/other_vein.png'
    }
  ];

  // Default Fallback Patient Data
  const patient = {
    name: patientData?.name || 'ชื่อ-นามสกุล-คนไข้',
    hnAn: patientData?.hnAn || 'HN34567890 · AN26080918',
    ward: patientData?.ward || 'PICU',
    room: patientData?.room || 'ห้อง A-01',
    bed: patientData?.bed || 'เตียง C32',
    needle: patientData?.needle || 'เข็ม #1',
    vein: patientData?.vein || 'Cephalic vein',
    site: patientData?.site || 'ท่อนแขนซ้าย',
    progress: patientData?.progress || '98 / 168',
    dueTimeText: patientData?.dueTimeText || 'กำหนดตรวจ 14:00 น. · เกินกำหนด',
    dueHighlight: patientData?.dueHighlight || '00:18:24'
  };

  const handleStartAnalysis = () => {
    setAiAnalysisState('processing');
    setProgressPercent(15);

    setTimeout(() => setProgressPercent(45), 600);
    setTimeout(() => setProgressPercent(80), 1300);
    setTimeout(() => {
      setProgressPercent(100);
      setTimeout(() => {
        setAiAnalysisState('result');
      }, 500);
    }, 2100);
  };

  // If AI Analysis is complete ('result' state), render the dedicated AI Analysis Result Screen
  if (currentStep === 3 && aiAnalysisState === 'result') {
    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Top Back Navigation Link */}
        <div>
          <button
            onClick={() => setAiAnalysisState('ready')}
            className="text-[#1E58E6] font-semibold text-[13.5px] hover:underline inline-flex items-center gap-1.5 cursor-pointer mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับรายชื่อผู้ป่วย</span>
          </button>

          {/* Result Page Title Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              ผลการวิเคราะห์ภาพ IV Site ด้วย AI
            </h1>
            <p className="text-slate-500 text-[13px] font-medium mt-1">
              รอบตรวจ 16 · บันทึกภาพเวลา 14:03 น. · ประมวลผลแล้วเสร็จภายใน 6.8 วินาที
            </p>
          </div>
        </div>

        {/* Main 2 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (4 Cols): Image Comparison Panel */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-[15px]">
                  ภาพสำหรับเปรียบเทียบ
                </h3>
                <p className="text-[12px] text-slate-400 font-medium">
                  เลือกภาพเพื่อดูรายละเอียดขนาดใหญ่
                </p>
              </div>
            </div>

            {/* Thumbnail 1: Previous Round */}
            <div className="space-y-1.5">
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-slate-100">
                <img
                  src="/iv_baseline.png"
                  alt="ภาพรอบก่อนหน้า"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="font-bold text-slate-900 text-[13px]">
                ภาพรอบก่อนหน้า
              </div>
              <div className="text-[12px] text-slate-400 font-medium">
                10 ส.ค. 2569 · 08:00 น.
              </div>
            </div>

            {/* Thumbnail 2: Current Image with Red AI Circle Annotation */}
            <div className="space-y-1.5 pt-1">
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-slate-100">
                <img
                  src="/iv_latest.png"
                  alt="ภาพปัจจุบันตำแหน่งที่ AI เน้น"
                  className="w-full h-full object-cover"
                />
                {/* Red Circle Highlight Overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-red-500 bg-red-500/15 rounded-full flex items-center justify-center pointer-events-none animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                </div>
              </div>
              <div className="font-bold text-slate-900 text-[13px]">
                ภาพปัจจุบันตำแหน่งที่ AI เน้น
              </div>
              <div className="text-[12px] text-slate-400 font-medium">
                10 ส.ค. 2569 · 10:00 น.
              </div>
            </div>
          </div>

          {/* Right Column (8 Cols): AI Analysis Details Cards */}
          <div className="lg:col-span-8 space-y-6">
            {/* CARD 1: INFILTRATION */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
                    <Droplets className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#1E58E6] uppercase tracking-wider block">
                      INFILTRATION
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                      ภาวะสารน้ำรั่วออกนอกหลอดเลือด
                    </h3>
                  </div>
                </div>

                {isInfiltrationReviewed ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4EA] text-[#10B981] font-semibold text-[12px] shrink-0 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>ยืนยันไม่พบสิ่งผิดปกติ</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-semibold text-[12px] shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>รอการยืนยัน</span>
                  </span>
                )}
              </div>

              {/* Finding Summary */}
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-[#10B981]">
                  ไม่พบข้อสังเกตจากภาพ
                </h4>
                <p className="text-[13px] text-slate-500 font-medium">
                  ระบบไม่พบพื้นที่บวมหรือการเปลี่ยนแปลงของผิวหนังที่ควรนำเสนอเพื่อทบทวน
                </p>
              </div>

              {/* 4 Stat Columns Grid */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Grade
                  </span>
                  <div className="text-lg font-extrabold text-[#1E58E6]">
                    Grade 0
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    บุคลากรทางการแพทย์ยืนยัน
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    ระดับความเสี่ยง
                  </span>
                  <div className="text-lg font-extrabold text-[#10B981]">
                    ต่ำ
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    ข้อมูลจากผลที่ได้รับการยืนยัน
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    ระดับความเชื่อมั่นของ AI
                  </span>
                  <div className="text-lg font-extrabold text-[#1E58E6]">
                    96%
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    ค่าความมั่นใจของ AI
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    ระยะเวลาประมวลผล
                  </span>
                  <div className="text-lg font-extrabold text-[#1E58E6]">
                    3.2 วินาที
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    ระยะเวลาประมวลผล AI
                  </span>
                </div>
              </div>

              {/* Risk Gauge Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="grid grid-cols-4 text-center text-[11px] font-semibold text-slate-400">
                  <span className="text-[#10B981]">ต่ำ</span>
                  <span>ปานกลาง</span>
                  <span>สูง</span>
                  <span>วิกฤต</span>
                </div>
                <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden flex">
                  <div className="w-1/4 bg-[#10B981] h-full" />
                  <div className="w-1/4 bg-amber-400 h-full" />
                  <div className="w-1/4 bg-orange-500 h-full" />
                  <div className="w-1/4 bg-[#DC2626] h-full" />
                  {/* Knob Indicator on Low Segment */}
                  <div className="absolute top-1/2 left-[12.5%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#10B981] rounded-full shadow-xs" />
                </div>
              </div>

              {/* Footer Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <span className="text-[12.5px] text-slate-500 font-medium">
                  พบความเสี่ยงในระบบ กรุณาทบทวน/ตรวจสอบผลการวิเคราะห์ (โดยผู้เชี่ยวชาญ)
                </span>
                {isInfiltrationReviewed ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button className="bg-[#10B981] text-white font-bold text-[13px] px-4 py-2.5 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-default">
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>ทบทวนผลสำเร็จ</span>
                    </button>
                    <button
                      onClick={() => {
                        setReviewModalItem({
                          type: 'infiltration',
                          title: 'INFILTRATION',
                          patientName: patient.name,
                          confidence: '96%'
                        });
                      }}
                      title="แก้ไขการทบทวน"
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer transition-colors shadow-2xs shrink-0"
                    >
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setReviewModalItem({
                        type: 'infiltration',
                        title: 'INFILTRATION',
                        patientName: patient.name,
                        confidence: '96%'
                      });
                    }}
                    className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>ทบทวนผล Infiltration</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* CARD 2: PHLEBITIS */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#DC2626] uppercase tracking-wider block">
                      PHLEBITIS
                    </span>
                    <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                      ภาวะหลอดเลือดดำอักเสบ
                    </h3>
                  </div>
                </div>

                {isPhlebitisReviewed ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-semibold text-[12px] shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>ยืนยันพบสิ่งผิดปกติ</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-semibold text-[12px] shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>รอการยืนยัน</span>
                  </span>
                )}
              </div>

              {/* Finding Summary */}
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-[#DC2626]">
                  {isPhlebitisReviewed ? 'ยืนยันว่าพบข้อสังเกตจากภาพ' : 'พบข้อสังเกตจากภาพ รอการทบทวน'}
                </h4>
                <p className="text-[13px] text-slate-500 font-medium">
                  AI เน้นบริเวณรอยแดงตามแนวหลอดเลือดเมื่อเปรียบเทียบกับภาพก่อนหน้า
                </p>
              </div>

              {/* 4 Stat Columns Grid */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Grade
                  </span>
                  <div className="text-lg font-extrabold text-[#1E58E6]">
                    {isPhlebitisReviewed ? 'Grade 3' : 'พบความเสี่ยง'}
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    บุคลากรทางการแพทย์ยืนยัน
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    ระดับความเสี่ยง
                  </span>
                  <div className={`text-lg font-extrabold ${isPhlebitisReviewed ? 'text-[#F59E0B]' : 'text-[#DC2626]'}`}>
                    {isPhlebitisReviewed ? 'สูง' : 'พบความเสี่ยง'}
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    ข้อมูลจากผลที่ได้รับการยืนยัน
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    ระดับความเชื่อมั่นของ AI
                  </span>
                  <div className="text-lg font-extrabold text-[#1E58E6]">
                    97%
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    ค่าความมั่นใจของ AI
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    ระยะเวลาประมวลผล
                  </span>
                  <div className="text-lg font-extrabold text-[#1E58E6]">
                    3.6 วินาที
                  </div>
                  <span className="text-[11px] text-slate-400 block">
                    ระยะเวลาประมวลผล AI
                  </span>
                </div>
              </div>

              {/* Risk Gauge Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="grid grid-cols-4 text-center text-[11px] font-semibold text-slate-400">
                  <span>ต่ำ</span>
                  <span>ปานกลาง</span>
                  <span className="text-[#DC2626]">สูง</span>
                  <span>วิกฤต</span>
                </div>
                <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden flex">
                  <div className="w-1/4 bg-[#10B981]/30 h-full" />
                  <div className="w-1/4 bg-amber-400/30 h-full" />
                  <div className="w-1/4 bg-orange-500 h-full" />
                  <div className="w-1/4 bg-[#DC2626]/30 h-full" />
                  {/* Knob Indicator on High Segment */}
                  <div className="absolute top-1/2 left-[62.5%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-orange-500 rounded-full shadow-xs" />
                </div>
              </div>

              {/* Footer Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <span className="text-[12.5px] text-slate-500 font-medium">
                  พบความเสี่ยงในระบบ กรุณาทบทวน/ตรวจสอบผลการวิเคราะห์ (โดยผู้เชี่ยวชาญ)
                </span>
                {isPhlebitisReviewed ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button className="bg-[#10B981] text-white font-bold text-[13px] px-4 py-2.5 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-default">
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>ทบทวนผลสำเร็จ</span>
                    </button>
                    <button
                      onClick={() => {
                        setReviewModalItem({
                          type: 'phlebitis',
                          title: 'PHLEBITIS',
                          patientName: patient.name,
                          confidence: '97%'
                        });
                      }}
                      title="แก้ไขการทบทวน"
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer transition-colors shadow-2xs shrink-0"
                    >
                      <Pencil className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setReviewModalItem({
                        type: 'phlebitis',
                        title: 'PHLEBITIS',
                        patientName: patient.name,
                        confidence: '97%'
                      });
                    }}
                    className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>ทบทวนผล Phlebitis</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Responsibility Warning Box */}
        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-[14px]">
                บุคลากรทางการแพทย์ผู้รับผิดชอบต้องทบทวนและยืนยันก่อนบันทึก
              </h4>
              <p className="text-[12.5px] text-slate-500 font-medium mt-0.5">
                ผลจาก AI เป็นข้อมูลสนับสนุน มิใช่การวินิจฉัย และไม่กำหนดระดับความรุนแรง (Grade)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[13px] rounded-xl shadow-2xs transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4 text-slate-500" />
              <span>มอบหมายผู้ทบทวน</span>
            </button>

            <button
              onClick={() => {
                if (onContinue) onContinue();
                else if (onBack) onBack();
              }}
              className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-[13px] shadow-xs transition-all inline-flex items-center justify-center gap-2 cursor-pointer ${isInfiltrationReviewed || isPhlebitisReviewed
                  ? 'bg-[#1E58E6] hover:bg-blue-700 text-white active:scale-95'
                  : 'bg-[#1E58E6] text-white hover:bg-blue-700 active:scale-95'
                }`}
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>บันทึกผลการตรวจ</span>
            </button>
          </div>
        </div>

        {/* Bottom Disclaimer Banner */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950 mt-6">
          <ShieldCheck className="w-8 h-8 text-[#1E58E6] shrink-0" />
          <div className="text-[14px]">
            <div className="font-bold text-blue-900">
              AI เป็นเครื่องมือสนับสนุนการตรวจสอบภาพ
            </div>
            <p className="text-blue-700 mt-0.5 text-[12px]">
              ผล AI ไม่ใช่การวินิจฉัย และทุกการบันทึกต้องได้รับการยืนยันโดยเจ้าหน้าที่
            </p>
          </div>
        </div>

        {/* AI Review Detail Modal */}
        {reviewModalItem && (
          <AiReviewDetailModal
            item={reviewModalItem}
            initialStep="form"
            onClose={() => setReviewModalItem(null)}
            onSaveSuccess={() => {
              if (reviewModalItem?.type === 'infiltration') {
                setIsInfiltrationReviewed(true);
              } else if (reviewModalItem?.type === 'phlebitis') {
                setIsPhlebitisReviewed(true);
              }
              setReviewModalItem(null);
            }}
          />
        )}

        {/* Assign Reviewer Modal */}
        {showAssignModal && (
          <AssignReviewerModal
            onClose={() => setShowAssignModal(false)}
            onConfirmSuccess={() => {
              setShowAssignModal(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Top Navigation Back Link */}
      <div>
        <button
          onClick={() => {
            if (currentStep > 1) {
              setCurrentStep(currentStep - 1);
            } else if (onBack || onCancel) {
              (onBack || onCancel)();
            }
          }}
          className="text-[#1E58E6] font-semibold text-[13.5px] hover:underline inline-flex items-center gap-1.5 cursor-pointer mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ย้อนกลับ</span>
        </button>

        {/* Section Header */}
        <div>
          <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">
            START IV MONITORING
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            เริ่มติดตาม IV Site
          </h1>
          <p className="text-slate-500 text-[13px] font-normal mt-1">
            เก็บข้อมูลเริ่มต้น ถ่ายภาพ Baseline แล้วเริ่มเวลา 168 ชั่วโมง
          </p>
        </div>
      </div>

      {/* Patient Identity Top Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0 shadow-2xs">
            <User className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                {patient.name}
              </h2>
            </div>
            <div className="text-[13px] text-slate-500 font-medium flex items-center gap-2 flex-wrap">
              <span>{patient.hnAn}</span>
              <span>·</span>
              <span>🏢 {patient.ward}</span>
              <span>·</span>
              <span>{patient.room}</span>
              <span>·</span>
              <span>🛏️ {patient.bed}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-semibold text-[12px] shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>ยืนยันจาก HIS</span>
          </span>
        </div>
      </div>

      {/* Stepper Progress Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 transition-colors ${currentStep > 1
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'bg-[#1E58E6] text-white shadow-xs'
                }`}
            >
              {currentStep > 1 ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : '1'}
            </div>
            <span
              className={`text-[13px] sm:text-[14px] font-bold ${currentStep >= 1
                  ? currentStep > 1
                    ? 'text-[#10B981]'
                    : 'text-[#1E58E6]'
                  : 'text-slate-400'
                }`}
            >
              {currentStep > 1 ? '✓ ระบุตำแหน่ง IV' : 'ระบุตำแหน่ง IV'}
            </span>
          </div>

          {/* Divider 1 */}
          <div
            className={`h-0.5 flex-1 min-w-[20px] transition-colors ${currentStep > 1 ? 'bg-[#10B981]' : 'bg-slate-200'
              }`}
          />

          {/* Step 2 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 transition-colors ${currentStep > 2
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : currentStep === 2
                    ? 'bg-white text-[#1E58E6] border-2 border-[#1E58E6]'
                    : 'border-2 border-slate-300 text-slate-400 bg-white'
                }`}
            >
              {currentStep > 2 ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : '2'}
            </div>
            <span
              className={`text-[13px] sm:text-[14px] ${currentStep === 2
                  ? 'text-[#1E58E6] font-bold'
                  : currentStep > 2
                    ? 'text-[#10B981] font-bold'
                    : 'text-slate-400 font-medium'
                }`}
            >
              {currentStep > 2 ? '✓ ถ่ายภาพ Baseline' : 'ถ่ายภาพ Baseline'}
            </span>
          </div>

          {/* Divider 2 */}
          <div
            className={`h-0.5 flex-1 min-w-[20px] transition-colors ${currentStep > 2 ? 'bg-[#10B981]' : 'bg-slate-200'
              }`}
          />

          {/* Step 3 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 transition-colors ${currentStep === 3
                  ? 'bg-[#1E58E6] text-white shadow-xs'
                  : 'border-2 border-slate-300 text-slate-400 bg-white'
                }`}
            >
              3
            </div>
            <span
              className={`text-[13px] sm:text-[14px] ${currentStep === 3 ? 'text-[#1E58E6] font-bold' : 'text-slate-400 font-medium'
                }`}
            >
              ยืนยันเริ่มติดตาม 7 วัน
            </span>
          </div>
        </div>
      </div>

      {/* STEP CONTENT CONTAINER */}
      {currentStep === 1 ? (
        /* ========================================================================= */
        /* STEP 1: ยืนยันตำแหน่ง IV Site                                             */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-2xs space-y-6 animate-fadeIn">
          {/* Step Header */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-[#1E58E6] text-white flex items-center justify-center shrink-0 font-bold text-[14px] shadow-xs mt-0.5">
              1
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                ยืนยันตำแหน่ง IV Site
              </h3>
              <p className="text-[13px] text-slate-500 font-normal mt-0.5">
                ตำแหน่งนี้จะใช้เป็นข้อมูลอ้างอิงสำหรับการตรวจทุก 2 ชั่วโมง
              </p>
            </div>
          </div>

          {/* Form Row: ด้านของร่างกาย & บริเวณ IV Site */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Field 1: ด้านของร่างกาย */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 block">
                ด้านของร่างกาย
              </label>
              <select
                value={bodySide}
                onChange={(e) => setBodySide(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] text-slate-800 font-medium focus:outline-none focus:border-[#1E58E6] focus:ring-1 focus:ring-[#1E58E6] shadow-2xs cursor-pointer"
              >
                <option value="ซ้าย">ซ้าย</option>
                <option value="ขวา">ขวา</option>
              </select>
            </div>

            {/* Field 2: บริเวณ IV Site */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 block">
                บริเวณ IV Site
              </label>
              <select
                value={ivSiteLocation}
                onChange={(e) => setIvSiteLocation(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] text-slate-800 font-medium focus:outline-none focus:border-[#1E58E6] focus:ring-1 focus:ring-[#1E58E6] shadow-2xs cursor-pointer"
              >
                <option value="หลังมือซ้าย">หลังมือซ้าย</option>
                <option value="ท่อนแขนซ้าย">ท่อนแขนซ้าย</option>
                <option value="ข้อพับแขนซ้าย">ข้อพับแขนซ้าย</option>
                <option value="หลังมือขวา">หลังมือขวา</option>
                <option value="ท่อนแขนขวา">ท่อนแขนขวา</option>
                <option value="ข้อพับแขนขวา">ข้อพับแขนขวา</option>
              </select>
            </div>
          </div>

          {/* Section: ตำแหน่งเส้นเลือด (IV Vein) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                ตำแหน่งเส้นเลือด (IV Vein)
              </h4>
              <span className="text-[12.5px] text-slate-400 font-medium">
                เลือก 1 รายการ · จำเป็นสำหรับการเริ่มติดตาม
              </span>
            </div>

            {/* 6 Vein Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {veinOptions.map((vein) => {
                const isSelected = selectedVeinId === vein.id;
                return (
                  <div
                    key={vein.id}
                    onClick={() => setSelectedVeinId(vein.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${isSelected
                        ? 'border-[#1E58E6] bg-blue-50/40 shadow-2xs ring-1 ring-[#1E58E6]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Thumbnail Illustration / Image */}
                      <div className="w-12 h-12 rounded-lg bg-blue-50/80 border border-blue-100/90 flex items-center justify-center shrink-0 overflow-hidden relative group">
                        {vein.image ? (
                          <img
                            src={vein.image}
                            alt={vein.title}
                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewVeinImage({ title: vein.title, image: vein.image! });
                            }}
                            title="คลิกเพื่อขยายรูปภาพ"
                          />
                        ) : (
                          <div className="p-1 w-full h-full flex items-center justify-center">
                            <svg viewBox="0 0 50 50" fill="none" className="w-full h-full">
                              {/* Arm contour */}
                              <path d="M 12 8 Q 18 25 22 42 M 38 8 Q 32 25 28 42" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
                              {/* Hand outline */}
                              <path d="M 22 42 Q 25 47 28 42" stroke="#94A3B8" strokeWidth="1.8" />
                              {/* Vein lines according to veinType */}
                              {vein.veinType === 'cephalic' && (
                                <path d="M 18 10 Q 20 25 22 40" stroke="#1E58E6" strokeWidth="3.2" strokeLinecap="round" />
                              )}
                              {vein.veinType === 'metacarpal' && (
                                <path d="M 18 30 L 22 42 M 25 30 L 25 42 M 32 30 L 28 42" stroke="#1E58E6" strokeWidth="2.8" strokeLinecap="round" />
                              )}
                              {vein.veinType === 'basilic' && (
                                <path d="M 32 10 Q 30 25 28 40" stroke="#1E58E6" strokeWidth="3.2" strokeLinecap="round" />
                              )}
                              {vein.veinType === 'antebrachial' && (
                                <path d="M 25 12 Q 25 26 25 40" stroke="#1E58E6" strokeWidth="3.2" strokeLinecap="round" />
                              )}
                              {vein.veinType === 'accessory' && (
                                <path d="M 16 14 Q 19 25 21 34" stroke="#1E58E6" strokeWidth="2.8" strokeDasharray="3 2" strokeLinecap="round" />
                              )}
                              {vein.veinType === 'other' && (
                                <circle cx="25" cy="25" r="8" stroke="#1E58E6" strokeWidth="2.2" strokeDasharray="2.5 2.5" />
                              )}
                            </svg>
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-slate-900 text-[14px]">
                          {vein.title}
                        </div>
                        <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                          {vein.sub}
                        </div>
                      </div>
                    </div>

                    {/* Radio Indicator */}
                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#1E58E6] text-white flex items-center justify-center shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 bg-white" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Info Metadata Box (Light gray container) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Col 1 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                วันและเวลาเริ่ม
              </span>
              <div className="text-[13.5px] font-bold text-slate-900">
                9 ส.ค. 2569 · 08:00 น.
              </div>
            </div>

            {/* Col 2 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                ผู้เริ่มติดตาม
              </span>
              <div className="text-[13.5px] font-bold text-slate-900">
                ชื่อ-นามสกุล-ผู้เริ่มติดตาม
              </div>
            </div>

            {/* Col 3 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                ขอบเขต
              </span>
              <div className="text-[13.5px] font-bold text-slate-900">
                แผนกเด็ก · PICU 2 / ห้อง A-01 / เตียง C32
              </div>
            </div>
          </div>
        </div>
      ) : currentStep === 2 ? (
        /* ========================================================================= */
        /* STEP 2: บันทึกและตรวจคุณภาพของภาพ (Camera Viewfinder & Criteria Checklist)  */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-2xs space-y-6 animate-fadeIn">
          {/* Step Header */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-[#1E58E6] text-white flex items-center justify-center shrink-0 font-bold text-[14px] shadow-xs mt-0.5">
              2
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                จัดทำภาพอ้างอิงเริ่มต้น (Baseline)
              </h3>
              <p className="text-[13px] text-slate-400 font-normal mt-0.5">
                ภาพนี้จะมาจากรอบตรวจตามกำหนด 84 รอบของเข็มใหม่ และไม่ปะปนกับภาพของเข็มเดิม
              </p>
            </div>
          </div>

          {/* 2 Column Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Camera Viewfinder / Captured Image Container */}
            <div
              className={`lg:col-span-7 rounded-2xl h-[360px] sm:h-[400px] relative flex flex-col items-center justify-center p-6 overflow-hidden border transition-all ${isCaptured
                  ? 'border-2 border-emerald-500 shadow-md bg-[#0B1528]'
                  : 'bg-[#0B1528] border-slate-800 shadow-inner'
                }`}
            >
              {isCaptured ? (
                <>
                  {/* Captured Real IV Image Background */}
                  <img
                    src="/iv_latest.png"
                    alt="Captured IV Site"
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Corner Brackets Framing Overlay */}
                  <div className="absolute inset-6 pointer-events-none flex flex-col justify-between p-2 z-10">
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400" />
                      <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400" />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400" />
                      <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400" />
                    </div>
                  </div>

                  {/* Translucent Overlay Card Centered */}
                  <div className="relative z-20 bg-slate-950/75 backdrop-blur-md rounded-2xl p-6 text-center text-white space-y-2 border border-white/10 max-w-xs shadow-xl animate-fadeIn">
                    <div className="w-12 h-12 rounded-full bg-[#10B981] text-white flex items-center justify-center mx-auto mb-3 shadow-md">
                      <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      ภาพพร้อมใช้งาน
                    </h4>
                    <p className="text-[12.5px] text-slate-200 font-normal">
                      เห็น IV Site และบริเวณโดยรอบชัดเจน
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Camera Viewfinder State */}
                  {/* White Camera Framing Overlay Corner Brackets */}
                  <div className="absolute inset-6 pointer-events-none flex flex-col justify-between p-2">
                    <div className="flex justify-between">
                      <div className="w-8 h-8 border-t-2 border-l-2 border-white" />
                      <div className="w-8 h-8 border-t-2 border-r-2 border-white" />
                    </div>
                    <div className="flex justify-between">
                      <div className="w-8 h-8 border-b-2 border-l-2 border-white" />
                      <div className="w-8 h-8 border-b-2 border-r-2 border-white" />
                    </div>
                  </div>

                  {/* Center Camera Overlay Icon & Prompt Text */}
                  <div className="text-center space-y-2 relative z-10">
                    <div className="w-14 h-14 rounded-full bg-white/10 text-slate-300 flex items-center justify-center mx-auto mb-3 backdrop-blur-xs">
                      <Camera className="w-7 h-7 stroke-[1.8]" />
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      จัดตำแหน่ง IV Site ให้อยู่กลางกรอบ
                    </h4>
                    <p className="text-[12.5px] text-slate-400 font-normal max-w-xs mx-auto">
                      หลีกเลี่ยงข้อมูลที่สามารถระบุตัวผู้ป่วย
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Right 5 Cols: Image Quality Criteria Panel */}
            <div className="lg:col-span-5 bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h4 className="text-[15px] font-extrabold text-slate-900 border-b border-slate-200/80 pb-3">
                  เกณฑ์คุณภาพของภาพ
                </h4>

                {/* 5 Quality Criteria Checklist Items */}
                <div className="space-y-3">
                  {[
                    'ภาพคมชัด',
                    'แสงเพียงพอ',
                    'เห็น IV Site ครบถ้วน',
                    'ไม่มีสิ่งบดบัง',
                    'สามารถใช้เปรียบเทียบถัดไป'
                  ].map((text, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[13px]">
                      <div className="flex items-center gap-2 text-slate-700 font-medium">
                        {isCaptured ? (
                          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 stroke-[2.5]" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span>{text}</span>
                      </div>
                      {isCaptured ? (
                        <span className="bg-[#E6F4EA] text-[#10B981] font-semibold text-[11px] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          ✓ ผ่านเกณฑ์
                        </span>
                      ) : (
                        <span className="bg-slate-200/70 text-slate-500 font-semibold text-[11px] px-2.5 py-0.5 rounded-md">
                          รอการตรวจสอบ
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 2 Bottom Buttons inside Quality Panel */}
              <div className="space-y-2.5 pt-2">
                <button className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[13.5px] py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>นำเข้าภาพ</span>
                </button>

                {isCaptured ? (
                  <button
                    onClick={() => setIsCaptured(false)}
                    className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[13.5px] py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                    <span>บันทึกภาพใหม่</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsCaptured(true)}
                    className="w-full bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>บันทึกภาพ</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* STEP 3: ยืนยันเริ่มติดตาม 7 วัน                                           */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-10 shadow-2xs text-center space-y-6 animate-fadeIn">
          {/* Centered Green Pulse Icon Badge */}
          <div className="w-14 h-14 rounded-full border border-emerald-300 bg-emerald-50/80 text-[#10B981] flex items-center justify-center mx-auto shadow-2xs">
            <Activity className="w-7 h-7 stroke-[2.2]" />
          </div>

          {/* Titles & Description */}
          <div className="space-y-2 max-w-xl mx-auto">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              พร้อมเริ่มติดตาม{patientData?.needle || 'เข็ม #3'}
            </h3>
            <p className="text-[13px] text-slate-400 font-normal leading-relaxed">
              เมื่อยืนยัน ระบบจะสร้างตารางใหม่จากรอบที่ 1 ตรวจทุก 2 ชั่วโมงจนสะสมครบ 168 ชั่วโมง โดยไม่เปลี่ยนตารางของ IV Site เดิม
            </p>
          </div>

          {/* 2 Column x 3 Row Summary Grid Box */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6 text-left max-w-3xl mx-auto shadow-2xs">
            {/* Row 1 Col 1 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                หมายเลข IV Site
              </span>
              <div className="text-base font-extrabold text-slate-900">
                {patientData?.needle || 'เข็ม #3'}
              </div>
            </div>

            {/* Row 1 Col 2 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                ตำแหน่ง IV Site
              </span>
              <div className="text-base font-extrabold text-slate-900">
                {ivSiteLocation} · ด้าน{bodySide}
              </div>
            </div>

            {/* Row 2 Col 1 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                ตำแหน่งเส้นเลือด
              </span>
              <div className="text-base font-extrabold text-slate-900">
                {veinOptions.find(v => v.id === selectedVeinId)?.title || 'Cephalic vein'}
              </div>
            </div>

            {/* Row 2 Col 2 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                ภาพอ้างอิงเริ่มต้น
              </span>
              <div className="text-base font-extrabold text-slate-900">
                ผ่านเกณฑ์คุณภาพของภาพ
              </div>
            </div>

            {/* Row 3 Col 1 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                กำหนดตรวจรอบแรก
              </span>
              <div className="text-base font-extrabold text-slate-900">
                2 ชั่วโมงหลัง เริ่มติดตาม
              </div>
            </div>

            {/* Row 3 Col 2 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                ระยะติดตามของเข็มนี้
              </span>
              <div className="text-base font-extrabold text-slate-900">
                168 ชั่วโมง
              </div>
            </div>
          </div>

          {/* Warning Banner Box */}
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 flex items-center gap-3 text-[#1E40AF] text-left max-w-3xl mx-auto shadow-2xs">
            <Info className="w-5 h-5 text-[#2563EB] shrink-0" />
            <p className="text-[12.5px] font-medium text-[#1E40AF] leading-relaxed">
              การข้ามรอบจะไม่เริ่มนับระยะเวลา 7 วันใหม่ ส่วนการถอดเข็มจะเปลี่ยนเป็นติดตามทุก 8 ชั่วโมงและนับต่อจากเวลาและรอบเดิม โดยไม่ลบประวัติ
            </p>
          </div>
        </div>
      )}

      {/* Main Bottom Actions Row */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          onClick={() => {
            if (currentStep > 1) {
              setCurrentStep(currentStep - 1);
            } else if (onCancel || onBack) {
              (onCancel || onBack)();
            }
          }}
          className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[14px] rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
        >
          {currentStep > 1 ? 'ย้อนกลับ' : 'ยกเลิก'}
        </button>

        {currentStep === 3 ? (
          <button
            onClick={() => {
              if (onContinue) onContinue();
              else if (onBack) onBack();
            }}
            className="px-6 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[14px] rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Activity className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>ยืนยัน IV Site</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (currentStep < 3) {
                setCurrentStep(currentStep + 1);
              } else if (onContinue) {
                onContinue();
              } else if (onBack) {
                onBack();
              }
            }}
            disabled={currentStep === 2 && !isCaptured}
            className={`px-6 py-2.5 rounded-xl font-bold text-[14px] inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer ${currentStep === 2 && !isCaptured
                ? 'bg-[#93C5FD] text-white cursor-not-allowed opacity-80'
                : 'bg-[#1E58E6] hover:bg-blue-700 text-white active:scale-95'
              }`}
          >
            <span>ถัดไป</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bottom Disclaimer Banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950 mt-6">
        <svg
          width="44"
          height="44"
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
          <p className="text-blue-700 mt-0.5 text-[12px]">
            ผล AI ไม่ใช่การวินิจฉัย และทุกการบันทึกต้องได้รับการยืนยันโดยเจ้าหน้าที่
          </p>
        </div>
      </div>

      {/* Skip Round Modal */}
      {showSkipModal && (
        <SkipRoundModal
          patientName={patient.name}
          hnAn={patient.hnAn}
          ward={patient.ward}
          room={patient.room}
          bed={patient.bed}
          dueTime="12:00 น."
          onClose={() => setShowSkipModal(false)}
          onConfirmSuccess={() => {
            setIsSkipped(true);
            setShowSkipModal(false);
            if (onConfirmSkip) {
              onConfirmSkip();
            } else if (onContinue) {
              onContinue();
            }
          }}
        />
      )}

      {/* AI Review Detail Modal */}
      {reviewModalItem && (
        <AiReviewDetailModal
          item={reviewModalItem}
          initialStep="form"
          onClose={() => setReviewModalItem(null)}
          onSaveSuccess={() => {
            if (reviewModalItem?.type === 'infiltration') {
              setIsInfiltrationReviewed(true);
            } else if (reviewModalItem?.type === 'phlebitis') {
              setIsPhlebitisReviewed(true);
            }
            setReviewModalItem(null);
          }}
        />
      )}

      {/* Vein Image Preview Modal */}
      {previewVeinImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewVeinImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl relative border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                ภาพกายวิภาค - {previewVeinImage.title}
              </h3>
              <button
                onClick={() => setPreviewVeinImage(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200/80 p-2 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewVeinImage.image}
                alt={previewVeinImage.title}
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-2xs"
              />
            </div>
            <div className="text-center pt-1">
              <button
                onClick={() => setPreviewVeinImage(null)}
                className="px-5 py-2 bg-[#1E58E6] text-white font-semibold text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-2xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
