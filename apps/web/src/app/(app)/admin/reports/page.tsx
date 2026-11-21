'use client';

import {
  BarChart3,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';

const RETENTION_DATA = [
  { month: 'Ene', retention: 92, churn: 8 },
  { month: 'Feb', retention: 93, churn: 7 },
  { month: 'Mar', retention: 91, churn: 9 },
  { month: 'Abr', retention: 94, churn: 6 },
  { month: 'May', retention: 95, churn: 5 },
  { month: 'Jun', retention: 96, churn: 4 },
  { month: 'Jul', retention: 94, churn: 6 },
  { month: 'Ago', retention: 95, churn: 5 },
  { month: 'Sep', retention: 97, churn: 3 },
  { month: 'Oct', retention: 96, churn: 4 },
  { month: 'Nov', retention: 98, churn: 2 },
];

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#26262B] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E07A3D]/15 text-[#E07A3D]">
              <BarChart3 size={20} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Reports & Club Analytics
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#8E8E93]">
            Métricas de retención, tasa de abandono (churn), ingresos acumulados y uso de instalaciones.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert('Descargando reporte consolidado en formato CSV...')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#26262B] bg-[#16161A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1E1E24] transition-colors"
        >
          <Download size={14} /> Exportar Reporte Ejecutivo
        </button>
      </div>

      {/* Quick KPI stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            Tasa de Retención
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-400">96.4%</p>
          <p className="mt-1 text-[10px] text-emerald-400 font-semibold">+2.1% este trimestre</p>
        </div>
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
            Churn Rate Mensual
          </p>
          <p className="mt-1 text-2xl font-black text-rose-400">3.6%</p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">Bajo el promedio del sector (7%)</p>
        </div>
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            LTV Promedio (Socio)
          </p>
          <p className="mt-1 text-2xl font-black text-white">$1,850,000</p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">Permanencia de 11.2 meses</p>
        </div>
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#E07A3D]">
            Puntos Loyalty Canjeados
          </p>
          <p className="mt-1 text-2xl font-black text-white">84,500</p>
          <p className="mt-1 text-[10px] text-emerald-400 font-semibold">1,240 vouchers activos</p>
        </div>
      </div>

      {/* Main Retention Area Chart */}
      <div className="rounded-3xl border border-[#26262B] bg-[#16161A] p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#26262B] pb-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Curva de Retención de Socios vs Churn</h3>
            <p className="text-xs text-[#8E8E93]">Evolución porcentual de socios leales en 2026</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Retención (%)
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> Churn (%)
            </span>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={RETENTION_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#222228" vertical={false} />
              <XAxis dataKey="month" stroke="#71717A" tick={{ fontSize: 11, fill: '#8E8E93' }} />
              <YAxis stroke="#71717A" tick={{ fontSize: 11, fill: '#8E8E93' }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#16161A',
                  border: '1px solid #26262B',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                }}
              />
              <Area
                type="monotone"
                dataKey="retention"
                stroke="#10B981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#retentionGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
