import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The Vocabulary page was removed. Existing bookmarks go to Albion Home.
  async redirects() {
    return [{ source: '/ielts/vocab', destination: '/ielts', permanent: false }];
  },
};
export default config;
