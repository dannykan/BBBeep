import { generateStaticParams } from './generateStaticParams';
import UserDetailClient from './UserDetailClient';

// 为静态导出提供 generateStaticParams
export { generateStaticParams };

export default function UserDetailPage({ params }: { params: { id: string } }) {
  return <UserDetailClient userId={params.id} />;
}
