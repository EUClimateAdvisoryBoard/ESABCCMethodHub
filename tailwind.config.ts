import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['var(--mh-font-sans)', '"Segoe UI"', 'Roboto', 'Arial', 'Helvetica Neue', 'Helvetica', 'sans-serif'],
    },
    extend: {
      colors: {
        primary: { DEFAULT: '#004B7F', dark: '#0A3D61', light: '#0065A4', lighter: '#478EA5', lightest: '#75C9DB' },
        secondary: { DEFAULT: '#007B6C', dark: '#00665A', light: '#00928F', lighter: '#74CBC8', lightest: '#AEDFE8' },
        tertiary: { DEFAULT: '#3D5265', dark: '#2E3E4C', light: '#54728C', lighter: '#7495B2', lightest: '#ACCAE5' },
        grey: { 50: '#F9FAFB', 100: '#F3F4F5', 200: '#E6E7E8', 300: '#DCDDDE', 400: '#BCBEC0', 500: '#808285', 600: '#54728C', 900: '#2E3E4C' },
        accent: { red: '#B83230', orange: '#FF9933', yellow: '#F2EB49', green: '#007B6C', teal: '#00928F', blue: '#004B7F', violet: '#6667AB', purple: '#A530B8' },
        surface: { blue: '#F2F6F8', teal: '#EDF1F2', green: '#E5F9E7', orange: '#FFEDDE', yellow: '#FFF8DB' },
      },
      maxWidth: { narrow: '900px', content: '1120px', wide: '1320px', text: '800px' },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
