import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronRight,
  Droplets,
  Image as ImageIcon,
  Pencil,
  ShieldCheck
} from 'lucide-react';
import { AiReviewDetailModal } from './AiReviewDetailModal';
import { AssignReviewerModal } from './AssignReviewerModal';
import { conditionName, conditionThai, fmtDateTime, fmtTime, pct, riskByGrade } from '../api/format';
import type { Analysis, Condition, ConditionView } from '../api/types';

interface InspectionResultProps {
  analysis: Analysis;
  onBack: () => void;
  onDone: () => void;
}

const RISK_COLORS = ['#10B981', '#10B981', '#F59E0B', '#F97316', '#DC2626'];

const ConditionCard: React.FC<{
  analysis: Analysis;
  view: ConditionView;
  onReview: () => void;
}> = ({ analysis, view, onReview }) => {
  const isPhl = view.condition === 'phlebitis';
  const review = view.review;
  const grade = review ? review.grade : view.ai_grade;
  const accent = isPhl ? '#DC2626' : '#1E58E6';
  const findingColor = (review ? review.finding === 'observation_found' : view.flagged) ? '#DC2626' : '#10B981';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPhl ? 'bg-red-50 text-[#DC2626]' : 'bg-blue-50 text-[#1E58E6]'}`}
          >
            {isPhl ? <Activity className="w-5 h-5 stroke-[2.2]" /> : <Droplets className="w-5 h-5 stroke-[2.2]" />}
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: accent }}>
              {conditionName[view.condition].toUpperCase()}
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 leading-snug">{conditionThai[view.condition]}</h3>
          </div>
        </div>

        {review ? (
          review.finding === 'observation_found' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-semibold text-[12px] shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>ยืนยันพบสิ่งผิดปกติ</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4EA] text-[#10B981] font-semibold text-[12px] shrink-0 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>ยืนยันไม่พบสิ่งผิดปกติ</span>
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-semibold text-[12px] shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>รอการยืนยัน</span>
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h4 className="text-base font-extrabold" style={{ color: findingColor }}>
          {review
            ? review.finding === 'observation_found'
              ? 'ยืนยันว่าพบข้อสังเกตจากภาพ'
              : 'ยืนยันว่าไม่พบข้อสังเกตจากภาพ'
            : view.flagged
              ? 'AI พบข้อสังเกตจากภาพ'
              : 'AI ไม่พบข้อสังเกตของภาวะนี้'}
        </h4>
        <p className="text-[13px] text-slate-500 font-medium">
          {view.flagged
            ? `โมเดลจัดภาพนี้เป็น ${conditionName[view.condition]} และคาดการณ์ Grade ${view.ai_grade} (ผลทดลอง ต้องได้รับการยืนยัน)`
            : `ความน่าจะเป็นของ ${conditionName[view.condition]} ต่ำกว่าอีกภาวะหนึ่ง`}
          {review?.note ? ` · หมายเหตุ: ${review.note}` : ''}
        </p>
      </div>

      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
        <div className="space-y-0.5">
          <span className="text-[11px] text-slate-400 font-medium block">Grade</span>
          <div className="text-lg font-extrabold text-[#1E58E6]">{grade !== null ? `Grade ${grade}` : '-'}</div>
          <span className="text-[11px] text-slate-400 block">
            {review ? `ยืนยันโดย ${review.reviewer?.full_name ?? '-'}` : view.flagged ? 'AI คาดการณ์ · รอยืนยัน' : 'รอยืนยัน'}
          </span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[11px] text-slate-400 font-medium block">ระดับความเสี่ยง</span>
          <div className="text-lg font-extrabold" style={{ color: grade !== null ? RISK_COLORS[grade] : '#94A3B8' }}>
            {grade !== null ? riskByGrade[grade] : '-'}
          </div>
          <span className="text-[11px] text-slate-400 block">{review ? 'ข้อมูลจากผลที่ได้รับการยืนยัน' : 'ยังไม่ได้รับการยืนยัน'}</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[11px] text-slate-400 font-medium block">ความน่าจะเป็นจาก AI</span>
          <div className="text-lg font-extrabold text-[#1E58E6]">{pct(view.probability)}</div>
          <span className="text-[11px] text-slate-400 block">ค่าความมั่นใจของ AI</span>
        </div>
        <div className="space-y-0.5">
          <span className="text-[11px] text-slate-400 font-medium block">ระยะเวลาประมวลผล</span>
          <div className="text-lg font-extrabold text-[#1E58E6]">
            {analysis.processing_ms ? `${(analysis.processing_ms / 1000).toFixed(1)} วินาที` : '-'}
          </div>
          <span className="text-[11px] text-slate-400 block">ระยะเวลาประมวลผล AI</span>
        </div>
      </div>

      <div className="space-y-1.5 pt-1">
        <div className="grid grid-cols-4 text-center text-[11px] font-semibold text-slate-400">
          {['ต่ำ', 'ปานกลาง', 'สูง', 'วิกฤต'].map((label, i) => (
            <span key={label} style={grade === i + 1 ? { color: RISK_COLORS[i + 1] } : undefined}>
              {label}
            </span>
          ))}
        </div>
        <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden flex">
          <div className="w-1/4 bg-[#10B981] h-full" />
          <div className="w-1/4 bg-amber-400 h-full" />
          <div className="w-1/4 bg-orange-500 h-full" />
          <div className="w-1/4 bg-[#DC2626] h-full" />
          {grade !== null && (
            <div
              className="absolute top-1/2 w-4 h-4 bg-white border-2 rounded-full shadow"
              style={{
                left: `${grade ? (grade - 0.5) * 25 : 12.5}%`,
                transform: 'translate(-50%, -50%)',
                borderColor: RISK_COLORS[grade]
              }}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <span className="text-[12.5px] text-slate-500 font-medium">
          {review ? `ทบทวนเมื่อ ${fmtDateTime(review.updated_at)}` : 'กรุณาทบทวน/ตรวจสอบผลการวิเคราะห์'}
        </span>
        {review ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-[#10B981] text-white font-bold text-[13px] px-4 py-2.5 rounded-xl shadow-xs inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>ทบทวนผลสำเร็จ</span>
            </span>
            <button
              onClick={onReview}
              title="แก้ไขการทบทวน"
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        ) : (
          <button
            onClick={onReview}
            className="bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13px] px-5 py-2.5 rounded-xl transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>ทบทวนผล {conditionName[view.condition]}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export const InspectionResult: React.FC<InspectionResultProps> = ({ analysis: initial, onBack, onDone }) => {
  const [analysis, setAnalysis] = useState(initial);
  const [reviewing, setReviewing] = useState<Condition | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [assignedName, setAssignedName] = useState<string | null>(initial.assigned_reviewer?.full_name ?? null);
  const allReviewed = analysis.review_status === 'reviewed';

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div>
        <button
          onClick={onBack}
          className="text-[#1E58E6] font-semibold text-[13.5px] hover:underline inline-flex items-center gap-1.5 cursor-pointer mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับ</span>
        </button>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">ผลการวิเคราะห์ภาพ IV Site ด้วย AI</h1>
        <p className="text-slate-500 text-[13px] font-medium mt-1">
          {analysis.patient.full_name} · {analysis.site.label} {analysis.site.location}
          {analysis.round ? ` · รอบตรวจ ${analysis.round.round_no}` : ''} · บันทึกภาพเวลา {fmtTime(analysis.created_at)}
          {analysis.processing_ms ? ` · ประมวลผลเสร็จภายใน ${(analysis.processing_ms / 1000).toFixed(1)} วินาที` : ''}
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-[12.5px] text-amber-900 leading-relaxed">
        <span className="font-bold">โมเดลทดลอง ({analysis.model_version ?? 'PediVein AI'}):</span> โมเดลนี้แยกได้เฉพาะ
        Infiltration กับ Phlebitis และไม่มีกลุ่ม “ปกติ” จึงเลือกภาวะใดภาวะหนึ่งเสมอ แม้ IV Site จะปกติ ผล Grade
        ที่ AI คาดการณ์มีความแม่นยำจำกัด บุคลากรทางการแพทย์ต้องตรวจผู้ป่วยและยืนยันผลทุกครั้ง
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0">
              <ImageIcon className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-[15px]">ภาพสำหรับเปรียบเทียบ</h3>
              <p className="text-[12px] text-slate-400 font-medium">คลิกภาพเพื่อเปิดขนาดเต็ม</p>
            </div>
          </div>
          {[
            {
              src: analysis.previous_image_url,
              title: analysis.previous_image_url === analysis.baseline_image_url ? 'ภาพอ้างอิงเริ่มต้น' : 'ภาพรอบก่อนหน้า',
              at: analysis.previous_taken_at
            },
            { src: analysis.image_url, title: 'ภาพรอบปัจจุบัน', at: analysis.created_at }
          ].map((img) => (
            <div key={img.title} className="space-y-1.5">
              <div className="relative w-full h-44 rounded-xl overflow-hidden border border-slate-200 shadow-2xs bg-slate-100">
                {img.src ? (
                  <a href={img.src} target="_blank" rel="noreferrer">
                    <img src={img.src} alt={img.title} className="w-full h-full object-cover" />
                  </a>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[12px] text-slate-400">ไม่มีภาพ</div>
                )}
              </div>
              <div className="font-bold text-slate-900 text-[13px]">{img.title}</div>
              <div className="text-[12px] text-slate-400 font-medium">{fmtDateTime(img.at)}</div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-8 space-y-6">
          {(['infiltration', 'phlebitis'] as const).map((condition) => (
            <ConditionCard
              key={condition}
              analysis={analysis}
              view={analysis.conditions[condition]}
              onReview={() => setReviewing(condition)}
            />
          ))}
        </div>
      </div>

      <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-[14px]">บุคลากรทางการแพทย์ผู้รับผิดชอบต้องทบทวนและยืนยัน</h4>
            <p className="text-[12.5px] text-slate-500 font-medium mt-0.5">
              {assignedName ? `มอบหมายให้ ${assignedName} ทบทวนแล้ว · ` : ''}
              ผลจาก AI เป็นข้อมูลสนับสนุน มิใช่การวินิจฉัย
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
          {!allReviewed && (
            <button
              onClick={() => setShowAssign(true)}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[13px] rounded-xl shadow-2xs inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Bell className="w-4 h-4 text-slate-500" />
              <span>มอบหมายผู้ทบทวน</span>
            </button>
          )}
          <button
            onClick={onDone}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-[13px] shadow-xs transition-all inline-flex items-center justify-center gap-2 cursor-pointer bg-[#1E58E6] hover:bg-blue-700 text-white active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{allReviewed ? 'เสร็จสิ้น' : 'บันทึกและทบทวนภายหลัง'}</span>
          </button>
        </div>
      </div>

      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950">
        <ShieldCheck className="w-8 h-8 text-[#1E58E6] shrink-0" />
        <div className="text-[14px]">
          <div className="font-bold text-blue-900">AI เป็นเครื่องมือสนับสนุนการตรวจสอบภาพ</div>
          <p className="text-blue-700 mt-0.5 text-[12px]">ผล AI ไม่ใช่การวินิจฉัย และทุกการบันทึกต้องได้รับการยืนยันโดยเจ้าหน้าที่</p>
        </div>
      </div>

      {reviewing && (
        <AiReviewDetailModal
          item={{ type: reviewing, analysis }}
          initialStep="form"
          onClose={() => setReviewing(null)}
          onSaveSuccess={(updated) => setAnalysis(updated)}
        />
      )}

      {showAssign && (
        <AssignReviewerModal
          analysisId={analysis.id}
          onClose={() => setShowAssign(false)}
          onConfirmSuccess={(name) => setAssignedName(name)}
        />
      )}
    </div>
  );
};
