/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        /* Legacy tokens — keep for marketplace compatibility */
        'theme-bg':            'var(--color-bg)',
        'theme-sidebar':       'var(--color-sidebar)',
        'theme-active-bg':     'var(--color-active-btn-bg)',
        'theme-active-text':   'var(--color-active-btn-text)',
        'theme-text':          'var(--color-text)',
        'theme-text-muted':    'var(--color-text-muted)',
        'theme-selected-bg':   'var(--color-selected-bg)',
        'theme-border':        'var(--color-border)',
        'theme-tooltip-bg':    'var(--color-tooltip-bg)',
        'theme-tooltip-text':  'var(--color-tooltip-text)',
        'theme-tooltip-border':'var(--color-tooltip-border)',

        /* New tokens */
        'theme-header':        'var(--color-header)',
        'theme-card':          'var(--color-card-bg)',
        'theme-card-border':   'var(--color-card-border)',
        'theme-text-faint':    'var(--color-text-faint)',
        'theme-separator':     'var(--color-separator)',
        'theme-hover':         'var(--color-hover)',
        'theme-selected':      'var(--color-selected)',
        'theme-accent':        'var(--color-accent)',
        'theme-accent-light':  'var(--color-accent-light)',
        'theme-green':         'var(--color-green)',
        'theme-green-bg':      'var(--color-green-bg)',
        'theme-red':           'var(--color-red)',
        'theme-active-dot':    'var(--color-active-dot)',
      }
    }
  },
  plugins: []
}
