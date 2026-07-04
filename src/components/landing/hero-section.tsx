import { Button } from '@/components/shared';

export function HeroSection() {
  return (
    <header className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDQZmqDnSbgqfJ3OEegPecDrG-RwY5TYnaeqdg6Cj9dNW0tyoS6_Cy0yEfEsrctZsZCxPpH-Eq_tfh9NlwtAE6HZGMT_RypU2P_-ZgwOjDS6dxJ3LoaZLXBvfNqCBCcsVz3M9HgMZWlrNfzRmgS85Z1iwVRVPQm5e3BPOIh3iYh3tpMO3LeDpRVmzerVR1QRDNflBzvnywUTyHp9HcpALw_e4WgvXmSBQMEAzPQss6kACVpFC-wRgI5uOOk3q0Q7DE0FbM8U41zuNXl')`,
          }}
        />
        <div className="absolute inset-0 hero-gradient" />
      </div>

      <div className="relative z-10 max-w-container-max mx-auto px-margin-mobile md:px-gutter w-full">
        <div className="max-w-3xl">
          <span className="inline-block px-3 py-1 bg-electric-orange/20 border border-electric-orange text-electric-orange font-label-bold text-xs uppercase tracking-[0.2em] mb-6">
            Elite Performance Optimization
          </span>

          <h1 className="font-display-xl text-5xl md:text-[72px] md:leading-[80px] uppercase leading-none mb-8 text-white tracking-tight">
            Engineered For <br />
            <span className="text-electric-orange">Elite Results</span>
          </h1>

          <p className="font-body-lg text-lg md:text-[18px] md:leading-[28px] text-on-surface-variant mb-10 max-w-xl">
            Beyond fitness. Beyond aesthetics. We utilize bio-metric telemetry and hybrid coaching to
            forge a performance-first lifestyle.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg">Join the Movement</Button>
            <Button variant="outline" size="lg" className="border-velocity-blue text-velocity-blue hover:bg-velocity-blue/10">
              Explore Programs
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
