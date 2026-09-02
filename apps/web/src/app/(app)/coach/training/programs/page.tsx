import { redirect } from 'next/navigation';

// Programas is hidden for now — the coach trains via Workouts (Templates/Builder) + Asignar.
// Redirect any stale/direct links back to the Training hub.
export default function ProgramsRedirect() {
  redirect('/coach/training')
}