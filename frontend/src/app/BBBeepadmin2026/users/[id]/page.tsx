import UserDetailClient from './UserDetailClient';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default function UserDetailPage({ params }: { params: { id: string } }) {
  return <UserDetailClient userId={params.id} />;
}
