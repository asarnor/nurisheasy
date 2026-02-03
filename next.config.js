/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Environment variables are automatically available in Next.js
  // NEXT_PUBLIC_* variables are exposed to the browser
  // Other variables are only available server-side
  env: {
    // Add any custom env vars that need to be exposed to the browser
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
}

module.exports = nextConfig
