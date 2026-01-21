import UserDetailClient from './UserDetailClient';

// 使用 Edge Runtime 以支持动态路由（Cloudflare Pages）
export const runtime = 'edge';

// 標記為動態頁面
export const dynamic = 'force-dynamic';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UserDetailClient userId={id} />;
}
