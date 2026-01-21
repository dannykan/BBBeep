'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

// 完全禁用 SSR，只在客戶端渲染
const UserDetailClient = dynamic(
  () => import('./UserDetailClient'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">載入中...</p>
      </div>
    )
  }
);

export const runtime = 'edge';

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
