import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD || '';

type FieldDef = {
  name: string;
  type: string;
  required: boolean;
  unique?: boolean;
  values?: string[];
  collectionId?: string;
};

async function createCollection(pb: PocketBase, name: string, fields: FieldDef[]) {
  console.log(`Creating collection: ${name}`);
  try {
    const result = await pb.send('/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name, type: 'base', fields }),
      headers: { 'Content-Type': 'application/json' },
    });
    console.log(`  Created: ${name}`);
    return result;
  } catch (error: any) {
    if (error.status === 400 && error.response?.data?.data?.name?.code === 'validation_collection_name_exists_in') {
      console.log(`  Already exists: ${name}`);
      const cols = await pb.send('/api/collections', { method: 'GET' });
      return (cols.items || []).find((c: any) => c.name === name);
    }
    throw error;
  }
}

async function setup() {
  const pb = new PocketBase(PB_URL);

  console.log('Authenticating as admin...');
  const authData = await pb.send('/api/collections/_superusers/auth-with-password', {
    method: 'POST',
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    headers: { 'Content-Type': 'application/json' },
  });
  pb.authStore.save(authData.token, authData.record);
  console.log('Authenticated.\n');

  // Phase 1: Create collections without relations
  const appUsers = await createCollection(pb, 'app_users', [
    { name: 'clerk_id', type: 'text', required: true, unique: true },
    { name: 'email', type: 'text', required: true },
    { name: 'full_name', type: 'text', required: true },
    { name: 'role', type: 'select', required: true, values: ['member', 'elite', 'pro', 'admin'] },
    { name: 'avatar_url', type: 'text', required: false },
  ]) as any;

  const plans = await createCollection(pb, 'plans', [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'price_monthly', type: 'number', required: true },
    { name: 'price_annual', type: 'number', required: false },
    { name: 'features', type: 'json', required: true },
    { name: 'paddle_price_id', type: 'text', required: true },
    { name: 'is_featured', type: 'bool', required: false },
    { name: 'sort_order', type: 'number', required: false },
  ]) as any;

  const prog = await createCollection(pb, 'workout_programs', [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'text', required: true },
    { name: 'difficulty', type: 'select', required: true, values: ['beginner', 'intermediate', 'advanced'] },
    { name: 'plan_tier', type: 'select', required: true, values: ['starter', 'elite', 'pro'] },
    { name: 'duration_weeks', type: 'number', required: true },
  ]) as any;

  // Phase 2: Create collections WITH relations (using resolved IDs)
  const subscriptions = await createCollection(pb, 'subscriptions', [
    { name: 'user_id', type: 'relation', required: true, collectionId: appUsers.id },
    { name: 'plan_id', type: 'relation', required: true, collectionId: plans.id },
    { name: 'status', type: 'select', required: true, values: ['active', 'canceled', 'past_due', 'trialing'] },
    { name: 'paddle_subscription_id', type: 'text', required: true },
    { name: 'paddle_customer_id', type: 'text', required: true },
    { name: 'current_period_start', type: 'date', required: true },
    { name: 'current_period_end', type: 'date', required: true },
  ]) as any;

  const workouts = await createCollection(pb, 'workouts', [
    { name: 'program_id', type: 'relation', required: true, collectionId: prog.id },
    { name: 'user_id', type: 'relation', required: true, collectionId: appUsers.id },
    { name: 'name', type: 'text', required: true },
    { name: 'day_number', type: 'number', required: true },
    { name: 'completed', type: 'bool', required: false },
    { name: 'completed_at', type: 'date', required: false },
    { name: 'notes', type: 'text', required: false },
  ]) as any;

  const exercises = await createCollection(pb, 'exercises', [
    { name: 'workout_id', type: 'relation', required: true, collectionId: workouts.id },
    { name: 'name', type: 'text', required: true },
    { name: 'sets', type: 'number', required: true },
    { name: 'reps', type: 'number', required: true },
    { name: 'weight_kg', type: 'number', required: false },
    { name: 'rest_seconds', type: 'number', required: false },
    { name: 'notes', type: 'text', required: false },
    { name: 'sort_order', type: 'number', required: true },
    { name: 'completed', type: 'bool', required: false },
  ]) as any;

  await createCollection(pb, 'progress_metrics', [
    { name: 'user_id', type: 'relation', required: true, collectionId: appUsers.id },
    { name: 'metric_type', type: 'select', required: true, values: ['weight', 'body_fat', 'vo2max', 'hrv', 'bench', 'squat', 'deadlift'] },
    { name: 'value', type: 'number', required: true },
    { name: 'unit', type: 'text', required: true },
    { name: 'recorded_at', type: 'date', required: true },
  ]);

  await createCollection(pb, 'payments', [
    { name: 'user_id', type: 'relation', required: true, collectionId: appUsers.id },
    { name: 'subscription_id', type: 'relation', required: false, collectionId: subscriptions.id },
    { name: 'paddle_transaction_id', type: 'text', required: true },
    { name: 'amount', type: 'number', required: true },
    { name: 'currency', type: 'text', required: true },
    { name: 'status', type: 'select', required: true, values: ['paid', 'pending', 'failed', 'refunded'] },
    { name: 'paid_at', type: 'date', required: false },
  ]);

  console.log('\nDone! All 8 collections created.');
}

setup().catch(console.error);
