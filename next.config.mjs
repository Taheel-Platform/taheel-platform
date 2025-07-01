/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        // لو عندك مسارات معينة أضفها هنا
      },
      {
        protocol: "https",
        hostname: "taheel-platform.app",
      }
      // ممكن تضيف أي دومين خارجي آخر بنفس الشكل
    ]
  }
};

export default nextConfig;