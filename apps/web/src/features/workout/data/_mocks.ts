import type {
  Exercise, ExerciseDetail, Workout, WorkoutPlan, WorkoutTemplate, WorkoutProgram,
  ScheduleEvent, WorkoutSessionRecord, WorkoutStats, WorkoutAnalytics,
  WorkoutExerciseDetail, WorkoutSet, AIWorkoutSuggestion, WorkoutHistoryEntry,
  PersonalRecord, ScheduledWorkout, MuscleGroup, Equipment, Difficulty,
  WorkoutGoal, WorkoutType, SetType, RestPeriod, ExerciseCategory
} from '../types'

// ============ Exercise Library ============
export const MOCK_EXERCISES: Exercise[] = [
  { id: 'ex-1', name: 'Barbell Back Squat', description: 'Compound lower-body movement targeting quads, hamstrings, and glutes.', muscleGroups: ['legs', 'quads', 'glutes'], equipment: 'barbell', difficulty: 'intermediate', instructions: ['Set bar on upper back', 'Unrack and step back', 'Bend knees to parallel', 'Drive up through heels'], videoUrl: '', createdAt: '2026-06-01' },
  { id: 'ex-2', name: 'Bench Press', description: 'Classic upper-body pushing movement.', muscleGroups: ['chest', 'shoulders', 'triceps'], equipment: 'barbell', difficulty: 'intermediate', instructions: ['Lie on bench, eyes under bar', 'Grip slightly wider than shoulder', 'Lower bar to mid-chest', 'Press up explosively'], createdAt: '2026-06-01' },
  { id: 'ex-3', name: 'Deadlift', description: 'Full-body pulling movement from the floor.', muscleGroups: ['back', 'hamstrings', 'glutes', 'core'], equipment: 'barbell', difficulty: 'advanced', instructions: ['Bar over mid-foot', 'Hinge at hips, grip bar', 'Drive through floor, bar close to body', 'Lock out at top'], createdAt: '2026-06-01' },
  { id: 'ex-4', name: 'Pull-Ups', description: 'Vertical pulling movement using bodyweight.', muscleGroups: ['back', 'biceps', 'core'], equipment: 'bodyweight', difficulty: 'intermediate', instructions: ['Grip bar shoulder-width', 'Hang with straight arms', 'Pull chest to bar', 'Lower with control'], createdAt: '2026-06-01' },
  { id: 'ex-5', name: 'Overhead Press', description: 'Standing shoulder press for total upper-body power.', muscleGroups: ['shoulders', 'triceps', 'core'], equipment: 'barbell', difficulty: 'intermediate', instructions: ['Bar at shoulder height', 'Grip just outside shoulders', 'Press overhead, head through', 'Lock out and lower'], createdAt: '2026-06-01' },
  { id: 'ex-6', name: 'Barbell Row', description: 'Horizontal pulling for back thickness.', muscleGroups: ['back', 'biceps'], equipment: 'barbell', difficulty: 'intermediate', instructions: ['Hinge forward, bar below knees', 'Pull bar to lower chest', 'Squeeze back at top', 'Lower with control'], createdAt: '2026-06-01' },
  { id: 'ex-7', name: 'Dumbbell Lunges', description: 'Unilateral leg movement for balance and strength.', muscleGroups: ['legs', 'quads', 'glutes', 'hamstrings'], equipment: 'dumbbell', difficulty: 'beginner', instructions: ['Hold dumbbells at sides', 'Step forward into lunge', 'Both knees to 90 degrees', 'Drive back to start'], createdAt: '2026-06-01' },
  { id: 'ex-8', name: 'Plank', description: 'Core stability exercise.', muscleGroups: ['core'], equipment: 'bodyweight', difficulty: 'beginner', instructions: ['Forearms on floor, elbows under shoulders', 'Body in straight line', 'Brace core, hold position', 'Breathe steadily'], createdAt: '2026-06-01' },
  { id: 'ex-9', name: 'Box Jumps', description: 'Explosive plyometric movement.', muscleGroups: ['legs', 'quads', 'glutes', 'calves'], equipment: 'bodyweight', difficulty: 'advanced', instructions: ['Stand facing box', 'Slight dip and swing arms', 'Jump up onto box', 'Step down, repeat'], createdAt: '2026-06-01' },
  { id: 'ex-10', name: 'Kettlebell Swings', description: 'Hip-driven explosive movement for power and conditioning.', muscleGroups: ['glutes', 'hamstrings', 'core', 'shoulders'], equipment: 'kettlebell', difficulty: 'intermediate', instructions: ['Feet wider than hips', 'Hinge back, bell between legs', 'Thrust hips forward, swing to chest', 'Let bell drop, hinge again'], createdAt: '2026-06-01' },
  { id: 'ex-11', name: 'Dumbbell Bicep Curls', description: 'Isolation movement for biceps.', muscleGroups: ['biceps'], equipment: 'dumbbell', difficulty: 'beginner', instructions: ['Stand with dumbbells at sides', 'Curl toward shoulders', 'Squeeze at top', 'Lower with control'], createdAt: '2026-06-01' },
  { id: 'ex-12', name: 'Tricep Pushdowns', description: 'Cable isolation for triceps.', muscleGroups: ['triceps'], equipment: 'cable', difficulty: 'beginner', instructions: ['Grip cable bar at chest', 'Push down until arms straight', 'Squeeze triceps', 'Return slowly'], createdAt: '2026-06-01' },
  { id: 'ex-13', name: 'Leg Press', description: 'Machine-based compound leg movement.', muscleGroups: ['legs', 'quads', 'glutes', 'hamstrings'], equipment: 'machine', difficulty: 'beginner', instructions: ['Sit in machine, feet on platform', 'Release safety handles', 'Press until legs nearly straight', 'Return to 90 degrees'], createdAt: '2026-06-01' },
  { id: 'ex-14', name: 'Face Pulls', description: 'Rear delt and rotator cuff cable exercise.', muscleGroups: ['shoulders', 'back'], equipment: 'cable', difficulty: 'beginner', instructions: ['Set pulley at upper chest', 'Grip rope with both hands', 'Pull toward face, elbows up', 'Squeeze rear delts'], createdAt: '2026-06-01' },
  { id: 'ex-15', name: 'Romanian Deadlift', description: 'Hip-dominant hamstring movement.', muscleGroups: ['hamstrings', 'glutes', 'back'], equipment: 'barbell', difficulty: 'intermediate', instructions: ['Hold bar at hip height', 'Hinge back, bar slides down legs', 'Feel hamstring stretch', 'Drive hips forward to return'], createdAt: '2026-06-01' },
  { id: 'ex-16', name: 'Medicine Ball Slams', description: 'Full-body power and conditioning movement.', muscleGroups: ['full_body', 'core', 'shoulders', 'legs'], equipment: 'medicine_ball', difficulty: 'intermediate', instructions: ['Stand with feet shoulder-width', 'Raise ball overhead', 'Slam ball down as hard as possible', 'Catch on bounce and repeat'], createdAt: '2026-06-01' },
]

