'use client';

import { useQuery } from '@tanstack/react-query';
import { X, Check, Clock, Users, UserCheck, UserX, BarChart3, Link2, Download, RefreshCw, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { coachingApi } from '@/features/shared/api/client';
import { useAthletes } from '@/features/coach/hooks/useAthletes';
import type { CoachEvent, EventFormField, EventRegistration } from '@/features/coach/types';

interface EventStatsModalProps {
  event: CoachEvent;
  onClose: () => void;
}

interface FormAnswer {
  athleteId: string;
  fieldId: string;
  value: string;
}

interface RegistrationRow {
  athleteId: string;
  name: string;
  status: 'accepted' | 'cancelled' | 'pending';
  answers: FormAnswer[];
}

/** Compact metric card — overline label + primary value (design system §5.1). */
function Metric({ label, value, icon: Icon, tone }: {
  label: string;
  value: number;
  icon: typeof Users;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface-2 p-3 flex-1 min-w-[88px]">
      <div className="flex items-center gap-1.5 text-white/40">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('mt-1.5 text-2xl font-display font-bold', tone ?? 'text-white')}>{value}</p>
    </div>
  );
}

export function EventStatsModal({ event, onClose }: EventStatsModalProps) {
  const { getAthleteById } = useAthletes();

  const { data: registrations = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['event-registrations', event.id],
    queryFn: () => coachingApi.getEventRegistrations(event.id),
    staleTime: 10_000,
  });

  const { data: formAnswers = [], refetch: refetchAnswers } = useQuery({
    queryKey: ['event-form-responses', event.id],
    queryFn: () => coachingApi.getEventFormResponses(event.id),
    staleTime: 10_000,
  });

  const answersByAthlete = new Map<string, FormAnswer[]>();
  for (const a of formAnswers) {
    const list = answersByAthlete.get(a.athleteId) ?? [];
    list.push({ athleteId: a.athleteId, fieldId: a.fieldId, value: a.value });
    answersByAthlete.set(a.athleteId, list);
  }

  const fieldLabel = (fieldId: string): string | null => {
    if (fieldId === 'name') return null;
    if (fieldId === 'email') return 'Email';
    if (fieldId === 'phone') return 'Teléfono';
    if (fieldId === 'category') return 'Categoría';
    return event.formFields?.find((f: EventFormField) => f.id === fieldId)?.label ?? fieldId;
  };

  const displayName = (athleteId: string, answers: FormAnswer[]): string => {
    if (!athleteId.startsWith('anon:')) {
      return getAthleteById(athleteId)?.name ?? `Atleta ${athleteId.slice(0, 6)}`;
    }
    const nameAnswer = answers.find((a) => a.fieldId === 'name' && a.value.trim());
    return nameAnswer?.value.trim() || 'Participante público';
  };

  const regByAthlete = new Map<string, EventRegistration>(
    registrations.map((r) => [r.athleteId, r]),
  );

  // Union of invited athletes and anyone who responded (public registrants included).
  const athleteIds = Array.from(new Set([...event.athleteIds, ...registrations.map((r) => r.athleteId)]));
  const rows: RegistrationRow[] = athleteIds.map((id) => {
    const reg = regByAthlete.get(id);
    const allAnswers = (answersByAthlete.get(id) ?? []).filter((a) => a.value.trim() !== '');
    return {
      athleteId: id,
      name: displayName(id, allAnswers),
      status: (reg?.status as 'accepted' | 'cancelled') ?? 'pending',
      // The name is already the row title; don't repeat it as an answer line.
      answers: allAnswers.filter((a) => a.fieldId !== 'name'),
    };
  });

  const accepted = rows.filter((r) => r.status === 'accepted').length;
  const acceptedPublic = rows.filter((r) => r.status === 'accepted' && r.athleteId.startsWith('anon:')).length;
  const acceptedAthletes = accepted - acceptedPublic;
  const cancelled = rows.filter((r) => r.status === 'cancelled').length;
  const pending = rows.filter((r) => r.status === 'pending').length;
  const denominator = event.maxCapacity && event.maxCapacity > 0 ? event.maxCapacity : rows.length;
  const rate = denominator > 0 ? Math.min(100, Math.round((accepted / denominator) * 100)) : 0;

  const handleRefresh = () => {
    void refetch();
    void refetchAnswers();
  };

  const handleExportCsv = () => {
    const customFields = event.formFields ?? [];
    const headers = ['Nombre', 'Tipo', 'Estado', 'Email', 'Teléfono', 'Categoría', ...customFields.map((f) => f.label)];
    const escapeCell = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csvRows = [
      headers.map(escapeCell).join(','),
      ...rows.map((row) => {
        const byField = new Map(row.answers.map((a) => [a.fieldId, a.value]));
        const cells = [
          row.name,
          row.athleteId.startsWith('anon:') ? 'Público externo' : 'Atleta',
          row.status === 'accepted' ? 'Confirmado' : row.status === 'cancelled' ? 'Cancelado' : 'Sin responder',
          byField.get('email') ?? '',
          byField.get('phone') ?? '',
          byField.get('category') ?? '',
          ...customFields.map((f) => (byField.get(f.id) ?? '').replace(/\u0001/g, '; ')),
        ];
        return cells.map(escapeCell).join(',');
      }),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscritos-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-1 border border-white/10 rounded-lg shadow-2xl">
        <div className="relative px-6 pt-6 pb-5 border-b border-white/10">
          <button onClick={onClose} className="absolute top-5 right-5 text-white/40 hover:text-white transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5 pr-8">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/15 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-display font-bold text-white truncate">Inscritos y Resultados</h3>
              <p className="text-xs text-white/40 truncate">{event.title} · {event.date}</p>
            </div>
            <div className="flex items-center gap-1.5 mr-6">
              <button
                onClick={handleRefresh}
                disabled={isFetching}
                className="p-1.5 rounded-lg bg-surface-2 border border-white/10 text-white/60 hover:text-white transition-colors"
                title="Actualizar"
                aria-label="Actualizar inscritos"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              </button>
              {rows.length > 0 && (
                <button
                  onClick={handleExportCsv}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-2 border border-white/10 text-xs text-white/80 hover:text-white transition-colors"
                  title="Descargar lista CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              <div className="flex gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-[72px] flex-1 rounded-xl bg-surface-3 animate-pulse" />
                ))}
              </div>
              <div className="h-24 rounded-xl bg-surface-3 animate-pulse" />
            </div>
          ) : error ? (
            <p className="text-sm text-white/50 text-center py-6">
              No se pudieron cargar los resultados. Intenta de nuevo.
            </p>
          ) : rows.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-white/20 mx-auto" />
              <p className="mt-3 text-sm font-semibold text-white">Sin participantes</p>
              <p className="mt-1 text-xs text-white/40 max-w-[320px] mx-auto">
                Este evento no tuvo atletas invitados ni respuestas de registro.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Metric label="Confirmados" value={accepted} icon={UserCheck} tone="text-green-400" />
                <Metric label="Público ext." value={acceptedPublic} icon={Globe} tone="text-cyan-400" />
                <Metric label="Atletas" value={acceptedAthletes} icon={Users} tone="text-white" />
                <Metric label="Cancelados" value={cancelled} icon={UserX} tone="text-red-400" />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-white/40">
                    {event.maxCapacity
                      ? `Ocupación (${accepted} / ${event.maxCapacity} cupos)`
                      : `Tasa de confirmación (${pending > 0 ? `${pending} pendientes` : 'en tiempo real'})`}
                  </span>
                  <span className="text-white font-medium">{rate}%</span>
                </div>
                <div className="h-1.5 w-full rounded bg-surface-5 overflow-hidden">
                  <div
                    className="h-full rounded bg-green-400 transition-all duration-700"
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/40 mb-2">Participantes</p>
                <div className="space-y-1 max-h-56 overflow-y-auto scrollbar-hide">
                  {rows.map((row) => (
                    <div
                      key={row.athleteId}
                      className="px-3 py-2 rounded-lg border border-white/5 bg-surface-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white truncate flex items-center gap-1.5">
                          {row.athleteId.startsWith('anon:') && (
                            <Link2 className="w-3.5 h-3.5 text-white/40 shrink-0" />
                          )}
                          {row.name}
                        </span>
                        {row.status === 'accepted' ? (
                          <span className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400">
                            <Check className="w-3 h-3" /> Confirmado
                          </span>
                        ) : row.status === 'cancelled' ? (
                          <span className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400">
                            <X className="w-3 h-3" /> Cancelado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/40">
                            <Clock className="w-3 h-3" /> Sin responder
                          </span>
                        )}
                      </div>
                      {row.answers.length > 0 && (
                        <dl className="mt-1.5 space-y-0.5">
                          {row.answers.map((a) => {
                            const label = fieldLabel(a.fieldId);
                            return (
                              <div key={a.fieldId} className="flex gap-2 text-[11px]">
                                {label && <dt className="text-white/40 shrink-0">{label}:</dt>}
                                <dd className={cn('text-white/60 truncate', !label && 'text-white/60')}>{a.value}</dd>
                              </div>
                            );
                          })}
                        </dl>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
