import { notFound } from 'next/navigation';
import { type Metadata } from 'next';
import { coachingApi } from '@/features/shared/api/client';
import { CoachHero } from '@/features/coach/components/public-page/CoachHero';
import { PlanGrid } from '@/features/coach/components/public-page/PlanGrid';
import type { CoachLandingResponse } from '@/features/coach/types';

async function fetchCoachPage(username: string): Promise<CoachLandingResponse> {
  return coachingApi.getPublicCoachPage(username);
}

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  let coach: CoachLandingResponse | null = null;
  try {
    coach = await fetchCoachPage(params.username);
  } catch {
    coach = null;
  }

  if (!coach) {
    return {
      title: 'Coach no encontrado | MR Training',
      description: 'No se pudo encontrar el coach solicitado.',
    };
  }

  return {
    title: `${coach.coachName} | MR Training`,
    description: coach.biography || `Conoce a ${coach.coachName} y sus planes de entrenamiento.`,
    openGraph: {
      title: `${coach.coachName} | MR Training`,
      description: coach.biography || `Conoce a ${coach.coachName} y sus planes de entrenamiento.`,
      type: 'profile',
      images: coach.coachPhoto ? [{ url: coach.coachPhoto }] : undefined,
    },
  };
}

export default async function CoachPublicPage({
  params,
}: {
  params: { username: string };
}) {
  let coach: CoachLandingResponse;
  try {
    coach = await fetchCoachPage(params.username);
  } catch {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <CoachHero coach={coach} />
      <PlanGrid plans={coach.planCatalog} coachUsername={coach.slug} />
    </main>
  );
}