// Extended exercise details for library
export const MOCK_EXERCISE_DETAILS: ExerciseDetail[] = [
  {
    id: 'ex-1', name: 'Barbell Back Squat', description: 'The king of lower body exercises. A compound movement that targets quads, hamstrings, and glutes while also engaging the core for stability.',
    muscleGroups: ['quads', 'glutes', 'hamstrings'], secondaryMuscles: ['core', 'calves'],
    equipment: 'barbell', difficulty: 'intermediate',
    category: 'compound', instructions: [
      'Set bar on upper back, resting on trapezius muscles',
      'Unrack and step back, feet shoulder-width apart',
      'Bend knees and hips simultaneously, lowering to parallel or below',
      'Drive through heels to stand up, fully extending hips and knees'
    ],
    tips: ['Keep chest up throughout the movement', 'Drive knees outward over toes', 'Maintain neutral spine'],
    commonMistakes: ['Knees caving inward', 'Rising on toes', 'Excessive forward lean'],
    videoUrl: 'https://cdn.mrtraining.com/exercises/squat.mp4', createdAt: '2026-06-01'
  },
  {
    id: 'ex-2', name: 'Bench Press', description: 'The fundamental upper body pushing exercise for chest, shoulders, and triceps development.',
    muscleGroups: ['chest', 'shoulders', 'triceps'], secondaryMuscles: ['biceps', 'core'],
    equipment: 'barbell', difficulty: 'intermediate',
    category: 'compound', instructions: [
      'Lie on bench with eyes directly under the bar',
      'Grip bar slightly wider than shoulder width',
      'Lower bar to mid-chest with control',
      'Press bar up explosively, returning to start position'
    ],
    tips: ['Retract shoulder blades and pin them back', 'Keep feet planted on the floor', 'Control the descent'],
    commonMistakes: ['Bouncing bar off chest', 'Flaring elbows at 90 degrees', 'Lifting butt off bench'],
    videoUrl: 'https://cdn.mrtraining.com/exercises/bench-press.mp4', createdAt: '2026-06-01'
  },
  {
    id: 'ex-3', name: 'Deadlift', description: 'A full-body pulling movement that builds posterior chain strength like no other exercise.',
    muscleGroups: ['back', 'hamstrings', 'glutes'], secondaryMuscles: ['core', 'biceps', 'forearms'],
    equipment: 'barbell', difficulty: 'advanced',
    category: 'compound', instructions: [
      'Stand with bar over mid-foot, shins nearly touching bar',
      'Hinge at hips and grip bar just outside legs',
      'Drive through floor, keeping bar close to body',
      'Lock out hips and stand tall at the top'
    ],
    tips: ['Keep bar dragging along your legs', 'Maintain flat back throughout', 'Push the floor away'],
    commonMistakes: ['Rounding lower back', 'Bar drifting away from body', 'Jerking the weight up with back'],
    videoUrl: 'https://cdn.mrtraining.com/exercises/deadlift.mp4', createdAt: '2026-06-01'
  },
  {
    id: 'ex-4', name: 'Pull-Ups', description: 'The ultimate bodyweight vertical pull. Builds a wide back and strong grip.',
    muscleGroups: ['back', 'biceps'], secondaryMuscles: ['core', 'forearms'],
    equipment: 'bodyweight', difficulty: 'intermediate',
    category: 'compound', instructions: [
      'Grip bar with palms facing away, slightly wider than shoulders',
      'Hang with arms fully extended, shoulders engaged',
      'Pull chest toward bar by driving elbows down',
      'Lower with control to full arm extension'
    ],
    tips: ['Initiate the pull with your lats, not arms', 'Keep core tight throughout', 'Focus on full range of motion'],
    commonMistakes: ['Using momentum to swing up', 'Not going to full deadhang', 'Shrugging shoulders at the top'],
    videoUrl: 'https://cdn.mrtraining.com/exercises/pullups.mp4', createdAt: '2026-06-01'
  },
  {
    id: 'ex-5', name: 'Overhead Press', description: 'Standing pressing movement for shoulder strength and core stability.',
    muscleGroups: ['shoulders', 'triceps'], secondaryMuscles: ['core', 'back'],
    equipment: 'barbell', difficulty: 'intermediate',
    category: 'compound', instructions: [
      'Bar rests at shoulder height, grip just outside shoulders',
      'Brace core and press bar overhead',
      'Move head through by slightly leaning forward at the top',
      'Lock out arms and lower with control'
    ],
    tips: ['Keep core braced throughout', 'Avoid excessive back arching', 'Press straight up'],
    commonMistakes: ['Excessive back arch', 'Pressing backward instead of up', 'Not locking out at top'],
    videoUrl: 'https://cdn.mrtraining.com/exercises/ohp.mp4', createdAt: '2026-06-01'
  },
  {
    id: 'ex-6', name: 'Barbell Row', description: 'Horizontal pulling movement for back thickness and bicep development.',
    muscleGroups: ['back', 'biceps'], secondaryMuscles: ['core', 'shoulders'],
    equipment: 'barbell', difficulty: 'intermediate',
    category: 'compound', instructions: [
      'Hinge forward at hips, keeping back flat, bar hangs below knees',
      'Pull bar to lower chest/upper abdomen',
      'Squeeze shoulder blades together at the top',
      'Lower with control to full extension'
    ],
    tips: ['Keep core tight to support spine', 'Pull with elbows, not hands', 'Feel the stretch in lats at bottom'],
    commonMistakes: ['Using too much body English', 'Not reaching full extension', 'Rounding back'],
    videoUrl: 'https://cdn.mrtraining.com/exercises/row.mp4', createdAt: '2026-06-01'
  },
]

