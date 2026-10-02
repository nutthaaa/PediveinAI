import React, { useState } from 'react';
import { X, Info, CheckCircle2, ArrowLeft } from 'lucide-react';

interface SelectedPatientItem {
  id: string;
  name: string;
  hnAn: string;
  room: string;
  bed?: string;
}

interface CreateTrackingGroupModalProps {
  selectedPatients?: SelectedPatientItem[];
  onClose: (action?: string) => void;
  onConfirmSuccess?: () => void;
}

export const CreateTrackingGroupModal: React.FC<CreateTrackingGroupModalProps> = ({
  selectedPatients = [
    {
      id: '1',
      name: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890',
      room: 'PICU ห้อง 901'
    },
    {
      id: '2',
      name: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890',
      room: 'PICU ห้อง 902'
    },
    {
      id: '3',
      name: 'ชื่อ-นามสกุลคนไข้',
      hnAn: 'HN34567890',
      room: 'PICU ห้อง 903'
    }
  ],
  onClose,
  onConfirmSuccess
}) => {
  const [isToastShown, setIsToastShown] = useState(false);

  const handleConfirm = () => {
    setIsToastShown(true);
    setTimeout(() => {
      if (onConfirmSuccess) onConfirmSuccess();
      onClose('confirm_created_group');
    }, 1000);
  };

  const count = selectedPatients.length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      {/* Toast Notification */}
      {isToastShown && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-60 bg-emerald-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-[14px] font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
          <span>สร้างกลุ่มผู้ป่วยติดตามเรียบร้อยแล้ว</span>
        </div>
      )}

      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Close X Button */}
        <button
          onClick={() => onClose('show_ai_result')}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <span className="text-[12px] font-bold text-blue-600 tracking-wider uppercase block">
            PEDIVEINCARE AI
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            ยืนยันการเพิ่มผู้ป่วยเข้ากลุ่มติดตาม
          </h2>
          <p className="text-slate-500 text-[13px] mt-1 leading-relaxed">
            ระบบจะนำผู้ป่วยที่เลือกเข้าสู่กลุ่มติดตามที่กำหนดเพื่อให้ทีมสามารถติดตามและจัดการข้อมูลได้อย่างเป็นระบบ
          </p>
        </div>

        {/* Selected Patients Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-slate-900">ผู้ป่วยที่เลือก</h3>
            <span className="text-[13px] font-medium text-slate-500">{count} ราย</span>
          </div>

          {/* Patient Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {selectedPatients.map((patient) => (
              <div
                key={patient.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs"
              >
                <div>
                  <div className="font-bold text-slate-900 text-[14px]">{patient.name}</div>
                  <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                    {patient.hnAn.split('·')[0].trim()}
                  </div>
                </div>

                <div className="bg-[#2D3748] text-white px-3.5 py-1 rounded-full text-[12px] font-semibold shrink-0 ml-2">
                  {patient.room}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Group Info Details Box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-slate-500 font-medium">ชื่อกลุ่ม:</span>
            <span className="text-slate-900 font-bold">ผู้ป่วยที่ต้องติดตามใกล้ชิด</span>
          </div>

          <div className="border-t border-slate-100" />

          <div className="flex items-center justify-between text-[14px]">
            <span className="text-slate-500 font-medium">จำนวนผู้ป่วยที่เลือก:</span>
            <span className="text-slate-900 font-bold">{count} ราย</span>
          </div>

          <div className="border-t border-slate-100" />

          <div className="flex items-center justify-between text-[14px]">
            <span className="text-slate-500 font-medium">ผู้รับผิดชอบ:</span>
            <span className="text-slate-900 font-bold">ชื่อ-นามสกุล เจ้าหน้าที่</span>
          </div>
        </div>

        {/* Notice Info Banner */}
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-3.5 flex items-center gap-3 text-[#1E58E6] text-[13px] font-medium">
          <div className="w-5 h-5 rounded-full bg-[#1E58E6] text-white flex items-center justify-center shrink-0 font-bold text-[11px]">
            i
          </div>
          <span>หลังยืนยัน ผู้ป่วยจะถูกเพิ่มเข้าสู่กลุ่มติดตามทันที</span>
        </div>

        {/* Footer Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-[14px] flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>ย้อนกลับ</span>
          </button>

          <button
            onClick={handleConfirm}
            className="px-6 py-3 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-2xl font-bold text-[14px] flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            <span>ยืนยันการสร้างกลุ่มติดตาม</span>
          </button>
        </div>
      </div>
    </div>
  );
};
