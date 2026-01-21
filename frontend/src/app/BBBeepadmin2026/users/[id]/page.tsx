'use client';

import { useParams } from 'next/navigation';
import UserDetailClient from './UserDetailClient';

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">無效的用戶 ID</p>
      </div>
    );
  }

  return <UserDetailClient userId={userId} />;
}
