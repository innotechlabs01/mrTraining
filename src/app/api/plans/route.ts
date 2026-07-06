import { NextResponse } from 'next/server';
import { toPlanDTO } from '@/application/dtos';
import { GetPlansUseCase } from '@/application/plans/get-plans.use-case';
import { PocketBasePlanRepository } from '@/infrastructure/database/pocketbase.plan-repo';

export async function GET() {
  try {
    const repo = new PocketBasePlanRepository();
    const getPlans = new GetPlansUseCase(repo);

    const result = await getPlans.execute();

    if (result.isFailure) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(result.value.map(toPlanDTO));
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
