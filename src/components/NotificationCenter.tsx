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
  onNavigate?: (nav: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onMarkAllAsRead,
  onBack,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'due' | 'ai' | 'system'>('due');
  const [readItems, setReadItems] = useState<Record<string, boolean>>({});

  const toggleRead = (id: string) => {
    setReadItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMarkAllRead = () => {
    const allRead: Record<string, boolean> = {};
    notificationItems.forEach((item) => {
      allRead[item.id] = true;
    });
    setReadItems(allRead);
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    }
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
      iconBg: 'bg-amber-50 text-amber-500',
      IconComponent: Clock,
      navTarget: 'rounds'
    },
    {
      id: '2',
      tab: 'due',
      type: 'overdue_alert',
      title: 'เกินกำหนดตรวจ 18 นาที',
      isNew: true,
      subtitle: 'ชื่อ-นามสกุลคนไข้ • PICU / B04 • รอบ 16 / 48',
      datetime: '10 ส.ค. 2569 • 14:02 น.',
      iconBg: 'bg-red-50 text-red-500',
      IconComponent: AlertTriangle,
      navTarget: 'rounds'
    },
    {
      id: '3',
      tab: 'ai',
      type: 'ai_review',
      title: 'ผล AI สำหรับ Phlebitis รอการทบทวน',
      isNew: true,
      subtitle: 'ชื่อ-นามสกุลคนไข้ • Pediatric 1 / A02',
      datetime: '10 ส.ค. 2569 • 14:00 น.',
      iconBg: 'bg-purple-50 text-purple-500',
      IconComponent: Sparkles,
      navTarget: 'ai_review'
    },
    {
      id: '4',
      tab: 'system',
      type: 'his_status',
      title: 'HIS เชื่อมต่อปกติ',
      isNew: false,
      subtitle: 'ปรับปรุงข้อมูลผู้ป่วยเด็กสำเร็จ 128 รายการ • ไม่พบ HN ซ้ำ',
      datetime: '10 ส.ค. 2569 • 05:30 น.',
      iconBg: 'bg-emerald-50 text-emerald-500',
      IconComponent: Wifi,
      navTarget: 'his'
    },
    {
      id: '5',
      tab: 'system',
      type: 'system_info',
      title: 'ระบบสำรองข้อมูลอัตโนมัติสำเร็จ',
      isNew: false,
      subtitle: 'บันทึกประวัติภาพรวม 96 ชั่วโมงประจำวันเรียบร้อยแล้ว',
      datetime: '10 ส.ค. 2569 • 04:00 น.',
      iconBg: 'bg-blue-50 text-blue-500',
      IconComponent: Bell,
      navTarget: 'settings'
    }
  ];

  const filteredNotifications = notificationItems.filter(
    (item) => item.tab === activeTab
  );

  const dueCount = notificationItems.filter((i) => i.tab === 'due').length;
  const aiCount = notificationItems.filter((i) => i.tab === 'ai').length;
  const systemCount = notificationItems.filter((i) => i.tab === 'system').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 animate-fadeIn">
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

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[13px] font-bold text-blue-600 tracking-wide">
            ศูนย์การแจ้งเตือน
          </span>
          <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight mt-0.5">
            การแจ้งเตือนและรายการที่ต้องรับทราบ
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 leading-normal">
            แยกตามกำหนดตรวจ ผลการวิเคราะห์ด้วย AI และสถานะระบบ เพื่อให้ระดับความเร่งด่วนชัดเจน
          </p>
        </div>

        <button
          onClick={handleMarkAllRead}
          className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-[13px] font-medium flex items-center gap-2 shadow-2xs transition-colors shrink-0 self-start sm:self-center cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 text-slate-500 stroke-[2]" />
          <span>รับทราบทั้งหมด</span>
        </button>
      </div>

      {/* Main Content White Container */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
        {/* Filter Tabs Row */}
        <div className="flex items-center gap-2 pb-5 border-b border-slate-100 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('due')}
            className={`px-4 py-2 rounded-xl text-[13.5px] font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'due'
                ? 'bg-[#1E58E6] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>กำหนดตรวจ</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center leading-none ${
                activeTab === 'due'
                  ? 'bg-white text-[#1E58E6]'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {dueCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 rounded-xl text-[13.5px] font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ai'
                ? 'bg-[#1E58E6] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>ผล AI รอการทบทวน</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center leading-none ${
                activeTab === 'ai'
                  ? 'bg-white text-[#1E58E6]'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {aiCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-xl text-[13.5px] font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-[#1E58E6] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>ระบบและ HIS</span>
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center leading-none ${
                activeTab === 'system'
                  ? 'bg-white text-[#1E58E6]'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {systemCount}
            </span>
          </button>
        </div>

        {/* Notifications List */}
        <div className="divide-y divide-slate-100">
          {filteredNotifications.map((item) => {
            const isRead = readItems[item.id];
            const IconComponent = item.IconComponent;

            return (
              <div
                key={item.id}
                className={`py-4.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 transition-colors ${
                  isRead ? 'opacity-60' : ''
                }`}
              >
                {/* Left: Icon + Text Content */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.iconBg}`}
                  >
                    <IconComponent className="w-5 h-5 stroke-[2.2]" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>
                      {item.isNew && !isRead && (
                        <span className="bg-[#1E58E6] text-white text-[11px] font-bold px-2 py-0.5 rounded-full leading-none">
                          ใหม่
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-slate-500 font-normal leading-normal truncate">
                      {item.subtitle}
                    </p>
                    <p className="text-[12px] text-slate-400 font-normal">
                      {item.datetime}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleRead(item.id)}
                    className={`border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isRead
                        ? 'bg-slate-50 text-slate-400 hover:text-slate-600'
                        : 'bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>อ่านแล้ว</span>
                  </button>
                  <button
                    onClick={() => onNavigate && onNavigate(item.navTarget)}
                    className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg p-1.5 transition-colors cursor-pointer flex items-center justify-center"
                    title="ดูรายละเอียด"
                  >
                    <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredNotifications.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-[14px]">
              ไม่มีการแจ้งเตือนในหมวดหมู่นี้
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