// ============ Helper Functions ============
function createWorkoutSet(setNumber: number, targetReps: number, targetWeight?: number, setType: SetType = 'working'): WorkoutSet {
  return {
    id: `set-${setNumber}`,
    setNumber,
    setType,
    targetReps,
    targetWeight,
    targetWeightUnit: 'kg',
    targetRpe: 8,
    isCompleted: false,
    isSkipped: false,
  }
}

function createWorkoutExercise(exerciseId: string, exerciseName: string, order: number, sets: number, reps: number, weight?: number, rest: RestPeriod = 90): WorkoutExerciseDetail {
  const workoutSets: WorkoutSet[] = Array.from({ length: sets }, (_, i) =>
    createWorkoutSet(i + 1, reps, weight)
  )

  return {
    id: `we-${exerciseId}`,
    exerciseId,
    exerciseName,
    section: order <= 2 ? 'warm_up' : order <= 8 ? 'main' : 'accessory',
    order,
    sets: workoutSets,
    rest,
    tempo: '2-0-1-0',
  }
}

// ============ Full Workouts ============
export const MOCK_WORKOUTS: Workout[] = [
  {
    id: 'wkt-1',
    name: 'Upper Body Power',
    description: 'Heavy compound upper-body work with accessory volume.',
    workoutType: 'strength',
    goal: 'strength',
    estimatedDuration: 55,
    status: 'scheduled',
    tags: ['upper', 'strength', 'compound'],
    coachNotes: 'Focus on bench press technique. Keep core engaged.',
    exercises: [
      createWorkoutExercise('ex-2', 'Bench Press', 1, 4, 6, 80),
      createWorkoutExercise('ex-4', 'Pull-Ups', 2, 4, 8),
      createWorkoutExercise('ex-5', 'Overhead Press', 3, 3, 8, 50),
      createWorkoutExercise('ex-6', 'Barbell Row', 4, 3, 10, 60),
      createWorkoutExercise('ex-11', 'Dumbbell Bicep Curls', 5, 3, 12, 14),
      createWorkoutExercise('ex-12', 'Tricep Pushdowns', 6, 3, 12),
    ],
    createdAt: '2026-07-01',
  },
  {
    id: 'wkt-2',
    name: 'Lower Body Strength',
    description: 'Heavy leg work focusing on squat and deadlift variations.',
    workoutType: 'strength',
    goal: 'strength',
    estimatedDuration: 50,
    status: 'scheduled',
    tags: ['lower', 'strength', 'legs'],
    exercises: [
      createWorkoutExercise('ex-1', 'Barbell Back Squat', 1, 4, 6, 100),
      createWorkoutExercise('ex-15', 'Romanian Deadlift', 2, 4, 8, 70),
      createWorkoutExercise('ex-7', 'Dumbbell Lunges', 3, 3, 10, 20),
      createWorkoutExercise('ex-8', 'Plank', 4, 3, 1),
    ],
    createdAt: '2026-07-01',
  },
  {
    id: 'wkt-3',
    name: 'Full Body Conditioning',
    description: 'High-intensity full-body circuit for conditioning.',
    workoutType: 'hiit',
    goal: 'conditioning',
    estimatedDuration: 35,
    status: 'completed',
    tags: ['full-body', 'conditioning', 'circuit'],
    exercises: [
      createWorkoutExercise('ex-10', 'Kettlebell Swings', 1, 3, 15, 24, 45),
      createWorkoutExercise('ex-9', 'Box Jumps', 2, 3, 8, undefined, 45),
      createWorkoutExercise('ex-16', 'Medicine Ball Slams', 3, 3, 12, undefined, 30),
      createWorkoutExercise('ex-8', 'Plank', 4, 3, 1, undefined, 30),
    ],
    createdAt: '2026-07-02',
  },
  {
    id: 'wkt-4',
    name: 'Push Day',
    description: 'Classic push workout for chest, shoulders, and triceps.',
    workoutType: 'strength',
    goal: 'hypertrophy',
    estimatedDuration: 45,
    status: 'in_progress',
    tags: ['push', 'hypertrophy', 'upper'],
    exercises: [
      createWorkoutExercise('ex-2', 'Bench Press', 1, 4, 10, 70),
      createWorkoutExercise('ex-5', 'Overhead Press', 2, 3, 12, 40),
      createWorkoutExercise('ex-14', 'Face Pulls', 3, 3, 15),
      createWorkoutExercise('ex-12', 'Tricep Pushdowns', 4, 3, 12),
      createWorkoutExercise('ex-11', 'Lateral Raises', 5, 3, 15, 10),
    ],
    createdAt: '2026-07-08',
  },
]

