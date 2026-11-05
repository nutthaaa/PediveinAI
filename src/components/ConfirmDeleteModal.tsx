import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { api, ApiError } from '../api/client';

interface ConfirmDeleteModalProps {
  title: string;
  /** What is about to be deleted, shown as rows. */
  details: { label: string; value: string }[];
  /** POST endpoint that takes ``{ reason }``. */
  endpoint: string;
  /** Text the user must type to enable the delete button (e.g. the HN). */
  confirmText: string;
  onClose: () => void;
  onDeleted: () => void;
}

/** Permanent deletion with a required reason; the backend records it in the audit log. */
export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  title,
  details,
  endpoint,
  confirmText,
  onClose,
  onDeleted
}) => {
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const ready = reason.trim().length > 0 && typed.trim() === confirmText && !deleting;

  const confirm = async () => {
    if (!ready) return;
    setDeleting(true);
    setError(null);
    try {
      await api.post(endpoint, { reason: reason.trim() });
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ลบไม่สำเร็จ');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-[520px] w-full max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="pr-10">
          <span className="text-[11px] font-bold text-red-600 tracking-wider uppercase block">ลบถาวร</span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">{title}</h2>
        </div>

        <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 text-[13.5px]">
          {details.map((row) => (
            <div key={row.label} className="p-3.5 flex justify-between gap-3">
              <span className="text-slate-400">{row.label}</span>
              <span className="font-bold text-slate-900 text-right break-all">{row.value}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700 flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>ข้อมูลและไฟล์ภาพจะถูกลบออกจากระบบทันทีและกู้คืนไม่ได้ ระบบบันทึกเพียงว่าใครลบอะไรและเพราะอะไรไว้ใน audit log</span>
        </div>

        <label className="block space-y-1.5 text-[13px]">
          <span className="font-semibold text-slate-700">เหตุผลที่ลบ *</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="เช่น ลงทะเบียนซ้ำ ถ่ายภาพผิดคน เคสทดสอบ"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-red-400"
          />
        </label>
        <label className="block space-y-1.5 text-[13px]">
          <span className="font-semibold text-slate-700">
            พิมพ์ <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{confirmText}</span> เพื่อยืนยัน
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-red-400"
          />
        </label>

        {error && <div className="text-[13px] text-red-600">{error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium cursor-pointer">
            ยกเลิก
          </button>
          <button
            onClick={confirm}
            disabled={!ready}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'กำลังลบ...' : 'ลบถาวร'}
          </button>
        </div>
      </div>
    </div>
  );
};
