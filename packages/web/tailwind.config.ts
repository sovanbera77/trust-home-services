import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4f46e5', hover: '#4338ca', light: '#818cf8' },
        surface: { DEFAULT: '#1e293b', light: 'rgba(30,41,59,0.7)' },
        'text-main': '#f8fafc',
        'text-muted': '#94a3b8',
      },
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};

export default config;
