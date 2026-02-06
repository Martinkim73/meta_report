/** @type {import('next').NextConfig} */
const nextConfig = {
  // API 라우트 body size 제한 증가 (비디오 업로드용)
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '50mb',
  },
  // 실험적 기능 활성화
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
