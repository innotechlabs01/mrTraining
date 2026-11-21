'use client';

import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface MonthData {
  month: string;
  Gold: number;
  Silver: number;
  Platinum: number;
}

const DEFAULT_DATA: MonthData[] = [
  { month: 'Jan', Gold: 380, Silver: 540, Platinum: 420 },
  { month: 'Feb', Gold: 450, Silver: 610, Platinum: 480 },
  { month: 'Mar', Gold: 490, Silver: 580, Platinum: 550 },
  { month: 'Apr', Gold: 620, Silver: 670, Platinum: 600 },
  { month: 'May', Gold: 780, Silver: 640, Platinum: 690 },
  { month: 'Jun', Gold: 920, Silver: 710, Platinum: 750 },
  { month: 'Jul', Gold: 840, Silver: 690, Platinum: 720 },
  { month: 'Aug', Gold: 890, Silver: 730, Platinum: 780 },
  { month: 'Sep', Gold: 1050, Silver: 790, Platinum: 880 },
  { month: 'Nov', Gold: 980, Silver: 760, Platinum: 840 },
  { month: 'Oct', Gold: 860, Silver: 720, Platinum: 790 },
  { month: 'Dec', Gold: 1240, Silver: 850, Platinum: 950 },
];

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-2xl border border-[#26262B] bg-[#16161A]/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md">
      <p className="font-bold text-[#A1A1AA] mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-[#E07A3D]" /> Gold:
          </span>
          <span className="font-mono font-bold text-white">
            {payload.find((p) => p.dataKey === 'Gold')?.value ?? 0}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <span className="h-2 w-2 rounded-full bg-[#E2E8F0]" /> Silver:
          </span>
          <span className="font-mono font-bold text-white">
            {payload.find((p) => p.dataKey === 'Silver')?.value ?? 0}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-[#10B981]" /> Platinum:
          </span>
          <span className="font-mono font-bold text-white">
            {payload.find((p) => p.dataKey === 'Platinum')?.value ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MembershipStatusChart({ data = DEFAULT_DATA }: { data?: MonthData[] }) {
  const [activeTier, setActiveTier] = useState<'All' | 'Gold' | 'Silver' | 'Platinum'>('All');

  return (
    <div className="flex flex-col justify-between rounded-3xl border border-[#26262B] bg-[#16161A] p-6 text-white shadow-xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-base font-bold tracking-tight text-white">
            Membership Status Report
          </h3>
          <p className="text-xs text-[#8E8E93]">Crecimiento y retención por nivel de membresía</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTier((t) => (t === 'Gold' ? 'All' : 'Gold'))}
            className="flex items-center gap-1.5 text-[#E07A3D] hover:opacity-80 transition-opacity"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#E07A3D]" />
            Gold
          </button>
          <button
            type="button"
            onClick={() => setActiveTier((t) => (t === 'Silver' ? 'All' : 'Silver'))}
            className="flex items-center gap-1.5 text-slate-300 hover:opacity-80 transition-opacity"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#E2E8F0]" />
            Silver
          </button>
          <button
            type="button"
            onClick={() => setActiveTier((t) => (t === 'Platinum' ? 'All' : 'Platinum'))}
            className="flex items-center gap-1.5 text-emerald-400 hover:opacity-80 transition-opacity"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
            Platinum
          </button>
        </div>
      </div>

      {/* Line Chart */}
      <div className="h-64 sm:h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222228" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#71717A"
              tickLine={false}
              axisLine={{ stroke: '#26262B' }}
              tick={{ fontSize: 11, fill: '#8E8E93' }}
            />
            <YAxis
              stroke="#71717A"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#8E8E93' }}
              domain={[0, 1400]}
              ticks={[0, 200, 400, 600, 800, 1000, 1200]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="Gold"
              stroke="#E07A3D"
              strokeWidth={activeTier === 'Gold' || activeTier === 'All' ? 2.5 : 1}
              strokeOpacity={activeTier === 'Silver' || activeTier === 'Platinum' ? 0.2 : 1}
              dot={{ r: 3, fill: '#E07A3D', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#E07A3D', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="Silver"
              stroke="#E2E8F0"
              strokeWidth={activeTier === 'Silver' || activeTier === 'All' ? 2 : 1}
              strokeOpacity={activeTier === 'Gold' || activeTier === 'Platinum' ? 0.2 : 1}
              dot={{ r: 2.5, fill: '#E2E8F0', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#E2E8F0', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="Platinum"
              stroke="#10B981"
              strokeWidth={activeTier === 'Platinum' || activeTier === 'All' ? 2 : 1}
              strokeOpacity={activeTier === 'Gold' || activeTier === 'Silver' ? 0.2 : 1}
              dot={{ r: 2.5, fill: '#10B981', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#10B981', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