export const MOCK_WORKOUT_PLANS: WorkoutPlan[] = [
  {
    id: 'wp-1', name: 'Upper Body Power', description: 'Heavy compound upper-body work with accessory volume.',
    goal: 'strength', estimatedDuration: 55, tags: ['upper', 'strength', 'compound'],
    exercises: [],
    createdAt: '2026-07-01',
  },
  {
    id: 'wp-2', name: 'Lower Body Strength', description: 'Heavy leg work focusing on squat and deadlift variations.',
    goal: 'strength', estimatedDuration: 50, tags: ['lower', 'strength', 'legs'],
    exercises: [],
    createdAt: '2026-07-01',
  },
  {
    id: 'wp-3', name: 'Full Body Conditioning', description: 'High-intensity full-body circuit for conditioning.',
    goal: 'conditioning', estimatedDuration: 35, tags: ['full-body', 'conditioning', 'circuit'],
    exercises: [],
    createdAt: '2026-07-02',
  },
]

export const MOCK_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'wt-1', name: 'Push/Pull Split', description: 'Alternating push and pull days for balanced upper body development.',
    goal: 'hypertrophy', estimatedDuration: 50, frequency: 'weekly', tags: ['upper', 'push-pull', 'hypertrophy'],
    exercises: [],
    createdAt: '2026-06-15',
  },
  {
    id: 'wt-2', name: 'Speed Development', description: 'Track-focused speed and acceleration workout.',
    goal: 'speed', estimatedDuration: 45, frequency: 'weekly', tags: ['speed', 'track', 'explosive'],
    exercises: [],
    createdAt: '2026-06-10',
  },
]

