export const runtime = 'edge';

export default function UserDetailPage({ params }: { params: { id: string } }) {
  return (
    <div style={{ padding: '20px' }}>
      <h1>User ID: {params.id}</h1>
      <p>如果你看到這個頁面，動態路由正常運作。</p>
      <a href="/BBBeepadmin2026">返回</a>
    </div>
  );
}
