/**
 * Turbo Lavado — Tailwind theme tokens.
 * Mirrors the CSS custom properties defined in src/styles.css.
 * Source of truth: redesign handoff (violet + emerald, ink neutrals).
 */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          900: '#4c1d95',
          ink: '#ffffff',
        },
        brand: {
          purple: '#5b2c83',
          'purple-deep': '#3b1d5c',
          green: '#1f8a3d',
          'green-bright': '#22c55e',
          'green-soft': '#4ade80',
          yellow: '#f0db1f',
          'yellow-deep': '#d4a017',
        },
        ink: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          150: '#e9eef5',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        canvas: '#f5f6f8',
        paper:  '#ffffff',
        'border-soft':   '#e6e8ee',
        'border-strong': '#d6d9e1',
        good: {
          50:  '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warn: {
          50:  '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        bad: {
          50:  '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        info: {
          50:  '#eff6ff',
          100: '#dbeafe',
          700: '#1d4ed8',
        },
        sidebar: {
          bg:        '#1a0f2e',
          'bg-2':    '#2a1a4a',
          fg:        '#d4cce6',
          'fg-dim':  '#8b7aa8',
        },
      },
      borderRadius: {
        sm:  '6px',
        DEFAULT: '10px',
        md:  '10px',
        lg:  '14px',
        xl:  '18px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(15,23,42,0.04), 0 1px 1px rgba(15,23,42,0.03)',
        sm: '0 1px 2px rgba(15,23,42,0.05), 0 2px 6px rgba(15,23,42,0.04)',
        md: '0 6px 16px rgba(15,23,42,0.08), 0 2px 6px rgba(15,23,42,0.04)',
        lg: '0 16px 40px rgba(15,23,42,0.14), 0 4px 10px rgba(15,23,42,0.06)',
        primary: '0 1px 0 rgba(255,255,255,0.18) inset, 0 1px 2px rgba(124,58,237,0.28), 0 2px 6px rgba(124,58,237,0.16)',
        'primary-hover': '0 1px 0 rgba(255,255,255,0.18) inset, 0 2px 4px rgba(124,58,237,0.32), 0 4px 12px rgba(124,58,237,0.20)',
        go: '0 1px 0 rgba(255,255,255,0.18) inset, 0 1px 2px rgba(31,138,61,0.28), 0 2px 6px rgba(31,138,61,0.16)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}
