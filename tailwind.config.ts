import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          green: '#10b981',
          'green-dark': '#059669',
        },
        danger: {
          red: '#ef4444',
          'red-dark': '#dc2626',
        },
        warning: {
          yellow: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
export default config;
