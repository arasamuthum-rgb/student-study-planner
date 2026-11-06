const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'), surface: c('surface'), sunken: c('sunken'), line: c('line'),
        fg: c('fg'), muted: c('muted'), accent: c('accent'), 'accent-fg': c('accent-fg'),
        ind: c('ind'), marker: c('marker'), ok: c('ok'), warn: c('warn'), bad: c('bad'),
      },
      fontFamily: { sans: ['"Figtree Variable"', 'Figtree', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', '"Figtree Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      borderRadius: { xl: '0.875rem', '2xl': '1.125rem' },
      boxShadow: {
        card: '0 1px 0 rgb(20 27 48 / 0.04)',
        pop: '0 10px 30px -8px rgb(15 23 42 / 0.25), 0 2px 6px rgb(15 23 42 / 0.08)',
      },
      keyframes: {
        pop: { from: { opacity: '0', transform: 'translateY(6px) scale(.98)' }, to: { opacity: '1', transform: 'none' } },
        slideR: { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
        slideL: { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { pop: 'pop .16s ease-out', slideR: 'slideR .22s ease-out', slideL: 'slideL .22s ease-out' },
    },
  },
  plugins: [],
};
