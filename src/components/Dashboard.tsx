import React, { useState } from 'react';
import dashboardHeaderLogo from '../assets/dashboard-header-logo.png';
import { RoundsInspection } from './RoundsInspection';
import { PediatricPatients } from './PediatricPatients';
import { AiReviewPending } from './AiReviewPending';
import { CompletedTracking } from './CompletedTracking';
import { NotificationCenter } from './NotificationCenter';
import { InfiltrationTracking } from './InfiltrationTracking';
import { PhlebitisTracking } from './PhlebitisTracking';
import { AnalysisHistory } from './AnalysisHistory';
import { DashboardOverview } from './DashboardOverview';
import { ExecutiveSummary } from './ExecutiveSummary';
import { HisConnectionStatus } from './HisConnectionStatus';
import { UserManagement } from './UserManagement';
import { AuditLog } from './AuditLog';
import { SystemSettings } from './SystemSettings';
import { StartIvMonitoring } from './StartIvMonitoring';
import { SinglePatientDetail } from './SinglePatientDetail';
import {
  Bell,
  Search,
  Calendar,
  Info,
  ChevronRight,
  Clock,
  Sparkles,
  Users,
  Activity,
  FileText,
  UserCheck,
  LogOut,
  Home,
  ClipboardList,
  Bookmark,
  Waves,
  Database,
  ShieldCheck,
  Sliders,
  Camera,
  BedDouble,
  Check,
  ArrowLeft
} from 'lucide-react';

