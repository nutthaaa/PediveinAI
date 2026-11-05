import React, { useState } from 'react';
import { AiReviewDetailModal } from './AiReviewDetailModal';
import { api } from '../api/client';
import { useApi } from '../api/useApi';
import { fmtTime, pct } from '../api/format';
import { hnAn } from '../api/selection';
import type { QueueItem } from '../api/types';
import {
  Search,
  CheckCircle2,
  Sparkles,
  Droplet,
  Eye,
} from 'lucide-react';

const PhlebitisIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
    <path d="M12 4c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
    <path d="M15.5 5c-1.2 1.8-1.2 3.8 0 5.6s1.2 3.8 0 5.6-1.2 3.8 0 5.6" />
  </svg>
);

interface AiReviewPendingProps {
  onNavigate?: (nav: string) => void;
}

export const AiReviewPending: React.FC<AiReviewPendingProps> = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedReviewItem, setSelectedReviewItem] = useState<any | null>(null);

  const queue = useApi(() => api.get<QueueItem[]>('/api/analyses/review-queue'), []);

  const reviewItems = (queue.data ?? []).map((q) => {
    const a = q.analysis;
    const view = a.conditions[q.condition];
    const name = q.condition === 'infiltration' ? 'Infiltration' : 'Phlebitis';
    return {
      id: q.key,
      source: q,
      patientName: a.patient.full_name,
      hnAn: hnAn(a.patient),
      hisConfirmed: false,
      site: a.site.location,
      vein: a.site.vein,
      needleNum: a.site.label,
      type: q.condition,
      badgeText: view.flagged ? `${name} ควรตรวจสอบ` : `${name} ยืนยันผล`,
      abnormalStatus: view.flagged ? `-AI พบข้อสังเกต (Grade ${view.ai_grade})` : '-AI ไม่พบข้อสังเกต',
      isAbnormalTextRed: view.flagged,
      reviewStatus: a.assigned_reviewer ? `มอบหมาย: ${a.assigned_reviewer.full_name}` : 'รอตรวจสอบ...',
      confidence: pct(view.probability),
      time: `วิเคราะห์เวลา ${fmtTime(a.created_at)}`,
      buttonText: `ทบทวน ${name}`
    };
  });

  const filteredItems = reviewItems.filter((item) => {
    const matchesSearch =
      item.patientName.includes(searchQuery) ||
      item.hnAn.includes(searchQuery) ||
      item.site.includes(searchQuery) ||
      item.vein.includes(searchQuery);

    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'infiltration' && item.type === 'infiltration') ||
      (typeFilter === 'phlebitis' && item.type === 'phlebitis');

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-5">
      {/* Top Header Section */}
      <div>
        <span className="text-[12px] font-bold text-blue-600 tracking-wide uppercase">
          ผลการวิเคราะห์ด้วย AI
        </span>
        <h1 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight mt-0.5">
          รายการผล AI ที่รอการทบทวน
        </h1>
        <p className="text-slate-500 text-[13px] mt-1">
          แสดงผลแยกตาม Infiltration และ Phlebitis โดยผลจาก AI เป็นข้อมูลสนับสนุนและไม่ใช่การวินิจฉัย
        </p>
      </div>

      {/* 2 Metric Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: INFILTRATION */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#0086FF] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Droplet className="w-5 h-5 fill-white" />
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {reviewItems.filter((i) => i.type === 'infiltration').length}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] font-bold text-blue-600 uppercase tracking-wide">
              INFILTRATION
            </div>
            <div className="text-[12px] text-slate-400 font-normal mt-0.5">
              บวม · เย็น · ตึง · สารน้ำไหลช้า
            </div>
          </div>
        </div>

        {/* Card 2: PHLEBITIS */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EF4444] text-white flex items-center justify-center shrink-0 shadow-xs">
              <PhlebitisIcon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {reviewItems.filter((i) => i.type === 'phlebitis').length}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[12px] font-bold text-red-600 uppercase tracking-wide">
              PHLEBITIS
            </div>
            <div className="text-[12px] text-slate-400 font-normal mt-0.5">
              แดง · อุ่น · กดเจ็บ · เปลี่ยนแปลงตามแนวหลอดเลือด
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Control Bar Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ / HN / AN / Ward / เตียง"
            className="pl-9 pr-4 py-2 w-full rounded-xl border border-slate-200 text-[14px] bg-white focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        {/* Dropdown Filter */}
        <div className="flex items-center gap-2 text-[14px] text-slate-600 self-end sm:self-auto">
          <span>สถานะ:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[14px] font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">ทั้งหมด</option>
            <option value="infiltration">INFILTRATION</option>
            <option value="phlebitis">PHLEBITIS</option>
          </select>
        </div>
      </div>

      {/* Main Data Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[14px] font-bold text-slate-700">
                <th className="py-3.5 px-5">ผู้ป่วย</th>
                <th className="py-3.5 px-4">IV SITE</th>
                <th className="py-3.5 px-4">ประเภท</th>
                <th className="py-3.5 px-4">สถานะความผิดปกติ</th>
                <th className="py-3.5 px-4 text-center">ระดับความเชื่อมั่น ของ AI ล่าสุด</th>
                <th className="py-3.5 px-5 text-right sm:text-center">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[14px]">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Patient Info */}
                  <td className="py-4 px-5">
                    <div className="font-bold text-slate-900">{item.patientName}</div>
                    <div className="text-[12px] text-slate-400 font-normal mt-0.5">{item.hnAn}</div>
                    {item.hisConfirmed && (
                      <span className="inline-flex items-center gap-1.5 bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full text-[11px] font-medium mt-1.5 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] stroke-[2.5]" />
                        <span>ยืนยันจาก HIS</span>
                      </span>
                    )}
                  </td>

                  {/* IV Site */}
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900">{item.site}</div>
                    <div className="text-[12px] text-slate-400 font-normal mt-0.5">{item.vein}</div>
                    <div className="text-[12px] text-slate-500 font-medium mt-0.5">{item.needleNum}</div>
                  </td>

                  {/* Type Badge */}
                  <td className="py-4 px-4">
                    {item.type === 'infiltration' ? (
                      <span className="bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] px-3.5 py-1.5 rounded-full text-[12px] font-bold inline-flex items-center gap-2 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-[#2563EB] stroke-[2]" />
                        <span>{item.badgeText}</span>
                      </span>
                    ) : (
                      <span className="bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] px-3.5 py-1.5 rounded-full text-[12px] font-bold inline-flex items-center gap-2 shadow-2xs">
                        <PhlebitisIcon className="w-3.5 h-3.5 text-[#DC2626]" />
                        <span>{item.badgeText}</span>
                      </span>
                    )}
                  </td>

                  {/* Abnormality Status */}
                  <td className="py-4 px-4">
                    <div
                      className={`font-bold text-[14px] ${item.isAbnormalTextRed ? 'text-[#DC2626]' : 'text-slate-900'
                        }`}
                    >
                      {item.abnormalStatus}
                    </div>
                    <div className="text-[12px] text-slate-400 font-normal mt-0.5">
                      {item.reviewStatus}
                    </div>
                  </td>

                  {/* Confidence */}
                  <td className="py-4 px-4 text-center">
                    <div className="font-bold text-blue-600 text-base">{item.confidence}</div>
                    <div className="text-[11px] text-blue-500 font-medium mt-0.5">{item.time}</div>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-5 text-right sm:text-center">
                    <button
                      onClick={() => setSelectedReviewItem(item)}
                      className="bg-[#1E58E6] hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-[13px] inline-flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{item.buttonText}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            {queue.loading ? 'กำลังโหลด...' : queue.error ? <span className="text-red-600">{queue.error}</span> : `ทั้งหมด ${filteredItems.length} รายการ`}
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

      {/* Detail Review Modal Popup */}
      {selectedReviewItem && (
        <AiReviewDetailModal
          item={{ type: selectedReviewItem.source.condition, analysis: selectedReviewItem.source.analysis }}
          onClose={() => setSelectedReviewItem(null)}
          onSaveSuccess={() => queue.reload()}
          onDeleted={() => queue.reload()}
        />
      )}
    </div>
  );
};
