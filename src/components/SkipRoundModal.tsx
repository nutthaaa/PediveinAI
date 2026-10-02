import React, { useState } from 'react';
import { X, Flag, CheckCircle2, ChevronDown } from 'lucide-react';

interface SkipRoundModalProps {
  patientName?: string;
  hnAn?: string;
  ward?: string;
  room?: string;
  bed?: string;
  dueTime?: string;
  onClose: () => void;
  onConfirmSuccess?: () => void;
}

export const SkipRoundModal: React.FC<SkipRoundModalProps> = ({
  patientName = 'ชื่อ-นามสกุล-คนไข้',
  ward = 'PICU',
  room = 'ห้อง A-01',
  bed = 'เตียง C32',
  dueTime = '12:00 น.',
  onClose,
  onConfirmSuccess
}) => {
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isOpenDropdown, setIsOpenDropdown] = useState<boolean>(false);
  const [isChecked, setIsChecked] = useState<boolean>(false);
  const [isToastShown, setIsToastShown] = useState<boolean>(false);

  const options = [
    'ผู้ป่วยหลับ',
    'ผู้ป่วยร้องไห้ งอแง ไม่ให้ความร่วมมือ',
    'ผู้ปกครองปฏิเสธ',
    'อื่นๆ'
  ];

  const displayReason = reason === 'อื่นๆ' ? (customReason || 'อื่นๆ') : reason;

  const handleConfirm = () => {
    if (!isChecked) return;
    setIsToastShown(true);
    setTimeout(() => {
      if (onConfirmSuccess) onConfirmSuccess();
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      {/* Toast Notification */}
      {isToastShown && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-[14px] font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          <span>บันทึกการข้ามรอบตรวจเรียบร้อยแล้ว</span>
        </div>
      )}

      <div className="bg-white rounded-3xl max-w-[560px] w-full p-6 sm:p-7 space-y-5 shadow-2xl relative border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Close X Button */}
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
            บันทึกข้ามรอบตรวจ
          </h2>
          <p className="text-slate-500 text-[13px] font-medium mt-0.5">
            {patientName} · {ward} · {room} · {bed}
          </p>
        </div>

        {/* Reason Custom Dropdown Section (หมายเหตุ) */}
        <div className="space-y-1.5 relative">
          <label className="text-[13px] font-semibold text-slate-600 block">
            หมายเหตุ
          </label>
          
          <button
            type="button"
            onClick={() => setIsOpenDropdown(!isOpenDropdown)}
            className={`w-full bg-white border rounded-xl px-4 py-3 text-[14px] text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
              isOpenDropdown
                ? 'border-[#1E58E6] ring-2 ring-blue-500/20'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <span className={reason ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}>
              {reason || 'เลือกสาเหตุ'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                isOpenDropdown ? 'rotate-180 text-[#1E58E6]' : ''
              }`}
            />
          </button>

          {/* Dropdown Options Box */}
          {isOpenDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    setReason(opt);
                    setIsOpenDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-[14px] transition-colors cursor-pointer flex items-center justify-between ${
                    reason === opt
                      ? 'bg-blue-50/60 text-[#1E58E6] font-bold'
                      : 'text-slate-800 font-medium hover:bg-slate-50'
                  }`}
                >
                  <span>{opt}</span>
                  {reason === opt && <CheckCircle2 className="w-4 h-4 text-[#1E58E6]" />}
                </button>
              ))}
            </div>
          )}

          {/* Custom Reason Text Field if "อื่นๆ" selected */}
          {reason === 'อื่นๆ' && (
            <div className="pt-2">
              <input
                type="text"
                placeholder="ระบุสาเหตุอื่นๆ..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          )}
        </div>

        {/* Info Summary Box */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-2.5 text-[13.5px] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-normal">กำหนดตรวจ</span>
            <span className="font-bold text-slate-900">{dueTime}</span>
          </div>

          <div className="border-t border-slate-100" />

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-normal">เวลาที่บันทึกการข้ามรอบ</span>
            <span className="font-bold text-slate-900">10 ส.ค. 2569 · 12:05 น.</span>
          </div>

          <div className="border-t border-slate-100" />

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-normal">ผู้ดำเนินการ</span>
            <span className="font-bold text-slate-900">ชื่อ-นามสกุล-ผู้ดำเนินการ</span>
          </div>

          <div className="border-t border-slate-100" />

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-normal">เหตุผล</span>
            <span className="font-bold text-slate-900">{displayReason || '-'}</span>
          </div>

          <div className="border-t border-slate-100" />

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-normal">หอผู้ป่วย / เตียง</span>
            <span className="font-bold text-slate-900">
              {ward} / {room}
            </span>
          </div>
        </div>

        {/* Confirmation Checkbox Card */}
        <div
          onClick={() => setIsChecked(!isChecked)}
          className={`border rounded-2xl p-4 flex items-center gap-3 transition-colors cursor-pointer shadow-2xs ${
            isChecked ? 'bg-blue-50/40 border-[#1E58E6]' : 'bg-white border-slate-200'
          }`}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="w-5 h-5 rounded-md border-slate-300 text-[#1E58E6] focus:ring-blue-500 cursor-pointer shrink-0"
          />
          <span className="text-[14px] font-bold text-slate-900">
            ยืนยันการข้ามรอบตรวจ
          </span>
        </div>

        {/* Notice Info Banner Box (Blue) */}
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-3.5 text-[#1E58E6] text-[12.5px] font-medium leading-relaxed">
          รอบนี้จะไม่นับเป็นรอบตรวจที่ดำเนินการแล้ว ระยะติดตาม 168 ชั่วโมงจะไม่เริ่มนับใหม่ และกำหนดรอบถัดไปคงเดิม
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-[14px] transition-colors shadow-2xs cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleConfirm}
            disabled={!isChecked}
            className={`px-5 py-2.5 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all ${
              isChecked
                ? 'bg-[#1E58E6] hover:bg-blue-700 text-white shadow-xs cursor-pointer active:scale-95'
                : 'bg-slate-100 text-slate-400 border border-slate-200/80 cursor-not-allowed'
            }`}
          >
            <Flag className="w-4 h-4" />
            <span>ยืนยันการข้ามรอบตรวจ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
