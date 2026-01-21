export const runtime = 'edge';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div style={{ padding: '20px' }}>
      <h1>User ID: {id}</h1>
      <p>如果你看到這個頁面，動態路由正常運作。</p>
      <a href="/BBBeepadmin2026">返回</a>
    </div>
  );
}
