import UserDetailClient from './UserDetailClient';

// 使用 Edge Runtime 以支持动态路由（Cloudflare Pages）
export const runtime = 'edge';

// 標記為動態頁面
export const dynamic = 'force-dynamic';

export default function UserDetailPage({ params }: { params: { id: string } }) {
  return <UserDetailClient userId={params.id} />;
}
