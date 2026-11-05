import React, { useEffect, useRef, useState } from 'react';
import {
  User,
  CheckCircle2,
  Clock,
  Flag,
  ChevronRight,
  ArrowLeft,
  Camera,
  Sparkles,
  AlertTriangle,
  Upload,
  RotateCcw,
  Activity,
  Info
} from 'lucide-react';
import { SkipRoundModal } from './SkipRoundModal';
import { InspectionResult } from './InspectionResult';
import { api, ApiError } from '../api/client';
import { useAuth } from '../api/auth';
import { fmtDateTime, holdMessage, qualityCheckLabels } from '../api/format';
import type { SiteSelection } from '../api/selection';
import type { Analysis, ArmCandidate, Quality, Site } from '../api/types';

interface StartIvMonitoringProps {
  patientData?: SiteSelection;
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
  // "inspect" = scheduled round of an existing IV site; "new_site" = start tracking a new needle.
  const mode: 'inspect' | 'new_site' = patientData?.roundId ? 'inspect' : 'new_site';
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(mode === 'inspect' ? 2 : 1);
  const [isSkipped, setIsSkipped] = useState<boolean>(false);
  const [showSkipModal, setShowSkipModal] = useState<boolean>(false);

  // Form selections for Step 1
  const [bodySide, setBodySide] = useState<string>('ซ้าย');
  const [ivSiteLocation, setIvSiteLocation] = useState<string>('หลังมือซ้าย');
  const [selectedVeinId, setSelectedVeinId] = useState<string>('cephalic');
  const [otherVein, setOtherVein] = useState<string>('');
  const [startedAtText] = useState(() => fmtDateTime(new Date().toISOString()));

