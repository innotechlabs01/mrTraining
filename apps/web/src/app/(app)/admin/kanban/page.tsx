'use client';

import { useSearchParams } from 'next/navigation';
import { Columns3, CheckCircle2, AlertCircle, Clock, Plus } from 'lucide-react';
import { KanbanBoard } from '@/components/admin/KanbanBoard';

export default function AdminKanbanPage() {
  const searchParams = useSearchParams();
  const shouldCreate = searchParams?.get('create') === 'true';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#26262B] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E07A3D]/15 text-[#E07A3D]">
              <Columns3 size={20} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Club Operations Kanban
            </h1>
          </div>
          <p className="mt-1 text-xs text-[#8E8E93]">
            Gestión interna de tareas, soporte a miembros, mantenimiento y facturación del club.
          </p>
        </div>

        {/* Quick counter chips */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-[#26262B] bg-[#16161A] px-3 py-1.5 text-xs text-[#A1A1AA]">
            <Clock size={13} className="text-amber-400" />
            <span>6 Tareas Activas</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400 font-semibold">
            <AlertCircle size={13} />
            <span>1 Bloqueada</span>
          </div>
        </div>
      </div>

      {/* Main Kanban Board */}
      <KanbanBoard initialCreateModal={shouldCreate} />
    </div>
  );
}
