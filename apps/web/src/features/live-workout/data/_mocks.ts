import type { LiveWorkoutPlan } from '../types'

// A guided, real-time follow-along session. Durations are active-work seconds
// per set; `rest` is the recovery between sets. Video paths are best-effort
// placeholders that gracefully fall back to an animated stage in the UI.

export const LIVE_WORKOUT_PLAN: LiveWorkoutPlan = {
  id: 'live-wo-morning-speed',
  name: 'Morning Speed',
  focus: 'Acceleration & Top Speed',
  coachName: 'Coach Marcus',
  coachInitials: 'CM',
  estimatedDuration: 22,
  exercises: [
    {
      id: 'ex-dynamic',
      name: 'Dynamic Warmup',
      section: 'warmup',
      sets: 1,
      duration: 30,
      rest: 0,
      muscleGroups: ['full_body'],
      videoUrl: '/video/dynamic-warmup.mp4',
      formTips: [
        'Circle the joints before loading them',
        'Keep movements controlled and deliberate',
      ],
      cues: [
        { id: 'c1', tone: 'motivation', text: 'Wake the body up. Smooth and controlled.' },
        { id: 'c2', tone: 'tip', text: 'Breathe out on every rotation.' },
      ],
    },
    {
      id: 'ex-a-skips',
      name: 'A-Skips',
      section: 'main',
      sets: 3,
      duration: 20,
      rest: 45,
      muscleGroups: ['legs', 'core'],
      equipment: 'Bodyweight',
      videoUrl: '/video/a-skips.mp4',
      formTips: [
        'Drive the knee up to hip height',
        'Stay tall — ears over shoulders over hips',
      ],
      cues: [
        { id: 'c3', tone: 'tip', text: 'Knee to hip, toe up. Skip with purpose.' },
        { id: 'c4', tone: 'correction', text: 'Don’t hunch — keep the chest proud.' },
        { id: 'c5', tone: 'praise', text: 'That rhythm is dialed in. Keep it.' },
      ],
    },
    {
      id: 'ex-flying',
      name: 'Flying 30m Sprints',
      section: 'main',
      sets: 4,
      duration: 12,
      rest: 90,
      muscleGroups: ['hamstrings', 'glutes', 'quads'],
      equipment: 'Track',
      videoUrl: '/video/flying-sprints.mp4',
      formTips: [
        'Accelerate smoothly, don’t stab at the ground',
        'Drive arms 90° — they set the leg speed',
      ],
      cues: [
        { id: 'c6', tone: 'tip', text: 'Explode from the hips. Arms at 90°.' },
        { id: 'c7', tone: 'motivation', text: 'Sell the finish — don’t ease before the line.' },
        { id: 'c8', tone: 'praise', text: 'Clean acceleration. That’s race pace.' },
      ],
    },
    {
      id: 'ex-block',
      name: 'Block Starts',
      section: 'main',
      sets: 5,
      duration: 8,
      rest: 75,
      muscleGroups: ['glutes', 'quads', 'core'],
      equipment: 'Blocks',
      videoUrl: '/video/block-starts.mp4',
      formTips: [
        'Hips high, shoulders over the line',
        'First three steps are low and driving',
      ],
      cues: [
        { id: 'c9', tone: 'tip', text: 'Hips up. Shoulders forward of the hands.' },
        { id: 'c10', tone: 'correction', text: 'Stay low longer — don’t pop up early.' },
        { id: 'c11', tone: 'praise', text: 'Under 1.8s. Textbook reaction.' },
      ],
    },
    {
      id: 'ex-cool',
      name: 'Cool Down & Mobility',
      section: 'cooldown',
      sets: 1,
      duration: 40,
      rest: 0,
      muscleGroups: ['full_body'],
      videoUrl: '/video/cool-down.mp4',
      formTips: ['Hold each stretch for 3 deep breaths', 'Let the heart rate drift down'],
      cues: [
        { id: 'c12', tone: 'motivation', text: 'Easy now. Let the breath do the work.' },
        { id: 'c13', tone: 'tip', text: 'Recovery starts the moment you stop.' },
      ],
    },
  ],
  playlist: [
    { id: 't1', title: 'Ignition', artist: 'Pulse Theory', durationSec: 184, url: '/audio/ignition.mp3', bpm: 128 },
    { id: 't2', title: 'Redline', artist: 'Kova', durationSec: 201, url: '/audio/redline.mp3', bpm: 132 },
    { id: 't3', title: 'Afterburn', artist: 'Nova Drift', durationSec: 176, url: '/audio/afterburn.mp3', bpm: 124 },
    { id: 't4', title: 'Finish Strong', artist: 'Apex', durationSec: 212, url: '/audio/finish-strong.mp3', bpm: 135 },
  ],
}

export const LIVE_MOTIVATIONAL_LINES = [
  'One rep at a time.',
  'Champions are built in the off-season.',
  'Trust the process.',
  'Your only competition is yesterday’s you.',
  'Every set counts.',
  'Be stronger than your excuses.',
]
