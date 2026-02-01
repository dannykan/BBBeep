import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // For now, we'll use zh-TW as the default locale
  // In the future, you can detect locale from headers or URL
  const locale = 'zh-TW';

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
