import React, { useState } from 'react';
import {
  Clock,
  Sparkles,
  Moon,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Loader2
} from 'lucide-react';
import { BDMSLogo } from './components/BDMSLogo';
import { Dashboard } from './components/Dashboard';
import bgHospital from './assets/bg-hospital.png';

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setLoginSuccess(true);
    }, 600);
  };

  if (loginSuccess) {
    return <Dashboard onLogout={() => setLoginSuccess(false)} />;
  }

  return (
    /* Main Layout Container: Full Screen Auto Flex Layout */
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#08192E] font-sans antialiased text-slate-800 selection:bg-blue-600 selection:text-white">
      {/* ========================================================================= */}
      {/* LEFT PANEL: Auto Layout Flex Column (50% Width on Desktop)               */}
      {/* ========================================================================= */}
      <div
        className="relative flex-1 lg:w-1/2 w-full min-h-screen text-white p-6 sm:p-10 lg:p-14 xl:p-16 flex flex-col justify-between overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(6, 20, 39, 0.35) 0%, rgba(6, 20, 39, 0.55) 100%), url(${bgHospital})`
        }}
      >
        {/* Top Header: BDMS Logo */}
        <div className="relative z-20 flex items-center justify-between">
          <BDMSLogo />
        </div>

        {/* Center Content Box: Auto-Centered Vertical Layout */}
        <div className="relative z-20 my-auto py-8 sm:py-12 w-full max-w-xl mx-auto lg:mx-0 flex flex-col justify-center space-y-8">
          {/* Title & Subtitle Stack */}
          <div className="space-y-3">
            <h1
              className="text-[48px] font-[600] text-white tracking-[-0.96px] leading-[48px] align-middle mb-4"
              style={{ fontFamily: "'Noto Sans', 'Noto Sans Thai', sans-serif" }}
            >
              PediVeinCare AI
            </h1>
            <p
              className="text-[18px] font-[500] text-[#99ABDD] tracking-[0px] leading-[29.25px] align-middle"
              style={{ fontFamily: "'Noto Sans', 'Noto Sans Thai', sans-serif" }}
            >
              ระบบติดตาม IV Site สำหรับผู้ป่วยเด็กตลอด 96 ชั่วโมง ตรวจทุก 2 ชั่วโมง
            </p>
          </div>

          {/* Feature List: Main Text 18px, Secondary Text 16px */}
          <div className="flex flex-col space-y-5">
            {/* Feature 1: Clock */}
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-[#0F2A4A]/80 border border-white/10 flex items-center justify-center text-white shrink-0 shadow-sm backdrop-blur-md group-hover:scale-105 transition-transform">
                <Clock className="w-6 h-6 text-slate-200" />
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-[18px] font-bold text-white leading-snug">กำหนดตรวจ 7 วัน</h3>
                <p className="text-[16px] text-slate-300/80">ไม่รวมภาพอ้างอิงเริ่มต้น (Baseline)</p>
              </div>
            </div>

            {/* Feature 2: AI Analysis */}
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-[#0F2A4A]/80 border border-white/10 flex items-center justify-center text-white shrink-0 shadow-sm backdrop-blur-md group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6 text-slate-200" />
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-[18px] font-bold text-white leading-snug">การวิเคราะห์ภาพด้วย AI</h3>
                <p className="text-[16px] text-slate-300/80">แยก Infiltration เเละ Phlebitis</p>
              </div>
            </div>

            {/* Feature 3: Moon */}
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-[#0F2A4A]/80 border border-white/10 flex items-center justify-center text-white shrink-0 shadow-sm backdrop-blur-md group-hover:scale-105 transition-transform">
                <Moon className="w-6 h-6 text-slate-200" />
              </div>
              <div className="flex flex-col justify-center">
                <h3 className="text-[18px] font-bold text-white leading-snug">ข้ามรอบเมื่อมีเหตุ</h3>
                <p className="text-[16px] text-slate-300/80">ไม่เปลี่ยนกำหนดรอบถัดไป</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer: Main Text 18px, Secondary Text 14px */}
        <div className="relative z-20 flex items-center gap-3 pt-4 border-t border-white/10">
          <div className="w-8 h-8 rounded-lg border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white text-[14px] leading-tight">BDMS Medical Information System</span>
            <span className="text-slate-300/80 text-[12px]">Secure Access Platform</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANEL: Auto Layout Flex Center Container (50% Width on Desktop)    */}
      {/* ========================================================================= */}
      <div className="flex-1 lg:w-1/2 w-full min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-6 sm:p-10 lg:p-14">
        {/* Floating Login Card: Auto Flexible Sizing & Auto Margins */}
        <div className="w-full max-w-[480px] my-auto bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-slate-100/80 p-8 sm:p-10 flex flex-col justify-between transition-all duration-300">
          {/* Standard Login Form Layout */}
          <div className="flex flex-col h-full justify-between space-y-8">
            {/* Card Header Stack */}
            <div className="space-y-1">
              <span className="text-[#1D61E7] text-[12px] font-bold tracking-wide block">
                เข้าสู่ระบบสำหรับบุคลากร
              </span>
              <h2 className="text-[28px] sm:text-[32px] font-extrabold text-[#0F172A] tracking-tight">
                เข้าสู่ระบบ PediVeinCare AI
              </h2>
              <p className="text-slate-400 text-[16px] pt-1">
                ใช้บัญชีโรงพยาบาลสำหรับแผนกเด็ก
              </p>
            </div>

            {/* Input Form Stack: Label & Input 18px */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Field 1 */}
              <div className="space-y-2">
                <label className="block text-[18px] font-bold text-slate-700">
                  อีเมลหรือรหัสพนักงาน
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ระบุอีเมลหรือรหัสพนักงาน"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-[18px] placeholder:text-slate-400 placeholder:text-[18px] focus:outline-none focus:border-[#1D61E7] focus:ring-2 focus:ring-[#1D61E7]/20 transition-all"
                />
              </div>

              {/* Field 2 */}
              <div className="space-y-2">
                <label className="block text-[18px] font-bold text-slate-700">
                  รหัสผ่าน
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="ระบุรหัสผ่าน"
                    className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-[18px] placeholder:text-slate-400 placeholder:text-[18px] focus:outline-none focus:border-[#1D61E7] focus:ring-2 focus:ring-[#1D61E7]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Options Row: 18px / 16px */}
              <div className="flex items-center justify-between pt-1 text-[16px]">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#1D61E7] focus:ring-[#1D61E7] cursor-pointer"
                  />
                  <span className="text-[16px]">จดจำการเข้าสู่ระบบ</span>
                </label>

                <a
                  href="#forgot-password"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('กรุณาติดต่อแผนก IT Helpdesk ของโรงพยาบาลเพื่อรีเซ็ตรหัสผ่าน');
                  }}
                  className="text-[#1D61E7] font-semibold text-[16px] hover:underline"
                >
                  ลืมรหัสผ่าน?
                </a>
              </div>

              {/* Primary Button: 18px */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-6 rounded-xl bg-[#155BE5] hover:bg-[#124EC6] active:bg-[#0F42A9] text-white font-bold text-[18px] shadow-md shadow-[#155BE5]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>เข้าสู่ระบบ</span>
                  </>
                )}
              </button>
            </form>

            {/* Card Footer: 14px */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[12px] text-slate-400 font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Protected by BDMS IT Security Operations Team</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

