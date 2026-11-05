import React, { useState } from 'react';
import { api, ApiError } from '../api/client';
import type { Site } from '../api/types';
import { X, LogOut } from 'lucide-react';

interface EndTrackingModalProps {
  patientId?: number;
  patientName?: string;
  sites?: Site[];
  pendingReviews?: number;
  onClose: () => void;
  onConfirmSuccess?: () => void;
}

export const EndTrackingModal: React.FC<EndTrackingModalProps> = ({
  patientId,
  patientName = '-',
  sites = [],
  pendingReviews = 0,
  onClose,
  onConfirmSuccess
}) => {
  const fullyTracked = sites.filter((site) => site.elapsed_hours >= site.duration_hours).length;
  const recordedRounds = sites.reduce((sum, site) => sum + site.completed_rounds, 0);
  const [isChecked, setIsChecked] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!isChecked) return;
    setError(null);
    try {
      if (patientId) await api.post(`/api/patients/${patientId}/discharge`, {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'สิ้นสุดการติดตามไม่สำเร็จ');
      return;
    }
    if (onConfirmSuccess) {
      onConfirmSuccess();
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-[620px] w-full p-6 sm:p-7 space-y-5 shadow-2xl relative border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
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
            ยืนยันสิ้นสุดการติดตาม
          </h2>
          <p className="text-slate-500 text-[13px] font-medium mt-0.5">
            ตรวจสอบข้อมูลก่อนยืนยัน
          </p>
        </div>

        {/* Center Orange Icon & Discharge Heading */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-14 h-14 rounded-full bg-[#FF7A00] text-white flex items-center justify-center mx-auto shadow-md mb-2">
            <LogOut className="w-7 h-7 rotate-180 stroke-[2.2]" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            ยืนยันผู้ป่วยจำหน่ายกลับบ้าน
          </h3>
          <p className="text-[13px] text-slate-500 font-normal leading-relaxed max-w-md mx-auto">
            ระบบจะสิ้นสุดตารางติดตามทุก IV Site ของ {patientName} ทันที โดยคงชั่วโมงและรอบตามเวลาจริง
          </p>
        </div>

        {/* 4 Metrics Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Card 1: IV Site ทั้งหมด */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 relative shadow-2xs">
            <span className="text-[11.5px] text-slate-400 font-medium block">
              IV Site ทั้งหมด
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{sites.length}</div>
            <span className="text-[11px] text-slate-400 font-normal absolute bottom-3.5 right-3.5">
              เข็ม
            </span>
          </div>

          {/* Card 2: ครบ 168 ชั่วโมง */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 relative shadow-2xs">
            <span className="text-[11.5px] text-slate-400 font-medium block">
              ครบระยะติดตาม
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{fullyTracked}</div>
            <span className="text-[11px] text-slate-400 font-normal absolute bottom-3.5 right-3.5">
              เข็ม
            </span>
          </div>

          {/* Card 3: รอบที่บันทึกจริง */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 relative shadow-2xs">
            <span className="text-[11.5px] text-slate-400 font-medium block">
              รอบที่บันทึกจริง
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{recordedRounds}</div>
            <span className="text-[11px] text-slate-400 font-normal absolute bottom-3.5 right-3.5">
              รอบ
            </span>
          </div>

          {/* Card 4: ผล AI รอการทบทวน (Green Background) */}
          <div className="bg-[#ECFDF5]/70 border border-[#A7F3D0] rounded-2xl p-3.5 relative shadow-2xs">
            <span className="text-[11.5px] text-[#059669] font-semibold block">
              ผล AI รอการทบทวน
            </span>
            <div className="text-2xl font-extrabold text-[#059669] mt-1">{pendingReviews}</div>
            <span className="text-[11px] text-[#059669] font-medium absolute bottom-3.5 right-3.5">
              รายการ
            </span>
          </div>
        </div>

        {/* IV Site rows */}
        <div className="space-y-2.5 pt-1">
          {sites.map((site) => (
            <div
              key={site.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-2xs text-[13px]"
            >
              <div className="font-extrabold text-slate-900">{site.label} · {site.location}</div>
              <div className="text-[12.5px] text-slate-400 font-medium">
                {Math.floor(site.elapsed_hours)} / {site.duration_hours} ชั่วโมง · รอบ {site.next_round?.round_no ?? site.total_rounds} ·
                ตรวจทุก {site.interval_hours} ชั่วโมง
              </div>
            </div>
          ))}
        </div>

        {/* Checkbox Confirmation Row */}
        <label className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs cursor-pointer hover:bg-slate-50/50 transition-colors block select-none">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 accent-[#1E58E6] cursor-pointer shrink-0"
          />
          <span className="font-extrabold text-slate-900 text-[13px] sm:text-[13.5px]">
            ยืนยันว่าผู้ป่วยจำหน่ายกลับบ้าน และต้องสิ้นสุดการติดตามทุก IV Site
          </span>
        </label>

        {/* Light Blue Disclaimer Box */}
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-3.5 text-[#1E40AF] text-[12.5px] font-medium leading-relaxed">
          ชั่วโมงจะไม่ถูกปรับให้ครบระยะติดตาม และจะไม่มีการสร้างรอบถัดไปหลังบันทึก ประวัติ ภาพ ผล AI และ Grade ยังคงเรียกดูได้
        </div>

        {/* Modal Action Buttons Row */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-700">{error}</div>
        )}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[13.5px] rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleConfirm}
            disabled={!isChecked}
            className={`px-6 py-2.5 rounded-xl font-bold text-[13.5px] inline-flex items-center gap-2 shadow-xs transition-all ${
              isChecked
                ? 'bg-[#FF7A00] hover:bg-orange-600 text-white cursor-pointer active:scale-95'
                : 'bg-orange-300 text-white cursor-not-allowed opacity-80'
            }`}
          >
            <LogOut className="w-4 h-4 rotate-180" />
            <span>ยืนยันสิ้นสุดการติดตาม</span>
          </button>
        </div>
      </div>
    </div>
  );
};
