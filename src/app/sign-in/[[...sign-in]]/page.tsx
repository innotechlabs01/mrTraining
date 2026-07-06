import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.plan) qs.set('plan', params.plan as string);
  const query = qs.toString();
  redirect(`/login${query ? `?${query}` : ''}`);
}
