/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'theme-bg': 'var(--color-bg)',
        'theme-sidebar': 'var(--color-sidebar)',
        'theme-active-bg': 'var(--color-active-btn-bg)',
        'theme-active-text': 'var(--color-active-btn-text)',
        'theme-text': 'var(--color-text)',
        'theme-text-muted': 'var(--color-text-muted)',
        'theme-selected-bg': 'var(--color-selected-bg)',
        'theme-border': 'var(--color-border)',
      }
    }
  },
  plugins: []
}
