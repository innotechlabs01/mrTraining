import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || '';

async function seed() {
  const pb = new PocketBase(PB_URL);

  console.log('Authenticating as admin...');
  const authData = await pb.send('/api/collections/_superusers/auth-with-password', {
    method: 'POST',
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    headers: { 'Content-Type': 'application/json' },
  });
  pb.authStore.save(authData.token, authData.record);
  console.log('Authenticated.\n');

  // --- PLANS ---
  console.log('Seeding plans...');
  const plansData = [
    { name: 'Starter', slug: 'starter', price_monthly: 4900, price_annual: 470000, features: ['Basic workout programs', 'Community access', 'Mobile app'], paddle_price_id: 'pri_01kwqdq8xx7s4ptpp9gqyn9dms', is_featured: false, sort_order: 1 },
    { name: 'Elite', slug: 'elite', price_monthly: 19900, price_annual: 1910000, features: ['Advanced programs', 'Coach check-ins', 'Wearable sync', 'Priority support'], paddle_price_id: 'pri_01kwqdq945983ncpjpjndhvn0b', is_featured: true, sort_order: 2 },
    { name: 'Pro', slug: 'pro', price_monthly: 44900, price_annual: 4310000, features: ['1:1 coaching', 'Lab panels', 'Daily adjustments', 'VIP events'], paddle_price_id: 'pri_01kwqdq9a9hys36akt1yytyv1w', is_featured: false, sort_order: 3 },
  ];
  const planRecords: Record<string, string> = {};
  for (const p of plansData) {
    const existing = await pb.collection('plans').getList(1, 1, { filter: `slug = "${p.slug}"` });
    if (existing.items.length > 0) {
      planRecords[p.slug] = existing.items[0].id;
      console.log(`  Plan "${p.name}" already exists`);
    } else {
      const r = await pb.collection('plans').create(p);
      planRecords[p.slug] = r.id;
      console.log(`  Created plan "${p.name}"`);
    }
  }

  // --- WORKOUT PROGRAMS ---
  console.log('\nSeeding workout programs...');
  const programsData = [
    { name: 'Upper Body Strength', description: 'Push/pull compound movements with progressive overload.', difficulty: 'intermediate', plan_tier: 'elite', duration_weeks: 8 },
    { name: 'Marathon Prep', description: '16-week periodized marathon training plan.', difficulty: 'advanced', plan_tier: 'pro', duration_weeks: 16 },
    { name: 'Foundation Builder', description: 'Full-body fundamentals for new athletes.', difficulty: 'beginner', plan_tier: 'starter', duration_weeks: 4 },
  ];
  const programRecords: string[] = [];
  for (const p of programsData) {
    const existing = await pb.collection('workout_programs').getList(1, 1, { filter: `name = "${p.name}"` });
    if (existing.items.length > 0) {
      programRecords.push(existing.items[0].id);
      console.log(`  Program "${p.name}" already exists`);
    } else {
      const r = await pb.collection('workout_programs').create(p);
      programRecords.push(r.id);
      console.log(`  Created program "${p.name}"`);
    }
  }

  // --- APP USER (demo user) ---
  console.log('\nSeeding demo user...');
  const demoEmail = 'demo@mrtraining.com';
  const existingUser = await pb.collection('app_users').getList(1, 1, { filter: `email = "${demoEmail}"` });
  let userId: string;
  if (existingUser.items.length > 0) {
    userId = existingUser.items[0].id;
    console.log(`  Demo user already exists`);
  } else {
    const r = await pb.collection('app_users').create({
      clerk_id: 'demo_user_001',
      email: demoEmail,
      full_name: 'Demo Athlete',
      role: 'elite',
    });
    userId = r.id;
    console.log(`  Created demo user`);
  }

  // --- SUBSCRIPTION ---
  console.log('\nSeeding subscription...');
  const existingSub = await pb.collection('subscriptions').getList(1, 1, { filter: `user_id = "${userId}"` });
  if (existingSub.items.length === 0) {
    await pb.collection('subscriptions').create({
      user_id: userId,
      plan_id: planRecords['elite'],
      status: 'active',
      paddle_subscription_id: 'sub_demo_001',
      paddle_customer_id: 'cus_demo_001',
      current_period_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      current_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    });
    console.log('  Created subscription');
  } else {
    console.log('  Subscription already exists');
  }

  // --- WORKOUTS ---
  console.log('\nSeeding workouts...');
  const workoutsData = [
    { program_id: programRecords[0], name: 'Push Day — Chest & Shoulders', day_number: 1, completed: true, completed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
    { program_id: programRecords[0], name: 'Pull Day — Back & Biceps', day_number: 2, completed: true, completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
    { program_id: programRecords[0], name: 'Leg Day — Quads & Glutes', day_number: 3, completed: true, completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
    { program_id: programRecords[0], name: 'Upper Body Strength', day_number: 4, completed: false },
    { program_id: programRecords[0], name: 'Active Recovery', day_number: 5, completed: false },
  ];
  const workoutIds: string[] = [];
  for (const w of workoutsData) {
    const existing = await pb.collection('workouts').getList(1, 1, { filter: `user_id = "${userId}" && name = "${w.name}"` });
    if (existing.items.length > 0) {
      workoutIds.push(existing.items[0].id);
      console.log(`  Workout "${w.name}" already exists`);
    } else {
      const r = await pb.collection('workouts').create({ ...w, user_id: userId });
      workoutIds.push(r.id);
      console.log(`  Created workout "${w.name}"`);
    }
  }

  // --- EXERCISES ---
  console.log('\nSeeding exercises...');
  const exercisesByWorkout: Record<number, Array<{ name: string; sets: number; reps: number; weight_kg: number | null; rest_seconds: number; sort_order: number; completed: boolean }>> = {
    0: [
      { name: 'Barbell Bench Press', sets: 4, reps: 8, weight_kg: 80, rest_seconds: 120, sort_order: 1, completed: true },
      { name: 'Incline Dumbbell Press', sets: 3, reps: 10, weight_kg: 30, rest_seconds: 90, sort_order: 2, completed: true },
      { name: 'Overhead Press', sets: 4, reps: 8, weight_kg: 50, rest_seconds: 120, sort_order: 3, completed: true },
      { name: 'Lateral Raises', sets: 3, reps: 12, weight_kg: 12, rest_seconds: 60, sort_order: 4, completed: true },
    ],
    1: [
      { name: 'Barbell Rows', sets: 4, reps: 8, weight_kg: 70, rest_seconds: 120, sort_order: 1, completed: true },
      { name: 'Pull-ups', sets: 3, reps: 10, weight_kg: null, rest_seconds: 90, sort_order: 2, completed: true },
      { name: 'Face Pulls', sets: 3, reps: 15, weight_kg: 15, rest_seconds: 60, sort_order: 3, completed: true },
      { name: 'Barbell Curls', sets: 3, reps: 12, weight_kg: 25, rest_seconds: 60, sort_order: 4, completed: true },
    ],
    2: [
      { name: 'Back Squat', sets: 4, reps: 8, weight_kg: 100, rest_seconds: 180, sort_order: 1, completed: true },
      { name: 'Romanian Deadlift', sets: 3, reps: 10, weight_kg: 80, rest_seconds: 120, sort_order: 2, completed: true },
      { name: 'Leg Press', sets: 3, reps: 12, weight_kg: 160, rest_seconds: 90, sort_order: 3, completed: true },
      { name: 'Walking Lunges', sets: 3, reps: 12, weight_kg: 20, rest_seconds: 60, sort_order: 4, completed: true },
    ],
    3: [
      { name: 'Dumbbell Shoulder Press', sets: 4, reps: 10, weight_kg: 24, rest_seconds: 90, sort_order: 1, completed: false },
      { name: 'Cable Rows', sets: 4, reps: 10, weight_kg: 45, rest_seconds: 90, sort_order: 2, completed: false },
      { name: 'Dips', sets: 3, reps: 12, weight_kg: null, rest_seconds: 60, sort_order: 3, completed: false },
      { name: 'Hammer Curls', sets: 3, reps: 12, weight_kg: 14, rest_seconds: 60, sort_order: 4, completed: false },
    ],
  };

  for (let i = 0; i < workoutIds.length; i++) {
    const exList = exercisesByWorkout[i];
    if (!exList) continue;
    const existing = await pb.collection('exercises').getList(1, 1, { filter: `workout_id = "${workoutIds[i]}"` });
    if (existing.totalItems > 0) {
      console.log(`  Exercises for workout ${i + 1} already exist`);
      continue;
    }
    for (const ex of exList) {
      await pb.collection('exercises').create({ ...ex, workout_id: workoutIds[i] });
    }
    console.log(`  Created ${exList.length} exercises for workout ${i + 1}`);
  }

  // --- PROGRESS METRICS ---
  console.log('\nSeeding progress metrics...');
  const metricsData = [
    { metric_type: 'weight', value: 82.5, unit: 'kg', days_ago: 0 },
    { metric_type: 'weight', value: 83.0, unit: 'kg', days_ago: 7 },
    { metric_type: 'weight', value: 83.8, unit: 'kg', days_ago: 14 },
    { metric_type: 'body_fat', value: 14.2, unit: '%', days_ago: 0 },
    { metric_type: 'body_fat', value: 14.8, unit: '%', days_ago: 14 },
    { metric_type: 'bench', value: 85, unit: 'kg', days_ago: 0 },
    { metric_type: 'bench', value: 80, unit: 'kg', days_ago: 14 },
    { metric_type: 'squat', value: 110, unit: 'kg', days_ago: 0 },
    { metric_type: 'squat', value: 105, unit: 'kg', days_ago: 14 },
    { metric_type: 'deadlift', value: 130, unit: 'kg', days_ago: 0 },
    { metric_type: 'deadlift', value: 125, unit: 'kg', days_ago: 14 },
    { metric_type: 'vo2max', value: 48.5, unit: 'ml/kg/min', days_ago: 0 },
  ];

  const existingMetrics = await pb.collection('progress_metrics').getList(1, 1, { filter: `user_id = "${userId}"` });
  if (existingMetrics.totalItems === 0) {
    for (const m of metricsData) {
      await pb.collection('progress_metrics').create({
        user_id: userId,
        metric_type: m.metric_type,
        value: m.value,
        unit: m.unit,
        recorded_at: new Date(Date.now() - m.days_ago * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    console.log(`  Created ${metricsData.length} progress metrics`);
  } else {
    console.log('  Progress metrics already exist');
  }

  console.log('\nSeeding complete!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
