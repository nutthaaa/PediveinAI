import React, { useState } from 'react';
import {
  Bell,
  Clock,
  AlertTriangle,
  Sparkles,
  Wifi,
  Check,
  CheckCircle2,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

interface NotificationCenterProps {
  onMarkAllAsRead?: () => void;
  onBack?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onMarkAllAsRead,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'due' | 'ai' | 'system'>('due');
  const [readItems, setReadItems] = useState<Record<string, boolean>>({});

  const toggleRead = (id: string) => {
    setReadItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const notificationItems = [
    {
      id: '1',
      tab: 'due',
      type: 'due_clock',
      title: 'ถึงกำหนดตรวจ IV Site',
      isNew: true,
      subtitle: 'ชื่อ-นามสกุลคนไข้ • Pediatric 1 / A02 • รอบ 14 / 48 • 14:00 น.',
      datetime: '10 ส.ค. 2569 • 14:02 น.',
      iconBg: 'bg-amber-100/90 text-amber-600 border border-amber-200/60',
      IconComponent: Clock
    },
    {
      id: '2',
      tab: 'due',
      type: 'overdue_alert',
      title: 'เกินกำหนดตรวจ 18 นาที',
      isNew: true,
      subtitle: 'ชื่อ-นามสกุลคนไข้ • PICU / B04 • รอบ 16 / 48',
      datetime: '10 ส.ค. 2569 • 14:02 น.',
      iconBg: 'bg-rose-100/90 text-rose-600 border border-rose-200/60',
      IconComponent: AlertTriangle
    },
    {
      id: '3',
      tab: 'ai',
      type: 'ai_review',
      title: 'ผล AI สำหรับ Phlebitis รอการทบทวน',
      isNew: true,
      subtitle: 'ชื่อ-นามสกุลคนไข้ • Pediatric 1 / A02',
      datetime: '10 ส.ค. 2569 • 14:00 น.',
      iconBg: 'bg-purple-100/90 text-purple-600 border border-purple-200/60',
      IconComponent: Sparkles
    },
    {
      id: '4',
      tab: 'system',
      type: 'his_status',
      title: 'HIS เชื่อมต่อปกติ',
      isNew: false,
      subtitle: 'ปรับปรุงข้อมูลผู้ป่วยเด็กสำเร็จ 128 รายการ • ไม่พบ HN ซ้ำ',
      datetime: '10 ส.ค. 2569 • 05:30 น.',
      iconBg: 'bg-emerald-100/90 text-emerald-600 border border-emerald-200/60',
      IconComponent: Wifi
    },
    {
      id: '5',
      tab: 'system',
      type: 'system_info',
      title: 'ระบบสำรองข้อมูลอัตโนมัติสำเร็จ',
      isNew: false,
      subtitle: 'บันทึกประวัติภาพรวม 96 ชั่วโมงประจำวันเรียบร้อยแล้ว',
      datetime: '10 ส.ค. 2569 • 04:00 น.',
      iconBg: 'bg-blue-100/90 text-blue-600 border border-blue-200/60',
      IconComponent: Bell
    }
  ];

  const filteredNotifications = notificationItems.filter(
    (item) => item.tab === activeTab
  );

  const dueCount = notificationItems.filter((i) => i.tab === 'due').length;
  const aiCount = notificationItems.filter((i) => i.tab === 'ai').length;
  const systemCount = notificationItems.filter((i) => i.tab === 'system').length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16 animate-fadeIn">
      {/* Back Navigation Link */}
      {onBack && (
        <button
          onClick={onBack}
          className="text-[#1E58E6] font-bold text-[14px] hover:underline inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>ย้อนกลับ</span>
        </button>
      )}

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#012351] tracking-tight">
        ศูนย์การแจ้งเตือน
      </h1>

      {/* Tabs Row */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-100 pb-2">
          <button
            onClick={() => setActiveTab('due')}
            className={`px-4 py-2 rounded-xl text-[13.5px] font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'due'
                ? 'bg-[#1E58E6] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>กำหนดตรวจ</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center leading-none ${
                activeTab === 'due'
                  ? 'bg-white text-[#1E58E6]'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {dueCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 rounded-xl text-[13.5px] font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ai'
                ? 'bg-[#1E58E6] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>ผล AI รอการทบทวน</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center leading-none ${
                activeTab === 'ai'
                  ? 'bg-white text-[#1E58E6]'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {aiCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-xl text-[13.5px] font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-[#1E58E6] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>ระบบและ HIS</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center leading-none ${
                activeTab === 'system'
                  ? 'bg-white text-[#1E58E6]'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {systemCount}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content White Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Notifications List */}
        <div className="divide-y divide-slate-100">
          {filteredNotifications.map((item) => {
            const isRead = readItems[item.id];
            const IconComponent = item.IconComponent;

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 flex items-start gap-3.5 transition-colors ${
                  isRead ? 'bg-slate-50/40 opacity-70' : 'hover:bg-slate-50/60'
                }`}
              >
                {/* Circular Icon */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.iconBg}`}
                >
                  <IconComponent className="w-5 h-5 stroke-[2.2]" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[14.5px] sm:text-[15.5px] font-extrabold text-slate-900 leading-snug">
                      {item.title}
                    </h3>
                    {item.isNew && !isRead && (
                      <span className="bg-[#1E58E6] text-white text-[10.5px] font-extrabold px-2 py-0.5 rounded-full leading-none shadow-2xs">
                        ใหม่
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] sm:text-[13px] text-slate-500 font-medium leading-relaxed">
                    {item.subtitle}
                  </p>
                  <p className="text-[11.5px] text-slate-400 font-normal">
                    {item.datetime}
                  </p>
                </div>
              </div>
            );
          })}

          {filteredNotifications.length === 0 && (
            <div className="p-12 text-center text-slate-400 text-[14px]">
              ไม่มีการแจ้งเตือนในหมวดหมู่นี้
            </div>
          )}
        </div>
      </div>

      {/* Full Width Action Button below list */}
      <button
        onClick={onMarkAllAsRead}
        className="w-full py-3 bg-white border border-slate-200/90 hover:bg-slate-50 text-slate-800 font-bold text-[14px] rounded-2xl shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
      >
        <CheckCircle2 className="w-4.5 h-4.5 text-slate-600 stroke-[2.2]" />
        <span>รับทราบทั้งหมด</span>
      </button>

      {/* Bottom Disclaimer Banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950 mt-6">
        <svg
          width="64"
          height="64"
          viewBox="0 0 46 46"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
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
