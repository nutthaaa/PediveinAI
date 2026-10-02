import React, { useState } from 'react';
import { X, Search, User, Check, Bell, CheckCircle2 } from 'lucide-react';

interface ReviewerOption {
  id: string;
  name: string;
  role: string;
}

const mockReviewers: ReviewerOption[] = [
  {
    id: 'rev-1',
    name: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
    role: 'พยาบาลวิชาชีพ แผนกเด็ก'
  },
  {
    id: 'rev-2',
    name: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
    role: 'หัวหน้าพยาบาลวิชาชีพ แผนกเด็ก'
  },
  {
    id: 'rev-3',
    name: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
    role: 'เจ้าหน้าที่ IV'
  },
  {
    id: 'rev-4',
    name: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
    role: 'เจ้าหน้าที่ IV'
  }
];

interface AssignReviewerModalProps {
  onClose: () => void;
  onConfirmSuccess?: (reviewerName: string) => void;
}

export const AssignReviewerModal: React.FC<AssignReviewerModalProps> = ({
  onClose,
  onConfirmSuccess
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string>('rev-1');
  const [showToast, setShowToast] = useState<boolean>(false);

  const filteredReviewers = mockReviewers.filter(
    (rev) =>
      rev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rev.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rev.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConfirmSubmit = () => {
    const selected = mockReviewers.find((r) => r.id === selectedId);
    setShowToast(true);

    setTimeout(() => {
      if (onConfirmSuccess && selected) {
        onConfirmSuccess(selected.name);
      }
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      {/* Toast Notification Banner */}
      {showToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-[14px] font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          <span>ส่งมอบการทบทวนให้บุคลากรเรียบร้อยแล้ว</span>
        </div>
      )}

      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-100 animate-scaleUp max-h-[92vh] overflow-y-auto">
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">
            PEDIVEINCARE AI
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            มอบหมายผู้รับผิดชอบทบทวน
          </h2>
          <p className="text-slate-500 text-[13px] font-medium">
            มอบหมายผู้รับผิดชอบทบทวนผลการวิเคราะห์ด้วย AI
          </p>
        </div>

        {/* Main Instruction Subtitle */}
        <p className="text-[13px] text-slate-500 font-normal leading-relaxed">
          เลือกบุคลากรผู้รับผิดชอบทบทวนผลการวิเคราะห์ด้วย AI ระบบจะบันทึกผู้มอบหมายและเวลาไว้สำหรับการตรวจสอบย้อนหลัง
        </p>

        {/* Search Bar Input */}
        <div className="relative">
          <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา ID เจ้าหน้าที่ / ชื่อเจ้าหน้าที่"
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-[13.5px] text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-[#1E58E6] focus:ring-2 focus:ring-blue-500/10 transition-all shadow-2xs"
          />
        </div>

        {/* Reviewer Cards Selection List */}
        <div className="space-y-3 pt-1">
          {filteredReviewers.map((rev) => {
            const isSelected = selectedId === rev.id;
            return (
              <div
                key={rev.id}
                onClick={() => setSelectedId(rev.id)}
                className={`rounded-2xl p-4 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  isSelected
                    ? 'border-2 border-[#1E58E6] bg-blue-50/20 shadow-2xs'
                    : 'border border-slate-200/90 bg-white hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-2xs transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-[#1E58E6]'
                        : 'bg-blue-50 text-[#1E58E6]'
                    }`}
                  >
                    <User className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-slate-900 leading-snug">
                      {rev.name}
                    </h4>
                    <p className="text-[12px] text-slate-400 font-medium mt-0.5">
                      {rev.role}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  <Check
                    className={`w-5 h-5 transition-colors ${
                      isSelected ? 'text-[#1E58E6] stroke-[2.5]' : 'text-slate-300'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[14px] rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            onClick={handleConfirmSubmit}
            className="px-6 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white font-bold text-[14px] rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
          >
            <Bell className="w-4 h-4 fill-white/20" />
            <span>ส่งมอบการทบทวน</span>
          </button>
        </div>
      </div>
    </div>
  );
};
