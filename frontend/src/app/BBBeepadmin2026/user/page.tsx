'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import UserDetailClient from './UserDetailClient';

function UserDetailContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('id');

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">無效的用戶 ID</p>
      </div>
    );
  }

  return <UserDetailClient userId={userId} />;
}

export default function UserPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    }>
      <UserDetailContent />
    </Suspense>
  );
}
