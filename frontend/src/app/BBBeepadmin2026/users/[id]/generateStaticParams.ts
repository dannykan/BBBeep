// 为静态导出提供 generateStaticParams
// 返回空数组，让 Next.js 在运行时处理动态路由
export async function generateStaticParams() {
  // 返回空数组，表示所有路由都在运行时生成
  return [];
}
