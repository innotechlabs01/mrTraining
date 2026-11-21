'use client';

import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider">
            Planes para coaches
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-bold text-white leading-tight">
            Entrena a tus atletas,<br />
            <span className="text-brand-primary">MR Training lo hace fácil</span>
          </h1>
          <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto">
            La plataforma para coaches que quieren gestionar atletas, crear planes de entrenamiento, cobrar membresías y crecer su negocio — todo en un solo lugar.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/sign-up?trial=true"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-brand-primary text-white text-lg font-semibold hover:bg-brand-primary/90 transition-colors shadow-lg shadow-brand-primary/20 text-center"
              >
                Comenzar prueba gratis de 7 días
              </Link>
              <a
                href="#planes"
                className="w-full sm:w-auto px-6 py-4 rounded-xl border border-surface-6 text-white hover:bg-surface-2 transition-colors text-center font-medium"
              >
                Ver planes de pago
              </a>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              Sin tarjeta de crédito • 7 días de acceso completo • Cancela cuando quieras
            </p>
          </div>
        </div>
      </section>
    );
}
