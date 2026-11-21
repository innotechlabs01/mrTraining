'use client';

import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Columns3,
  List as ListIcon,
  Clock,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type TaskType =
  | 'Member Issue'
  | 'Trainer Task'
  | 'Billing'
  | 'Loyalty'
  | 'Maintenance'
  | 'General';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export type ColumnId =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'done'
  | 'blocked';

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  columnId: ColumnId;
  type: TaskType;
  priority: TaskPriority;
  assignee: {
    name: string;
    avatar?: string;
    initials: string;
  };
  dueDate: string;
  tags: string[];
  commentsCount: number;
}

const INITIAL_TASKS: KanbanTask[] = [
  {
    id: 't-1',
    title: 'Auditar pagos fallidos de membresías Platinum',
    description: 'Revisar 12 transacciones con webhook 402 en la pasarela Wompi.',
    columnId: 'blocked',
    type: 'Billing',
    priority: 'High',
    assignee: { name: 'Emon Admin', initials: 'EA' },
    dueDate: '20 Nov',
    tags: ['Wompi', 'Platinum'],
    commentsCount: 5,
  },
  {
    id: 't-2',
    title: 'Lanzar campaña de Loyalty Gift Voucher 50%',
    description: 'Activar código promocional para socios con asistencia > 15 días.',
    columnId: 'in_progress',
    type: 'Loyalty',
    priority: 'High',
    assignee: { name: 'Sarah Vega', initials: 'SV' },
    dueDate: '22 Nov',
    tags: ['Marketing', 'Loyalty'],
    commentsCount: 3,
  },
  {
    id: 't-3',
    title: 'Mantenimiento preventivo en poleas de musculación',
    description: 'Revisión trimestral de cables y lubricación en zona de pesas.',
    columnId: 'todo',
    type: 'Maintenance',
    priority: 'Medium',
    assignee: { name: 'Carlos Tech', initials: 'CT' },
    dueDate: '25 Nov',
    tags: ['Equipos', 'Piso 1'],
    commentsCount: 1,
  },
  {
    id: 't-4',
    title: 'Asignar nuevo entrenador a Batch B (Spinning 07:00)',
    description: 'Reemplazo temporal por vacaciones del coach titular.',
    columnId: 'review',
    type: 'Trainer Task',
    priority: 'Medium',
    assignee: { name: 'Daniela Ruiz', initials: 'DR' },
    dueDate: '21 Nov',
    tags: ['Batch', 'Spinning'],
    commentsCount: 4,
  },
  {
    id: 't-5',
    title: 'Resolver queja de casilleros de socio #4920',
    description: 'Sustitución de cerradura inteligente en vestier masculino.',
    columnId: 'done',
    type: 'Member Issue',
    priority: 'Low',
    assignee: { name: 'Emon Admin', initials: 'EA' },
    dueDate: '18 Nov',
    tags: ['Soporte', 'Vestier'],
    commentsCount: 2,
  },
  {
    id: 't-6',
    title: 'Integrar TRM oficial para cobros en divisa extranjera',
    description: 'Ajuste del margen del 8% en facturación de planes anuales.',
    columnId: 'backlog',
    type: 'Billing',
    priority: 'Medium',
    assignee: { name: 'Tech Team', initials: 'TT' },
    dueDate: '30 Nov',
    tags: ['Finanzas', 'TRM'],
    commentsCount: 0,
  },
];

const COLUMNS: { id: ColumnId; label: string; toneColor: string }[] = [
  { id: 'backlog', label: 'Backlog', toneColor: '#71717A' },
  { id: 'todo', label: 'To Do', toneColor: '#3B82F6' },
  { id: 'in_progress', label: 'In Progress', toneColor: '#F59E0B' },
  { id: 'review', label: 'Waiting / Review', toneColor: '#8B5CF6' },
  { id: 'done', label: 'Done', toneColor: '#10B981' },
  { id: 'blocked', label: 'Blocked', toneColor: '#EF4444' },
];

