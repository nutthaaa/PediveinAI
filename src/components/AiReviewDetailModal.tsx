import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Check,
  Droplet,
  Info,
  Activity
} from 'lucide-react';

const infiltrationGradeInfo: Record<number, { title: string; risk: string; desc: string; recommendation: string; riskColor: string }> = {
  1: {
    title: 'Grade 1',
    risk: 'ระดับความเสี่ยงต่ำ',
    desc: 'บวม 1–10% ของแขนหรือมือใต้ตำแหน่งแทงเข็ม และปวดบริเวณที่แทง',
    recommendation: 'หยุดให้สารน้ำหรือยา, Off IV Site, ไม่กดบริเวณรั่วซึม, ยกแขนสูง 24 ชั่วโมง, ประคบตามชนิดยา และปรึกษา IV Team',
    riskColor: 'text-[#10B981]'
  },
  2: {
    title: 'Grade 2',
    risk: 'ระดับความเสี่ยงปานกลาง',
    desc: 'บวม 10–25% ของแขนหรือมือใต้ตำแหน่งแทงเข็ม ผิวหนังตึง ปวดบริเวณที่แทง',
    recommendation: 'หยุดให้สารน้ำหรือยา, Off IV Site, ยกแขนสูง 24 ชั่วโมง, ประคบตามชนิดยา และรายงานแพทย์ประจำบ้าน',
    riskColor: 'text-[#F59E0B]'
  },
  3: {
    title: 'Grade 3',
    risk: 'ระดับความเสี่ยงสูง',
    desc: 'บวม 25–50% ของแขนหรือมือใต้ตำแหน่งแทงเข็ม ผิวหนังตึง เย็น ปวด และสีผิวเปลี่ยน',
    recommendation: 'หยุดให้สารน้ำหรือยา, Off IV Site, ยกแขนสูง, ปรึกษา IV Team และแพทย์ผู้ดูแลทันที',
    riskColor: 'text-[#F97316]'
  },
  4: {
    title: 'Grade 4',
    risk: 'ระดับความเสี่ยงสูงมาก',
    desc: 'บวม >50% ของแขนหรือมือ ผิวหนังตึง เย็น ปวดรุนแรง มีแผลพุพอง หรือเนื้อเยื่อขาดเลือด',
    recommendation: 'หยุดให้สารน้ำหรือยา, Off IV Site ทันที, ปรึกษาศัลยกรรม และ IV Expert Urgent',
    riskColor: 'text-[#991B1B]'
  }
};

const phlebitisGradeInfo: Record<number, { title: string; risk: string; desc: string; recommendation: string; riskColor: string }> = {
  1: {
    title: 'Grade 1',
    risk: 'ระดับความเสี่ยงต่ำ',
    desc: 'ปวดบริเวณตำแหน่งแทงเข็ม หรือมีรอยแดงโดยไม่มีอาการบวม',
    recommendation: 'สังเกตอาการใกล้ชิด, Off IV Site หากมีอาการเพิ่มขึ้น และประคบอุ่น',
    riskColor: 'text-[#10B981]'
  },
  2: {
    title: 'Grade 2',
    risk: 'ระดับความเสี่ยงปานกลาง',
    desc: 'ปวดร่วมกับมีรอยแดง หรือบวมบริเวณตำแหน่งแทงเข็ม',
    recommendation: 'Off IV Site, เปลี่ยนตำแหน่งแทงเข็มใหม่, ประคบอุ่น และติดตามอาการ',
    riskColor: 'text-[#F59E0B]'
  },
  3: {
    title: 'Grade 3',
    risk: 'ระดับความเสี่ยงสูง',
    desc: 'ปวดตามแนวหลอดเลือดดำ มีรอยแดง คลำได้หลอดเลือดแข็ง (Venous Cord)',
    recommendation: 'Off IV Site ทันที, ประคบอุ่น, รายงานแพทย์ และปรึกษา IV Team',
    riskColor: 'text-[#F97316]'
  },
  4: {
    title: 'Grade 4',
    risk: 'ระดับความเสี่ยงสูงมาก',
    desc: 'ปวดตามแนวหลอดเลือดดำ คลำได้หลอดเลือดแข็งยาว > 1 นิ้ว มีสิ่งหลั่งหรือหนองไหล',
    recommendation: 'Off IV Site ทันที, ส่งตรวจ Culture สิ่งหลั่ง, ปรึกษาแพทย์และ IV Team Urgent',
    riskColor: 'text-[#991B1B]'
  }
};

