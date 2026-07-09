import { permanentRedirect } from 'next/navigation'

export default function WorkoutsPage() {
  permanentRedirect('/coach/workouts/exercises')
}