interface DashboardProps {
  onLogout?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeNav, setActiveNav] = useState('overview');
  const [tableFilter, setTableFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notificationCount, setNotificationCount] = useState(8);
  const [selectedNeedlePatient, setSelectedNeedlePatient] = useState<any | null>(null);

  const handleInspectNeedle = (patient: any) => {
    setSelectedNeedlePatient(patient);
    setActiveNav('start_monitoring');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  // Sample Patients Data for Table
  const patients = [
    {
      id: '1',
      name: 'เด็กชายสมชาย ใจดี',
      hn: 'HN56789012',
      site: 'ท่อนแขนซ้าย',
      ward: 'PICU',
      bed: 'เตียง B04',
      progress: '32 / 168 ชม.',
      round: 'รอบ 16 / 48',
      statusType: 'overdue',
      statusText: '14:00 น. เกินกำหนด 00:18:24',
      aiStatus: 'Phlebitis',
      aiType: 'phlebitis',
      urgency: 'high'
    },
    {
      id: '2',
      name: 'เด็กหญิงปิยะดา รักษ์ดี',
      hn: 'HN56789012',
      site: 'หลังมือขวา',
      ward: 'PICU',
      bed: 'เตียง A02',
      progress: '28 / 168 ชม.',
      round: 'รอบ 14 / 48',
      statusType: 'due',
      statusText: '14:00 น. ถึงกำหนดตรวจ',
      aiStatus: 'Infiltration',
      aiType: 'infiltration',
      urgency: 'high'
    },
    {
      id: '3',
      name: 'เด็กชายกิตติศักดิ์ มั่นคง',
      hn: 'HN56789012',
      site: 'หลังมือขวา',
      ward: 'PICU',
      bed: 'เตียง C12',
      progress: '14 / 168 ชม.',
      round: 'รอบ 7 / 48',
      statusType: 'near_due',
      statusText: '16:00 น. เหลือ 01:42:10',
      aiStatus: 'ไม่พบข้อสังเกต',
      aiType: 'normal',
      urgency: 'normal'
    },
    {
      id: '4',
      name: 'เด็กหญิงนภา วงศ์สว่าง',
      hn: 'HN56789012',
      site: 'หลังมือขวา',
      ward: 'PICU',
      bed: 'เตียง B12',
      progress: '4 / 168 ชม.',
      round: 'รอบ 2 / 48',
      statusType: 'near_due',
      statusText: '14:00 น. เหลือ 00:42:18',
      aiStatus: 'ไม่พบข้อสังเกต',
      aiType: 'normal',
      urgency: 'normal'
    }
  ];

  const filteredPatients = patients.filter((p) => {
    if (tableFilter === 'ai_review' && p.aiType === 'normal') return false;
    if (tableFilter === 'overdue' && p.statusType !== 'overdue') return false;
    if (tableFilter === 'due' && p.statusType !== 'due') return false;
    if (tableFilter === 'near_due' && p.statusType !== 'near_due') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.hn.toLowerCase().includes(q) ||
        p.bed.toLowerCase().includes(q) ||
        p.ward.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="h-screen w-full bg-[#F3F5F9] font-sans antialiased flex text-slate-800 overflow-hidden">
      {/* ========================================================================= */}
      {/* LEFT SIDEBAR                                                              */}
      {/* ========================================================================= */}
      <aside className="w-64 sm:w-72 bg-[#012351] text-white flex flex-col justify-between shrink-0 h-screen border-r border-[#0a3166] shadow-lg overflow-y-auto no-scrollbar">
        <div className="p-4 sm:p-5">
          {/* Logo & Title Header */}
          <div className="pb-5 border-b border-[#0e3770]/80 flex flex-col items-center gap-2 text-center">
            <div className="w-full bg-transparent p-2 rounded-xl flex items-center justify-center">
              <img
                src={dashboardHeaderLogo}
                alt="BANGKOK HOSPITAL"
                className="h-9 w-auto object-contain max-w-full"
              />
            </div>
            <span className="text-[12px] text-blue-200 font-medium tracking-wide">
              ติดตาม IV Site ผู้ป่วยเด็ก
            </span>
          </div>

          {/* Nav Links */}
          <nav className="mt-5 space-y-5 text-[14px]">
            {/* Group 1 */}
            <div>
              <div className="px-3 text-[12px] font-semibold text-[#82a4d9] mb-2.5">
                การติดตามผู้ป่วย
              </div>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setActiveNav('overview')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'overview'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white shadow-md shadow-blue-900/40 font-semibold'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <Home className="w-5 h-5 shrink-0 fill-white text-white" />
                    <span>ภาพรวมการติดตาม</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveNav('patients')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'patients'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <Users className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>รายการผู้ป่วยเด็ก</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveNav('rounds')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'rounds'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <ClipboardList className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>งานตรวจตามรอบ</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveNav('ai_review')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'ai_review'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <Sparkles className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>ผล AI รอการทบทวน</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveNav('completed')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'completed'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <Bookmark className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>สิ้นสุดการติดตาม</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveNav('alerts')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'alerts'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <Bell className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>ศูนย์การแจ้งเตือน</span>
                  </button>
                </li>
              </ul>
            </div>

            <div className="border-t border-[#0e3770]/80 pt-4">
              {/* Group 2 */}
              <div className="px-3 text-[12px] font-semibold text-[#82a4d9] mb-2.5">
                การติดตามแยกประเภท
              </div>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setActiveNav('infiltration')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'infiltration'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <Activity className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>ติดตาม Infiltration</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveNav('phlebitis')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'phlebitis'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <Waves className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>ติดตาม Phlebitis</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveNav('history')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'history'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <Clock className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>ประวัติผลการวิเคราะห์</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveNav('reports')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'reports'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <FileText className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>รายงานสรุปภาพรวมทั้งระบบ</span>
                  </button>
                </li>
              </ul>
            </div>

            <div className="border-t border-[#0e3770]/80 pt-4">
              {/* Group 3 */}
              <div className="px-3 text-[12px] font-semibold text-[#82a4d9] mb-2.5">
                ข้อมูลและระบบ
              </div>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setActiveNav('his')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'his'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <Database className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>สถานะการเชื่อมต่อ HIS</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveNav('users')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'users'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <UserCheck className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>ผู้ใช้งานและสิทธิ์การเข้าถึง</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveNav('audit')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'audit'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <ShieldCheck className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>บันทึกตรวจสอบย้อนหลัง</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveNav('settings')}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl font-medium transition-all text-left ${activeNav === 'settings'
                      ? 'bg-gradient-to-r from-[#1453C7] to-[#1C60E2] text-white'
                      : 'text-slate-200 hover:bg-[#063068] hover:text-white'
                      }`}
                  >
                    <Sliders className="w-5 h-5 shrink-0 text-slate-300" />
                    <span>การตั้งค่าระบบ</span>
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* Bottom Sidebar Box: HIS Status & User Footer */}
        <div className="p-4 space-y-3 bg-[#001738] border-t border-[#0a3166]">
          {/* HIS Connection Pill */}
          <div className="bg-[#031d42] rounded-xl p-3 border border-[#0c3977]/80 flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
            </div>
            <div className="flex flex-col text-[12px]">
              <span className="font-bold text-white leading-snug">เชื่อมต่อ HIS</span>
              <span className="text-slate-400 text-[11px]">สถานะ: เชื่อมต่อสำเร็จ</span>
              <span className="text-slate-500 text-[10px]">อัปเดตล่าสุด 05:30 น.</span>
            </div>
          </div>

          {/* User Profile Info */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-slate-700 ring-2 ring-blue-500/40 flex items-center justify-center text-white font-bold text-xs overflow-hidden">
                <img
                  src="/image 9.png"
                  alt="Nurse Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col text-[12px]">
                <span className="font-bold text-white leading-tight truncate max-w-[120px]">
                  ชื่อเจ้าหน้าที่-นามสกุล
                </span>
                <span className="text-slate-400 text-[11px]">NICU Nurse</span>
              </div>
            </div>
            {onLogout ? (
              <button
                onClick={onLogout}
                title="ออกจากระบบ"
                className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
          </div>
          <div className="text-center text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
            Bangkok Hospital PediVeinCare AI v1.0
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA                                                         */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar">
        {/* TOP BAR / HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs">
          {/* Breadcrumb Location */}
          <div className="flex items-center gap-2 text-[14px]">
            <span className="font-semibold text-slate-900">โรงพยาบาลกรุงเทพ</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-600 font-medium">แผนกเด็ก (กุมารเวชกรรม)</span>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาผู้ป่วย"
                className="pl-9 pr-4 py-1.5 w-60 rounded-lg border border-slate-200 text-[13px] bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            {/* Utility Buttons */}
            <button
              title="เลือกวันที่"
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              title="คู่มือการใช้งานและข้อมูลระบบ"
              onClick={() => setActiveNav(activeNav === 'guide' ? 'overview' : 'guide')}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${activeNav === 'guide'
                  ? 'bg-[#0070F3] text-white border-[#0070F3] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                }`}
            >
              <Info className="w-4 h-4" />
            </button>
            <button
              title="การแจ้งเตือน"
              onClick={() => setNotificationCount(0)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 relative transition-colors"
            >
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* MAIN BODY SCROLL AREA */}
        <div className="p-6 pb-14 space-y-6 max-w-[1600px] w-full mx-auto">
          {activeNav === 'guide' ? (
            <div className="space-y-6">
              {/* Back link & Title section */}
              <div>
                <button
                  onClick={() => setActiveNav('overview')}
                  className="text-[#1E58E6] font-semibold text-[14px] hover:underline inline-flex items-center gap-1.5 mb-2.5 cursor-pointer transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>กลับไปหน้าภาพรวม</span>
                </button>

                <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
                  คู่มือการใช้งานสำหรับบุคลากรแผนกเด็ก
                </h1>
                <p className="text-slate-500 text-[14px] mt-1">
                  ลำดับการใช้งานหลักตั้งแต่เริ่มติดตาม IV Site จนถึงปิดการติดตามครบ 96 ชั่วโมง
                </p>
              </div>

              {/* Main Grid: Left 8 Cols (Work Procedure), Right 4 Cols (Important Statuses) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 8 Cols: ขั้นตอนการปฏิบัติงาน */}
                <div className="lg:col-span-8">
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    {/* Card Header */}
                    <div className="p-5 border-b border-slate-100 flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#0070F3] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Activity className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <h2 className="text-[17px] font-bold text-slate-900 leading-snug">
                          ขั้นตอนการปฏิบัติงาน
                        </h2>
                        <p className="text-[13px] text-slate-400 font-normal mt-0.5">
                          เลือกขั้นตอนเพื่อไปยังหน้าที่เกี่ยวข้อง
                        </p>
                      </div>
                    </div>

                    {/* 5 Steps List */}
                    <div className="divide-y divide-slate-100">
                      {/* Step 1 */}
                      <div className="p-5 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="w-9 h-9 rounded-full border border-slate-200 text-slate-400 font-medium text-[13px] flex items-center justify-center shrink-0 mt-0.5">
                          1
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#0070F3] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <Camera className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                            เริ่มระยะติดตาม
                          </h3>
                          <p className="text-[13px] text-slate-500 font-normal mt-1 leading-relaxed">
                            ยืนยันผู้ป่วยและตำแหน่ง IV Site จัดทำอ้างอิงเริ่มต้น แล้วเริ่มนับระยะติดตาม 96 ชั่วโมง
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="p-5 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="w-9 h-9 rounded-full border border-slate-200 text-slate-400 font-medium text-[13px] flex items-center justify-center shrink-0 mt-0.5">
                          2
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                            ดำเนินการตรวจตามรอบ
                          </h3>
                          <p className="text-[13px] text-slate-500 font-normal mt-1 leading-relaxed">
                            ระบบเปิดปุ่มเมื่อถึงกำหนดตรวจทุก 2 ชั่วโมง โดยภาพอ้างอิงเริ่มต้นไม่นับรวมในรอบตรวจ 48 รอบ
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="p-5 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="w-9 h-9 rounded-full border border-slate-200 text-slate-400 font-medium text-[13px] flex items-center justify-center shrink-0 mt-0.5">
                          3
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#334155] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <BedDouble className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                            บันทึกเมื่อผู้ป่วยหลับ
                          </h3>
                          <p className="text-[13px] text-slate-500 font-normal mt-1 leading-relaxed">
                            ข้ามได้เฉพาะรอบที่ถึงกำหนด ไม่นับเป็นรอบตรวจที่ดำเนินการแล้ว ไม่เริ่มนับระยะเวลาใหม่ และกำหนดรอบถัดไปคงเดิม
                          </p>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="p-5 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="w-9 h-9 rounded-full border border-slate-200 text-slate-400 font-medium text-[13px] flex items-center justify-center shrink-0 mt-0.5">
                          4
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#6366F1] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                            ทบทวนผลการวิเคราะห์ด้วย AI
                          </h3>
                          <p className="text-[13px] text-slate-500 font-normal mt-1 leading-relaxed">
                            เปรียบเทียบภาพและทบทวน Infiltration กับ Phlebitis แยกจากกัน ก่อนยืนยันผลโดยบุคลากรทางการแพทย์ผู้รับผิดชอบ
                          </p>
                        </div>
                      </div>

                      {/* Step 5 */}
                      <div className="p-5 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="w-9 h-9 rounded-full border border-slate-200 text-slate-400 font-medium text-[13px] flex items-center justify-center shrink-0 mt-0.5">
                          5
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <Check className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                            ตรวจสอบและปิดการติดตาม
                          </h3>
                          <p className="text-[13px] text-slate-500 font-normal mt-1 leading-relaxed">
                            เมื่อครบ 96 ชั่วโมง ให้ตรวจสอบรายงานสรุป 48 รอบ ประวัติการข้ามรอบ และผลที่รอการทบทวนก่อนปิดการติดตาม
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 4 Cols: ความหมายของสถานะสำคัญ */}
                <div className="lg:col-span-4">
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                    {/* Card Header */}
                    <div className="p-5 border-b border-slate-100 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Info className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-[16px] font-bold text-slate-900 leading-snug">
                          ความหมายของสถานะสำคัญ
                        </h2>
                        <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                          ใช้คำเดียวกันในทุกหน้าของระบบ
                        </p>
                      </div>
                    </div>

                    {/* Status List */}
                    <div className="divide-y divide-slate-100">
                      {/* Item 1 */}
                      <div className="p-5 hover:bg-slate-50/50 transition-colors">
                        <h3 className="text-[14px] font-bold text-slate-900 leading-tight">
                          ถึงกำหนดตรวจ
                        </h3>
                        <p className="text-[13px] text-slate-500 font-normal mt-1.5 leading-relaxed">
                          สามารถดำเนินการตรวจหรือบันทึกข้ามรอบเนื่องจากผู้ป่วยหลับได้
                        </p>
                      </div>

                      {/* Item 2 */}
                      <div className="p-5 hover:bg-slate-50/50 transition-colors">
                        <h3 className="text-[14px] font-bold text-slate-900 leading-tight">
                          เกินกำหนด
                        </h3>
                        <p className="text-[13px] text-slate-500 font-normal mt-1.5 leading-relaxed">
                          ควรดำเนินการเป็นลำดับแรกและระบบคงเวลาตามกำหนดเดิมไว้ในประวัติ
                        </p>
                      </div>

                      {/* Item 3 */}
                      <div className="p-5 hover:bg-slate-50/50 transition-colors">
                        <h3 className="text-[14px] font-bold text-slate-900 leading-tight">
                          ผล AI รอการทบทวน
                        </h3>
                        <p className="text-[13px] text-slate-500 font-normal mt-1.5 leading-relaxed">
                          AI พบข้อสังเกตจากภาพและรอการยืนยันโดยบุคลากรทางการแพทย์ผู้รับผิดชอบ
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Disclaimer Banner */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950 mt-6">
                <svg width="64" height="64" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
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
          ) : activeNav === 'start_monitoring' ? (
            <StartIvMonitoring
              patientData={selectedNeedlePatient}
              onBack={() => setActiveNav('patient_detail')}
              onCancel={() => setActiveNav('patient_detail')}
              onContinue={() => setActiveNav('patient_detail')}
              onConfirmSkip={() => setActiveNav('patient_detail')}
            />
          ) : activeNav === 'patient_detail' || activeNav === 'single_patient' ? (
            <SinglePatientDetail
              patientName={selectedNeedlePatient?.name}
              hnAn={selectedNeedlePatient?.hn}
              onBack={() => setActiveNav('rounds')}
              onViewGradeHistory={() => setActiveNav('history')}
              onViewTrackingHistory={() => setActiveNav('rounds')}
              onInspectNeedleNow={() => setActiveNav('start_monitoring')}
              onViewSummaryReport={() => setActiveNav('reports')}
              onViewInfiltrationDetail={() => setActiveNav('infiltration')}
              onViewPhlebitisDetail={() => setActiveNav('phlebitis')}
            />
          ) : activeNav === 'rounds' ? (
            <RoundsInspection onInspectNeedle={handleInspectNeedle} />
          ) : activeNav === 'patients' ? (
            <PediatricPatients
              onAddFirstIvSite={(patient) => {
                setSelectedNeedlePatient(patient);
                setActiveNav('start_monitoring');
              }}
              onInspectNeedle={handleInspectNeedle}
              onNavigate={(nav) => setActiveNav(nav)}
            />
          ) : activeNav === 'ai_review' ? (
            <AiReviewPending onNavigate={(nav: string) => setActiveNav(nav)} />
          ) : activeNav === 'completed' ? (
            <CompletedTracking />
          ) : activeNav === 'alerts' ? (
            <NotificationCenter onMarkAllAsRead={() => setNotificationCount(0)} />
          ) : activeNav === 'infiltration' ? (
            <InfiltrationTracking
              onNavigate={(nav) => setActiveNav(nav)}
              onInspectNeedle={handleInspectNeedle}
            />
          ) : activeNav === 'phlebitis' ? (
            <PhlebitisTracking
              onNavigate={(nav) => setActiveNav(nav)}
              onInspectNeedle={handleInspectNeedle}
            />
          ) : activeNav === 'history' ? (
            <AnalysisHistory onNavigate={(nav: string) => setActiveNav(nav)} />
          ) : activeNav === 'reports' ? (
            <ExecutiveSummary onNavigate={(nav: string) => setActiveNav(nav)} />
          ) : activeNav === 'his' ? (
            <HisConnectionStatus onNavigate={(nav: string) => setActiveNav(nav)} />
          ) : activeNav === 'users' ? (
            <UserManagement onNavigate={(nav: string) => setActiveNav(nav)} />
          ) : activeNav === 'audit' ? (
            <AuditLog onNavigate={(nav: string) => setActiveNav(nav)} />
          ) : activeNav === 'settings' ? (
            <SystemSettings onNavigate={(nav: string) => setActiveNav(nav)} />
          ) : (
            <DashboardOverview
              onNavigate={(nav: string) => setActiveNav(nav)}
              handleRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              filteredPatients={filteredPatients}
              tableFilter={tableFilter}
              setTableFilter={setTableFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}
        </div>
      </main>
    </div>
  );
};
