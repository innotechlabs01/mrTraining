'use client';

export function FeaturesSection() {
  return (
    <section id="caracteristicas" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white">Todo lo que necesitas</h2>
          <p className="mt-4 text-text-secondary">Herramientas diseñadas para coaches modernos</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: 'Seguro y confiable', desc: 'Tus datos y los de tus atletas están protegidos con encriptación de nivel bancario.' },
            { title: 'Sin contratos', desc: 'Cancela cuando quieras. Sin compromisos a largo plazo.' },
            { title: 'Resultados medibles', desc: 'Mide el progreso real de tus atletas con métricas objetivas.' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-surface-2 bg-surface-1 p-6">
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
