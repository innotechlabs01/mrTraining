'use client';

export function HowItWorksSection() {
  const steps = [
    { step: 1, title: 'Crea tu perfil de coach', desc: 'Regístrate y configura tu perfil con tu experiencia y especialidades.' },
    { step: 2, title: 'Crea tus planes de entrenamiento', desc: 'Diseña programas personalizados para tus atletas con ejercicios, series y repeticiones.' },
    { step: 3, title: 'Invita a tus atletas', desc: 'Envía invitaciones a tus atletas para que se unan a tu programa.' },
    { step: 4, title: 'Monitorea y cobra', desc: 'Sigue el progreso de tus atletas y cobra mensualmente por la plataforma.' },
  ];

  return (
    <section id="como-funciona" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white">Cómo funciona</h2>
          <p className="mt-4 text-text-secondary">Desde el primer atleta hasta tu academia completa</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold mb-4">
                <span className="text-xl font-bold">{step.step}</span>
              </div>
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
