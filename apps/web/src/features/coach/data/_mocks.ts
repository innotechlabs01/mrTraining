import type {
  AthleteBrief,
  CoachSession,
  MessageThread,
  DailySummary,
  TimeBlock,
  AiSuggestion,
} from '../types'

export const MOCK_TIME_BLOCKS: TimeBlock[] = [
  { id: 'morning-brief', label: 'Morning Brief', time: '6:00 AM', endTime: '6:10 AM', icon: 'sunrise', status: 'past' },
  { id: 'check-in', label: 'Athlete Check-in', time: '6:15 AM', endTime: '6:25 AM', icon: 'clipboard-check', status: 'past' },
  { id: 'session-prep', label: 'Session Prep', time: '6:30 AM', endTime: '6:55 AM', icon: 'list-checks', status: 'current' },
  { id: 'live-session', label: 'Live Sessions', time: '7:00 AM', endTime: '12:00 PM', icon: 'activity', status: 'upcoming' },
  { id: 'mid-day', label: 'Mid-day Review', time: '12:00 PM', endTime: '12:15 PM', icon: 'sun', status: 'upcoming' },
  { id: 'program-design', label: 'Program Design', time: '5:00 PM', endTime: '5:45 PM', icon: 'dumbbell', status: 'upcoming' },
  { id: 'communication', label: 'Communication', time: '6:00 PM', endTime: '6:30 PM', icon: 'message-square', status: 'upcoming' },
  { id: 'insights', label: 'AI Insights', time: '7:00 PM', endTime: '7:20 PM', icon: 'brain', status: 'upcoming' },
  { id: 'daily-summary', label: 'Daily Summary', time: '8:00 PM', endTime: '8:10 PM', icon: 'calendar-check', status: 'upcoming' },
]

export const MOCK_ATHLETES: AthleteBrief[] = [
  {
    id: 'ath-1',
    name: 'Marcus Chen',
    avatarUrl: '',
    sport: 'Track - 400m',
    readiness: { sleep: 7.2, hrv: 65, recovery: 82, score: 78 },
    todaySessionIds: ['sess-1'],
  },
  {
    id: 'ath-2',
    name: 'Sarah Johnson',
    avatarUrl: '',
    sport: 'Swimming',
    readiness: { sleep: 8.1, hrv: 72, recovery: 91, score: 88 },
    todaySessionIds: ['sess-1'],
  },
  {
    id: 'ath-3',
    name: 'David Park',
    avatarUrl: '',
    sport: 'Track - 100m',
    readiness: { sleep: 5.8, hrv: 45, recovery: 38, score: 42 },
    flag: { type: 'readiness', severity: 'high', message: 'HRV dropped 35% from baseline — possible overtraining' },
    todaySessionIds: ['sess-1', 'sess-2'],
  },
  {
    id: 'ath-4',
    name: 'Emily Rodriguez',
    avatarUrl: '',
    sport: 'Crossfit',
    readiness: { sleep: 7.5, hrv: 68, recovery: 75, score: 74 },
    todaySessionIds: ['sess-2'],
  },
  {
    id: 'ath-5',
    name: 'James Thompson',
    avatarUrl: '',
    sport: 'Track - 200m',
    readiness: { sleep: 6.9, hrv: 58, recovery: 65, score: 63 },
    flag: { type: 'attendance', severity: 'medium', message: '15 min late to yesterday\'s session' },
    todaySessionIds: ['sess-2'],
  },
  {
    id: 'ath-6',
    name: 'Aisha Patel',
    avatarUrl: '',
    sport: 'Marathon',
    readiness: { sleep: 8.3, hrv: 78, recovery: 94, score: 92 },
    todaySessionIds: ['sess-3'],
  },
  {
    id: 'ath-7',
    name: 'Lucas Weber',
    avatarUrl: '',
    sport: 'Triathlon',
    readiness: { sleep: 6.2, hrv: 52, recovery: 45, score: 50 },
    flag: { type: 'injury', severity: 'high', message: 'Mild hamstring tightness reported' },
    todaySessionIds: ['sess-3'],
  },
  {
    id: 'ath-8',
    name: 'Sophie Martin',
    avatarUrl: '',
    sport: 'Track - 800m',
    readiness: { sleep: 7.8, hrv: 70, recovery: 85, score: 81 },
    todaySessionIds: ['sess-3'],
  },
]

export const MOCK_SESSIONS: CoachSession[] = [
  {
    id: 'sess-1',
    name: 'Morning Speed Work',
    time: '7:00 AM',
    endTime: '9:00 AM',
    location: 'Track A',
    athleteIds: ['ath-1', 'ath-2', 'ath-3'],
    status: 'planned',
    exercises: [
      { id: 'ex-1', name: 'Dynamic Warmup', sets: 1, reps: 10, rest: 0 },
      { id: 'ex-2', name: 'Flying 30m Sprints', sets: 5, reps: 1, rest: 120 },
      { id: 'ex-3', name: 'Block Starts', sets: 6, reps: 1, rest: 90 },
      { id: 'ex-4', name: 'Medicine Ball Throws', sets: 3, reps: 8, rest: 60 },
    ],
    aiAdjustments: [
      {
        id: 'adj-1',
        type: 'adjustment',
        title: 'Reduce volume for David Park',
        description: 'Reduce Flying Sprints from 5 to 3 sets',
        reasoning: 'David\'s recovery score is 38 — high fatigue detected',
        actionLabel: 'Apply',
      },
    ],
  },
  {
    id: 'sess-2',
    name: 'Strength & Conditioning',
    time: '9:30 AM',
    endTime: '11:00 AM',
    location: 'Weight Room B',
    athleteIds: ['ath-3', 'ath-4', 'ath-5'],
    status: 'planned',
    exercises: [
      { id: 'ex-5', name: 'Back Squat', sets: 5, reps: 5, rest: 180, weight: 100 },
      { id: 'ex-6', name: 'Bench Press', sets: 4, reps: 8, rest: 120, weight: 60 },
      { id: 'ex-7', name: 'Romanian Deadlift', sets: 3, reps: 10, rest: 90, weight: 80 },
    ],
  },
  {
    id: 'sess-3',
    name: 'Afternoon Endurance',
    time: '1:00 PM',
    endTime: '3:00 PM',
    location: 'Outdoor Trail',
    athleteIds: ['ath-6', 'ath-7', 'ath-8'],
    status: 'planned',
    exercises: [
      { id: 'ex-8', name: 'Zone 2 Run', sets: 1, reps: 45, rest: 0 },
      { id: 'ex-9', name: 'Hill Repeats', sets: 6, reps: 1, rest: 90 },
      { id: 'ex-10', name: 'Cool Down Stretch', sets: 1, reps: 10, rest: 0 },
    ],
  },
]