// ============ Programs ============
export const MOCK_PROGRAMS: WorkoutProgram[] = [
  {
    id: 'prog-1',
    name: 'Hypertrophy Block',
    description: '8-week hypertrophy training block focused on volume and time under tension.',
    sportType: 'gym',
    goal: 'hypertrophy',
    phase: 'Week 3 of 8',
    startDate: '2026-06-15',
    endDate: '2026-08-10',
    durationWeeks: 8,
    workouts: MOCK_WORKOUTS,
    status: 'active',
    isTemplate: false,
    athleteIds: ['ath-1', 'ath-2'],
    createdBy: 'coach-1',
    createdAt: '2026-06-01',
    publishedAt: '2026-06-15',
  },
  {
    id: 'prog-2',
    name: 'Strength Foundation',
    description: '12-week strength program for intermediate lifters.',
    sportType: 'gym',
    goal: 'strength',
    startDate: '2026-09-01',
    endDate: '2026-11-24',
    durationWeeks: 12,
    workouts: [],
    status: 'draft',
    isTemplate: true,
    athleteIds: [],
    createdBy: 'coach-1',
    createdAt: '2026-07-01',
  },
]

// ============ Schedule ============
export const MOCK_SCHEDULE_EVENTS: ScheduleEvent[] = [
  { id: 'se-1', workoutId: 'wkt-1', workoutName: 'Upper Body Power', athleteIds: ['ath-1', 'ath-2'], athleteNames: ['Alex Chen', 'Sarah Johnson'], date: '2026-07-08', startTime: '07:00', endTime: '08:00', status: 'published', coachNotes: 'Focus on bench press technique', createdAt: '2026-07-07' },
  { id: 'se-2', workoutId: 'wkt-2', workoutName: 'Lower Body Strength', athleteIds: ['ath-1'], athleteNames: ['Alex Chen'], date: '2026-07-09', startTime: '07:00', endTime: '07:50', status: 'scheduled', coachNotes: 'Increase squat weight by 2.5kg', createdAt: '2026-07-07' },
  { id: 'se-3', workoutId: 'wkt-3', workoutName: 'Full Body Conditioning', athleteIds: ['ath-2', 'ath-3'], athleteNames: ['Sarah Johnson', 'James Thompson'], date: '2026-07-10', startTime: '15:00', endTime: '15:35', status: 'draft', createdAt: '2026-07-08' },
]

