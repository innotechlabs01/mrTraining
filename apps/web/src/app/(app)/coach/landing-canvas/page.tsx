/**
 * Pagina del editor canvas de landing del coach: /coach/landing-canvas.
 *
 * Server Component delgada que orquesta CoachLandingCanvas (Client Component).
 * No contiene logica de negocio; solo compone la feature.
 */
import { CoachLandingCanvas } from '@/features/coach/landing-canvas';

export default function CoachLandingCanvasPage(): JSX.Element {
  return <CoachLandingCanvas />;
}
