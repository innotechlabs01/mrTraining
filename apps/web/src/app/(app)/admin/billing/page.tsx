'use client';

import { useState } from 'react';
import {
  Receipt,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal, Field } from '@/components/admin/ui';

interface BillingRecord {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  planName: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  date: string;
  paymentMethod: string;
}

const BILLING_DATA: BillingRecord[] = [
  {
    id: 'inv-1',
    invoiceNumber: 'INV-2026-8901',
    customerName: 'Carlos Mendoza',
    customerEmail: 'carlos.mendoza@email.com',
    planName: 'Membresía Platinum Anual',
    amount: 1450000,
    status: 'paid',
    date: '18 Nov 2026',
    paymentMethod: 'Tarjeta Crédito (Wompi)',
  },
  {
    id: 'inv-2',
    invoiceNumber: 'INV-2026-8902',
    customerName: 'Valentina Restrepo',
    customerEmail: 'valentina.r@email.com',
    planName: 'Membresía Gold Mensual',
    amount: 195000,
    status: 'paid',
    date: '17 Nov 2026',
    paymentMethod: 'PSE / Bancolombia',
  },
  {
    id: 'inv-3',
    invoiceNumber: 'INV-2026-8903',
    customerName: 'Alejandro Morales',
    customerEmail: 'amorales@email.com',
    planName: 'Membresía Silver Mensual',
    amount: 125000,
    status: 'pending',
    date: '16 Nov 2026',
    paymentMethod: 'Suscripción Automática',
  },
  {
    id: 'inv-4',
    invoiceNumber: 'INV-2026-8904',
    customerName: 'Mariana Salazar',
    customerEmail: 'm.salazar@email.com',
    planName: 'Membresía Gold Trimestral',
    amount: 520000,
    status: 'failed',
    date: '15 Nov 2026',
    paymentMethod: 'Tarjeta Débito (Fondos Insuficientes)',
  },
];

export default function AdminBillingPage() {
  const [records] = useState<BillingRecord[]>(BILLING_DATA);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<BillingRecord | null>(null);

  const filtered = records.filter((r) => {
    const matchSearch =
      !search.trim() ||
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.planName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#26262B] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E07A3D]/15 text-[#E07A3D]">
              <Receipt size={20} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Billing List & Facturación
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#8E8E93]">
            Historial de facturas, cobros recurrentes de membresías e integraciones de pago.
          </p>
        </div>

        <a
          href="/admin/plans"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#26262B] bg-[#16161A] px-4 py-2.5 text-xs font-semibold text-[#D1D1D6] hover:bg-[#1E1E24] hover:text-white transition-colors"
        >
          <ExternalLink size={14} /> Configurar Planes y Precios
        </a>
      </div>

      {/* Financial Stat summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            Recaudado Este Mes
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-400 tabular-nums">$24,890,000</p>
          <p className="mt-1 text-[10px] text-emerald-400 font-semibold">+14.2% vs mes anterior</p>
        </div>
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Cobros Pendientes
          </p>
          <p className="mt-1 text-2xl font-black text-white tabular-nums">$1,850,000</p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">12 transacciones</p>
        </div>
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
            Pagos Fallidos
          </p>
          <p className="mt-1 text-2xl font-black text-rose-400 tabular-nums">4</p>
          <p className="mt-1 text-[10px] text-rose-400 font-semibold">Requieren reintento</p>
        </div>
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Tasa de Cobro Exitoso
          </p>
          <p className="mt-1 text-2xl font-black text-white tabular-nums">98.2%</p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">Wompi Gateway</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#26262B] bg-[#16161A] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar factura o cliente..."
              className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:border-[#E07A3D] focus:outline-none"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#26262B] bg-[#1B1B22] px-3 py-2 text-xs text-[#D1D1D6] focus:border-[#E07A3D] focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
            <option value="failed">Fallido</option>
          </select>
        </div>

        <span className="text-xs text-[#8E8E93]">
          {filtered.length} facturas registradas
        </span>
      </div>

      {/* Billing Table */}
      <div className="overflow-hidden rounded-3xl border border-[#26262B] bg-[#16161A] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="border-b border-[#26262B] bg-[#121216] text-[11px] uppercase tracking-wider text-[#71717A]">
              <tr>
                <th className="px-5 py-3.5">Factura ID</th>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Concepto / Plan</th>
                <th className="px-5 py-3.5">Método de Pago</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Monto</th>
                <th className="px-5 py-3.5 text-right">Fecha</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-[#1B1B22] transition-colors">
                  <td className="px-5 py-4 font-mono font-bold text-white">{r.invoiceNumber}</td>
                  <td className="px-5 py-4 font-medium text-white">{r.customerName}</td>
                  <td className="px-5 py-4 text-[#D1D1D6]">{r.planName}</td>
                  <td className="px-5 py-4 text-[#8E8E93]">{r.paymentMethod}</td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-bold capitalize',
                        r.status === 'paid'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : r.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-rose-500/15 text-rose-400'
                      )}
                    >
                      {r.status === 'paid' ? 'Pagado' : r.status === 'pending' ? 'Pendiente' : 'Fallido'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-mono font-bold text-white">
                    ${r.amount.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-right text-[#8E8E93]">{r.date}</td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedRecord(r)}
                      className="rounded-lg p-1.5 text-[#8E8E93] hover:bg-[#202026] hover:text-[#E07A3D] transition-colors"
                      title="Ver Factura"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecord && (
        <Modal
          open={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title={`Detalle de Factura: ${selectedRecord.invoiceNumber}`}
          description={`Fecha de emisión: ${selectedRecord.date}`}
        >
          <div className="grid grid-cols-2 gap-4 text-xs">
            <Field label="Cliente">{selectedRecord.customerName}</Field>
            <Field label="Email">{selectedRecord.customerEmail}</Field>
            <Field label="Concepto">{selectedRecord.planName}</Field>
            <Field label="Método de Pago">{selectedRecord.paymentMethod}</Field>
            <Field label="Monto Total">${selectedRecord.amount.toLocaleString()}</Field>
            <Field label="Estado">{selectedRecord.status.toUpperCase()}</Field>
          </div>
        </Modal>
      )}
    </div>
  );
}
