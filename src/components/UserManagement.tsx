import React, { useState } from 'react';
import {
  UserPlus,
  Shield,
  Lock,
  Search,
  Filter,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  empCode: string;
  email: string;
  role: string;
  scope: string;
  mfaEnabled: boolean;
  avatarText: string;
  status: 'active' | 'inactive';
}

interface UserManagementProps {
  onNavigate?: (nav: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onNavigate }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form states for modal
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmpCode, setNewUserEmpCode] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('พยาบาลวิชาชีพ แผนกเด็ก');
  const [newUserScope, setNewUserScope] = useState('แผนกเด็ก');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [users, setUsers] = useState<UserItem[]>([
    {
      id: '1',
      name: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
      empCode: 'EMP-0428',
      email: 'EMP@Bangkokhospital.com',
      role: 'พยาบาลวิชาชีพ แผนกเด็ก',
      scope: 'แผนกเด็ก',
      mfaEnabled: true,
      avatarText: 'สด',
      status: 'active'
    },
    {
      id: '2',
      name: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
      empCode: 'EMP-0428',
      email: 'EMP@Bangkokhospital.com',
      role: 'พยาบาลวิชาชีพ แผนกเด็ก',
      scope: 'แผนกเด็ก',
      mfaEnabled: true,
      avatarText: 'สด',
      status: 'active'
    },
    {
      id: '3',
      name: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
      empCode: 'EMP-0428',
      email: 'EMP@Bangkokhospital.com',
      role: 'พยาบาลวิชาชีพ แผนกเด็ก',
      scope: 'แผนกเด็ก',
      mfaEnabled: true,
      avatarText: 'สด',
      status: 'active'
    },
    {
      id: '4',
      name: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
      empCode: 'EMP-0429',
      email: 'EMP@Bangkokhospital.com',
      role: 'หัวหน้าหอผู้ป่วยเด็ก',
      scope: 'แผนกเด็ก',
      mfaEnabled: true,
      avatarText: 'สด',
      status: 'active'
    },
    {
      id: '5',
      name: 'ชื่อ-นามสกุลแพทย์-แผนกเด็ก',
      empCode: 'EMP-0430',
      email: 'EMP@Bangkokhospital.com',
      role: 'ผู้ดูแลระบบ',
      scope: 'Admin',
      mfaEnabled: true,
      avatarText: 'สด',
      status: 'active'
    },
    {
      id: '6',
      name: 'ชื่อ-นามสกุล-ผู้บริหาร',
      empCode: 'EMP-0431',
      email: 'EMP@Bangkokhospital.com',
      role: 'ผู้บริหาร',
      scope: 'ทั้งระบบ',
      mfaEnabled: true,
      avatarText: 'สด',
      status: 'active'
    }
  ]);

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const newUser: UserItem = {
      id: Date.now().toString(),
      name: newUserName,
      empCode: newUserEmpCode || `EMP-0${Math.floor(100 + Math.random() * 900)}`,
      email: newUserEmail || `${newUserName.replace(/\s+/g, '')}@Bangkokhospital.com`,
      role: newUserRole,
      scope: newUserScope,
      mfaEnabled: true,
      avatarText: newUserName.substring(0, 2) || 'สด',
      status: 'active'
    };

    setUsers([newUser, ...users]);
    setIsAddModalOpen(false);
    setNewUserName('');
    setNewUserEmpCode('');
    setNewUserEmail('');
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
    setEditingUser(null);
  };

  const filteredUsers = users.filter(user => {
    if (statusFilter === 'active' && user.status !== 'active') return false;
    if (statusFilter === 'mfa' && !user.mfaEnabled) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.empCode.toLowerCase().includes(q) ||
        user.role.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* PAGE HEADER ROW                                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[13px] font-semibold text-[#1E58E6] tracking-tight">
            การจัดการสิทธิ์การเข้าถึง
          </span>
          <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900 tracking-tight mt-0.5">
            ผู้ใช้งานและสิทธิ์การเข้าถึง
          </h1>
          <p className="text-[13px] text-slate-500 mt-1">
            กำหนดสิทธิ์ตามบทบาท หน้าที่รับผิดชอบ และขอบเขตแผนกเด็ก
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-xl font-medium text-[13px] shadow-xs transition-all active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-white" />
          <span>เพิ่มผู้ใช้งาน</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER CARD                                                       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Card Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E58E6] flex items-center justify-center shrink-0 shadow-xs">
              <UserCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold text-slate-900 leading-snug">
                เจ้าหน้าที่ในระบบ
              </h2>
              <p className="text-[13px] text-slate-400 font-normal mt-0.5">
                เปรียบเทียบผลรายเดือนและเรียกดูรายงานเดิมได้
              </p>
            </div>
          </div>

          {/* Filter Dropdown & Search */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="flex items-center gap-2 text-[13px] text-slate-600">
              <span className="text-slate-500 font-medium">สถานะในระบบ</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
              >
                <option value="all">ทั้งหมด</option>
                <option value="active">เปิดใช้งาน</option>
                <option value="mfa">ผ่าน MFA แล้ว</option>
              </select>
            </div>
          </div>
        </div>

        {/* User List Rows */}
        <div className="divide-y divide-slate-100">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                {/* User Identity Column */}
                <div className="flex items-center gap-4 min-w-[260px]">
                  <div className="w-11 h-11 rounded-full bg-blue-100 text-[#1E58E6] font-bold text-[14px] flex items-center justify-center shrink-0 shadow-2xs">
                    {user.avatarText}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-slate-900 leading-snug truncate">
                      {user.name}
                    </h3>
                    <p className="text-[12px] text-slate-400 font-normal mt-0.5 truncate">
                      {user.empCode} · {user.email}
                    </p>
                  </div>
                </div>

                {/* Role & Scope Column */}
                <div className="min-w-[200px]">
                  <h4 className="text-[14px] font-bold text-slate-800 leading-tight">
                    {user.role}
                  </h4>
                  <p className="text-[12px] text-slate-400 font-normal mt-0.5">
                    ขอบเขต: {user.scope}
                  </p>
                </div>

                {/* MFA Badge Column */}
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E6F9F0] border border-[#A7F3D0] text-[#047857] rounded-full text-[12px] font-semibold">
                    <Lock className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>เปิดใช้งานการยืนยันตัวตนหลายปัจจัย (MFA)</span>
                  </span>
                </div>

                {/* Action Button */}
                <div className="shrink-0 self-end md:self-auto">
                  <button
                    onClick={() => setEditingUser(user)}
                    className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-[13px] font-medium transition-all active:scale-95 cursor-pointer"
                  >
                    แก้ไขข้อมูลผู้ใช้งาน
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-400 text-[14px]">
              ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไขการค้นหา
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px] text-slate-500">
          <div>
            Showing {filteredUsers.length} of {users.length} Historical Log
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
      {/* ADD USER MODAL                                                            */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-[620px] w-full p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">
                  PEDIVEINCARE AI
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                  เพิ่มผู้ใช้งานในระบบ
                </h3>
                <p className="text-[13px] text-slate-500 font-normal mt-0.5">
                  ตรวจสอบข้อมูลก่อนยืนยัน
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddUser} className="space-y-4 text-[13px]">
              {/* Row 1: ชื่อ-นามสกุล & รหัสเจ้าหน้าที่ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">
                    ชื่อ-นามสกุล<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="ชื่อ-นามสกุลแพทย์-แผนกเด็ก"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 font-medium placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">
                    รหัสเจ้าหน้าที่<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserEmpCode}
                    onChange={(e) => setNewUserEmpCode(e.target.value)}
                    placeholder="EMP-0000"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 font-medium placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Row 2: อีเมลโรงพยาบาล */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  อีเมลโรงพยาบาล<span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="name@bangkokhospital.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 font-medium placeholder-slate-400"
                />
              </div>

              {/* Row 3: รหัสผ่าน & ยืนยันรหัสผ่าน */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">
                    รหัสผ่าน<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="XXX-XXXXX-XXXXX"
                      className="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 font-medium placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">
                    ยืนยันรหัสผ่าน<span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="XXX-XXXXX-XXXXX"
                      className="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 font-medium placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 4: บทบาท & ขอบเขต/แผนก */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">
                    บทบาท<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-slate-800 font-medium cursor-pointer"
                  >
                    <option value="พยาบาลวิชาชีพ แผนกเด็ก">พยาบาลวิชาชีพ แผนกเด็ก</option>
                    <option value="หัวหน้าหอผู้ป่วยเด็ก">หัวหน้าหอผู้ป่วยเด็ก</option>
                    <option value="กุมารแพทย์ผู้ดูแล">กุมารแพทย์ผู้ดูแล</option>
                    <option value="ผู้ดูแลระบบ">ผู้ดูแลระบบ</option>
                    <option value="ผู้บริหาร">ผู้บริหาร</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">
                    ขอบเขต/แผนก<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newUserScope}
                    onChange={(e) => setNewUserScope(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-slate-800 font-medium cursor-pointer"
                  >
                    <option value="แผนกเด็ก">แผนกเด็ก</option>
                    <option value="Admin">Admin</option>
                    <option value="ทั้งระบบ">ทั้งระบบ</option>
                  </select>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl font-medium text-slate-600 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-xl font-medium shadow-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>บันทึกผู้ใช้งาน</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT USER MODAL                                                           */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-[620px] w-full p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">
                  PEDIVEINCARE AI
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
                  แก้ไขข้อมูลผู้ใช้งาน
                </h3>
                <p className="text-[13px] text-slate-500 font-normal mt-0.5">
                  {editingUser.name}
                </p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditUser} className="space-y-4 text-[13px]">
              {/* Row 1: ชื่อ-นามสกุล & รหัสเจ้าหน้าที่ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">
                    ชื่อ-นามสกุล<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    placeholder="ชื่อ-นามสกุลแพทย์-แผนกเด็ก"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">
                    รหัสเจ้าหน้าที่<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.empCode}
                    onChange={(e) => setEditingUser({ ...editingUser, empCode: e.target.value })}
                    placeholder="EMP-0000"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Row 2: อีเมลโรงพยาบาล */}
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">
                  อีเมลโรงพยาบาล<span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  placeholder="name@bangkokhospital.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 font-medium"
                />
              </div>

              {/* Row 3: บทบาท & ขอบเขต/แผนก */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">
                    บทบาท<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-slate-800 font-medium cursor-pointer"
                  >
                    <option value="พยาบาลวิชาชีพ แผนกเด็ก">พยาบาลวิชาชีพ แผนกเด็ก</option>
                    <option value="หัวหน้าหอผู้ป่วยเด็ก">หัวหน้าหอผู้ป่วยเด็ก</option>
                    <option value="กุมารแพทย์ผู้ดูแล">กุมารแพทย์ผู้ดูแล</option>
                    <option value="ผู้ดูแลระบบ">ผู้ดูแลระบบ</option>
                    <option value="ผู้บริหาร">ผู้บริหาร</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1.5">
                    ขอบเขต/แผนก<span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingUser.scope}
                    onChange={(e) => setEditingUser({ ...editingUser, scope: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white text-slate-800 font-medium cursor-pointer"
                  >
                    <option value="แผนกเด็ก">แผนกเด็ก</option>
                    <option value="Admin">Admin</option>
                    <option value="ทั้งระบบ">ทั้งระบบ</option>
                  </select>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-100 rounded-xl font-medium text-slate-600 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-xl font-medium shadow-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>บันทึกผู้ใช้งาน</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
