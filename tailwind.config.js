/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background:   'var(--color-background)',
        foreground:   'var(--color-foreground)',
        card: {
          DEFAULT:    'var(--color-card)',
          foreground: 'var(--color-card-foreground)',
        },
        popover: {
          DEFAULT:    'var(--color-popover)',
          foreground: 'var(--color-popover-foreground)',
        },
        primary: {
          DEFAULT:    'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)',
        },
        secondary: {
          DEFAULT:    'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground)',
        },
        muted: {
          DEFAULT:    'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)',
        },
        accent: {
          DEFAULT:    'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)',
        },
        destructive:  'var(--color-destructive)',
        border:       'var(--color-border)',
        input:        'var(--color-input)',
        ring:         'var(--color-ring)',
      },
      borderRadius: {
        sm:  'var(--radius-sm)',
        md:  'var(--radius-md)',
        DEFAULT: 'var(--radius)',
        lg:  'var(--radius-lg)',
        xl:  'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
      },
    },
  },
  plugins: [],
}
