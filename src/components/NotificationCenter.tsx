import React, { useState } from 'react';
import {
  Bell,
  Clock,
  AlertTriangle,
  Sparkles,
  Wifi,
  Check,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

interface NotificationCenterProps {
  onMarkAllAsRead?: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  onMarkAllAsRead
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
      iconBg: 'bg-[#FFF7ED] text-[#EA580C]',
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
      iconBg: 'bg-[#FEF2F2] text-[#DC2626]',
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
      iconBg: 'bg-[#F3E8FF] text-[#9333EA]',
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
      iconBg: 'bg-[#E6F4EA] text-[#10B981]',
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
      iconBg: 'bg-[#EAF2FF] text-[#2563EB]',
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
    <div className="space-y-6">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[12px] font-bold text-blue-600 tracking-wide uppercase">
            ศูนย์การแจ้งเตือน
          </span>
          <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight mt-0.5">
            การแจ้งเตือนและรายการที่ต้องรับทราบ
          </h1>
          <p className="text-slate-500 text-[13px] mt-1">
            แยกตามกำหนดตรวจ ผลการวิเคราะห์ด้วย AI และสถานะระบบ เพื่อให้ระดับความเร่งด่วนชัดเจน
          </p>
        </div>

        <button
          onClick={onMarkAllAsRead}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-medium text-[13px] shadow-2xs flex items-center gap-2 transition-all active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 text-slate-600" />
          <span>รับทราบทั้งหมด</span>
        </button>
      </div>

      {/* Main Content White Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="p-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('due')}
            className={`px-4 py-2 rounded-xl text-[13px] flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'due'
                ? 'bg-[#1E58E6] text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <span>กำหนดตรวจ</span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
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
            className={`px-4 py-2 rounded-xl text-[13px] flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-[#1E58E6] text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <span>ผล AI รอการทบทวน</span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
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
            className={`px-4 py-2 rounded-xl text-[13px] flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'system'
                ? 'bg-[#1E58E6] text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
            }`}
          >
            <span>ระบบและ HIS</span>
            <span
              className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                activeTab === 'system'
                  ? 'bg-white text-[#1E58E6]'
                  : 'bg-slate-200/80 text-slate-600'
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
                className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  isRead ? 'bg-slate-50/40 opacity-75' : 'hover:bg-slate-50/60'
                }`}
              >
                {/* Left Side: Icon & Titles */}
                <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${item.iconBg}`}
                  >
                    <IconComponent className="w-5.5 h-5.5 stroke-[2.2]" />
                  </div>

                  <div className="min-w-0 flex-1">
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
                    <p className="text-[12px] text-slate-500 font-medium mt-1">
                      {item.subtitle}
                    </p>
                    <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                      {item.datetime}
                    </p>
                  </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    onClick={() => toggleRead(item.id)}
                    className={`px-3.5 py-1.5 border rounded-xl text-[13px] font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                      isRead
                        ? 'bg-slate-100 border-slate-200 text-slate-500'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isRead ? 'รับทราบแล้ว' : 'อ่านแล้ว'}</span>
                  </button>

                  <button className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center shadow-2xs cursor-pointer transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
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
