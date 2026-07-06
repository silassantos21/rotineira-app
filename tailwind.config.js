/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // ── Paleta base ─────────────────────────────────
        'verde-mosgo':  '#556B2F',
        'verde-oliva':  '#7B8D63',
        'creme':        '#F8F5EE',
        'bege':         '#EADFCF',
        'terracota':    '#C9775D',
        'terracota-dk': '#B5644A',

        // ── Semânticos (uso recomendado nos componentes) ─
        primary:        '#556B2F',
        'primary-text': '#2D3B1F',
        secondary:      '#7B8D63',
        accent:         '#C9775D',
        'accent-press': '#B5644A',

        // ── Fundos ───────────────────────────────────────
        'bg-screen':    '#F8F5EE',
        'bg-card':      '#EADFCF',
        'bg-badge':     '#EBE5D8',
        'bg-input':     '#FFFFFF',
        'bg-logo':      '#FCF2E8', // fundo exato da logo PNG — usar no splash e containers da logo

        // ── Texto ────────────────────────────────────────
        'text-heading':     '#2D3B1F',
        'text-body':        '#4A5240',
        'text-muted':       '#9BA38D',
        'text-placeholder': '#B5BDAA',
        'text-inverse':     '#F8F5EE',

        // ── Bordas ───────────────────────────────────────
        'border-light':  '#D4CBBF',
        'border-medium': '#9BA38D',
        'border-focus':  '#556B2F',

        // ── Status ───────────────────────────────────────
        success: '#7B8D63',
        error:   '#C05A44',
        warning: '#C9A05D',
      },
      fontFamily: {
        'nunito-light':     ['Nunito_300Light'],
        'nunito':           ['Nunito_400Regular'],
        'nunito-semibold':  ['Nunito_600SemiBold'],
        'nunito-bold':      ['Nunito_700Bold'],
        'nunito-extrabold': ['Nunito_800ExtraBold'],
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '14px',
        xl:   '20px',
      },
    },
  },
  plugins: [],
}