export const MOCK_SCHEDULED_WORKOUTS: ScheduledWorkout[] = [
  {
    id: 'sw-1',
    workout: MOCK_WORKOUTS[0],
    athleteId: 'ath-1',
    athleteName: 'Alex Chen',
    scheduledDate: '2026-07-08',
    scheduledTime: '07:00',
    status: 'published',
    reminderSent: true,
  },
  {
    id: 'sw-2',
    workout: MOCK_WORKOUTS[1],
    athleteId: 'ath-1',
    athleteName: 'Alex Chen',
    scheduledDate: '2026-07-09',
    scheduledTime: '07:00',
    status: 'scheduled',
    reminderSent: false,
  },
]

// ============ Session Records ============
export const MOCK_SESSION_RECORDS: WorkoutSessionRecord[] = [
  {
    id: 'wsr-1', workoutId: 'wkt-1', workoutName: 'Upper Body Power', goal: 'strength', athleteId: 'ath-1',
    date: '2026-07-06', startedAt: '07:05', completedAt: '08:02', duration: 57, status: 'completed',
    totalVolume: 4240,
    exercises: [
      { exerciseId: 'ex-2', exerciseName: 'Bench Press', sets: [
        { setNumber: 1, reps: 6, weight: 80, rpe: 7, completed: true },
        { setNumber: 2, reps: 6, weight: 80, rpe: 8, completed: true },
        { setNumber: 3, reps: 5, weight: 80, rpe: 9, completed: true },
        { setNumber: 4, reps: 5, weight: 80, rpe: 9, completed: true },
      ]},
      { exerciseId: 'ex-4', exerciseName: 'Pull-Ups', sets: [
        { setNumber: 1, reps: 8, rpe: 7, completed: true },
        { setNumber: 2, reps: 8, rpe: 8, completed: true },
        { setNumber: 3, reps: 7, rpe: 9, completed: true },
        { setNumber: 4, reps: 6, rpe: 9, completed: true },
      ]},
    ],
  },
  {
    id: 'wsr-2', workoutId: 'wkt-2', workoutName: 'Lower Body Strength', goal: 'strength', athleteId: 'ath-1',
    date: '2026-07-04', startedAt: '07:00', completedAt: '07:55', duration: 55, status: 'completed',
    totalVolume: 9880,
    exercises: [
      { exerciseId: 'ex-1', exerciseName: 'Barbell Back Squat', sets: [
        { setNumber: 1, reps: 6, weight: 100, rpe: 7, completed: true },
        { setNumber: 2, reps: 6, weight: 100, rpe: 8, completed: true },
        { setNumber: 3, reps: 6, weight: 105, rpe: 8, completed: true },
        { setNumber: 4, reps: 5, weight: 105, rpe: 9, completed: true },
      ]},
      { exerciseId: 'ex-15', exerciseName: 'Romanian Deadlift', sets: [
        { setNumber: 1, reps: 8, weight: 70, rpe: 7, completed: true },
        { setNumber: 2, reps: 8, weight: 70, rpe: 7, completed: true },
        { setNumber: 3, reps: 8, weight: 75, rpe: 8, completed: true },
        { setNumber: 4, reps: 7, weight: 75, rpe: 9, completed: true },
      ]},
    ],
  },
  {
    id: 'wsr-3', workoutId: 'wkt-3', workoutName: 'Full Body Conditioning', goal: 'conditioning', athleteId: 'ath-1',
    date: '2026-07-02', startedAt: '15:00', completedAt: '15:40', duration: 40, status: 'completed',
    totalVolume: 0,
    exercises: [
      { exerciseId: 'ex-10', exerciseName: 'Kettlebell Swings', sets: [
        { setNumber: 1, reps: 15, weight: 24, rpe: 7, completed: true },
        { setNumber: 2, reps: 15, weight: 24, rpe: 8, completed: true },
        { setNumber: 3, reps: 15, weight: 24, rpe: 9, completed: true },
      ]},
      { exerciseId: 'ex-9', exerciseName: 'Box Jumps', sets: [
        { setNumber: 1, reps: 8, rpe: 7, completed: true },
        { setNumber: 2, reps: 8, rpe: 8, completed: true },
        { setNumber: 3, reps: 7, rpe: 9, completed: true },
      ]},
    ],
  },
]