  // Captured image + quality check (Step 2)
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [isCheckingQuality, setIsCheckingQuality] = useState(false);
  const [allowManualQuality, setAllowManualQuality] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // AI analysis (inspect mode)
  const [aiAnalysisState, setAiAnalysisState] = useState<'ready' | 'processing' | 'result'>('ready');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [armCandidates, setArmCandidates] = useState<ArmCandidate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCaptured =
    !!imageFile &&
    !!quality &&
    quality.status !== 'RETAKE' &&
    (quality.status !== 'MANUAL_REVIEW' || allowManualQuality);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setQuality(null);
    setAllowManualQuality(false);
    setAnalysis(null);
    setArmCandidates([]);
    setErrorText(null);
    setIsCheckingQuality(true);
    try {
      const form = new FormData();
      form.append('image', file);
      setQuality(await api.upload<Quality>('/api/ai/quality-check', form));
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'ตรวจคุณภาพภาพไม่สำเร็จ');
    } finally {
      setIsCheckingQuality(false);
    }
  };

  const resetCapture = () => {
    setImageFile(null);
    setImagePreview(null);
    setQuality(null);
    setAllowManualQuality(false);
    setAnalysis(null);
    setArmCandidates([]);
    setErrorText(null);
  };

  // Vein selection options
  const veinOptions = [
    {
      id: 'cephalic',
      title: 'Cephalic vein',
      sub: 'เส้นเลือดดำเซฟาลิก',
      veinType: 'cephalic'
    },
    {
      id: 'metacarpal',
      title: 'Metacarpal vein',
      sub: 'เส้นเลือดดำเมตาคาร์ปัล',
      veinType: 'metacarpal'
    },
    {
      id: 'basilic',
      title: 'Basilic median vein',
      sub: 'เส้นเลือดดำบาซิลิก มีเดียน',
      veinType: 'basilic'
    },
    {
      id: 'antebrachial',
      title: 'Antebrachial vein',
      sub: 'เส้นเลือดดำแอนทีบราเคียล',
      veinType: 'antebrachial'
    },
    {
      id: 'accessory',
      title: 'Accessory cephalic vein',
      sub: 'เส้นเลือดดำเซฟาลิกส่วนเสริม',
      veinType: 'accessory'
    },
    {
      id: 'other',
      title: 'Other (ระบุ)',
      sub: 'เส้นเลือดตำแหน่งอื่น',
      veinType: 'other'
    }
  ];

  const patient = {
    name: patientData?.name || '-',
    hnAn: patientData?.hnAn || '-',
    ward: patientData?.ward || '-',
    room: patientData?.room || '-',
    bed: patientData?.bed || '-',
    needle: patientData?.needle || 'เข็มใหม่',
    vein: patientData?.vein || '-',
    site: patientData?.site || '-',
    progress: patientData?.progress || '-',
    dueTimeText: patientData?.dueTimeText || '',
    dueHighlight: patientData?.dueHighlight || ''
  };

  const veinTitle = () => {
    const option = veinOptions.find((v) => v.id === selectedVeinId);
    if (selectedVeinId === 'other') return otherVein.trim() || 'Other';
    return option?.title ?? 'Cephalic vein';
  };

  const runAnalysis = async (selectedArmId?: string) => {
    if (!imageFile || !patientData?.roundId) return;
    setErrorText(null);
    setAiAnalysisState('processing');
    setProgressPercent(10);
    // Real progress is not reported by the AI service; advance a soft indicator while waiting.
    const timer = setInterval(() => setProgressPercent((p) => Math.min(p + (95 - p) * 0.08, 95)), 500);
    try {
      const form = new FormData();
      form.append('image', imageFile);
      if (selectedArmId) form.append('selected_arm_id', selectedArmId);
      if (allowManualQuality) form.append('allow_manual_quality_review', 'true');
      const result = await api.upload<Analysis>(`/api/rounds/${patientData.roundId}/inspect`, form);
      setProgressPercent(100);
      setAnalysis(result);
      setArmCandidates(result.manual_review_candidates ?? []);
      if (result.status === 'OK') {
        setAiAnalysisState('result');
      } else {
        setAiAnalysisState('ready');
        if (result.status === 'QUALITY_HOLD') setQuality(result.quality);
        setErrorText(
          result.status === 'QUALITY_HOLD'
            ? 'ภาพไม่ผ่านเกณฑ์คุณภาพสำหรับ AI กรุณาถ่ายภาพใหม่'
            : holdMessage(result.preprocessing_reason)
        );
      }
    } catch (err) {
      setAiAnalysisState('ready');
      setErrorText(err instanceof ApiError ? err.message : 'วิเคราะห์ภาพไม่สำเร็จ');
    } finally {
      clearInterval(timer);
    }
  };

  const createSite = async () => {
    if (!imageFile || !patientData) return;
    setErrorText(null);
    setIsSubmitting(true);
    try {
      const form = new FormData();
      form.append('body_side', bodySide);
      form.append('location', ivSiteLocation);
      form.append('vein', veinTitle());
      form.append('baseline_image', imageFile);
      if (allowManualQuality) form.append('allow_manual_quality_review', 'true');
      await api.upload<Site>(`/api/patients/${patientData.patientId}/iv-sites`, form);
      if (onContinue) onContinue();
      else if (onBack) onBack();
    } catch (err) {
      setErrorText(err instanceof ApiError ? err.message : 'บันทึก IV Site ไม่สำเร็จ');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (aiAnalysisState === 'result' && analysis) {
    return (
      <InspectionResult
        analysis={analysis}
        onBack={() => (onBack ? onBack() : onCancel?.())}
        onDone={() => (onContinue ? onContinue() : onBack?.())}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Top Navigation Back Link */}
      <div>
        <button
          onClick={() => {
            if (currentStep > (mode === 'inspect' ? 2 : 1)) {
              setCurrentStep(currentStep - 1);
            } else {
              (onBack || onCancel)?.();
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
            {mode === 'inspect' ? 'IV SITE INSPECTION' : 'START IV MONITORING'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {mode === 'inspect' ? `ตรวจ IV Site · ${patient.needle} ${patient.site}` : 'เริ่มติดตาม IV Site'}
          </h1>
          <p className="text-slate-500 text-[13px] font-normal mt-1">
            {mode === 'inspect'
              ? `${patientData?.round ?? ''} · ${patient.dueTimeText} ${patient.dueHighlight}`
              : 'เก็บข้อมูลเริ่มต้น ถ่ายภาพ Baseline แล้วเริ่มเวลา 168 ชั่วโมง'}
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
            <span>{mode === 'inspect' ? `${patient.vein}` : 'IV Site ใหม่'}</span>
          </span>
        </div>
      </div>

      {/* Stepper Progress Header Card */}
      <div className={`bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs ${mode === 'inspect' ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 transition-colors ${
                currentStep > 1
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : 'bg-[#1E58E6] text-white shadow-xs'
              }`}
            >
              {currentStep > 1 ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : '1'}
            </div>
            <span
              className={`text-[13px] sm:text-[14px] font-bold ${
                currentStep >= 1
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
            className={`h-0.5 flex-1 min-w-[20px] transition-colors ${
              currentStep > 1 ? 'bg-[#10B981]' : 'bg-slate-200'
            }`}
          />

          {/* Step 2 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 transition-colors ${
                currentStep > 2
                  ? 'bg-[#10B981] text-white shadow-xs'
                  : currentStep === 2
                  ? 'bg-white text-[#1E58E6] border-2 border-[#1E58E6]'
                  : 'border-2 border-slate-300 text-slate-400 bg-white'
              }`}
            >
              {currentStep > 2 ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : '2'}
            </div>
            <span
              className={`text-[13px] sm:text-[14px] ${
                currentStep === 2
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
            className={`h-0.5 flex-1 min-w-[20px] transition-colors ${
              currentStep > 2 ? 'bg-[#10B981]' : 'bg-slate-200'
            }`}
          />

          {/* Step 3 */}
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 transition-colors ${
                currentStep === 3
                  ? 'bg-[#1E58E6] text-white shadow-xs'
                  : 'border-2 border-slate-300 text-slate-400 bg-white'
              }`}
            >
              3
            </div>
            <span
              className={`text-[13px] sm:text-[14px] ${
                currentStep === 3 ? 'text-[#1E58E6] font-bold' : 'text-slate-400 font-medium'
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
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#1E58E6] bg-blue-50/40 shadow-2xs ring-1 ring-[#1E58E6]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* SVG Thumbnail Illustration */}
                      <div className="w-12 h-12 rounded-lg bg-blue-50/80 border border-blue-100/90 flex items-center justify-center shrink-0 p-1">
                        <svg viewBox="0 0 50 50" fill="none" className="w-full h-full">
                          {/* Arm contour */}
                          <path d="M 12 8 Q 18 25 22 42 M 38 8 Q 32 25 28 42" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round"/>
                          {/* Hand outline */}
                          <path d="M 22 42 Q 25 47 28 42" stroke="#94A3B8" strokeWidth="1.8"/>
                          {/* Vein lines according to veinType */}
                          {vein.veinType === 'cephalic' && (
                            <path d="M 18 10 Q 20 25 22 40" stroke="#1E58E6" strokeWidth="3.2" strokeLinecap="round"/>
                          )}
                          {vein.veinType === 'metacarpal' && (
                            <path d="M 18 30 L 22 42 M 25 30 L 25 42 M 32 30 L 28 42" stroke="#1E58E6" strokeWidth="2.8" strokeLinecap="round"/>
                          )}
                          {vein.veinType === 'basilic' && (
                            <path d="M 32 10 Q 30 25 28 40" stroke="#1E58E6" strokeWidth="3.2" strokeLinecap="round"/>
                          )}
                          {vein.veinType === 'antebrachial' && (
                            <path d="M 25 12 Q 25 26 25 40" stroke="#1E58E6" strokeWidth="3.2" strokeLinecap="round"/>
                          )}
                          {vein.veinType === 'accessory' && (
                            <path d="M 16 14 Q 19 25 21 34" stroke="#1E58E6" strokeWidth="2.8" strokeDasharray="3 2" strokeLinecap="round"/>
                          )}
                          {vein.veinType === 'other' && (
                            <circle cx="25" cy="25" r="8" stroke="#1E58E6" strokeWidth="2.2" strokeDasharray="2.5 2.5"/>
                          )}
                        </svg>
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

          {selectedVeinId === 'other' && (
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 block">ระบุตำแหน่งเส้นเลือด</label>
              <input
                value={otherVein}
                onChange={(e) => setOtherVein(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#1E58E6]"
              />
            </div>
          )}

          {/* Bottom Info Metadata Box (Light gray container) */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-4.5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Col 1 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                วันและเวลาเริ่ม
              </span>
              <div className="text-[13.5px] font-bold text-slate-900">
                {startedAtText}
              </div>
            </div>

            {/* Col 2 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                ผู้เริ่มติดตาม
              </span>
              <div className="text-[13.5px] font-bold text-slate-900">
                {user.full_name}
              </div>
            </div>

            {/* Col 3 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                ขอบเขต
              </span>
              <div className="text-[13.5px] font-bold text-slate-900">
                {user.scope} · {patient.ward} / {patient.room} / {patient.bed}
              </div>
            </div>
          </div>
        </div>
      ) : currentStep === 2 ? (
        /* ========================================================================= */
        /* STEP 2: บันทึกและตรวจคุณภาพของภาพ (Camera / File + AI quality check)      */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-2xs space-y-6 animate-fadeIn">
          <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={handleImageSelected} />
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleImageSelected} />

          {/* Step Header */}
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-full bg-[#1E58E6] text-white flex items-center justify-center shrink-0 font-bold text-[14px] shadow-xs mt-0.5">
              {mode === 'inspect' ? <Camera className="w-4 h-4" /> : 2}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug">
                {mode === 'inspect' ? 'ถ่ายภาพ IV Site รอบนี้' : 'จัดทำภาพอ้างอิงเริ่มต้น (Baseline)'}
              </h3>
              <p className="text-[13px] text-slate-400 font-normal mt-0.5">
                {mode === 'inspect'
                  ? 'ภาพจะถูกส่งให้ AI วิเคราะห์ Infiltration / Phlebitis และเปรียบเทียบกับภาพก่อนหน้า'
                  : 'ภาพนี้จะใช้เปรียบเทียบกับทุกรอบตรวจของเข็มใหม่ และไม่ส่งให้ AI วิเคราะห์'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: viewfinder / captured image */}
            <div
              className={`lg:col-span-7 rounded-2xl h-[360px] sm:h-[400px] relative flex flex-col items-center justify-center p-6 overflow-hidden border transition-all ${
                isCaptured ? 'border-2 border-emerald-500 shadow-md bg-[#0B1528]' : 'bg-[#0B1528] border-slate-800 shadow-inner'
              }`}
            >
              {imagePreview && <img src={imagePreview} alt="Captured IV Site" className="absolute inset-0 w-full h-full object-contain" />}

              <div className="absolute inset-6 pointer-events-none flex flex-col justify-between p-2 z-10">
                <div className="flex justify-between">
                  <div className={`w-7 h-7 border-t-2 border-l-2 ${isCaptured ? 'border-emerald-400' : 'border-white'}`} />
                  <div className={`w-7 h-7 border-t-2 border-r-2 ${isCaptured ? 'border-emerald-400' : 'border-white'}`} />
                </div>
                <div className="flex justify-between">
                  <div className={`w-7 h-7 border-b-2 border-l-2 ${isCaptured ? 'border-emerald-400' : 'border-white'}`} />
                  <div className={`w-7 h-7 border-b-2 border-r-2 ${isCaptured ? 'border-emerald-400' : 'border-white'}`} />
                </div>
              </div>

              {aiAnalysisState === 'processing' ? (
                <div className="relative z-20 bg-slate-950/80 backdrop-blur-md rounded-2xl p-6 text-center text-white space-y-3 border border-white/10 w-72 shadow-xl">
                  <Sparkles className="w-8 h-8 mx-auto text-blue-300 animate-pulse" />
                  <h4 className="text-base font-bold">AI กำลังวิเคราะห์ภาพ...</h4>
                  <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                    <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="text-[12px] text-slate-300">ตรวจหาแขน แยกขอบเขต และประเมินด้วยโมเดล อาจใช้เวลาหลายวินาทีบน CPU</p>
                </div>
              ) : isCheckingQuality ? (
                <div className="relative z-20 bg-slate-950/75 backdrop-blur-md rounded-2xl px-6 py-4 text-white text-[13px] font-semibold">
                  กำลังตรวจคุณภาพภาพ...
                </div>
              ) : imagePreview && quality ? (
                <div className="relative z-20 bg-slate-950/75 backdrop-blur-md rounded-2xl p-5 text-center text-white space-y-1.5 border border-white/10 max-w-xs shadow-xl">
                  <div
                    className={`w-11 h-11 rounded-full text-white flex items-center justify-center mx-auto mb-2 shadow-md ${
                      quality.status === 'PASS' ? 'bg-[#10B981]' : quality.status === 'MANUAL_REVIEW' ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                  >
                    {quality.status === 'PASS' ? <CheckCircle2 className="w-6 h-6 stroke-[2.5]" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <h4 className="text-base font-bold tracking-tight">
                    {quality.status === 'PASS' ? 'ภาพพร้อมใช้งาน' : quality.status === 'MANUAL_REVIEW' ? 'ภาพควรตรวจสอบ' : 'ต้องถ่ายภาพใหม่'}
                  </h4>
                  <p className="text-[12px] text-slate-200">
                    {[...quality.reasons, ...quality.warnings].join(' · ') || 'เห็น IV Site และบริเวณโดยรอบชัดเจน'}
                  </p>
                </div>
              ) : !imagePreview ? (
                <div className="text-center space-y-2 relative z-10">
                  <div className="w-14 h-14 rounded-full bg-white/10 text-slate-300 flex items-center justify-center mx-auto mb-3 backdrop-blur-xs">
                    <Camera className="w-7 h-7 stroke-[1.8]" />
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">จัดตำแหน่ง IV Site ให้อยู่กลางกรอบ</h4>
                  <p className="text-[12.5px] text-slate-400 font-normal max-w-xs mx-auto">
                    หลีกเลี่ยงข้อมูลที่สามารถระบุตัวผู้ป่วย เช่น ป้ายชื่อ หรือ สายรัดข้อมือ
                  </p>
                </div>
              ) : null}
            </div>

            {/* Right: quality checklist */}
            <div className="lg:col-span-5 bg-slate-50/80 border border-slate-200/90 rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <h4 className="text-[15px] font-extrabold text-slate-900 border-b border-slate-200/80 pb-3">เกณฑ์คุณภาพของภาพ</h4>
                <div className="space-y-3">
                  {Object.entries(quality?.checks ?? Object.fromEntries(Object.keys(qualityCheckLabels).slice(1, 9).map((k) => [k, 'PENDING'])))
                    .filter(([key]) => key in qualityCheckLabels)
                    .map(([key, state]) => (
                      <div key={key} className="flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                          {state === 'PASS' ? (
                            <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 stroke-[2.5]" />
                          ) : state === 'PENDING' || state.startsWith('NOT_ASSESSED') ? (
                            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          ) : (
                            <AlertTriangle className={`w-4 h-4 shrink-0 ${state === 'REJECT' ? 'text-red-500' : 'text-amber-500'}`} />
                          )}
                          <span>{qualityCheckLabels[key]}</span>
                        </div>
                        <span
                          className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-md ${
                            state === 'PASS'
                              ? 'bg-[#E6F4EA] text-[#10B981]'
                              : state === 'REJECT'
                                ? 'bg-red-50 text-red-600'
                                : state === 'PENDING' || state.startsWith('NOT_ASSESSED')
                                  ? 'bg-slate-200/70 text-slate-500'
                                  : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {state === 'PASS'
                            ? '✓ ผ่านเกณฑ์'
                            : state === 'REJECT'
                              ? 'ไม่ผ่าน'
                              : state === 'PENDING'
                                ? 'รอการตรวจสอบ'
                                : state.startsWith('NOT_ASSESSED')
                                  ? 'ตรวจโดย AI'
                                  : 'ควรตรวจสอบ'}
                        </span>
                      </div>
                    ))}
                </div>

                {quality?.status === 'MANUAL_REVIEW' && (
                  <label className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-900 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowManualQuality}
                      onChange={(e) => setAllowManualQuality(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#1E58E6]"
                    />
                    <span>ข้าพเจ้าตรวจภาพแล้ว ยืนยันว่าเห็น IV Site ชัดเจนพอสำหรับใช้งาน</span>
                  </label>
                )}

                {armCandidates.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[13px] font-bold text-slate-800">เลือกแขนที่มี IV Site</div>
                    <div className="grid grid-cols-2 gap-2">
                      {armCandidates.map((arm) => (
                        <button
                          key={arm.arm_id}
                          onClick={() => runAnalysis(arm.arm_id)}
                          className="rounded-xl border border-slate-200 bg-white hover:border-[#1E58E6] overflow-hidden text-[12px] font-bold text-slate-700 cursor-pointer"
                        >
                          <img src={arm.preview_data_url} alt={arm.arm_id} className="w-full h-24 object-cover" />
                          <div className="py-1">{arm.arm_id}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {errorText && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium text-red-700">{errorText}</div>
                )}
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={aiAnalysisState === 'processing'}
                  className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[13.5px] py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-60"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>นำเข้าภาพ</span>
                </button>
                {imageFile ? (
                  <button
                    onClick={() => {
                      resetCapture();
                      cameraInputRef.current?.click();
                    }}
                    disabled={aiAnalysisState === 'processing'}
                    className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[13.5px] py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-2xs cursor-pointer disabled:opacity-60"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                    <span>บันทึกภาพใหม่</span>
                  </button>
                ) : (
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer"
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
              พร้อมเริ่มติดตาม{patientData?.needle || 'เข็มใหม่'}
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
                {patientData?.needle || 'เข็มใหม่ (กำหนดเลขอัตโนมัติ)'}
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
                {veinTitle()}
              </div>
            </div>

            {/* Row 2 Col 2 */}
            <div className="space-y-0.5">
              <span className="text-[12px] text-slate-400 font-medium block">
                ภาพอ้างอิงเริ่มต้น
              </span>
              <div className="text-base font-extrabold text-slate-900">
                {quality?.status === 'PASS' ? 'ผ่านเกณฑ์คุณภาพของภาพ' : 'ยืนยันคุณภาพโดยเจ้าหน้าที่'}
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
      {currentStep === 3 && errorText && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-700">{errorText}</div>
      )}
      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (currentStep > (mode === 'inspect' ? 2 : 1)) {
                setCurrentStep(currentStep - 1);
              } else {
                (onCancel || onBack)?.();
              }
            }}
            className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[14px] rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            {currentStep > (mode === 'inspect' ? 2 : 1) ? 'ย้อนกลับ' : 'ยกเลิก'}
          </button>
          {mode === 'inspect' && (
            <button
              onClick={() => setShowSkipModal(true)}
              disabled={isSkipped || aiAnalysisState === 'processing'}
              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[14px] rounded-xl shadow-2xs cursor-pointer inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Flag className="w-4 h-4" />
              <span>ข้ามรอบ</span>
            </button>
          )}
        </div>

        {mode === 'inspect' ? (
          <button
            onClick={() => runAnalysis()}
            disabled={!isCaptured || aiAnalysisState === 'processing'}
            className={`px-6 py-2.5 rounded-xl font-bold text-[14px] inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              !isCaptured || aiAnalysisState === 'processing'
                ? 'bg-[#93C5FD] text-white cursor-not-allowed opacity-80'
                : 'bg-[#1E58E6] hover:bg-blue-700 text-white active:scale-95'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{aiAnalysisState === 'processing' ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ด้วย AI'}</span>
          </button>
        ) : currentStep === 3 ? (
          <button
            onClick={createSite}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[14px] rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60"
          >
            <Activity className="w-4.5 h-4.5 stroke-[2.5]" />
            <span>{isSubmitting ? 'กำลังบันทึก...' : 'ยืนยัน IV Site'}</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            disabled={(currentStep === 2 && !isCaptured) || (currentStep === 1 && selectedVeinId === 'other' && !otherVein.trim())}
            className={`px-6 py-2.5 rounded-xl font-bold text-[14px] inline-flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              currentStep === 2 && !isCaptured
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
          roundId={patientData?.roundId}
          patientName={patient.name}
          hnAn={patient.hnAn}
          ward={patient.ward}
          room={patient.room}
          bed={patient.bed}
          dueTime={patient.dueTimeText}
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

    </div>
  );
};
