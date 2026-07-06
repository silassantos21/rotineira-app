export const colors = {
  // ── Paleta base ──────────────────────────────────────────────
  verdeMosgo:  '#556B2F',
  verdeOliva:  '#7B8D63',
  creme:       '#F8F5EE',
  bege:        '#EADFCF',
  terracota:   '#C9775D',

  // ── Marca ────────────────────────────────────────────────────
  brand: {
    primary:      '#556B2F', // verde musgo — logo, header, botão outline
    secondary:    '#7B8D63', // verde oliva — ícones, badges, chips
    accent:       '#C9775D', // terracota — CTA principal ("Gerar Cardápio", "Compartilhar")
    accentPress:  '#B5644A', // terracota escurecido — estado pressionado
  },

  // ── Fundos ───────────────────────────────────────────────────
  background: {
    screen: '#F8F5EE', // creme — fundo padrão de telas
    card:   '#EADFCF', // bege — cards de membros, seções agrupadas
    header: '#556B2F', // verde musgo — top bar
    input:  '#FFFFFF', // branco — campos de texto
    badge:  '#EBE5D8', // bege levemente mais escuro — chips/toggles inativos
    // Fundo exato da logo (PNG não transparente). Usar no splash screen e em
    // containers que envolvem a logo para evitar retângulo visível.
    logo:   '#FCF2E8',
  },

  // ── Tipografia ───────────────────────────────────────────────
  text: {
    heading:     '#2D3B1F', // quase preto derivado do verde — títulos
    body:        '#4A5240', // verde-escuro médio — corpo de texto
    muted:       '#9BA38D', // oliva acinzentado — subtítulos, slogan, placeholders
    placeholder: '#B5BDAA', // mais claro — placeholder de input
    inverse:     '#F8F5EE', // creme — texto sobre fundo escuro (header, botão terracota)
    accent:      '#C9775D', // terracota — links, destaques inline
    brand:       '#556B2F', // verde musgo — nome do app na header
  },

  // ── Bordas ───────────────────────────────────────────────────
  border: {
    light:  '#D4CBBF', // bege mais escuro — separadores, borda de card
    medium: '#9BA38D', // oliva — borda de input normal
    focus:  '#556B2F', // verde musgo — borda de input em foco
  },

  // ── Estado ───────────────────────────────────────────────────
  status: {
    success: '#7B8D63', // verde oliva — confirmações, checkboxes marcados
    error:   '#C05A44', // terracota mais escuro — erros de validação
    warning: '#C9A05D', // âmbar — avisos (derivado da terracota)
  },

  // ── Utilitários ──────────────────────────────────────────────
  white:   '#FFFFFF',
  overlay: 'rgba(85, 107, 47, 0.12)',  // verde musgo transparente — backdrop de modal
  shadow:  'rgba(45, 59, 31, 0.10)',   // sombra de card natural
} as const
