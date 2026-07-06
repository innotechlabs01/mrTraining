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
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F0F0F]/60 via-[#0F0F0F]/30 to-[#0F0F0F]" />
      </div>

      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-6 w-full">
        <div className="max-w-3xl">
          <span className="inline-block px-4 py-1.5 bg-[#FF6B00]/20 border border-[#FF6B00] text-[#FF6B00] font-label-bold text-[10px] uppercase tracking-[0.2em] mb-6 rounded">
            Elite Performance Optimization
          </span>

          <h1 className="font-display-xl text-5xl md:text-[72px] md:leading-[80px] uppercase leading-none mb-6 text-white tracking-tight">
            Transform More <br />
            <span className="text-[#FF6B00]">Than Your Body.</span>
          </h1>

          <p className="font-body-lg text-lg md:text-[18px] md:leading-[28px] text-[#C4C7C7] mb-10 max-w-xl">
            Transform your entire lifestyle with the world&apos;s most advanced athletic
            performance ecosystem.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button size="lg">Start Assessment</Button>
            <Button variant="secondary" size="lg">
              Book Consultation
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C4C7C7" strokeWidth="2">
          <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
        </svg>
      </div>
    </header>
  );
}
