/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        sound: {
          '0%, 40%, 100%': { transform: 'scaleY(0.4)' },
          '20%': { transform: 'scaleY(1.0)' },
        },
      },
      animation: {
        'sound-wave-1': 'sound 1.2s infinite ease-in-out',
        'sound-wave-2': 'sound 1.2s infinite ease-in-out -1.1s',
        'sound-wave-3': 'sound 1.2s infinite ease-in-out -1.0s',
        'sound-wave-4': 'sound 1.2s infinite ease-in-out -0.9s',
        'sound-wave-5': 'sound 1.2s infinite ease-in-out -0.8s',
      },
    },
  },
  plugins: [],
};