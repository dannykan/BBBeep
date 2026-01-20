import UserDetailClient from './UserDetailClient';

// 为静态导出提供 generateStaticParams
export async function generateStaticParams() {
  return [];
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  return <UserDetailClient userId={params.id} />;
}
