'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  QrCode,
  Eye,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal, Field } from '@/components/admin/ui';

interface MemberItem {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  tier: 'Gold' | 'Silver' | 'Platinum';
  status: 'active' | 'pending' | 'expired' | 'frozen';
  joinedDate: string;
  assignedTrainer: string;
  checkinsThisMonth: number;
  loyaltyPoints: number;
}

const MEMBERS_DATA: MemberItem[] = [
  {
    id: 'm-1',
    code: 'FF-8901',
    name: 'Carlos Mendoza',
    email: 'carlos.mendoza@email.com',
    phone: '+57 300 123 4567',
    tier: 'Platinum',
    status: 'active',
    joinedDate: '12 Ene 2026',
    assignedTrainer: 'Sarah Vega',
    checkinsThisMonth: 18,
    loyaltyPoints: 340,
  },
  {
    id: 'm-2',
    code: 'FF-8902',
    name: 'Valentina Restrepo',
    email: 'valentina.r@email.com',
    phone: '+57 311 987 6543',
    tier: 'Gold',
    status: 'active',
    joinedDate: '03 Feb 2026',
    assignedTrainer: 'Daniela Ruiz',
    checkinsThisMonth: 15,
    loyaltyPoints: 210,
  },
  {
    id: 'm-3',
    code: 'FF-8903',
    name: 'Alejandro Morales',
    email: 'amorales@email.com',
    phone: '+57 315 444 8899',
    tier: 'Silver',
    status: 'active',
    joinedDate: '18 Mar 2026',
    assignedTrainer: 'Mateo Coach',
    checkinsThisMonth: 9,
    loyaltyPoints: 95,
  },
  {
    id: 'm-4',
    code: 'FF-8904',
    name: 'Camila Ospina',
    email: 'camila.ospina@email.com',
    phone: '+57 320 555 1212',
    tier: 'Platinum',
    status: 'active',
    joinedDate: '28 Mar 2026',
    assignedTrainer: 'Sarah Vega',
    checkinsThisMonth: 22,
    loyaltyPoints: 480,
  },
  {
    id: 'm-5',
    code: 'FF-8905',
    name: 'Julián Henao',
    email: 'julian.henao@email.com',
    phone: '+57 312 777 9900',
    tier: 'Gold',
    status: 'frozen',
    joinedDate: '10 Feb 2026',
    assignedTrainer: 'Mateo Coach',
    checkinsThisMonth: 0,
    loyaltyPoints: 120,
  },
  {
    id: 'm-6',
    code: 'FF-8906',
    name: 'Mariana Salazar',
    email: 'm.salazar@email.com',
    phone: '+57 301 666 4321',
    tier: 'Silver',
    status: 'expired',
    joinedDate: '05 Nov 2025',
    assignedTrainer: 'Daniela Ruiz',
    checkinsThisMonth: 1,
    loyaltyPoints: 40,
  },
];

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberItem[]>(MEMBERS_DATA);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // New member form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newTier, setNewTier] = useState<'Gold' | 'Silver' | 'Platinum'>('Gold');

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        !search.trim() ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        m.code.toLowerCase().includes(search.toLowerCase());
      const matchTier = tierFilter === 'all' || m.tier === tierFilter;
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchSearch && matchTier && matchStatus;
    });
  }, [members, search, tierFilter, statusFilter]);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const newM: MemberItem = {
      id: `m-${Date.now()}`,
      code: `FF-${Math.floor(1000 + Math.random() * 9000)}`,
      name: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim() || '+57 300 000 0000',
      tier: newTier,
      status: 'active',
      joinedDate: 'Hoy',
      assignedTrainer: 'Sarah Vega',
      checkinsThisMonth: 1,
      loyaltyPoints: 50,
    };

    setMembers([newM, ...members]);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setAddModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#26262B] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E07A3D]/15 text-[#E07A3D]">
              <Users size={20} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Gestión de Miembros (Members)
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#8E8E93]">
            Directorio completo de atletas, membresías activas, puntos de lealtad y asistencias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E07A3D] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#D0692D] transition-colors"
          >
            <Plus size={15} /> Nuevo Miembro
          </button>
        </div>
      </div>

      {/* Stats Quick strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            Total Miembros
          </p>
          <p className="mt-1 text-2xl font-black text-white">5,890</p>
          <p className="mt-1 text-[10px] text-emerald-400 font-semibold">+26.8% este año</p>
        </div>
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Gold Club
          </p>
          <p className="mt-1 text-2xl font-black text-white">2,840</p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">48% del total</p>
        </div>
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Platinum VIP
          </p>
          <p className="mt-1 text-2xl font-black text-white">1,100</p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">Acceso Todo Incluido</p>
        </div>
        <div className="rounded-2xl border border-[#26262B] bg-[#16161A] p-4 text-white">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Silver Base
          </p>
          <p className="mt-1 text-2xl font-black text-white">1,950</p>
          <p className="mt-1 text-[10px] text-[#8E8E93]">Plan Básico Fitness</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#26262B] bg-[#16161A] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, código o email..."
              className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:border-[#E07A3D] focus:outline-none"
            />
          </div>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-xl border border-[#26262B] bg-[#1B1B22] px-3 py-2 text-xs text-[#D1D1D6] focus:border-[#E07A3D] focus:outline-none"
          >
            <option value="all">Todos los niveles</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Platinum">Platinum</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#26262B] bg-[#1B1B22] px-3 py-2 text-xs text-[#D1D1D6] focus:border-[#E07A3D] focus:outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="frozen">Congelado</option>
            <option value="expired">Vencido</option>
          </select>
        </div>

        <span className="text-xs text-[#8E8E93]">
          Mostrando <strong className="text-white">{filteredMembers.length}</strong> miembros
        </span>
      </div>

      {/* Members Table */}
      <div className="overflow-hidden rounded-3xl border border-[#26262B] bg-[#16161A] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="border-b border-[#26262B] bg-[#121216] text-[11px] uppercase tracking-wider text-[#71717A]">
              <tr>
                <th className="px-5 py-3.5">Miembro</th>
                <th className="px-5 py-3.5">Código ID</th>
                <th className="px-5 py-3.5">Nivel (Tier)</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5">Entrenador</th>
                <th className="px-5 py-3.5 text-center">Asistencias Mes</th>
                <th className="px-5 py-3.5 text-right">Puntos Loyalty</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-[#1B1B22] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E07A3D]/20 font-bold text-xs text-[#E07A3D]">
                        {m.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{m.name}</div>
                        <div className="text-[11px] text-[#8E8E93]">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-[#D1D1D6]">{m.code}</td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                        m.tier === 'Gold'
                          ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
                          : m.tier === 'Platinum'
                          ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                          : 'bg-slate-400/15 text-slate-300 border border-slate-400/30'
                      )}
                    >
                      {m.tier}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold capitalize',
                        m.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : m.status === 'frozen'
                          ? 'bg-blue-500/15 text-blue-400'
                          : 'bg-rose-500/15 text-rose-400'
                      )}
                    >
                      {m.status === 'active' ? 'Activo' : m.status === 'frozen' ? 'Congelado' : 'Vencido'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#A1A1AA]">{m.assignedTrainer}</td>
                  <td className="px-5 py-4 text-center font-bold text-white tabular-nums">
                    {m.checkinsThisMonth}
                  </td>
                  <td className="px-5 py-4 text-right font-mono font-bold text-amber-300">
                    +{m.loyaltyPoints} pts
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className="rounded-lg p-1.5 text-[#8E8E93] hover:bg-[#202026] hover:text-[#E07A3D] transition-colors"
                      title="Ver Ficha Digital"
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

      {/* Member Digital Card Details Modal */}
      {selectedMember && (
        <Modal
          open={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          title={`Ficha Digital de Miembro: ${selectedMember.name}`}
          description={`Código de socio: ${selectedMember.code} · Miembro desde ${selectedMember.joinedDate}`}
        >
          <div className="space-y-6">
            {/* 3D Realistic Loyalty Pass Card */}
            <div className="mx-auto max-w-sm rounded-2xl border border-white/10 bg-gradient-to-br from-[#1E1E26] via-[#2A1D1A] to-[#121217] p-6 text-white shadow-2xl relative">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={18} className="text-[#E07A3D]" />
                  <span className="font-black text-sm">FitFlow Club</span>
                </div>
                <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  {selectedMember.tier} TIER
                </span>
              </div>

              <div className="my-5">
                <div className="text-lg font-bold text-white">{selectedMember.name}</div>
                <div className="text-xs font-mono text-[#8E8E93]">{selectedMember.code}</div>
              </div>

              <div className="flex items-end justify-between border-t border-white/10 pt-3">
                <div>
                  <div className="text-[10px] uppercase text-[#8E8E93]">Puntos Acumulados</div>
                  <div className="text-sm font-bold text-amber-400">
                    {selectedMember.loyaltyPoints} Loyalty Pts
                  </div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1 text-black">
                  <QrCode size={36} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <Field label="Correo">{selectedMember.email}</Field>
              <Field label="Teléfono">{selectedMember.phone}</Field>
              <Field label="Entrenador Asignado">{selectedMember.assignedTrainer}</Field>
              <Field label="Asistencias este mes">{selectedMember.checkinsThisMonth} check-ins</Field>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Member Modal */}
      {addModalOpen && (
        <Modal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Inscribir Nuevo Miembro en FitFlow"
          description="Completa los datos para emitir la credencial y activar la membresía."
        >
          <form onSubmit={handleAddMember} className="space-y-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Andrés Peláez"
                className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] p-2.5 text-xs text-white focus:border-[#E07A3D] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="andres@email.com"
                  className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] p-2.5 text-xs text-white focus:border-[#E07A3D] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+57 300 000 0000"
                  className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] p-2.5 text-xs text-white focus:border-[#E07A3D] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">
                Nivel de Membresía
              </label>
              <select
                value={newTier}
                onChange={(e) => setNewTier(e.target.value as 'Gold' | 'Silver' | 'Platinum')}
                className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] p-2.5 text-xs text-white focus:border-[#E07A3D] focus:outline-none"
              >
                <option value="Gold">Gold (Recomendado)</option>
                <option value="Platinum">Platinum VIP</option>
                <option value="Silver">Silver Básico</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[#26262B]">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs text-[#8E8E93] hover:bg-[#202026]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[#E07A3D] px-4 py-2 text-xs font-bold text-white hover:bg-[#D0692D]"
              >
                Crear Miembro
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