export function KanbanBoard({ initialCreateModal = false }: { initialCreateModal?: boolean }) {
  const [tasks, setTasks] = useState<KanbanTask[]>(INITIAL_TASKS);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [createModalOpen, setCreateModalOpen] = useState(initialCreateModal);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newColumn, setNewColumn] = useState<ColumnId>('todo');
  const [newType, setNewType] = useState<TaskType>('Member Issue');
  const [newPriority, setNewPriority] = useState<TaskPriority>('Medium');
  const [newAssignee, setNewAssignee] = useState('Emon Admin');

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        !search.trim() ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(search.toLowerCase()));
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      const matchType = typeFilter === 'all' || t.type === typeFilter;
      return matchSearch && matchPriority && matchType;
    });
  }, [tasks, search, priorityFilter, typeFilter]);

  const moveTask = (taskId: string, targetCol: ColumnId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, columnId: targetCol } : t))
    );
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: KanbanTask = {
      id: `task-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      columnId: newColumn,
      type: newType,
      priority: newPriority,
      assignee: {
        name: newAssignee,
        initials: newAssignee
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase(),
      },
      dueDate: 'Próximamente',
      tags: [newType],
      commentsCount: 0,
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTitle('');
    setNewDesc('');
    setCreateModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Filter and Actions Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-[#26262B] bg-[#16161A] p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tareas en tablero..."
              className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] pl-9 pr-3 py-2 text-xs text-white placeholder-[#71717A] focus:border-[#E07A3D] focus:outline-none"
            />
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-xl border border-[#26262B] bg-[#1B1B22] px-3 py-2 text-xs text-[#D1D1D6] focus:border-[#E07A3D] focus:outline-none"
          >
            <option value="all">Todas las prioridades</option>
            <option value="High">Alta (High)</option>
            <option value="Medium">Media (Medium)</option>
            <option value="Low">Baja (Low)</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-[#26262B] bg-[#1B1B22] px-3 py-2 text-xs text-[#D1D1D6] focus:border-[#E07A3D] focus:outline-none"
          >
            <option value="all">Todos los tipos</option>
            <option value="Member Issue">Member Issue</option>
            <option value="Trainer Task">Trainer Task</option>
            <option value="Billing">Billing</option>
            <option value="Loyalty">Loyalty</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-xl border border-[#26262B] bg-[#1B1B22] p-0.5 text-[#8E8E93]">
            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                viewMode === 'board' ? 'bg-[#26262B] text-white' : 'hover:text-white'
              )}
              title="Vista Tablero"
            >
              <Columns3 size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                viewMode === 'list' ? 'bg-[#26262B] text-white' : 'hover:text-white'
              )}
              title="Vista Lista"
            >
              <ListIcon size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#E07A3D] px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-[#D0692D] transition-colors"
          >
            <Plus size={15} /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* Board View */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.columnId === col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col rounded-2xl border border-[#26262B] bg-[#141418] p-3 shadow-lg"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-[#26262B] pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: col.toneColor }}
                    />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      {col.label}
                    </h4>
                  </div>
                  <span className="rounded-full bg-[#202026] px-2 py-0.5 text-[10px] font-bold text-[#8E8E93]">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 min-h-[140px]">
                  {colTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-[#52525B]">
                      Sin tareas
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group relative rounded-xl border border-[#222228] bg-[#181820] p-3 text-white transition-all hover:border-[#383842] hover:shadow-md"
                      >
                        {/* Top: Type & Priority */}
                        <div className="flex items-center justify-between text-[10px] mb-1.5">
                          <span className="rounded bg-[#222228] px-1.5 py-0.5 font-semibold text-[#8E8E93]">
                            {task.type}
                          </span>
                          <span
                            className={cn(
                              'font-bold',
                              task.priority === 'High'
                                ? 'text-rose-400'
                                : task.priority === 'Medium'
                                ? 'text-amber-400'
                                : 'text-blue-400'
                            )}
                          >
                            ● {task.priority}
                          </span>
                        </div>

                        {/* Title */}
                        <h5 className="text-xs font-bold leading-snug text-white line-clamp-2">
                          {task.title}
                        </h5>

                        {task.description && (
                          <p className="mt-1 text-[11px] text-[#A1A1AA] line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Footer: Assignee & Meta */}
                        <div className="mt-3 flex items-center justify-between border-t border-[#222228] pt-2 text-[10px] text-[#8E8E93]">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E07A3D]/20 font-bold text-[9px] text-[#E07A3D]">
                              {task.assignee.initials}
                            </div>
                            <span className="truncate max-w-[70px]">{task.assignee.name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {task.commentsCount > 0 && (
                              <span className="flex items-center gap-0.5">
                                <MessageSquare size={10} /> {task.commentsCount}
                              </span>
                            )}
                            <span className="flex items-center gap-0.5 text-[#71717A]">
                              <Clock size={10} /> {task.dueDate}
                            </span>
                          </div>
                        </div>

                        {/* Quick Move Arrows */}
                        <div className="mt-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {col.id !== 'backlog' && (
                            <button
                              type="button"
                              onClick={() => {
                                const idx = COLUMNS.findIndex((c) => c.id === col.id);
                                if (idx > 0) moveTask(task.id, COLUMNS[idx - 1].id);
                              }}
                              className="rounded p-1 text-[#8E8E93] hover:bg-[#26262B] hover:text-white"
                              title="Mover columna anterior"
                            >
                              <ArrowLeft size={11} />
                            </button>
                          )}
                          {col.id !== 'done' && (
                            <button
                              type="button"
                              onClick={() => {
                                const idx = COLUMNS.findIndex((c) => c.id === col.id);
                                if (idx < COLUMNS.length - 1) moveTask(task.id, COLUMNS[idx + 1].id);
                              }}
                              className="rounded p-1 text-[#8E8E93] hover:bg-[#26262B] hover:text-white"
                              title="Mover siguiente columna"
                            >
                              <ArrowRight size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="overflow-hidden rounded-2xl border border-[#26262B] bg-[#16161A]">
          <table className="w-full text-left text-xs text-white">
            <thead className="border-b border-[#26262B] bg-[#121216] text-[11px] uppercase tracking-wider text-[#71717A]">
              <tr>
                <th className="px-4 py-3">Tarea</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Asignado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222228]">
              {filteredTasks.map((t) => (
                <tr key={t.id} className="hover:bg-[#1B1B22] transition-colors">
                  <td className="px-4 py-3 font-semibold">{t.title}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#202026] px-2 py-0.5 text-[10px] font-bold capitalize text-white">
                      {COLUMNS.find((c) => c.id === t.columnId)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1AA]">{t.type}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'font-bold',
                        t.priority === 'High'
                          ? 'text-rose-400'
                          : t.priority === 'Medium'
                          ? 'text-amber-400'
                          : 'text-blue-400'
                      )}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1AA]">{t.assignee.name}</td>
                  <td className="px-4 py-3 text-[#71717A]">{t.dueDate}</td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={t.columnId}
                      onChange={(e) => moveTask(t.id, e.target.value as ColumnId)}
                      className="rounded-lg border border-[#26262B] bg-[#121216] px-2 py-1 text-[11px] text-[#A1A1AA] focus:border-[#E07A3D] focus:outline-none"
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Quick Task Creation Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setCreateModalOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-[#26262B] bg-[#141418] p-6 text-white shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#26262B] pb-3 mb-4">
              <h3 className="text-base font-bold text-white">Nueva Tarea Kanban</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="rounded-lg p-1 text-[#8E8E93] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">
                  Título de la tarea
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Revisar renovación pendiente de membresía Gold"
                  className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] p-2.5 text-xs text-white focus:border-[#E07A3D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Detalles sobre lo que se debe resolver..."
                  className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] p-2.5 text-xs text-white focus:border-[#E07A3D] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">
                    Columna inicial
                  </label>
                  <select
                    value={newColumn}
                    onChange={(e) => setNewColumn(e.target.value as ColumnId)}
                    className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] p-2.5 text-xs text-white focus:border-[#E07A3D] focus:outline-none"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">
                    Tipo de tarea
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as TaskType)}
                    className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] p-2.5 text-xs text-white focus:border-[#E07A3D] focus:outline-none"
                  >
                    <option value="Member Issue">Member Issue</option>
                    <option value="Trainer Task">Trainer Task</option>
                    <option value="Billing">Billing</option>
                    <option value="Loyalty">Loyalty</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">
                    Prioridad
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] p-2.5 text-xs text-white focus:border-[#E07A3D] focus:outline-none"
                  >
                    <option value="High">Alta (High)</option>
                    <option value="Medium">Media (Medium)</option>
                    <option value="Low">Baja (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">
                    Asignado a
                  </label>
                  <input
                    type="text"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="w-full rounded-xl border border-[#26262B] bg-[#1B1B22] p-2.5 text-xs text-white focus:border-[#E07A3D] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-[#26262B] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs text-[#8E8E93] hover:bg-[#202026]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#E07A3D] px-4 py-2 text-xs font-bold text-white hover:bg-[#D0692D]"
                >
                  Guardar Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
