import React from 'react';
import { Cpu, Database, RefreshCw, ServerCog, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { fmtDateTime } from '../api/format';
import type { SystemStatus } from '../api/types';

interface HisConnectionStatusProps {
  onNavigate?: (nav: string) => void;
}

const tone = (ok: boolean | null) =>
  ok === null
    ? { box: 'bg-slate-50 border-slate-200', icon: 'bg-slate-100 text-slate-500', title: 'text-slate-800', text: 'text-slate-500' }
    : ok
      ? { box: 'bg-[#E6F9F0] border-[#BBF7D0]', icon: 'bg-[#D1FAE5] text-[#10B981]', title: 'text-[#065F46]', text: 'text-[#059669]' }
      : { box: 'bg-red-50 border-red-200', icon: 'bg-red-100 text-red-600', title: 'text-red-800', text: 'text-red-600' };

export const HisConnectionStatus: React.FC<HisConnectionStatusProps> = () => {
  const status = useApi(() => api.get<SystemStatus>('/api/system/status'), []);
  const data = status.data;

  const services = [
    {
      key: 'db',
      name: 'ฐานข้อมูล PostgreSQL',
      icon: Database,
      ok: data ? data.database === 'UP' : null,
      detail: data ? (data.database === 'UP' ? 'เชื่อมต่อปกติ' : 'ไม่สามารถเชื่อมต่อฐานข้อมูล') : 'กำลังตรวจสอบ...'
    },
    {
      key: 'ai',
      name: 'บริการ AI (PediVein inference)',
      icon: Cpu,
      ok: data ? data.ai.status === 'READY' : null,
      detail: !data
        ? 'กำลังตรวจสอบ...'
        : data.ai.status === 'READY'
          ? `พร้อมใช้งาน · ${data.ai.model_version ?? ''} · ${data.ai.provider ?? ''}`
          : data.ai.status === 'NOT_READY'
            ? `โหลดโมเดลไม่สำเร็จหรือยังโหลดไม่เสร็จ${data.ai.error ? ` (${data.ai.error})` : ''}`
            : 'ไม่สามารถเชื่อมต่อบริการ AI · ตรวจสอบว่า backend_ai_cpu ทำงานอยู่'
    },
    {
      key: 'his',
      name: 'ระบบสารสนเทศโรงพยาบาล (HIS)',
      icon: ServerCog,
      ok: data ? (data.his.status === 'NOT_CONFIGURED' ? null : data.his.status === 'UP') : null,
      detail:
        data?.his.status === 'NOT_CONFIGURED'
          ? 'ยังไม่ได้เชื่อมต่อ · ลงทะเบียนผู้ป่วยด้วยตนเองที่หน้า “ผู้ป่วยเด็ก”'
          : data?.his.status ?? 'กำลังตรวจสอบ...'
    }
  ];
  const allOk = data ? data.database === 'UP' && data.ai.status === 'READY' : null;
  const banner = tone(allOk);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[13px] font-semibold text-[#1E58E6] tracking-tight">การเชื่อมต่อระบบ</span>
          <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900 tracking-tight mt-0.5">สถานะการเชื่อมต่อระบบ</h1>
          <p className="text-[13px] text-slate-500 mt-1">ตรวจสอบฐานข้อมูล บริการ AI และการเชื่อมต่อ HIS</p>
        </div>
        <button
          onClick={() => status.reload()}
          disabled={status.loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-xl font-medium text-[13px] shadow-xs transition-all cursor-pointer disabled:opacity-70"
        >
          <RefreshCw className={`w-4 h-4 text-white ${status.loading ? 'animate-spin' : ''}`} />
          <span>ทดสอบการเชื่อมต่อ</span>
        </button>
      </div>

      <div className={`border rounded-2xl p-5 shadow-2xs flex items-center gap-4 ${banner.box}`}>
        <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${banner.icon}`}>
          {allOk === false ? <WifiOff className="w-6 h-6" /> : <Wifi className="w-6 h-6" />}
        </div>
        <div>
          <h2 className={`text-base sm:text-[18px] font-bold leading-tight ${banner.title}`}>
            {status.error
              ? 'ไม่สามารถติดต่อ backend ได้'
              : allOk === null
                ? 'กำลังตรวจสอบ...'
                : allOk
                  ? 'ระบบหลักทำงานตามปกติ'
                  : 'มีบริการที่ไม่พร้อมใช้งาน'}
          </h2>
          <p className={`text-[13px] font-normal mt-0.5 ${banner.text}`}>
            {status.error ?? `ตรวจสอบล่าสุด ${data ? fmtDateTime(data.server_time) : '-'}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {services.map(({ key, name, icon: Icon, ok, detail }) => {
          const t = tone(ok);
          return (
            <div key={key} className={`rounded-2xl border p-5 shadow-2xs space-y-3 ${t.box}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.icon}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`text-[15px] font-bold ${t.title}`}>{name}</h3>
                <p className={`text-[12.5px] mt-1 ${t.text}`}>{detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center gap-4 text-blue-950">
        <ShieldCheck className="w-8 h-8 text-[#1E58E6] shrink-0" />
        <div className="text-[14px]">
          <div className="font-bold text-blue-900">ข้อมูลผู้ป่วยถูกเก็บในฐานข้อมูลของโรงพยาบาล</div>
          <p className="text-blue-700 mt-0.5 text-[12px]">ภาพ IV Site ถูกส่งไปยังบริการ AI ภายในเท่านั้น และไม่ถูกเก็บไว้ในบริการ AI หลังประมวลผล</p>
        </div>
      </div>
    </div>
  );
};
