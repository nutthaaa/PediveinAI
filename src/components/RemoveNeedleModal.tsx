import React, { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Site, SystemSettings } from '../api/types';
import { X, Activity, Clock } from 'lucide-react';

const SyringeIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 2 4 4" />
    <path d="m17 7 3-3" />
    <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-1.6-1.6c-1-1-1-2.5 0-3.4L14 4" />
    <path d="m9 11 4 4" />
    <path d="m5 19-3 3" />
    <path d="m14 4 6 6" />
  </svg>
);

interface RemoveNeedleModalProps {
  site?: Site;
  needleNumber?: string;
  location?: string;
  onClose: () => void;
  onConfirmSuccess?: () => void;
}

export const RemoveNeedleModal: React.FC<RemoveNeedleModalProps> = ({
  site,
  needleNumber = 'เข็ม #1',
  location = 'หลังมือซ้าย',
  onClose,
  onConfirmSuccess
}) => {
  const [reasons, setReasons] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [postInterval, setPostInterval] = useState(8);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    api
      .get<SystemSettings>('/api/settings')
      .then((s) => {
        setReasons(s.removal_reasons);
        setReason(s.removal_reasons[0] ?? '');
        setPostInterval(s.post_removal_interval_hours);
      })
      .catch(() => undefined);
  }, []);

  const handleConfirm = async () => {
    if (!reason.trim() || isSaving) return;
    setError(null);
    setIsSaving(true);
    try {
      if (site) await api.post(`/api/iv-sites/${site.id}/remove`, { reason: reason.trim() });
      if (onConfirmSuccess) onConfirmSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'บันทึกการถอดเข็มไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-[540px] w-full p-6 sm:p-7 space-y-5 shadow-2xl relative border border-slate-100 animate-scaleUp">
        {/* Close Button X */}
        <button
          onClick={onClose}
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
            บันทึกถอดเข็ม {needleNumber}
          </h2>
          <p className="text-slate-500 text-[13px] font-medium mt-0.5">
            ตรวจสอบข้อมูลก่อนยืนยัน
          </p>
        </div>

        {/* Center Syringe Icon & Title */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-14 h-14 rounded-full bg-[#1E58E6] text-white flex items-center justify-center mx-auto shadow-md">
            <SyringeIcon className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">
            ถอดเข็มแล้ว แต่ยังติดตามต่อ
          </h3>
          <p className="text-[12.5px] text-slate-500 font-normal max-w-md mx-auto leading-relaxed">
            ระบบจะเปลี่ยนเฉพาะตารางของ{needleNumber} โดยไม่ลบประวัติและไม่กระทบเข็มอื่นของผู้ป่วย
          </p>
        </div>

        {/* Data Rows Container */}
        <div className="border border-slate-200/90 rounded-2xl divide-y divide-slate-100 text-[13.5px]">
          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-medium">ตำแหน่ง</span>
            <span className="font-extrabold text-slate-900">{location}</span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-medium">ช่วงติดตามเดิม</span>
            <span className="font-extrabold text-slate-900">ทุก {site?.interval_hours ?? 2} ชั่วโมง</span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-medium">ช่วงติดตามหลังถอด</span>
            <span className="font-extrabold text-slate-900">ทุก {postInterval} ชั่วโมง</span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-medium">เวลาสะสม</span>
            <span className="font-extrabold text-slate-900">
              {site ? `${Math.floor(site.elapsed_hours)} / ${site.duration_hours}` : '-'} ชั่วโมง · คงเดิม
            </span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <span className="text-slate-400 font-medium">รอบปัจจุบัน</span>
            <span className="font-extrabold text-slate-900">
              รอบ {site?.next_round?.round_no ?? '-'} · นับต่อจากรอบเดิม
            </span>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 flex items-start gap-3 text-left">
          <Clock className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-bold text-[#1E40AF] text-[13px]">
              หลักการนับต่อเนื่อง
            </div>
            <p className="text-[12px] text-[#1E40AF] leading-relaxed font-medium">
              รอบถัดไปจะเกิดอีก {postInterval} ชั่วโมง ส่วน IV Site ใหม่ที่เพิ่มในผู้ป่วยคนเดิมจะเริ่มรอบที่ 1 และตรวจทุก 2 ชั่วโมงด้วยตารางของตัวเอง
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[13px] font-semibold text-slate-700 block">เหตุผลการถอดเข็ม</label>
          <select
            value={reasons.includes(reason) ? reason : '__other'}
            onChange={(e) => setReason(e.target.value === '__other' ? '' : e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#1E58E6]"
          >
            {reasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="__other">อื่นๆ (ระบุ)</option>
          </select>
          {!reasons.includes(reason) && (
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผล"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-[#1E58E6]"
            />
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-700">{error}</div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[13.5px] rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason.trim() || isSaving}
            className="disabled:opacity-60 px-5 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[13.5px] rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Activity className="w-4 h-4 stroke-[2.5]" />
            <span>ยืนยันการถอดเข็ม</span>
          </button>
        </div>
      </div>
    </div>
  );
};
