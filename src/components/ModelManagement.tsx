import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  X
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useAuth } from '../api/auth';
import { useApi } from '../api/useApi';
import { fmtDateTime, pct } from '../api/format';
import type { ClassMetrics, ModelVersion, ModelVersionsPage, SystemSettings } from '../api/types';

interface ModelManagementProps {
  onNavigate?: (nav: string) => void;
}

const FINISHED = ['succeeded', 'failed'];

const STATE_LABEL: Record<string, string> = {
  queued: 'รอเริ่ม',
  preprocessing: 'เตรียมภาพ',
  training: 'กำลังเทรน',
  evaluating: 'กำลังทดสอบ',
  exporting: 'บันทึกโมเดล',
  succeeded: 'สำเร็จ',
  failed: 'ไม่สำเร็จ'
};

const EXCLUDED_LABEL: Record<string, string> = {
  incomplete_review: 'ทบทวนผลไม่ครบทั้ง 2 ภาวะ',
  no_finding: 'ไม่พบทั้ง 2 ภาวะ (โมเดลยังไม่มีคลาสปกติ)',
  both_conditions_same_grade: 'พบทั้ง 2 ภาวะด้วย Grade เท่ากัน',
  IMAGE_MISSING: 'ไม่พบไฟล์ภาพ',
  INVALID_PATH: 'ตำแหน่งไฟล์ภาพไม่ถูกต้อง'
};

const TRIGGER_LABEL: Record<string, string> = {
  manual: 'สั่งเทรนเอง',
  schedule: 'ตั้งเวลาอัตโนมัติ',
  builtin: 'โมเดลตั้งต้น'
};

const excludedLabel = (key: string) =>
  EXCLUDED_LABEL[key] ?? (key.startsWith('PREPROCESSING_') ? `เตรียมภาพไม่ผ่าน (${key.slice(14)})` : key);

const isRunning = (v: ModelVersion) => !FINISHED.includes(v.state);

/** Headline accuracy: held-out test set for retrained versions, cross-validation for the built-in model. */
function headline(v: ModelVersion) {
  const m = v.metadata;
  if (m?.test_metrics) {
    return {
      condition: m.test_metrics.condition.accuracy,
      grade: m.test_metrics.grade.accuracy,
      baseCondition: m.base_test_metrics?.condition.accuracy ?? null,
      baseGrade: m.base_test_metrics?.grade.accuracy ?? null,
      source: `ชุดทดสอบ ${m.test_metrics.condition.n ?? '-'} ภาพ`
    };
  }
  if (m?.oof_condition) {
    return {
      condition: m.oof_condition.accuracy,
      grade: m.oof_grade?.accuracy ?? null,
      baseCondition: null,
      baseGrade: null,
      source: `Cross-validation ${m.development_n ?? '-'} ภาพ`
    };
  }
  return null;
}

const Delta: React.FC<{ value: number | null; base: number | null }> = ({ value, base }) => {
  if (value === null || base === null) return null;
  const diff = Math.round((value - base) * 100);
  const tone = diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-slate-400';
  return <span className={`text-[11px] font-bold ${tone}`}>{diff > 0 ? '+' : ''}{diff}</span>;
};

