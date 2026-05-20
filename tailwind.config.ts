/**
 * CPC Station Manager — Tailwind Design Token Reference
 *
 * Tailwind v4 is CSS-first: color utilities are generated from @theme in
 * globals.css. This file documents design tokens and is loaded via
 * @config for darkMode / content settings that v4 still reads from JS config.
 *
 * Font utilities (font-syne, font-sans, font-mono) and colour utilities
 * (bg-primary, text-accent, etc.) are authoritative in globals.css @theme.
 */

const config = {
  darkMode: 'class' as const,

  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './providers/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],

  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E85D04',
          dark:    '#DC2F02',
        },
        accent:  '#F48C06',
        success: '#2D6A4F',
        warning: '#E9C46A',
        danger:  '#E63946',
        surface: {
          dark:  '#111114',
          light: '#FFFFFF',
        },
        card: {
          dark:  '#18181C',
          light: '#FEFEFE',
        },
        border: {
          dark:  '#2A2A30',
          light: '#E4E2DC',
        },
      },

      fontFamily: {
        syne: ['var(--font-syne)',          'sans-serif'],
        sans: ['var(--font-ibm-plex-sans)', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
    },
  },
}

export default config
