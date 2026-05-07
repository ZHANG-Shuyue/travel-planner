import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7B9EAE',
        secondary: '#A4B9A8',
        accent: '#D4A9A8',
        muted: '#C8C2BC',
        background: '#F5F2EE',
        warm: '#E8DFC4',
        purple: '#9B8EA8',
        'dark-bg': '#2C2C2C',
        'dark-card': '#3A3A3A',
      },
    },
  },
  plugins: [],
} satisfies Config
