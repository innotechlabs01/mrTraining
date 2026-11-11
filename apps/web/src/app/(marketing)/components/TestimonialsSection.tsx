'use client';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  stars: number;
}

export function TestimonialsSection({ testimonials, loading }: { testimonials: Testimonial[]; loading: boolean }) {
  return (
    <section id="testimonios" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white">Lo que dicen nuestros coaches</h2>
          <p className="mt-4 text-text-secondary">Historias reales de coaches que crecieron con MR Training</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-text-secondary">Cargando testimonios...</div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">No hay testimonios aún.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.id} className="rounded-xl border border-surface-6 bg-surface-1 p-6">
              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((s, i) => (
                  <span key={s} className={i < t.stars ? 'text-yellow-400' : 'text-gray-400'}>
                    ★
                  </span>
                ))}
              </div>
              <p className="text-sm text-gray-300 italic mb-4">&laquo;{t.text}&raquo;</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-xs">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-gray-400">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    </section>
  );
}
