/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow leaflet assets
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "unpkg.com",
      },
    ],
  },
};

export default nextConfig;
