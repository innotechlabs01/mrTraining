import type {
  AthleteTimeBlock,
  WorkoutPlan,
  Meal,
  WaterLog,
  Supplement,
  TeamPost,
  MorningData,
} from '../types'

export const ATHLETE_NAME = 'Alex'

export const MOCK_TIME_BLOCKS: AthleteTimeBlock[] = [
  { id: 'morning', label: 'Morning', time: '6:00 AM', icon: 'sunrise', status: 'current' },
  { id: 'workout', label: 'Workout', time: '7:00 AM', icon: 'dumbbell', status: 'upcoming' },
  { id: 'recovery', label: 'Recovery', time: 'Post-workout', icon: 'heart', status: 'upcoming' },
  { id: 'nutrition', label: 'Nutrition', time: 'Meal times', icon: 'apple', status: 'upcoming' },
  { id: 'community', label: 'Community', time: 'Anytime', icon: 'users', status: 'upcoming' },
  { id: 'night', label: 'Night Summary', time: '8:00 PM', icon: 'moon', status: 'upcoming' },
]

export const MOCK_MORNING: MorningData = {
  sleepHours: 7.5,
  sleepQuality: 'good',
  quote: 'The only bad workout is the one that didn\'t happen.',
  todayWorkout: {
    id: 'wo-1',
    name: 'Morning Speed',
    focus: 'Acceleration & Top Speed',
    estimatedDuration: 60,
    coachNote: 'Focus on driving your arms today. Stay relaxed through the finish.',
    exercises: [
      { id: 'ex-1', name: 'Dynamic Warmup', sets: 1, reps: 10, rest: 0, completedSets: 0 },
      { id: 'ex-2', name: 'A-Skips', sets: 3, reps: 20, rest: 60, completedSets: 0 },
      { id: 'ex-3', name: 'Flying 30m Sprints', sets: 4, reps: 1, rest: 120, completedSets: 0 },
      { id: 'ex-4', name: 'Block Starts', sets: 5, reps: 1, rest: 90, completedSets: 0 },
      { id: 'ex-5', name: 'Cool Down', sets: 1, reps: 1, rest: 0, completedSets: 0 },
    ],
  },
}

export const MOCK_MEALS: Meal[] = [
  { id: 'meal-1', name: 'Oatmeal with Berries & Protein', type: 'breakfast', calories: 420, protein: 32, logged: false, time: '7:30 AM', suggestion: 'Add a scoop of whey for extra protein' },
  { id: 'meal-2', name: 'Grilled Chicken Salad', type: 'lunch', calories: 560, protein: 45, logged: false, time: '12:30 PM', suggestion: 'Include avocado for healthy fats' },
  { id: 'meal-3', name: 'Salmon with Sweet Potato', type: 'dinner', calories: 620, protein: 48, logged: false, time: '7:00 PM', suggestion: 'Add steamed broccoli for fiber' },
  { id: 'meal-4', name: 'Greek Yogurt & Almonds', type: 'snack', calories: 220, protein: 18, logged: false, time: '3:30 PM', suggestion: 'Great post-workout snack option' },
]

export const MOCK_WATER: WaterLog = {
  current: 600,
  goal: 3000,
}

export const MOCK_SUPPLEMENTS: Supplement[] = [
  { id: 'sup-1', name: 'Vitamin D', dosage: '2000 IU', taken: false, time: 'Morning' },
  { id: 'sup-2', name: 'Omega-3', dosage: '1000 mg', taken: false, time: 'With breakfast' },
  { id: 'sup-3', name: 'Magnesium', dosage: '400 mg', taken: false, time: 'Before bed' },
]

export const MOCK_POSTS: TeamPost[] = [
  {
    id: 'post-1',
    authorId: 'coach',
    author: 'Coach Marcus',
    content: 'Great session today everyone! Remember — recovery starts now. Hydrate, stretch, and get your sleep.',
    timestamp: 'Today 9:15 AM',
    type: 'announcement',
    likes: 12,
    cheered: false,
  },
  {
    id: 'post-2',
    authorId: 'ath-2',
    author: 'Sarah Johnson',
    content: 'New 100m PB! 11.32s! Couldn\'t have done it without this team 💪',
    timestamp: 'Today 10:30 AM',
    type: 'achievement',
    likes: 24,
    cheered: false,
  },
  {
    id: 'post-3',
    authorId: 'ath-5',
    author: 'James Thompson',
    content: 'Anyone doing an extra session this afternoon?',
    timestamp: 'Today 11:00 AM',
    type: 'message',
    likes: 3,
    cheered: false,
  },
]

export const MOCK_DAILY_SUMMARY = {
  date: new Date().toISOString().split('T')[0],
  workoutCompleted: false,
  workoutName: 'Morning Speed',
  exercisesCompleted: 0,
  totalExercises: 5,
  waterPercentage: 20,
  mealsLogged: 0,
  totalMeals: 4,
  supplementsTaken: 0,
  totalSupplements: 3,
  streak: 5,
  highlights: [
    'Completed all 5 block starts under 1.8s',
    'Drank 2L of water so far',
    'Ate breakfast within 30 min of waking',
  ],
  motivationQuote: 'Success is the sum of small efforts repeated day in and day out.',
  tomorrowPreview: 'Light recovery run + mobility focus',
}

export const MOTIVATIONAL_MESSAGES = [
  'You\'ve got this!',
  'One rep at a time.',
  'Champions are made in the off-season.',
  'Trust the process.',
  'Your only competition is yesterday\'s you.',
  'Small steps lead to big results.',
  'Feel the burn, embrace the growth.',
  'Be stronger than your excuses.',
  'Every set counts.',
  'You are capable of amazing things.',
]
