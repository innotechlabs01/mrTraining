const FEATURES = [
  'Direct wearable telemetry sync (Garmin, Whoop, Apple)',
  'Dynamic CRM dashboard for detailed progress tracking',
  'Instant communication with your dedicated head coach',
];

const APP_MOCKUP =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDhZS0k-zY_zNvRZ39rqXAAjBTILlbkjaI5SfPXRhNzGCAgIiKycxaRLU8b9cTFqMisfRSkm9f4upA4Gr8eH9m-KAOXEakGcc8XL2dSziShID3Z-_P5ES8cyO3iunohnFtqqVS573Jh-jQCwDg2AOubjEEzUA4yfpwDQD8Bul1CgJmYdsqWGH85FYrwaZp_xzVlQFhMn_FKykL7o8KoHyihEDwO91emk3egDde0WxbJgRSi7xIDP52lxnKUtdjmMkmr2K1g67EobsYU';

const CRM_MOCKUP =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBtQG05JFHgrx3ywoPFH-ms8kP_ZHQ35KrB6jweAL0qtJ_91zJG8asmorf7PpaRIDpmzLckiLJtmIKYjIU2DDK0LdpMLywxJOLySoXA5HXMwW8iFCU6gRzxAjFBnHtumHiYHoKXabKLcNhKXRju01sVJOShwRsgKnhzFwNNEz4qHWQh6d5jLuA2uECG6yUNrgfZzyUbJQ2Z1z9toDLm1I4SJDIftHHE1OXzuU9kiQz0DB5l0_e5B9y1rueAGK81F3nIjaIkVHopKyFT';

export function EcosystemSection() {
  return (
    <section className="py-section-gap-lg overflow-hidden bg-background" id="ecosystem">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-gutter">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-headline-lg text-3xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-8">
              Integrated <br />
              <span className="text-velocity-blue">Ecosystem</span>
            </h2>
            <p className="text-lg text-on-surface-variant mb-8 font-body-lg">
              The MR Training App isn&apos;t just a workout log. It&apos;s a command center that
              bridges the gap between your physical effort and data-driven insights. Syncs directly
              with your performance ecosystem.
            </p>

            <ul className="space-y-4 mb-10">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-electric-orange shrink-0">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  <span className="font-body-md">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="flex gap-4">
              <button className="bg-surface-container-highest px-6 py-4 flex items-center gap-3 hover:bg-surface-bright transition-colors border border-outline-variant/30 rounded">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <p className="text-[10px] uppercase opacity-60 leading-none">Download on the</p>
                  <p className="font-bold leading-none">App Store</p>
                </div>
              </button>
              <button className="bg-surface-container-highest px-6 py-4 flex items-center gap-3 hover:bg-surface-bright transition-colors border border-outline-variant/30 rounded">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                </svg>
                <div className="text-left">
                  <p className="text-[10px] uppercase opacity-60 leading-none">Get it on</p>
                  <p className="font-bold leading-none">Google Play</p>
                </div>
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-10 bg-electric-orange/10 blur-[100px] rounded-full" />
            <div className="relative z-10 p-4 bg-deep-slate rounded-xl border border-outline-variant/30 shadow-2xl rotate-3">
              <div
                className="aspect-[9/19] bg-cover bg-center rounded-lg shadow-inner"
                style={{ backgroundImage: `url(${APP_MOCKUP})` }}
              />
            </div>
            <div className="absolute -bottom-10 -left-10 z-20 p-4 bg-deep-slate rounded-xl border border-velocity-blue shadow-2xl -rotate-6 hidden md:block">
              <div
                className="aspect-video w-64 bg-cover bg-center rounded-lg"
                style={{ backgroundImage: `url(${CRM_MOCKUP})` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
