export function AppShowcase() {
  return (
    <section className="py-[120px] bg-[#0F0F0F] overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-headline-lg text-3xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-6">
              Your Coach <br />
              <span className="text-[#0066FF]">In Your Pocket.</span>
            </h2>
            <p className="text-lg text-[#C4C7C7] mb-10 font-body-lg">
              The MR Training app is the brain of your transformation. Monitor real-time heart rate
              zones, track detailed lift statistics, and chat with your performance team 24/7.
            </p>

            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#0066FF]/10 rounded-full flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-label-bold text-sm uppercase tracking-wider mb-1">
                    Universal Wearable Sync
                  </h4>
                  <p className="text-sm text-[#C4C7C7]">
                    Native integration with Apple Health, Garmin Connect, and Strava.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#0066FF]/10 rounded-full flex items-center justify-center shrink-0">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2">
                    <path d="M3 3v18h18" />
                    <path d="M7 16l4-4 4 4 5-5" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-label-bold text-sm uppercase tracking-wider mb-1">
                    Predictive Recovery
                  </h4>
                  <p className="text-sm text-[#C4C7C7]">
                    AI-driven HRV analysis suggests workout intensity based on sleep data.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button className="bg-[#1C1C1C] px-6 py-4 flex items-center gap-3 hover:bg-[#2C2C2C] transition-colors border border-[#2C2C2C]/50 rounded-xl">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-white/60 uppercase leading-none">Download on the</p>
                  <p className="font-bold text-white leading-none mt-0.5">App Store</p>
                </div>
              </button>
              <button className="bg-[#1C1C1C] px-6 py-4 flex items-center gap-3 hover:bg-[#2C2C2C] transition-colors border border-[#2C2C2C]/50 rounded-xl">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 010 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                </svg>
                <div className="text-left">
                  <p className="text-[10px] text-white/60 uppercase leading-none">Get it on</p>
                  <p className="font-bold text-white leading-none mt-0.5">Google Play</p>
                </div>
              </button>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="absolute -inset-10 bg-[#0066FF]/10 blur-[100px] rounded-full" />
            <div className="relative z-10 bg-[#1C1C1C] rounded-[32px] border border-[#2C2C2C]/50 shadow-2xl p-4 w-[320px]">
              <div className="bg-[#0F0F0F] rounded-[24px] p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-xs text-[#C4C7C7]">Good Morning</p>
                    <p className="font-headline-md text-lg font-bold text-white">Alex</p>
                  </div>
                  <div className="w-10 h-10 bg-[#FF6B00] rounded-full flex items-center justify-center text-xs font-bold text-white">
                    MR
                  </div>
                </div>

                <div className="bg-[#1C1C1C] rounded-xl p-4 mb-4 border border-[#2C2C2C]/30">
                  <p className="text-[10px] text-[#C4C7C7] uppercase tracking-wider mb-1">
                    Today&apos;s Focus
                  </p>
                  <p className="font-headline-md text-sm font-bold text-white mb-1">
                    Lactate Threshold Run
                  </p>
                  <p className="text-xs text-[#0066FF]">45 mins @ Zone 4</p>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 bg-[#1C1C1C] rounded-xl p-4 border border-[#2C2C2C]/30 text-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF6B00" className="mx-auto mb-1">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                    <p className="font-stats-number text-xl font-black text-white">72</p>
                    <p className="text-[10px] text-[#C4C7C7]">BPM</p>
                  </div>
                  <div className="flex-1 bg-[#1C1C1C] rounded-xl p-4 border border-[#2C2C2C]/30 text-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#0066FF" className="mx-auto mb-1">
                      <path d="M3 3v18h18" />
                      <path d="M7 16l4-4 4 4 5-5" />
                    </svg>
                    <p className="font-stats-number text-xl font-black text-white">88</p>
                    <p className="text-[10px] text-[#C4C7C7]">Score</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
