import { notFound } from 'next/navigation';
import { ServerApiError, serverFetch } from '@/core/lib/api/server-client';
import type { UserDetail as UserDetailType } from '@/core/types/api';
import { UserDetail } from '@/features/users';

export const metadata = { title: 'Usuario' };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;
  let user: UserDetailType;
  try {
    user = await serverFetch<UserDetailType>(`/users/${id}`);
  } catch (err) {
    if (err instanceof ServerApiError && err.status === 404) notFound();
    throw err;
  }
  return <UserDetail user={user} />;
}