interface AiReviewDetailModalProps {
  item: any;
  onClose: () => void;
  onSaveSuccess?: () => void;
  onNavigate?: (nav: string) => void;
  initialStep?: 'overview' | 'form';
}

export const AiReviewDetailModal: React.FC<AiReviewDetailModalProps> = ({
  item,
  onClose,
  onSaveSuccess,
  onNavigate,
  initialStep = 'overview'
}) => {
  const [step, setStep] = useState<'overview' | 'form'>(initialStep);
  const [selectedOption, setSelectedOption] = useState<'no_observation' | 'observation_found' | null>('no_observation');
  const [hasPain, setHasPain] = useState<boolean | null>(true);
  const [selectedGradeNum, setSelectedGradeNum] = useState<number>(1);
  const [isReviewedChecked, setIsReviewedChecked] = useState(false);
  const [isToastShown, setIsToastShown] = useState(false);

  const isPhlebitis = item?.type === 'phlebitis' || item?.title?.toLowerCase().includes('phlebitis');
  const typeName = isPhlebitis ? 'PHLEBITIS' : 'INFILTRATION';
  const thaiName = isPhlebitis ? 'ภาวะหลอดเลือดดำอักเสบ' : 'ภาวะสารน้ำรั่วออกนอกหลอดเลือด';
  const patientName = item?.patientName || item?.name || 'ชื่อ-นามสกุล-คนไข้';

  const currentGradeMap = isPhlebitis ? phlebitisGradeInfo : infiltrationGradeInfo;
  const activeGradeDetail = currentGradeMap[selectedGradeNum] || currentGradeMap[1];

  const handleConfirmSave = () => {
    if (!selectedOption || !isReviewedChecked) return;
    setIsToastShown(true);
    setTimeout(() => {
      if (onSaveSuccess) onSaveSuccess();
      if (onNavigate) onNavigate('history');
      onClose();
    }, 1200);
  };

  const isSaveDisabled = !selectedOption || !isReviewedChecked;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      {/* Success Toast Banner */}
      {isToastShown && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-[14px] font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          <span>บันทึกผลการทบทวนเรียบร้อยแล้ว</span>
        </div>
      )}

      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <span className="text-[12px] font-bold text-blue-600 tracking-wider uppercase">
            PEDIVEINCARE AI
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            รายละเอียด {typeName}
          </h2>
          <p className="text-slate-500 text-[13px] mt-1">
            {patientName} · HN56789012 · PICU / ห้อง A-01 / เตียง C32
          </p>
        </div>

        {/* Status Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
              {isPhlebitis ? (
                <Activity className="w-6 h-6 text-[#1E58E6]" />
              ) : (
                <Droplet className="w-6 h-6 text-[#1E58E6]" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {typeName} · {thaiName}
              </h3>
              <p className="text-[12.5px] text-slate-500 font-normal mt-0.5">
                ไม่พบข้อสังเกตจากภาพ และได้รับการยืนยันผลแล้ว
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 self-start sm:self-auto space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-full text-[12px] font-semibold shadow-2xs">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>รอการทบทวน</span>
            </span>
            <div className="text-[11px] text-slate-400 font-normal">
              ส่งคิวเข้าทบทวน 9 ส.ค. 2569 · 08:10 น.
            </div>
          </div>
        </div>

        {/* 2 Image Comparison Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Image 1: Baseline */}
          <div>
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group">
              <img
                src="/iv_baseline.png"
                alt="Baseline Image"
                className="w-full h-48 sm:h-52 object-cover"
              />
              <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-white/85 backdrop-blur-xs text-slate-800 text-[11.5px] font-bold shadow-2xs">
                ภาพอ้างอิงเริ่มต้น
              </div>
            </div>
            <div className="mt-2 text-left">
              <div className="text-[14px] font-bold text-slate-900">ภาพอ้างอิงเริ่มต้น</div>
              <div className="text-[12px] text-slate-400 font-normal">9 ส.ค. 2569 · 08:00 น.</div>
            </div>
          </div>

          {/* Image 2: Latest / Followup with Circle Overlay */}
          <div>
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group">
              <img
                src="/iv_latest.png"
                alt="Latest Image"
                className="w-full h-48 sm:h-52 object-cover"
              />
              {/* Highlight Circle SVG */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 200 200">
                  <circle
                    cx="140"
                    cy="95"
                    r="26"
                    fill="none"
                    stroke={isPhlebitis ? '#1E58E6' : '#EF4444'}
                    strokeWidth="3.5"
                    strokeDasharray="4 2"
                    className="animate-pulse"
                  />
                  <circle
                    cx="140"
                    cy="95"
                    r="26"
                    fill={isPhlebitis ? 'rgba(30, 88, 230, 0.12)' : 'rgba(239, 68, 68, 0.15)'}
                  />
                </svg>
              </div>
              <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-white/85 backdrop-blur-xs text-slate-800 text-[11.5px] font-bold shadow-2xs">
                ภาพรอบล่าสุด
              </div>
            </div>
            <div className="mt-2 text-left">
              <div className="text-[14px] font-bold text-slate-900">ภาพล่าสุด</div>
              <div className="text-[12px] text-slate-400 font-normal">10 ส.ค. 2569 · 12:05 น.</div>
            </div>
          </div>
        </div>

        {/* STEP 1: OVERVIEW SCREEN */}
        {step === 'overview' && (
          <>
            {/* 3 Metric Statistic Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80">
                <span className="text-[12px] text-slate-500 font-medium block">Grade</span>
                <div className="text-2xl font-bold text-[#1E58E6] mt-1">Grade 0</div>
                <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">บุคลากรทางการแพทย์ยืนยัน</span>
              </div>

              <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80">
                <span className="text-[12px] text-slate-500 font-medium block">ระดับความเสี่ยง</span>
                <div className="text-2xl font-bold text-[#10B981] mt-1">ต่ำ</div>
                <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">ข้อมูลจากผลที่ได้รับการยืนยัน</span>
              </div>

              <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80">
                <span className="text-[12px] text-slate-500 font-medium block">ระดับความเชื่อมั่นของ AI</span>
                <div className="text-2xl font-bold text-[#1E58E6] mt-1">{item?.confidence || '96%'}</div>
                <span className="text-[11px] text-slate-400 font-normal mt-0.5 block">ค่าความมั่นใจของ AI</span>
              </div>
            </div>

            {/* Risk Bar with Segment Labels */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11.5px] font-semibold text-slate-500 px-1">
                <span>ต่ำ</span>
                <span>ปานกลาง</span>
                <span>สูง</span>
                <span>วิกฤต</span>
              </div>
              <div className="relative h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                <div className="w-1/4 bg-[#10B981] h-full relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#10B981] shadow-xs" />
                </div>
                <div className="w-1/4 bg-[#F59E0B] h-full" />
                <div className="w-1/4 bg-[#F97316] h-full" />
                <div className="w-1/4 bg-[#991B1B] h-full" />
              </div>
            </div>

            {/* Inspector Details Footer Box */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-100 p-4 flex items-center justify-between text-[13px]">
              <div>
                <span className="font-bold text-slate-900 block">ผู้รับผิดชอบ ชื่อ-นามสกุล-ผู้ตรวจ</span>
                <span className="text-[12px] text-slate-400 font-normal">เจ้าหน้าที่แผนก • เด็ก</span>
              </div>
              <span className="text-[12px] text-slate-400 font-medium">AI ตรวจสอบเสร็จ 12:05 น.</span>
            </div>

            {/* Step 1 Action Button */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setStep('form')}
                className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold rounded-2xl px-6 py-3 shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer text-[14px]"
              >
                <Eye className="w-4.5 h-4.5" />
                <span>เริ่มทบทวนผล AI</span>
              </button>
            </div>
          </>
        )}

        {/* STEP 2: INTERACTIVE REVIEW FORM SCREEN */}
        {step === 'form' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Step 1 Box: Confirm Result from Images */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#1E58E6] text-white flex items-center justify-center font-bold text-[13px] shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                    ยืนยันผลจากภาพ
                  </h3>
                  <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                    เลือกผลหลังจากเปรียบเทียบภาพอ้างอิงเริ่มต้นกับภาพรอบล่าสุด
                  </p>
                </div>
              </div>

              {/* 2 Radio Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* Option 1: No Observation */}
                <div
                  onClick={() => setSelectedOption((prev) => (prev === 'no_observation' ? null : 'no_observation'))}
                  className={`rounded-2xl p-4 border transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedOption === 'no_observation'
                      ? 'border-2 border-[#10B981] bg-[#E6F4EA]/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedOption === 'no_observation' ? 'text-[#10B981]' : 'text-slate-400'
                  }`}>
                    <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-slate-900 leading-snug">
                      ยืนยันว่าไม่พบข้อสังเกตจากภาพ
                    </h4>
                    <p className="text-[12px] text-slate-500 font-normal mt-0.5 leading-normal">
                      ระบบบันทึก Grade 0 และระดับความเสี่ยงต่ำ
                    </p>
                  </div>
                </div>

                {/* Option 2: Observation Found */}
                <div
                  onClick={() => setSelectedOption((prev) => (prev === 'observation_found' ? null : 'observation_found'))}
                  className={`rounded-2xl p-4 border transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedOption === 'observation_found'
                      ? 'border-2 border-[#EF4444] bg-[#FEF2F2] shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedOption === 'observation_found' ? 'text-[#EF4444]' : 'text-slate-400'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-slate-900 leading-snug">
                      ยืนยันว่าพบข้อสังเกตจากภาพ
                    </h4>
                    <p className="text-[12px] text-slate-500 font-normal mt-0.5 leading-normal">
                      ต้องเลือก Grade ก่อนบันทึกผลการทบทวน
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2 & SECTION 3 (Displayed ONLY when Option 2 "observation_found" is selected) */}
            {selectedOption === 'observation_found' && (
              <>
                {/* SECTION 2: Symptom Assessment */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#1E58E6] text-white flex items-center justify-center font-bold text-[13px] shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                        ประเมินอาการและสิ่งที่คลำพบ
                      </h3>
                      <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                        บันทึกข้อมูลจากผู้ป่วยและการตรวจร่างกายก่อนยืนยัน Grade
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <p className="text-[13.5px] font-bold text-[#EF4444] mb-3">
                      *ผู้ป่วยมีอาการปวดบริเวณตำแหน่ง IV หรือแนวหลอดเลือดดำหรือไม่?
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <button
                        type="button"
                        onClick={() => setHasPain(true)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          hasPain === true
                            ? 'border-2 border-[#1E58E6] bg-blue-50/20 text-[#1E58E6] font-bold shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="text-[13.5px] leading-snug">
                          มีอาการปวด (เด็กร้องไห้ ชักมือหนี งอแง หน้านิ่วขมวดคิ้ว)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHasPain(false)}
                        className={`p-4 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center ${
                          hasPain === false
                            ? 'border-2 border-[#1E58E6] bg-blue-50/20 text-[#1E58E6] font-bold shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <div className="text-[13.5px]">ไม่มีอาการปวด</div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Specify Grade */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-4 shadow-2xs animate-fadeIn">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-[#1E58E6] text-white flex items-center justify-center font-bold text-[13px] shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                        ระบุ Grade ที่ยืนยัน
                      </h3>
                      <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                        เลือกตามเกณฑ์ที่โรงพยาบาลกำหนด ระบบจะคำนวณระดับความเสี่ยงให้อัตโนมัติ
                      </p>
                    </div>
                  </div>

                  {/* 4 Grade Selection Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {[1, 2, 3, 4].map((gNum) => {
                      const info = currentGradeMap[gNum];
                      const isSelected = selectedGradeNum === gNum;
                      return (
                        <div
                          key={gNum}
                          onClick={() => setSelectedGradeNum(gNum)}
                          className={`rounded-2xl p-4 text-center cursor-pointer transition-all ${
                            isSelected
                              ? 'border-2 border-[#1E58E6] bg-[#EFF6FF] shadow-2xs'
                              : 'border border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-[16px] font-extrabold text-slate-900">{info.title}</div>
                          <div className="text-[11.5px] text-slate-500 font-normal mt-0.5">{info.risk}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dynamic Risk Bar Indicator */}
                  <div className="space-y-1.5 pt-2">
                    <div className="grid grid-cols-4 text-center text-[11.5px] font-medium text-slate-400">
                      <span>ต่ำ</span>
                      <span>ปานกลาง</span>
                      <span>สูง</span>
                      <span>วิกฤต</span>
                    </div>
                    <div className="relative h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100">
                      <div className="w-1/4 bg-[#10B981] h-full" />
                      <div className="w-1/4 bg-[#F59E0B] h-full" />
                      <div className="w-1/4 bg-[#F97316] h-full" />
                      <div className="w-1/4 bg-[#991B1B] h-full" />
                      
                      {/* Pointer Node Circle */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-md transition-all duration-300"
                        style={{
                          left: selectedGradeNum === 1 ? '12.5%' : selectedGradeNum === 2 ? '37.5%' : selectedGradeNum === 3 ? '62.5%' : '87.5%',
                          transform: 'translate(-50%, -50%)',
                          borderColor: selectedGradeNum === 1 ? '#10B981' : selectedGradeNum === 2 ? '#F59E0B' : selectedGradeNum === 3 ? '#F97316' : '#991B1B'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Results to be Saved Summary Box */}
            {selectedOption && (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-5 space-y-3 animate-fadeIn">
                <span className="text-[12px] text-slate-500 font-medium block">
                  ผลที่จะบันทึก
                </span>
                
                {selectedOption === 'no_observation' ? (
                  <div>
                    <div className="text-xl sm:text-2xl font-extrabold text-[#10B981]">
                      Grade 0 · ระดับความเสี่ยงต่ำ
                    </div>
                    <p className="text-[13px] text-slate-600 font-normal mt-1 leading-relaxed">
                      ไม่พบอาการแสดงของการแทงเข็มรั่วซึมหรืออักเสบ
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                      Grade {selectedGradeNum} · {activeGradeDetail.risk}
                    </div>
                    <p className="text-[13px] text-slate-600 font-normal mt-1 leading-relaxed">
                      {activeGradeDetail.desc}
                    </p>
                  </div>
                )}

                <div className="border-t border-[#BFDBFE]/80 pt-3 flex items-start gap-2.5 text-[#1E58E6] text-[13px] font-medium leading-relaxed">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {selectedOption === 'no_observation'
                      ? 'Observe IV site และ Monitor ตามรอบการตรวจปกติ'
                      : activeGradeDetail.recommendation}
                  </span>
                </div>
              </div>
            )}

            {/* Confirmation Checkbox Box */}
            <div className={`rounded-2xl p-4 flex items-center gap-3 transition-colors ${
              isReviewedChecked ? 'bg-blue-50/70 border border-blue-200' : 'bg-white border border-slate-200'
            }`}>
              <input
                type="checkbox"
                id="reviewCheck"
                checked={isReviewedChecked}
                onChange={(e) => setIsReviewedChecked(e.target.checked)}
                className="w-5 h-5 rounded text-[#1E58E6] border-slate-300 focus:ring-blue-500 cursor-pointer accent-[#1E58E6]"
              />
              <label
                htmlFor="reviewCheck"
                className="text-[13.5px] font-bold text-slate-800 cursor-pointer select-none"
              >
                ได้ทบทวนภาพอ้างอิง ภาพรอบล่าสุด และผล AI ของ {typeName} แล้ว
              </label>
            </div>

            {/* Step 2 Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                onClick={() => setStep('overview')}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-[13.5px] flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>ย้อนกลับ</span>
              </button>

              <button
                onClick={handleConfirmSave}
                disabled={isSaveDisabled}
                className={`px-6 py-3 rounded-2xl font-bold text-[14px] flex items-center gap-2.5 shadow-md transition-all ${
                  isSaveDisabled
                    ? 'bg-[#93C5FD] text-white opacity-85 cursor-not-allowed'
                    : 'bg-[#1E58E6] hover:bg-blue-700 text-white cursor-pointer active:scale-95'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
                <span>ยืนยันและบันทึกผลการทบทวน</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