export const MOCK_MESSAGE_THREADS: MessageThread[] = [
  {
    id: 'thread-1',
    participants: [{ id: 'ath-1', name: 'Marcus Chen' }],
    lastMessage: { id: 'msg-3', senderId: 'ath-1', senderName: 'Marcus Chen', content: 'Thanks coach! Felt great today', timestamp: 'Yesterday 7:42 PM', type: 'text' },
    unread: false,
    messages: [
      { id: 'msg-1', senderId: 'coach', senderName: 'You', content: 'Great session today Marcus. Your start looked much sharper.', timestamp: 'Yesterday 7:30 PM', type: 'text' },
      { id: 'msg-2', senderId: 'ath-1', senderName: 'Marcus Chen', content: 'Really? I felt a bit slow out of the blocks', timestamp: 'Yesterday 7:35 PM', type: 'text' },
      { id: 'msg-3', senderId: 'ath-1', senderName: 'Marcus Chen', content: 'Thanks coach! Felt great today', timestamp: 'Yesterday 7:42 PM', type: 'text' },
    ],
  },
  {
    id: 'thread-2',
    participants: [{ id: 'ath-3', name: 'David Park' }],
    lastMessage: { id: 'msg-5', senderId: 'ath-3', senderName: 'David Park', content: 'I\'m really tired, can we adjust today?', timestamp: 'Yesterday 9:15 PM', type: 'text' },
    unread: true,
    messages: [
      { id: 'msg-4', senderId: 'ath-3', senderName: 'David Park', content: 'Coach, I\'ve been having trouble sleeping this week', timestamp: 'Yesterday 9:10 PM', type: 'text' },
      { id: 'msg-5', senderId: 'ath-3', senderName: 'David Park', content: 'I\'m really tired, can we adjust today?', timestamp: 'Yesterday 9:15 PM', type: 'text' },
    ],
  },
  {
    id: 'thread-3',
    participants: [{ id: 'ath-7', name: 'Lucas Weber' }],
    lastMessage: { id: 'msg-6', senderId: 'ath-7', senderName: 'Lucas Weber', content: 'Hamstring feels tight after yesterday\'s hill session', timestamp: 'Today 5:30 AM', type: 'text' },
    unread: true,
    messages: [
      { id: 'msg-6', senderId: 'ath-7', senderName: 'Lucas Weber', content: 'Hamstring feels tight after yesterday\'s hill session', timestamp: 'Today 5:30 AM', type: 'text' },
    ],
  },
  {
    id: 'thread-4',
    participants: [{ id: 'ath-2', name: 'Sarah Johnson' }, { id: 'ath-8', name: 'Sophie Martin' }],
    lastMessage: { id: 'msg-7', senderId: 'ath-2', senderName: 'Sarah Johnson', content: 'Are we doing the relay drills tomorrow?', timestamp: 'Yesterday 8:00 PM', type: 'text' },
    unread: false,
    messages: [
      { id: 'msg-7', senderId: 'ath-2', senderName: 'Sarah Johnson', content: 'Are we doing the relay drills tomorrow?', timestamp: 'Yesterday 8:00 PM', type: 'text' },
    ],
  },
]

export const MOCK_DAILY_SUMMARY: DailySummary = {
  date: '2026-07-08',
  athleteCount: 8,
  sessionCount: 3,
  completedSessions: 0,
  completedSessionNames: [],
  messageCount: 4,
  notesCount: 0,
  highlights: [
    'Sarah Johnson set a new 100m personal best during warmup drills',
    'James Thompson showed improved block technique — start phase faster by 0.12s',
    'Aisha Patel completing first week of marathon base building — great consistency',
  ],
  aiRecommendation: 'Consider reducing David Park\'s load tomorrow and scheduling a recovery session for Lucas Weber. Overall team readiness is trending positively.',
  tomorrowPreview: {
    athleteCount: 6,
    sessionCount: 2,
    suggestedFocus: 'Recovery and technique — lighter load after today\'s intensity',
  },
}

export const MOCK_AI_SUGGESTED_MESSAGES: AiSuggestion[] = [
  {
    id: 'ai-msg-1',
    type: 'message',
    title: 'Congratulate Sarah',
    description: 'Great effort today on the 100m drills, Sarah! Your start phase is really improving.',
    reasoning: 'Sarah set a PB today — positive reinforcement builds momentum',
    actionLabel: 'Send',
  },
  {
    id: 'ai-msg-2',
    type: 'message',
    title: 'Check in with David',
    description: 'David, I noticed your recovery score is low. Let\'s adjust today\'s plan to keep you healthy.',
    reasoning: 'David\'s HRV dropped 35% — proactive communication prevents overtraining',
    actionLabel: 'Send',
  },
]
