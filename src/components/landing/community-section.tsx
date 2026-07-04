import { GlassCard } from '@/components/shared';

const TESTIMONIAL = {
  name: 'Jason D.',
  role: 'Pro Athlete',
  initials: 'JD',
  quote:
    'The telemetry tracking changed how I view training. I\'m no longer guessing. I\'m executing a plan built for my exact recovery state.',
};

const FEATURED_ATHLETE = {
  name: 'Alex Carter',
  tag: 'Elite Member | 12 Weeks Progress',
  image:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD-amhsrLnxCoELINt_vwbIpAgThio8h3udzV0OjZymtVGm1qaX5-b1UREKrzDIVJhMOlX3aLTksmXD9fWx-tvdzuwKNryC3hasqtrPlFr_uYfJs0q6Xh6TbdKBKX1w6K5htHTy9frQSbYlWOO3VosgVs4hbaZBbdsvWOkj6-8foM7RuKlI4mwy_5mfaISh4H6GEiqixJcoo6o2hdUNBcY5p39U-GC8hMztPolrZbZFdojhQTl-HDml3A61F1YGzZ-drF19jyPTOE1E',
};

const ACTION_IMAGE_1 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD_9fanWv-Qc3tedH92tsEUBh81QPXLyDCKfpLyIk6KYCXHUrlpHhOKF8w-vuU4ZxfKPIt3dLMAcHbyMNITTgQjFlmBZq1LiZm9_wIRAOIPYheGEAmF9QQMYrHNzo9OSs5Z2xXP1ZYstJBxfRzXKlER9eqKPO31fU_MbwoDvy2ZtwJQUv1O9xg_FGa87B9R7EmcHSs5CcoRHZ6xiO-3gRO8gc4Yw3LOXXI41OwbcAy9AsX5voL5-YWDJ46GnVgWan05gKf63bvYrJeG';

const ACTION_IMAGE_2 =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDBqlcerkxspIvYZ2xufa5UNoKDvjdaTw_xsPLnVz1ysVzIIShm36NqVy5RI46rGM0YtJfOXxd8_Cfi0NJbwUw1HbY8swLGEWx1oEA3ptUJP4nGdYuitSbmrF9aNjljwXUzdO4WAsybuB5qOLqSvIBJamWQdrny4BveOcGkZwR8ynVB0GshSNSrKr71xQap0swL-ovubUyo8RybqufbbPXD_UcncFg8GcJEXjCsOaUDrxH5V-KQfR4yQSMMfNAKPc94V-0rvG3U52le';

export function CommunitySection() {
  return (
    <section className="py-section-gap-lg bg-surface-container-low" id="community">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-gutter">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <h2 className="font-headline-lg text-3xl md:text-[40px] md:leading-[48px] font-bold uppercase mb-4">
              Elite Community
            </h2>
            <p className="text-on-surface-variant max-w-xl font-body-md">
              Join thousands of athletes who have transcended their limits. Our community is built on
              accountability, data, and shared grit.
            </p>
          </div>
          <button className="flex items-center gap-2 text-electric-orange font-label-bold uppercase tracking-widest group">
            View All Stories{' '}
            <span className="group-hover:translate-x-2 transition-transform">&rarr;</span>
          </button>
        </div>

        <div className="masonry">
          {/* Featured Story */}
          <div className="masonry-item relative group overflow-hidden">
            <div
              className="aspect-[3/4] bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url(${FEATURED_ATHLETE.image})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-end">
              <p className="font-label-bold text-white mb-1">{FEATURED_ATHLETE.name}</p>
              <p className="text-xs text-velocity-blue uppercase tracking-widest">
                {FEATURED_ATHLETE.tag}
              </p>
            </div>
          </div>

          {/* Testimonial Card */}
          <GlassCard className="masonry-item p-8" hoverColor="none">
            <div className="flex gap-1 mb-4 text-electric-orange">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <p className="font-body-md text-on-surface italic mb-6">&ldquo;{TESTIMONIAL.quote}&rdquo;</p>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-electric-orange rounded-full flex items-center justify-center font-bold text-on-primary-container text-xs">
                {TESTIMONIAL.initials}
              </div>
              <span className="font-label-bold text-sm">
                {TESTIMONIAL.name} - {TESTIMONIAL.role}
              </span>
            </div>
          </GlassCard>

          {/* Progress Image */}
          <div className="masonry-item relative group overflow-hidden">
            <div
              className="aspect-square bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url(${ACTION_IMAGE_1})` }}
            />
          </div>

          {/* Data Highlight */}
          <GlassCard className="masonry-item p-8 bg-electric-orange/10 border-electric-orange/30" hoverColor="none">
            <span className="inline-block px-3 py-1 bg-electric-orange text-on-primary-container font-label-bold text-[10px] uppercase tracking-wider mb-4">
              Verified Transformation
            </span>
            <h4 className="font-headline-md text-2xl font-bold text-white mb-2">
              32% Increase in VO2 Max
            </h4>
            <p className="text-sm text-on-surface-variant font-body-md">
              Systematic training protocols lead to measurable physiological upgrades.
            </p>
          </GlassCard>

          {/* Intensity Image */}
          <div className="masonry-item relative group overflow-hidden">
            <div
              className="aspect-[4/5] bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url(${ACTION_IMAGE_2})` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
