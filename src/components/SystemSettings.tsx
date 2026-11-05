import React, { useEffect, useState } from 'react';
import {
  Lock,
  Bell,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../api/auth';
import type { SystemSettings as SettingsData } from '../api/types';

interface SystemSettingsProps {
  onNavigate?: (nav: string) => void;
}

export const SystemSettings: React.FC<SystemSettingsProps> = () => {
  // Notification Toggle States
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [notifyDueTime, setNotifyDueTime] = useState(true);
  const [notifySkipRound, setNotifySkipRound] = useState(true);
  const [notifyAiPending, setNotifyAiPending] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [allowManualQuality, setAllowManualQuality] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Save Toast State
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const applySettings = (value: SettingsData) => {
    setSettings(value);
    setNotifyDueTime(value.notify_overdue);
    setNotifySkipRound(value.notify_skipped_rounds);
    setNotifyAiPending(value.notify_ai_findings);
    setAiEnabled(value.ai_enabled);
    setAllowManualQuality(value.allow_manual_quality_review);
  };

  useEffect(() => {
    api.get<SettingsData>('/api/settings').then(applySettings).catch(() => undefined);
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      applySettings(
        await api.put<SettingsData>('/api/settings', {
          notify_overdue: notifyDueTime,
          notify_skipped_rounds: notifySkipRound,
          notify_ai_findings: notifyAiPending,
          ai_enabled: aiEnabled,
          allow_manual_quality_review: allowManualQuality
        })
      );
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'บันทึกการตั้งค่าไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* PAGE HEADER ROW                                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[13px] font-semibold text-[#1E58E6] tracking-tight">
            การตั้งค่าระบบ
          </span>
          <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900 tracking-tight mt-0.5">
            การตั้งค่า PediVeinCare AI
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            ค่าหลักถูกกำหนดตามขอบเขตแผนกเด็กและข้อกำหนดการติดตาม โดยระบบไม่สร้างแนวทางการดูแลทางคลินิกเพิ่มเติม
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving || !isAdmin}
          title={isAdmin ? undefined : 'เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขการตั้งค่าได้'}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-xl font-medium text-[13px] shadow-xs transition-all active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer disabled:opacity-75"
        >
          <Settings className={`w-4 h-4 text-white ${isSaving ? 'animate-spin' : ''}`} />
          <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
        </button>
      </div>

      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">{saveError}</div>
      )}

      {/* Save Success Alert Toast */}
      {isSaved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-[14px] font-semibold">
              บันทึกการตั้งค่าระบบเรียบร้อยแล้ว
            </span>
          </div>
          <span className="text-[12px] text-emerald-600 font-medium">เมื่อสักครู่</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2 COLUMNS GRID LAYOUT                                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ======================================================================= */}
        {/* LEFT COLUMN: ข้อกำหนดหลักของการติดตาม (7 Cols)                            */}
        {/* ======================================================================= */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden h-full flex flex-col justify-between">
            {/* Card Header */}
            <div className="p-5 border-b border-slate-100 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0 shadow-2xs">
                <Lock className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-slate-900 leading-snug">
                  ข้อกำหนดหลักของการติดตาม
                </h2>
                <p className="text-[13px] text-slate-400 font-normal mt-0.5">
                  ค่าที่กำหนดไว้และไม่สามารถแก้ไขได้
                </p>
              </div>
            </div>

            {/* Key-Value Rules List */}
            <div className="divide-y divide-slate-100 text-[13px]">
              {/* Row 1 */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                <span className="text-slate-500 font-normal shrink-0">หน่วยงาน</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">แผนกเด็กเท่านั้น</span>
                  <span className="px-2.5 py-0.5 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded-full text-[11px] font-semibold">
                    กำหนดไว้
                  </span>
                </div>
              </div>

              {/* Row 2 */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                <span className="text-slate-500 font-normal shrink-0">ระยะเวลาติดตาม</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{settings?.tracking_duration_hours ?? 168} ชั่วโมงต่อ IV Site</span>
                  <span className="px-2.5 py-0.5 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded-full text-[11px] font-semibold">
                    กำหนดไว้
                  </span>
                </div>
              </div>

              {/* Row 3 */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                <span className="text-slate-500 font-normal shrink-0">ช่วงเวลาระหว่างรอบตรวจ</span>
                <span className="font-semibold text-slate-900 text-right">
                  ใช้งานอยู่ทุก {settings?.default_interval_hours ?? 2} ชั่วโมง · ถอดแล้วทุก {settings?.post_removal_interval_hours ?? 8} ชั่วโมง
                </span>
              </div>

              <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                <span className="text-slate-500 font-normal shrink-0">เกณฑ์ถึงกำหนด / เกินกำหนด</span>
                <span className="font-semibold text-slate-900 text-right">
                  ถึงกำหนดก่อนเวลา {settings?.due_window_minutes ?? 15} นาที · เกินกำหนดหลัง {settings?.overdue_grace_minutes ?? 15} นาที
                </span>
              </div>

              {/* Row 4 */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                <span className="text-slate-500 font-normal shrink-0">การเปลี่ยนเข็ม</span>
                <span className="font-semibold text-slate-900 text-right">
                  เข็มใหม่เริ่มรอบที่ 1 ส่วนเข็มเดิมคงเวลาและรอบเดิมไว้
                </span>
              </div>

              {/* Row 5 */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                <span className="text-slate-500 font-normal shrink-0">การข้ามรอบเนื่องจากหมายเหตุต่างๆ</span>
                <span className="font-semibold text-slate-900 text-right">
                  ไม่เริ่มนับเวลาใหม่ และนับรอบถัดไปตามช่วงของ IV Site นั้น
                </span>
              </div>

              {/* Row 6 */}
              <div className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                <span className="text-slate-500 font-normal shrink-0">ข้อมูลที่บุคลากรบันทึก</span>
                <span className="font-semibold text-slate-900 text-right">
                  ระดับความรุนแรง (Grade1-4) แสดงเฉพาะผลที่แพทย์ยืนยันแล้ว
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: การแจ้งเตือนบุคลากรผู้รับผิดชอบ (5 Cols)                      */}
        {/* ======================================================================= */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden h-full flex flex-col">
            {/* Card Header */}
            <div className="p-5 border-b border-slate-100 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Bell className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-slate-900 leading-snug">
                  การแจ้งเตือนบุคลากรผู้รับผิดชอบ
                </h2>
                <p className="text-[13px] text-slate-400 font-normal mt-0.5">
                  กำหนดการแจ้งเตือนตามประเภทเหตุการณ์
                </p>
              </div>
            </div>

            {/* Toggle List */}
            <div className="divide-y divide-slate-100 text-[13px] p-2 flex-1">
              {/* Item 1 */}
              <div className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 text-[14px]">
                    ใกล้ถึงกำหนด / ถึงกำหนด / เกินกำหนด
                  </h3>
                  <p className="text-slate-400 font-normal text-[12px]">
                    แจ้งเตือนรอบตรวจทุก 2 ชั่วโมง หรือ 8 ชั่วโมง
                  </p>
                </div>
                {/* Toggle Button */}
                <button
                  onClick={() => setNotifyDueTime(!notifyDueTime)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
                    notifyDueTime ? 'bg-[#1E58E6]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      notifyDueTime ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Item 2 */}
              <div className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 text-[14px]">
                    ข้ามรอบตรวจ
                  </h3>
                  <p className="text-slate-400 font-normal text-[12px]">
                    แจ้งหัวหน้าเวรเมื่อมีการบันทึกข้ามรอบ
                  </p>
                </div>
                {/* Toggle Button */}
                <button
                  onClick={() => setNotifySkipRound(!notifySkipRound)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
                    notifySkipRound ? 'bg-[#1E58E6]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      notifySkipRound ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Item 3 */}
              <div className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 text-[14px]">
                    ผล AI รอการทบทวน
                  </h3>
                  <p className="text-slate-400 font-normal text-[12px]">
                    แยกตาม Infiltration และ Phlebitis
                  </p>
                </div>
                {/* Toggle Button */}
                <button
                  onClick={() => setNotifyAiPending(!notifyAiPending)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
                    notifyAiPending ? 'bg-[#1E58E6]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      notifyAiPending ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 text-[14px]">เปิดใช้งานการวิเคราะห์ภาพด้วย AI</h3>
                  <p className="text-slate-400 font-normal text-[12px]">ปิดเมื่อบริการ AI ขัดข้องหรืออยู่ระหว่างบำรุงรักษา</p>
                </div>
                <button
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
                    aiEnabled ? 'bg-[#1E58E6]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      aiEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                <div className="space-y-0.5 min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 text-[14px]">อนุญาตใช้ภาพที่ต้องตรวจสอบคุณภาพ</h3>
                  <p className="text-slate-400 font-normal text-[12px]">ให้เจ้าหน้าที่ยืนยันภาพที่ผลตรวจคุณภาพเป็น MANUAL_REVIEW แล้วส่ง AI ได้</p>
                </div>
                <button
                  onClick={() => setAllowManualQuality(!allowManualQuality)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer shrink-0 ${
                    allowManualQuality ? 'bg-[#1E58E6]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                      allowManualQuality ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM DISCLAIMER BANNER                                                  */}
      {/* ========================================================================= */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950">
        <svg width="44" height="44" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
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
          <p className="text-blue-700 mt-0.5">
            ผล AI ไม่ใช่การวินิจฉัย และทุกการบันทึกต้องได้รับการยืนยันโดยเจ้าหน้าที่
          </p>
        </div>
      </div>
    </div>
  );
};
