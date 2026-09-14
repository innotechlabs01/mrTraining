/**
 * Onboarding / auth imagery — remote Unsplash assets (stable public CDN URLs).
 * Centralized so screens share one source of truth instead of inline URIs.
 *
 * NOTE: These are remote images — they require a network connection at runtime.
 * Each maps to a fitness-themed Unsplash photo that renders with a reliable
 * URL (verified HTTP 200). Dark overlay is applied by the consuming screen.
 */

/** Full-bleed hero originals from the Unsplash public CDN. */
const unsplash = (id: string): string => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const welcomeImage = unsplash(
  'photo-1517963879433-6ad2b056d712', // athlete training action
);

/**
 * Per-step hero images for the 13-step onboarding flow.
 * Index-aligned with the onboarding STEP_COUNT (13 heroes).
 */
export const onboardingHeroes: string[] = [
  unsplash('photo-1517836357463-d25dfeac3438'), // Your Sport — dumbbells
  unsplash('photo-1544367567-0f2fcb009e0b'), // How & Level — coaching
  unsplash('photo-1571019613454-1cb2f99b2d8b'), // Gender — female athlete
  unsplash('photo-1517963879433-6ad2b056d712'), // Weight — training action
  unsplash('photo-1461896836934-ffe607ba8211'), // Age — running endurance
  unsplash('photo-1519608487953-e999c86e7455'), // Height — swimming full-body
  unsplash('photo-1540497077202-7c8a3999166f'), // Goal — HIIT intensity
  unsplash('photo-1502904550040-7534597429ae'), // Activity level — road running
  unsplash('photo-1517646287270-a5a9ca602e5c'), // Schedule — cycling
  unsplash('photo-1517836357463-d25dfeac3438'), // Equipment — dumbbells
  unsplash('photo-1484480974693-6ca0a78fb36b'), // Fill profile — planning
  unsplash('photo-1506126613408-eca07ce68773'), // Your Plan — wellness
  unsplash('photo-1583454110551-21f2fa2afe61'), // Your Choice — focused athlete
];