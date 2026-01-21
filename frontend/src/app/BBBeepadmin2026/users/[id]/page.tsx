import UserDetailClient from './UserDetailClient';

export const runtime = 'edge';

export default function UserDetailPage({ params }: { params: { id: string } }) {
  return <UserDetailClient userId={params.id} />;
}
