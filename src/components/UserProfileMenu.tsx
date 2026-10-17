import React, { useEffect, useRef, useState } from 'react';
import { ChevronUp, LogOut, User } from 'lucide-react';

interface UserProfileMenuProps {
  name?: string;
  role?: string;
  avatarSrc?: string;
  onLogout?: () => void;
}

/**
 * Sidebar profile button. Clicking it toggles a small dropdown (opening upward)
 * that contains the logout action.
 */
export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  name = 'ชื่อเจ้าหน้าที่-นามสกุล',
  role = 'NICU Nurse',
  avatarSrc = '/image 9.png',
  onLogout,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative pt-1">
      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 mb-2 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-1 duration-150"
        >
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2.5">
            <User className="w-4 h-4 text-slate-400" />
            <div className="min-w-0">
              <div className="text-[13px] font-bold truncate">{name}</div>
              <div className="text-[11px] text-slate-500">{role}</div>
            </div>
          </div>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 p-1.5 -m-1.5 rounded-xl transition-colors cursor-pointer text-left ${
          open ? 'bg-white/10' : 'hover:bg-white/5'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-full bg-slate-700 ring-2 ring-blue-500/40 overflow-hidden">
            <img src={avatarSrc} alt="Nurse Profile" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col text-[12px] min-w-0">
            <span className="font-bold text-white leading-tight truncate">{name}</span>
            <span className="text-slate-400 text-[11px]">{role}</span>
          </div>
        </div>
        <ChevronUp
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${open ? '' : 'rotate-180'}`}
        />
      </button>
    </div>
  );
};
