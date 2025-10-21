/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    {
      pattern: /bg-(cyan|blue|emerald|amber|gray)-(100|200|500|600|700)/,
    },
    {
      pattern: /text-(cyan|blue|emerald|amber|gray)-(500|600|700)/,
    },
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        '2xl': '4rem',
      },
    },
    extend: {
      screens: {
        xs: '480px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      fontSize: {
        'fluid-xs': 'clamp(0.75rem, 0.69rem + 0.27vw, 0.875rem)',
        'fluid-sm': 'clamp(0.875rem, 0.82rem + 0.27vw, 1rem)',
        'fluid-base': 'clamp(1rem, 0.92rem + 0.36vw, 1.125rem)',
        'fluid-lg': 'clamp(1.125rem, 1.05rem + 0.45vw, 1.5rem)',
        'fluid-xl': 'clamp(1.25rem, 1.12rem + 0.71vw, 1.875rem)',
        'fluid-2xl': 'clamp(1.5rem, 1.28rem + 1.08vw, 2.25rem)',
        'fluid-3xl': 'clamp(1.875rem, 1.52rem + 1.79vw, 3rem)',
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      boxShadow: {
        shell: '0 10px 30px -12px rgba(15, 23, 42, 0.25)',
      },
      maxWidth: {
        shell: '1280px',
      },
    },
  },
  plugins: [],
};