const StateBadge: React.FC<{ v: ModelVersion }> = ({ v }) => {
  const tone =
    v.state === 'succeeded'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : v.state === 'failed'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-blue-50 text-blue-700 border-blue-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11.5px] font-bold ${tone}`}>
      {isRunning(v) && <Loader2 className="w-3 h-3 animate-spin" />}
      {STATE_LABEL[v.state] ?? v.state}
    </span>
  );
};

const Counts: React.FC<{ title: string; values: Record<string, number> }> = ({ title, values }) => (
  <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
    <span className="text-slate-400 font-medium">{title}</span>
    {Object.entries(values).map(([k, n]) => (
      <span key={k} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold">
        {k}: {n}
      </span>
    ))}
  </div>
);

export const ModelManagement: React.FC<ModelManagementProps> = () => {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const page = useApi(() => api.get<ModelVersionsPage>('/api/model-versions'), []);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [activating, setActivating] = useState<ModelVersion | null>(null);
  const [showTrain, setShowTrain] = useState(false);
  const data = page.data;
  const running = data?.versions.find(isRunning) ?? null;
  const active = data?.versions.find((v) => v.is_active) ?? null;

  const { reload } = page;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(reload, 4000);
    return () => clearInterval(timer);
  }, [running, reload]);

  const canTrain =
    isAdmin && !!data?.ai_reachable && !data.training_running && data.dataset.labelled >= data.dataset.min_required;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[13px] font-semibold text-[#1E58E6] tracking-tight">AI และโมเดล</span>
          <h1 className="text-2xl sm:text-[30px] font-bold text-slate-900 tracking-tight mt-0.5">จัดการโมเดล AI</h1>
          <p className="text-[13px] text-slate-500 mt-1">
            เทรนโมเดลใหม่จากผลที่บุคลากรยืนยันแล้ว ดูผลการเทรนย้อนหลัง และเลือกเวอร์ชันที่ใช้งาน
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => page.reload()}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-[13px] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${page.loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowTrain(true)}
              disabled={!canTrain}
              title={
                !data?.ai_reachable
                  ? 'ไม่สามารถเชื่อมต่อบริการ AI'
                  : data.training_running
                    ? 'มีการเทรนกำลังทำงานอยู่'
                    : !canTrain
                      ? `ต้องมีภาพที่ยืนยันผลแล้วอย่างน้อย ${data.dataset.min_required} ภาพ`
                      : undefined
              }
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-xl font-medium text-[13px] shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              <span>เริ่มเทรนโมเดลใหม่</span>
            </button>
          )}
        </div>
      </div>

      {page.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">{page.error}</div>
      )}
      {data && !data.ai_reachable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div>
            ไม่สามารถเชื่อมต่อบริการ AI · แสดงประวัติที่บันทึกไว้ล่าสุด และยังเทรนหรือเปลี่ยนโมเดลไม่ได้
            {data.ai_error && <div className="font-normal mt-0.5">สาเหตุ: {data.ai_error}</div>}
          </div>
        </div>
      )}
      {data && data.active && data.loaded && data.active !== data.loaded && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
          บริการ AI โหลด {data.active} ไม่สำเร็จ ขณะนี้ใช้ {data.loaded} แทน
        </div>
      )}

      {running && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between gap-3 text-[13.5px]">
            <div className="flex items-center gap-2 font-bold text-blue-900">
              <Loader2 className="w-4 h-4 animate-spin" />
              กำลังเทรน {running.version}
            </div>
            <button onClick={() => setDetailId(running.id)} className="text-[12.5px] font-semibold text-[#1E58E6] hover:underline cursor-pointer">
              ดู log
            </button>
          </div>
          <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
            <div className="h-full bg-[#1E58E6] transition-all" style={{ width: `${Math.round((running.progress ?? 0) * 100)}%` }} />
          </div>
          <div className="text-[12px] text-blue-700">
            {running.message ?? STATE_LABEL[running.state]} · {Math.round((running.progress ?? 0) * 100)}%
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ActiveModelCard version={active} />
        <DatasetCard data={data} />
        {data ? (
          // Remount when the saved values change so the form starts from them.
          <ScheduleCard key={JSON.stringify(data.schedule)} schedule={data.schedule} isAdmin={isAdmin} onSaved={page.reload} />
        ) : (
          <Card icon={Clock} title="เทรนอัตโนมัติตามรอบเวลา">
            <div className="text-[13px] text-slate-400">กำลังโหลด...</div>
          </Card>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#1E58E6]" />
          <h2 className="text-[15px] font-bold text-slate-900">ประวัติเวอร์ชันโมเดล</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-slate-500 text-[12px]">
              <tr>
                <th className="text-left font-semibold px-5 py-2.5">เวอร์ชัน</th>
                <th className="text-left font-semibold px-3 py-2.5">วันที่</th>
                <th className="text-left font-semibold px-3 py-2.5">ที่มา</th>
                <th className="text-right font-semibold px-3 py-2.5">ภาพเทรน / ทดสอบ</th>
                <th className="text-right font-semibold px-3 py-2.5">Condition</th>
                <th className="text-right font-semibold px-3 py-2.5">Grade</th>
                <th className="text-left font-semibold px-3 py-2.5">สถานะ</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.versions.map((v) => {
                const h = headline(v);
                const ds = v.metadata?.dataset;
                return (
                  <tr key={v.id} className={v.is_active ? 'bg-emerald-50/40' : ''}>
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-900 break-all">{v.version}</div>
                      <div className="flex gap-1.5 mt-1">
                        {v.is_active && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10.5px] font-bold">ใช้งานอยู่</span>
                        )}
                        {v.is_builtin && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10.5px] font-bold">ตั้งต้น</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                      {fmtDateTime(v.metadata?.trained_at_utc ?? v.created_at)}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {TRIGGER_LABEL[v.trigger] ?? v.trigger}
                      {v.started_by && <div className="text-[11.5px] text-slate-400">{v.started_by.full_name}</div>}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700 whitespace-nowrap">
                      {ds ? `${ds.train} / ${ds.test}` : v.metadata?.development_n ? `${v.metadata.development_n} (CV)` : '-'}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className="font-bold text-slate-900">{h ? pct(h.condition) : '-'}</span>{' '}
                      {h && <Delta value={h.condition} base={h.baseCondition} />}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span className="font-bold text-slate-900">{h ? pct(h.grade) : '-'}</span>{' '}
                      {h && <Delta value={h.grade} base={h.baseGrade} />}
                    </td>
                    <td className="px-3 py-3"><StateBadge v={v} /></td>
                    <td className="px-5 py-3 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => setDetailId(v.id)}
                        className="text-[12.5px] font-semibold text-[#1E58E6] hover:underline cursor-pointer"
                      >
                        รายละเอียด
                      </button>
                      {isAdmin && v.state === 'succeeded' && !v.is_active && (
                        <button
                          onClick={() => setActivating(v)}
                          disabled={!data.ai_reachable}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {v.is_builtin ? 'ย้อนกลับไปใช้' : 'ใช้งานเวอร์ชันนี้'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {data && data.versions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-400">ยังไม่มีข้อมูลเวอร์ชันโมเดล</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 text-[11.5px] text-slate-500">
          ตัวเลขสีเขียว/แดง = ต่างจากโมเดลก่อนหน้า (จุดเปอร์เซ็นต์) เมื่อทดสอบกับภาพชุดเดียวกัน ·
          ชุดทดสอบเป็นผู้ป่วยที่ไม่ได้ใช้เทรน
        </div>
      </div>

      {detailId !== null && <VersionDetailModal id={detailId} onClose={() => setDetailId(null)} />}
      {activating && (
        <ActivateModal
          version={activating}
          current={active}
          onClose={() => setActivating(null)}
          onDone={() => {
            setActivating(null);
            page.reload();
          }}
        />
      )}
      {showTrain && data && (
        <TrainModal
          data={data}
          onClose={() => setShowTrain(false)}
          onStarted={() => {
            setShowTrain(false);
            page.reload();
          }}
        />
      )}
    </div>
  );
};

const Card: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E58E6] flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <h3 className="text-[14.5px] font-bold text-slate-900">{title}</h3>
    </div>
    {children}
  </div>
);

const ActiveModelCard: React.FC<{ version: ModelVersion | null }> = ({ version }) => {
  const h = version ? headline(version) : null;
  return (
    <Card icon={BrainCircuit} title="โมเดลที่ใช้งานอยู่">
      {version ? (
        <div className="space-y-2.5">
          <div className="font-extrabold text-slate-900 text-[14px] break-all">{version.version}</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[11.5px] text-slate-500">Condition accuracy</div>
              <div className="text-xl font-extrabold text-slate-900">{h ? pct(h.condition) : '-'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-[11.5px] text-slate-500">Grade accuracy</div>
              <div className="text-xl font-extrabold text-slate-900">{h ? pct(h.grade) : '-'}</div>
            </div>
          </div>
          <div className="text-[12px] text-slate-500">
            {h?.source ?? ''}
            {version.activated_at && (
              <> · เปิดใช้ {fmtDateTime(version.activated_at)}{version.activated_by ? ` โดย ${version.activated_by.full_name}` : ''}</>
            )}
          </div>
        </div>
      ) : (
        <div className="text-[13px] text-slate-400">ยังไม่ทราบ (บริการ AI ยังไม่ตอบกลับ)</div>
      )}
    </Card>
  );
};

const DatasetCard: React.FC<{ data: ModelVersionsPage | null }> = ({ data }) => {
  const ds = data?.dataset;
  const ratio = ds ? Math.min(1, ds.labelled / ds.min_required) : 0;
  return (
    <Card icon={Database} title="ข้อมูลสำหรับเทรน">
      {ds ? (
        <div className="space-y-2.5">
          <div className="flex items-end gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{ds.labelled}</span>
            <span className="text-[12.5px] text-slate-500 pb-1">ภาพที่ยืนยันผลแล้ว · ผู้ป่วย {ds.patients} คน</span>
          </div>
          <div className="text-[12.5px] text-slate-600">
            ใหม่ตั้งแต่เทรนครั้งล่าสุด <span className="font-bold text-slate-900">{ds.new_since_last_training}</span> ภาพ
          </div>
          {ds.labelled < ds.min_required && (
            <div className="space-y-1">
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${ratio * 100}%` }} />
              </div>
              <div className="text-[11.5px] text-amber-700">ต้องมีอย่างน้อย {ds.min_required} ภาพจึงจะเทรนได้</div>
            </div>
          )}
          <Counts title="ภาวะ" values={ds.condition} />
          <Counts title="Grade" values={ds.grade} />
          {Object.keys(ds.excluded).length > 0 && (
            <div className="text-[11.5px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
              <div className="font-semibold text-slate-600 pt-1.5">ไม่ได้นำมาเทรน</div>
              {Object.entries(ds.excluded).map(([k, n]) => (
                <div key={k}>{excludedLabel(k)}: {n} ภาพ</div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-[13px] text-slate-400">กำลังโหลด...</div>
      )}
    </Card>
  );
};

const ScheduleCard: React.FC<{ schedule: ModelVersionsPage['schedule']; isAdmin: boolean; onSaved: () => void }> = ({
  schedule,
  isAdmin,
  onSaved
}) => {
  const [enabled, setEnabled] = useState(schedule.auto_retrain_enabled);
  const [days, setDays] = useState(schedule.auto_retrain_interval_days);
  const [minNew, setMinNew] = useState(schedule.auto_retrain_min_new_labels);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put<SystemSettings>('/api/settings', {
        auto_retrain_enabled: enabled,
        auto_retrain_interval_days: Math.max(1, days),
        auto_retrain_min_new_labels: Math.max(1, minNew)
      });
      setMessage('บันทึกแล้ว');
      onSaved();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card icon={Clock} title="เทรนอัตโนมัติตามรอบเวลา">
      <label className="flex items-center justify-between gap-3 text-[13px] font-medium text-slate-700">
        <span>เปิดการเทรนอัตโนมัติ</span>
        <input
          type="checkbox"
          checked={enabled}
          disabled={!isAdmin}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4 accent-[#1E58E6]"
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-[13px] text-slate-700">
        <span>เทรนทุก (วัน)</span>
        <input
          type="number"
          min={1}
          value={days}
          disabled={!isAdmin}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-right"
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-[13px] text-slate-700">
        <span>เมื่อมีภาพยืนยันใหม่อย่างน้อย</span>
        <input
          type="number"
          min={1}
          value={minNew}
          disabled={!isAdmin}
          onChange={(e) => setMinNew(Number(e.target.value))}
          className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-right"
        />
      </label>
      <p className="text-[11.5px] text-slate-500 leading-relaxed">
        โมเดลที่เทรนอัตโนมัติจะยังไม่ถูกใช้กับผู้ป่วย จนกว่าผู้ดูแลระบบจะตรวจผลและกด “ใช้งานเวอร์ชันนี้”
      </p>
      {isAdmin && (
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-3.5 py-2 bg-[#1E58E6] hover:bg-blue-700 text-white rounded-lg text-[12.5px] font-semibold cursor-pointer disabled:opacity-60"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          {message && <span className="text-[12px] text-slate-500">{message}</span>}
        </div>
      )}
    </Card>
  );
};

const MetricRow: React.FC<{ label: string; field: keyof ClassMetrics; next?: ClassMetrics; base?: ClassMetrics }> = ({
  label,
  field,
  next,
  base
}) => {
  const a = (next?.[field] as number | null | undefined) ?? null;
  const b = (base?.[field] as number | null | undefined) ?? null;
  return (
    <tr>
      <td className="py-1.5 text-slate-500">{label}</td>
      <td className="py-1.5 text-right font-bold text-slate-900">{pct(a)}</td>
      <td className="py-1.5 text-right text-slate-600">{pct(b)}</td>
      <td className="py-1.5 text-right"><Delta value={a} base={b} /></td>
    </tr>
  );
};

const Confusion: React.FC<{ title: string; labels: string[]; matrix?: number[][] }> = ({ title, labels, matrix }) =>
  matrix ? (
    <div>
      <div className="text-[12px] font-semibold text-slate-600 mb-1">{title}</div>
      <table className="text-[11.5px] border border-slate-200">
        <thead>
          <tr>
            <th className="px-2 py-1 bg-slate-50 text-slate-400 font-medium">จริง \ ทาย</th>
            {labels.map((l) => (
              <th key={l} className="px-2 py-1 bg-slate-50 font-semibold text-slate-600">{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={labels[i]}>
              <th className="px-2 py-1 bg-slate-50 font-semibold text-slate-600">{labels[i]}</th>
              {row.map((n, j) => (
                <td key={j} className={`px-2 py-1 text-center ${i === j ? 'bg-emerald-50 font-bold text-emerald-800' : 'text-slate-700'}`}>
                  {n}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;

const ModalShell: React.FC<{ title: string; subtitle?: string; wide?: boolean; onClose: () => void; children: React.ReactNode }> = ({
  title,
  subtitle,
  wide,
  onClose,
  children
}) => (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
    <div className={`bg-white rounded-3xl w-full ${wide ? 'max-w-[860px]' : 'max-w-[540px]'} max-h-[90vh] overflow-y-auto p-6 sm:p-7 space-y-5 shadow-2xl relative`}>
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="pr-10">
        <span className="text-[11px] font-bold text-[#1E58E6] tracking-wider uppercase block">PEDIVEINCARE AI</span>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5 break-all">{title}</h2>
        {subtitle && <p className="text-slate-500 text-[13px] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  </div>
);

const VersionDetailModal: React.FC<{ id: number; onClose: () => void }> = ({ id, onClose }) => {
  const detail = useApi(() => api.get<ModelVersion>(`/api/model-versions/${id}`), [id]);
  const v = detail.data;
  const { reload } = detail;
  const live = !!v && isRunning(v);
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(reload, 3000);
    return () => clearInterval(timer);
  }, [live, reload]);

  const m = v?.metadata;
  const ds = m?.dataset;
  const next = m?.test_metrics;
  const base = m?.base_test_metrics;

  return (
    <ModalShell title={v?.version ?? 'กำลังโหลด...'} subtitle={v ? `${STATE_LABEL[v.state] ?? v.state} · ${TRIGGER_LABEL[v.trigger] ?? v.trigger}` : undefined} wide onClose={onClose}>
      {detail.error && <div className="text-[13px] text-red-600">{detail.error}</div>}
      {v && (
        <div className="space-y-5 text-[13px]">
          {v.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{v.error}</div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Info label="เริ่มจากโมเดล" value={v.base_version ?? '-'} />
            <Info label="เทรนเมื่อ" value={fmtDateTime(m?.trained_at_utc ?? v.created_at)} />
            <Info label="ใช้เวลา" value={m?.duration_seconds ? `${Math.round(m.duration_seconds / 60)} นาที` : '-'} />
            <Info label="อุปกรณ์" value={m?.device ?? '-'} />
          </div>
          {v.notes && <div className="text-slate-600"><span className="font-semibold">หมายเหตุ:</span> {v.notes}</div>}

          {next && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900">ผลทดสอบ (ผู้ป่วยที่ไม่ได้ใช้เทรน {next.condition.n} ภาพ)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['condition', 'grade'] as const).map((task) => (
                  <table key={task} className="w-full">
                    <thead className="text-[11.5px] text-slate-400">
                      <tr>
                        <th className="text-left font-semibold">{task === 'condition' ? 'INF / PHL' : 'Grade 1–4'}</th>
                        <th className="text-right font-semibold">เวอร์ชันนี้</th>
                        <th className="text-right font-semibold">โมเดลก่อนหน้า</th>
                        <th className="text-right font-semibold">ต่าง</th>
                      </tr>
                    </thead>
                    <tbody>
                      <MetricRow label="Accuracy" field="accuracy" next={next[task]} base={base?.[task]} />
                      <MetricRow label="Balanced accuracy" field="balanced_accuracy" next={next[task]} base={base?.[task]} />
                      <MetricRow label="Macro F1" field="macro_f1" next={next[task]} base={base?.[task]} />
                    </tbody>
                  </table>
                ))}
              </div>
              <div className="flex flex-wrap gap-6">
                <Confusion title="Condition (เวอร์ชันนี้)" labels={['INF', 'PHL']} matrix={next.condition.confusion_matrix} />
                <Confusion title="Grade (เวอร์ชันนี้)" labels={['1', '2', '3', '4']} matrix={next.grade.confusion_matrix} />
              </div>
            </div>
          )}
          {!next && m?.oof_condition && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900">ผลจากผู้พัฒนาโมเดลตั้งต้น (cross-validation {m.development_n} ภาพ)</h3>
              <div className="flex flex-wrap gap-6">
                <Confusion title={`Condition · acc ${pct(m.oof_condition.accuracy)}`} labels={['INF', 'PHL']} matrix={m.oof_condition.confusion_matrix} />
                <Confusion title={`Grade · acc ${pct(m.oof_grade?.accuracy)}`} labels={['1', '2', '3', '4']} matrix={m.oof_grade?.confusion_matrix} />
              </div>
            </div>
          )}

          {ds && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900">ข้อมูลที่ใช้</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Info label="ภาพที่ส่งมา" value={`${ds.received}`} />
                <Info label="ใช้ได้" value={`${ds.usable}`} />
                <Info label="ชุดเทรน" value={`${ds.train} ภาพ / ${ds.train_labels.patients} คน`} />
                <Info label="ชุดทดสอบ" value={`${ds.test} ภาพ / ${ds.test_labels.patients} คน`} />
              </div>
              <Counts title="เทรน · ภาวะ" values={ds.train_labels.condition} />
              <Counts title="เทรน · Grade" values={ds.train_labels.grade} />
              <Counts title="ทดสอบ · ภาวะ" values={ds.test_labels.condition} />
              <Counts title="ทดสอบ · Grade" values={ds.test_labels.grade} />
              {Object.keys(ds.skipped).length > 0 && (
                <div className="text-[12px] text-slate-500">
                  ข้ามไป: {Object.entries(ds.skipped).map(([k, n]) => `${excludedLabel(k)} ${n}`).join(' · ')}
                </div>
              )}
              {m?.config && (
                <div className="text-[12px] text-slate-500">
                  Epochs {m.config.epochs} · batch {m.config.batch_size} · lr {m.config.learning_rate} · {ds.split}
                </div>
              )}
            </div>
          )}

          {!v.is_builtin && (
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                Training log {live && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1E58E6]" />}
              </h3>
              <pre className="bg-slate-900 text-slate-100 text-[11.5px] leading-relaxed rounded-xl p-4 max-h-80 overflow-auto whitespace-pre-wrap">
                {v.log || 'ยังไม่มี log'}
              </pre>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 p-3">
    <div className="text-[11.5px] text-slate-500">{label}</div>
    <div className="font-bold text-slate-900 break-all">{value}</div>
  </div>
);

const ActivateModal: React.FC<{ version: ModelVersion; current: ModelVersion | null; onClose: () => void; onDone: () => void }> = ({
  version,
  current,
  onClose,
  onDone
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const h = headline(version);
  const confirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/model-versions/${version.id}/activate`);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'เปลี่ยนโมเดลไม่สำเร็จ');
      setSaving(false);
    }
  };
  return (
    <ModalShell title={version.is_builtin ? 'ย้อนกลับไปใช้โมเดลตั้งต้น' : 'ใช้งานโมเดลเวอร์ชันนี้'} onClose={onClose}>
      <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 text-[13.5px]">
        <div className="p-3.5 flex justify-between gap-3">
          <span className="text-slate-400">ปัจจุบัน</span>
          <span className="font-bold text-slate-900 text-right break-all">{current?.version ?? '-'}</span>
        </div>
        <div className="p-3.5 flex justify-between gap-3">
          <span className="text-slate-400">เปลี่ยนเป็น</span>
          <span className="font-bold text-slate-900 text-right break-all">{version.version}</span>
        </div>
        {h && (
          <div className="p-3.5 flex justify-between gap-3">
            <span className="text-slate-400">Accuracy ({h.source})</span>
            <span className="font-bold text-slate-900">
              Condition {pct(h.condition)} <Delta value={h.condition} base={h.baseCondition} /> · Grade {pct(h.grade)}{' '}
              <Delta value={h.grade} base={h.baseGrade} />
            </span>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800 flex gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          ผลการวิเคราะห์ภาพทุกครั้งหลังจากนี้จะใช้โมเดลเวอร์ชันนี้ทันที และบันทึกชื่อเวอร์ชันไว้กับผลแต่ละครั้ง
          เปลี่ยนกลับได้ตลอดจากหน้านี้ ผลของ AI ยังต้องให้บุคลากรยืนยันเสมอ
        </span>
      </div>
      {error && <div className="text-[13px] text-red-600">{error}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium cursor-pointer">ยกเลิก</button>
        <button
          onClick={confirm}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold cursor-pointer disabled:opacity-60"
        >
          {version.is_builtin ? <RotateCcw className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {saving ? 'กำลังเปลี่ยน...' : 'ยืนยัน'}
        </button>
      </div>
    </ModalShell>
  );
};

const TrainModal: React.FC<{ data: ModelVersionsPage; onClose: () => void; onStarted: () => void }> = ({
  data,
  onClose,
  onStarted
}) => {
  const [notes, setNotes] = useState('');
  const [epochs, setEpochs] = useState(15);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ds = data.dataset;
  const start = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post('/api/model-versions/train', { notes: notes.trim() || null, epochs });
      onStarted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'เริ่มเทรนไม่สำเร็จ');
      setSaving(false);
    }
  };
  return (
    <ModalShell title="เริ่มเทรนโมเดลใหม่" subtitle={`เทรนต่อจาก ${data.active ?? '-'}`} onClose={onClose}>
      <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 text-[13.5px]">
        <div className="p-3.5 flex justify-between">
          <span className="text-slate-400">ภาพที่ยืนยันผลแล้ว</span>
          <span className="font-bold text-slate-900">{ds.labelled} ภาพ · {ds.patients} คน</span>
        </div>
        <div className="p-3.5 flex justify-between">
          <span className="text-slate-400">ใหม่ตั้งแต่ครั้งล่าสุด</span>
          <span className="font-bold text-slate-900">{ds.new_since_last_training} ภาพ</span>
        </div>
      </div>
      <label className="block space-y-1.5 text-[13px]">
        <span className="font-semibold text-slate-700">จำนวนรอบการเทรน (epochs)</span>
        <input
          type="number"
          min={1}
          max={100}
          value={epochs}
          onChange={(e) => setEpochs(Number(e.target.value))}
          className="w-28 px-3 py-2 rounded-lg border border-slate-200"
        />
      </label>
      <label className="block space-y-1.5 text-[13px]">
        <span className="font-semibold text-slate-700">หมายเหตุ (ไม่บังคับ)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-slate-200"
          placeholder="เช่น เพิ่มข้อมูลเดือนพฤศจิกายน"
        />
      </label>
      <p className="text-[12px] text-slate-500 leading-relaxed">
        ระบบแยกผู้ป่วยประมาณ 20% ไว้ทดสอบ แล้วเทียบผลกับโมเดลปัจจุบันบนภาพชุดเดียวกัน
        เมื่อเทรนเสร็จ โมเดลใหม่จะยังไม่ถูกใช้งานจนกว่าจะกด “ใช้งานเวอร์ชันนี้”
      </p>
      {error && <div className="text-[13px] text-red-600">{error}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-slate-200 text-[13px] font-medium cursor-pointer">ยกเลิก</button>
        <button
          onClick={start}
          disabled={saving || epochs < 1 || epochs > 100}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E58E6] hover:bg-blue-700 text-white text-[13px] font-semibold cursor-pointer disabled:opacity-60"
        >
          <Play className="w-4 h-4" />
          {saving ? 'กำลังเริ่ม...' : 'เริ่มเทรน'}
        </button>
      </div>
    </ModalShell>
  );
};