// ============ History ============
export const MOCK_HISTORY: WorkoutHistoryEntry[] = [
  { id: 'wh-1', workoutId: 'wkt-1', workoutName: 'Upper Body Power', date: '2026-07-06', duration: 57, status: 'completed', totalVolume: 4240, exercisesCompleted: 6, exercisesTotal: 6, rpe: 8, soreness: 5, energy: 7, notes: 'Felt strong today', tags: ['upper', 'strength'] },
  { id: 'wh-2', workoutId: 'wkt-2', workoutName: 'Lower Body Strength', date: '2026-07-04', duration: 55, status: 'completed', totalVolume: 9880, exercisesCompleted: 4, exercisesTotal: 4, rpe: 8, soreness: 6, energy: 6, tags: ['lower', 'strength'] },
  { id: 'wh-3', workoutId: 'wkt-3', workoutName: 'Full Body Conditioning', date: '2026-07-02', duration: 40, status: 'completed', totalVolume: 0, exercisesCompleted: 4, exercisesTotal: 4, rpe: 9, soreness: 4, energy: 8, tags: ['hiit', 'conditioning'] },
  { id: 'wh-4', workoutId: 'wkt-5', workoutName: 'Active Recovery', date: '2026-07-01', duration: 30, status: 'completed', totalVolume: 0, exercisesCompleted: 3, exercisesTotal: 3, rpe: 4, soreness: 3, energy: 9, tags: ['recovery', 'mobility'] },
  { id: 'wh-5', workoutId: 'wkt-1', workoutName: 'Upper Body Power', date: '2026-06-29', duration: 52, status: 'completed', totalVolume: 4080, exercisesCompleted: 6, exercisesTotal: 6, rpe: 7, soreness: 4, energy: 7, tags: ['upper', 'strength'] },
  { id: 'wh-6', workoutId: 'wkt-2', workoutName: 'Lower Body Strength', date: '2026-06-27', duration: 58, status: 'missed', totalVolume: 0, exercisesCompleted: 0, exercisesTotal: 4, tags: ['lower', 'strength'] },
]

// ============ Analytics ============
export const MOCK_ANALYTICS: WorkoutAnalytics = {
  overview: {
    totalWorkouts: 24,
    completedWorkouts: 21,
    missedWorkouts: 3,
    completionRate: 87.5,
    averageDuration: 48,
    totalVolume: 21320,
    totalTime: 1152, // minutes
  },
  volume: {
    weeklyVolume: [4200, 5800, 7200, 8500, 4800],
    monthlyVolume: [28500, 31200, 29800],
    yearlyVolume: [],
  },
  performance: {
    averageRpe: 7.6,
    rpeByDay: [
      { day: 'Mon', rpe: 7.5 },
      { day: 'Tue', rpe: 8.0 },
      { day: 'Wed', rpe: 7.2 },
      { day: 'Thu', rpe: 7.8 },
      { day: 'Fri', rpe: 8.2 },
      { day: 'Sat', rpe: 7.0 },
      { day: 'Sun', rpe: 0 },
    ],
    strengthProgression: [
      { exercise: 'Squat', date: '2026-06-01', estimated1RM: 140 },
      { exercise: 'Squat', date: '2026-07-04', estimated1RM: 152 },
      { exercise: 'Bench Press', date: '2026-06-01', estimated1RM: 100 },
      { exercise: 'Bench Press', date: '2026-07-04', estimated1RM: 108 },
    ],
  },
  consistency: {
    currentStreak: 4,
    longestStreak: 12,
    weeklyFrequency: 4.2,
    monthlyFrequency: 18,
  },
  recentPrs: [
    { id: 'pr-1', exerciseName: 'Barbell Back Squat', exerciseId: 'ex-1', recordType: '1rm', value: 152, unit: 'kg', achievedAt: '2026-07-04', workoutId: 'wsr-2', previousRecord: 140, improvement: 8.6 },
    { id: 'pr-2', exerciseName: 'Bench Press', exerciseId: 'ex-2', recordType: '1rm', value: 108, unit: 'kg', achievedAt: '2026-06-28', workoutId: 'wsr-1', previousRecord: 100, improvement: 8.0 },
    { id: 'pr-3', exerciseName: 'Deadlift', exerciseId: 'ex-3', recordType: '1rm', value: 180, unit: 'kg', achievedAt: '2026-06-20', workoutId: 'wsr-4', previousRecord: 165, improvement: 9.1 },
  ],
}

