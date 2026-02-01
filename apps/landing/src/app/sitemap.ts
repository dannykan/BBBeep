import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ubeep.app';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    // 之後可以加入更多頁面
    // {
    //   url: `${baseUrl}/privacy`,
    //   lastModified: new Date(),
    //   changeFrequency: 'monthly',
    //   priority: 0.5,
    // },
  ];
}
