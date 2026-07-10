'use client'

import { useState } from 'react'
import { ChevronDown, MessageCircle, BookOpen, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQS = [
  { q: '¿Cómo asigno un workout a un atleta?', a: 'Ve a Training > Asignar, selecciona los atletas, elige el contenido, configura modalidad y fechas, y confirma.' },
  { q: '¿Cómo creo un nuevo plan de suscripción?', a: 'Ve a Planes, haz clic en "Nuevo Plan", completa los detalles y actívalo.' },
  { q: '¿Cómo veo las métricas de mis atletas?', a: 'Desde el Dashboard tienes un resumen general. Para ver atletas individuales, ve a Usuarios y selecciona el atleta.' },
  { q: '¿Cómo configuro eventos recurrentes?', a: 'Ve a Eventos, crea un nuevo evento y selecciona la opción de repetición semanal/mensual.' },
  { q: '¿Cómo gestiono los pagos pendientes?', a: 'En Dashboard puedes ver el resumen de pagos pendientes. Ve a Usuarios para ver el detalle de cada atleta.' },
]

export default function CoachSupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Soporte</h1>
        <p className="text-sm text-white/40 mt-1">Ayuda y recursos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: MessageCircle, label: 'Chat en vivo', desc: 'Habla con soporte', color: 'bg-brand-primary/10 text-brand-primary' },
          { icon: Mail, label: 'Email', desc: 'soporte@mrtraining.app', color: 'bg-blue-500/10 text-blue-400' },
          { icon: BookOpen, label: 'Guía', desc: 'Documentación completa', color: 'bg-purple-500/10 text-purple-400' },
        ].map((item) => (
          <button
            key={item.label}
            className="rounded-2xl border border-white/5 bg-surface-1 p-5 hover:border-white/10 transition-all text-left"
          >
            <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-3`}>
              <item.icon size={18} />
            </div>
            <p className="text-sm font-semibold text-white">{item.label}</p>
            <p className="text-xs text-white/40 mt-0.5">{item.desc}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/5 bg-surface-1 p-5">
        <h2 className="text-sm font-semibold text-white/70 mb-4">Preguntas Frecuentes</h2>
        <div className="space-y-1">
          {FAQS.map((faq, i) => (
            <div key={i} className="border-b border-white/5 last:border-0">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between py-3 text-left"
              >
                <span className="text-sm text-white/60">{faq.q}</span>
                <ChevronDown
                  size={14}
                  className={cn(
                    'text-white/30 transition-transform shrink-0 ml-4',
                    openFaq === i && 'rotate-180',
                  )}
                />
              </button>
              {openFaq === i && (
                <p className="text-xs text-white/40 pb-3 -mt-1">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
