import React, { useState } from 'react';
import {
  Search,
  Eye,
  Filter,
  X,
  Clock,
  User,
  Activity,
  Sparkles,
  ShieldCheck,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AuditItem {
  id: string;
  time: string;
  date: string;
  operator: string;
  event: string;
  eventType: 'skip' | 'ai' | 'photo' | 'permission' | 'complete' | 'start';
  category: 'schedule' | 'ai' | 'permission';
  target: string;
  details?: string;
  ipAddress?: string;
}

interface AuditLogProps {
  onNavigate?: (nav: string) => void;
}

export const AuditLog: React.FC<AuditLogProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'schedule' | 'ai' | 'permission'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAudit, setSelectedAudit] = useState<AuditItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const auditLogs: AuditItem[] = [
    {
      id: 'LOG-9042',
      time: '14:05 น.',
      date: '9 ส.ค. 2569',
      operator: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
      event: 'ข้ามรอบตรวจ: ผู้ป่วยหลับ',
      eventType: 'skip',
      category: 'schedule',
      target: 'HN56789012 · รอบ 14:00 น.',
      details: 'บันทึกข้ามการตรวจในรอบ 14:00 น. เนื่องจากผู้ป่วยกำลังนอนหลับพักผ่อน ตามแนวทางปฏิบัติแผนกเด็ก',
      ipAddress: '10.240.12.85'
    },
    {
      id: 'LOG-9041',
      time: '14:03 น.',
      date: '9 ส.ค. 2569',
      operator: 'บริการ AI',
      event: 'วิเคราะห์ภาพ',
      eventType: 'ai',
      category: 'ai',
      target: 'Infiltration 96% · Phlebitis 94%',
      details: 'ประมวลผลการวิเคราะห์ภาพถ่าย IV Site ด้วยโมเดล PediVein AI v1.0 พบความเสี่ยง Infiltration 96% และ Phlebitis 94%',
      ipAddress: '10.240.0.12 (Internal AI Server)'
    },
    {
      id: 'LOG-9040',
      time: '14:02 น.',
      date: '9 ส.ค. 2569',
      operator: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
      event: 'บันทึกภาพ IV Site',
      eventType: 'photo',
      category: 'schedule',
      target: 'HN12345678 · รอบ 14 / 48',
      details: 'อัปโหลดภาพถ่ายตำแหน่ง IV Site หลังมือขวา ผู้ป่วย HN12345678 สำหรับรอบตรวจที่ 14',
      ipAddress: '10.240.12.85'
    },
    {
      id: 'LOG-9039',
      time: '13:45 น.',
      date: '9 ส.ค. 2569',
      operator: 'ชื่อ-นามสกุล-เจ้าหน้าที่ดูแลระบบ',
      event: 'แก้ไขสิทธิ์ผู้ใช้งาน',
      eventType: 'permission',
      category: 'permission',
      target: 'EMP-0428 · พยาบาลวิชาชีพ แผนกเด็ก',
      details: 'ปรับปรุงขอบเขตสิทธิ์การเข้าถึงข้อมูลผู้ป่วยเฉพาะหอผู้ป่วยเด็ก (NICU/PICU) ให้แก่พนักงาน EMP-0428',
      ipAddress: '10.240.10.11'
    },
    {
      id: 'LOG-9038',
      time: '12:00 น.',
      date: '9 ส.ค. 2569',
      operator: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
      event: 'ยืนยันผลการประมวลผล AI',
      eventType: 'ai',
      category: 'ai',
      target: 'HN56789012 · ยืนยันผลปกติ',
      details: 'เจ้าหน้าที่ยืนยันผลตรวจภาพถ่าย IV Site ไม่พบอาการแทรกซ้อนตรงตามการคาดการณ์ของระบบ',
      ipAddress: '10.240.12.86'
    },
    {
      id: 'LOG-9037',
      time: '10:15 น.',
      date: '9 ส.ค. 2569',
      operator: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
      event: 'เริ่มต้นระยะติดตาม 96 ชม.',
      eventType: 'start',
      category: 'schedule',
      target: 'HN98765432 · หอผู้ป่วย PICU',
      details: 'เปิดการติดตาม IV Site ผู้ป่วยเด็กรายใหม่ พร้อมถ่ายภาพอ้างอิงเริ่มต้น (Baseline Image)',
      ipAddress: '10.240.12.85'
    },
    {
      id: 'LOG-9036',
      time: '08:30 น.',
      date: '9 ส.ค. 2569',
      operator: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
      event: 'ปิดการติดตามครบกำหนด',
      eventType: 'complete',
      category: 'schedule',
      target: 'HN34567890 · ครบ 48 รอบ (96 ชม.)',
      details: 'สรุปผลรายงานติดตามครบ 96 ชั่วโมง ไร้อาการแทรกซ้อน ถอดสาย IV เรียบร้อย',
      ipAddress: '10.240.12.88'
    }
  ];

  const filteredLogs = auditLogs.filter((log) => {
    if (activeTab !== 'all' && log.category !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.operator.toLowerCase().includes(q) ||
        log.event.toLowerCase().includes(q) ||
        log.target.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getEventBadge = (type: AuditItem['eventType'], eventText: string) => {
    switch (type) {
      case 'skip':
        return (
          <span className="inline-flex items-center px-3 py-1 bg-[#E8F0FE] text-[#1D61E8] border border-[#C2D7FF] rounded-full text-[12px] font-medium">
            {eventText}
          </span>
        );
      case 'ai':
        return (
          <span className="inline-flex items-center px-3 py-1 bg-[#F3E8FF] text-[#9333EA] border border-[#E9D5FF] rounded-full text-[12px] font-medium">
            {eventText}
          </span>
        );
      case 'photo':
        return (
          <span className="inline-flex items-center px-3 py-1 bg-[#E0F2FE] text-[#0284C7] border border-[#BAE6FD] rounded-full text-[12px] font-medium">
            {eventText}
          </span>
        );
      case 'permission':
        return (
          <span className="inline-flex items-center px-3 py-1 bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] rounded-full text-[12px] font-medium">
            {eventText}
          </span>
        );
      case 'complete':
        return (
          <span className="inline-flex items-center px-3 py-1 bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] rounded-full text-[12px] font-medium">
            {eventText}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] rounded-full text-[12px] font-medium">
            {eventText}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* PAGE HEADER ROW                                                           */}
      {/* ========================================================================= */}
      <div>
        <span className="text-[13px] font-semibold text-[#1E58E6] tracking-tight">
          การตรวจสอบย้อนหลังและความสามารถในการสืบค้น
        </span>
        <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900 tracking-tight mt-0.5">
          บันทึกตรวจสอบย้อนหลัง
        </h1>
        <p className="text-[13px] text-slate-500 mt-1">
          บันทึกผู้ดำเนินการ เวลาตามกำหนด เวลาที่ดำเนินการจริง การบันทึกภาพ การวิเคราะห์ด้วย AI การข้ามรอบ การแก้ไขข้อมูล และการปิดการติดตาม
        </p>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER CARD                                                       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Controls Row: Search Input (Left) & Filter Tabs (Right) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ / ผู้ดำเนินการ / เหตุการณ์"
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar self-start md:self-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#1E58E6] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'schedule'
                  ? 'bg-[#1E58E6] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              ทางการนัดตรวจ
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-[#1E58E6] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              วิเคราะห์ด้วย AI
            </button>
            <button
              onClick={() => setActiveTab('permission')}
              className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                activeTab === 'permission'
                  ? 'bg-[#1E58E6] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              สิทธิ์การเข้าถึง
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[12px] font-semibold text-slate-500 uppercase tracking-wide">
                <th className="py-3.5 px-5 w-44">วันและเวลา</th>
                <th className="py-3.5 px-5 w-60">ผู้ดำเนินการ</th>
                <th className="py-3.5 px-5 w-64">เหตุการณ์</th>
                <th className="py-3.5 px-5">เป้าหมาย / ผลลัพธ์</th>
                <th className="py-3.5 px-5 text-right w-36"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[14px]">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* Date & Time Column */}
                    <td className="py-4 px-5 align-middle">
                      <div className="font-bold text-slate-900 leading-snug">
                        {log.time}
                      </div>
                      <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                        {log.date}
                      </div>
                    </td>

                    {/* Operator Column */}
                    <td className="py-4 px-5 align-middle font-medium text-slate-800">
                      {log.operator}
                    </td>

                    {/* Event Badge Column */}
                    <td className="py-4 px-5 align-middle">
                      {getEventBadge(log.eventType, log.event)}
                    </td>

                    {/* Target / Outcome Column */}
                    <td className="py-4 px-5 align-middle font-medium text-slate-700">
                      {log.target}
                    </td>

                    {/* Action Column */}
                    <td className="py-4 px-5 align-middle text-right">
                      <button
                        onClick={() => setSelectedAudit(log)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[12px] font-medium transition-all active:scale-95 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>ดูรายละเอียด</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-[14px]">
                    ไม่พบข้อมูลบันทึกตรวจสอบย้อนหลังตามเงื่อนไขที่กำหนด
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px] text-slate-500">
          <div>
            Showing {filteredLogs.length} of {auditLogs.length} Historical Log
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-slate-200 rounded-lg bg-white disabled:opacity-50 text-slate-600 hover:bg-slate-100 transition-colors text-[13px]"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-7 h-7 rounded-lg font-bold text-[13px] flex items-center justify-center ${
                currentPage === 1
                  ? 'bg-[#1E58E6] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`w-7 h-7 rounded-lg font-bold text-[13px] flex items-center justify-center ${
                currentPage === 2
                  ? 'bg-[#1E58E6] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              2
            </button>
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

      {/* ========================================================================= */}
      {/* DETAIL MODAL                                                              */}
      {/* ========================================================================= */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  Audit Log Detail · {selectedAudit.id}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  รายละเอียดการตรวจสอบย้อนหลัง
                </h3>
              </div>
              <button
                onClick={() => setSelectedAudit(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">วันและเวลา</span>
                  <span className="font-bold text-slate-800">{selectedAudit.date} {selectedAudit.time}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] font-semibold">IP Address</span>
                  <span className="font-mono text-slate-700">{selectedAudit.ipAddress || '10.240.12.85'}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[12px] font-semibold mb-1">ผู้ดำเนินการ</span>
                <div className="font-bold text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl">
                  {selectedAudit.operator}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[12px] font-semibold mb-1">เหตุการณ์</span>
                <div>{getEventBadge(selectedAudit.eventType, selectedAudit.event)}</div>
              </div>

              <div>
                <span className="text-slate-400 block text-[12px] font-semibold mb-1">เป้าหมาย / ผลลัพธ์</span>
                <div className="font-semibold text-slate-800 bg-white border border-slate-200 px-3 py-2 rounded-xl">
                  {selectedAudit.target}
                </div>
              </div>

              {selectedAudit.details && (
                <div>
                  <span className="text-slate-400 block text-[12px] font-semibold mb-1">รายละเอียดเพิ่มเติม</span>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {selectedAudit.details}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedAudit(null)}
                className="px-5 py-2 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-xl font-medium shadow-xs text-[13px] cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
