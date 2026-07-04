import PocketBase from 'pocketbase';
import { env } from '@/shared/config/env';

let pbInstance: PocketBase | null = null;

export function getPocketBase(): PocketBase {
  if (!pbInstance) {
    pbInstance = new PocketBase(env.POCKETBASE_URL);
    pbInstance.autoCancellation(false);
  }
  return pbInstance;
}

export async function getAdminPocketBase(): Promise<PocketBase> {
  const pb = new PocketBase(env.POCKETBASE_URL);
  await pb.admins.authWithPassword(env.POCKETBASE_ADMIN_EMAIL, env.POCKETBASE_ADMIN_PASSWORD);
  return pb;
}
