import UserDetailClient from './UserDetailClient';

// 使用 Edge Runtime 以支持动态路由
export const runtime = 'edge';

export default function UserDetailPage({ params }: { params: { id: string } }) {
  return <UserDetailClient userId={params.id} />;
}