// ============ AI Suggestions ============
export const MOCK_AI_SUGGESTIONS: AIWorkoutSuggestion[] = [
  {
    id: 'ai-1',
    prompt: 'Create a hypertrophy workout for chest and back focusing on time under tension',
    generatedWorkout: {
      id: 'ai-wkt-1',
      name: 'AI: Hypertrophy Push/Pull',
      description: 'AI-generated hypertrophy workout with slow tempo and extended sets',
      workoutType: 'strength',
      goal: 'hypertrophy',
      estimatedDuration: 55,
      status: 'scheduled',
      tags: ['ai-generated', 'hypertrophy'],
      exercises: [
        createWorkoutExercise('ex-2', 'Bench Press', 1, 4, 10, 65),
        createWorkoutExercise('ex-6', 'Barbell Row', 2, 4, 10, 55),
        createWorkoutExercise('ex-14', 'Incline Dumbbell Press', 3, 3, 12, 30),
        createWorkoutExercise('ex-4', 'Pull-Ups', 4, 3, 10),
      ],
      createdAt: '2026-07-08',
    },
    confidence: 0.87,
    explanation: 'This workout targets chest and back with compound movements and higher rep ranges (10-12) to maximize time under tension. Tempo is set to 3-0-1-0 for each exercise.',
    basedOnAthlete: 'ath-1',
    status: 'pending',
    createdAt: '2026-07-08T10:30:00Z',
  },
]

export const MOCK_STATS: WorkoutStats = {
  totalSessions: 21,
  totalVolume: 21320,
  averageRpe: 7.6,
  streak: 4,
  consistency: 87.5,
  weeklyVolume: [
    { week: '2026-06-22', volume: 7200 },
    { week: '2026-06-29', volume: 8500 },
    { week: '2026-07-06', volume: 4800 },
  ],
  recentPrs: [
    { exercise: 'Barbell Back Squat', date: '2026-07-04', value: '152 kg' },
    { exercise: 'Bench Press', date: '2026-06-28', value: '108 kg' },
    { exercise: 'Deadlift', date: '2026-06-20', value: '180 kg' },
  ],
}

// ============ Labels & Constants ============
export const WORKOUT_GOAL_LABELS: Record<WorkoutGoal, string> = {
  strength: 'Strength',
  hypertrophy: 'Hypertrophy',
  endurance: 'Endurance',
  speed: 'Speed',
  power: 'Power',
  mobility: 'Mobility',
  conditioning: 'Conditioning',
  warm_up: 'Warm Up',
  cool_down: 'Cool Down',
}

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = {
  strength: 'Strength',
  cardio: 'Cardio',
  hiit: 'HIIT',
  mobility: 'Mobility',
  sport_specific: 'Sport Specific',
  competition: 'Competition',
  rest: 'Rest Day',
}

export const EXERCISE_CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  compound: 'Compound',
  isolation: 'Isolation',
  plyometric: 'Plyometric',
  cardio: 'Cardio',
  bodyweight: 'Bodyweight',
  warm_up: 'Warm Up',
  cool_down: 'Cool Down',
  core: 'Core',
}

export const SET_TYPE_LABELS: Record<SetType, string> = {
  warmup: 'Warm-up',
  working: 'Working',
  dropset: 'Drop Set',
  supersets: 'Superset',
  failure: 'To Failure',
}

export const REST_PERIOD_OPTIONS: { value: RestPeriod; label: string }[] = [
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '1:00' },
  { value: 90, label: '1:30' },
  { value: 120, label: '2:00' },
  { value: 180, label: '3:00' },
  { value: 240, label: '4:00' },
  { value: 300, label: '5:00' },
]
