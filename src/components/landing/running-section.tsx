export function RunningSection() {
  return (
    <section className="py-[120px] bg-[#1E1E20] overflow-hidden relative">
      <div className="absolute inset-0 z-0 opacity-20">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDBqlcerkxspIvYZ2xufa5UNoKDvjdaTw_xsPLnVz1ysVzIIShm36NqVy5RI46rGM0YtJfOXxd8_Cfi0NJbwUw1HbY8swLGEWx1oEA3ptUJP4nGdYuitSbmrF9aNjljwXUzdO4WAsybuB5qOLqSvIBJamWQdrny4BveOcGkZwR8ynVB0GshSNSrKr71xQap0swL-ovubUyo8RybqufbbPXD_UcncFg8GcJEXjCsOaUDrxH5V-KQfR4yQSMMfNAKPc94V-0rvG3U52le')",
          }}
        />
      </div>
      <div className="relative z-10 max-w-[1280px] mx-auto px-5 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <blockquote className="text-2xl md:text-3xl font-headline-md font-bold italic text-white mb-8 leading-relaxed">
              &ldquo;Whether it&apos;s your first 5K or your fifth Major, our ecosystem ensures you
              never run alone.&rdquo;
            </blockquote>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#FF5C00]/10 rounded-full flex items-center justify-center shrink-0">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FF5C00"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-label-bold text-sm uppercase tracking-wider mb-1">
                    Race Preparation
                  </h4>
                  <p className="text-sm text-[#8E8E93]">
                    Customized plans for 10K, Half, and Full Marathons with taper-logic.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#FF5C00]/10 rounded-full flex items-center justify-center shrink-0">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#FF5C00"
                    strokeWidth="2"
                  >
                    <path d="M2 16l4-4 4 4 4-4 4 4" />
                    <path d="M2 8l4-4 4 4 4-4 4 4" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-label-bold text-sm uppercase tracking-wider mb-1">
                    Gait Analysis
                  </h4>
                  <p className="text-sm text-[#8E8E93]">
                    Video review of your running form by Olympic-level biomechanics experts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
