// Grade de 4pt — garante alinhamento preciso em qualquer tela
export const spacing = {
  '0':  0,
  '1':  4,
  '2':  8,
  '3':  12,
  '4':  16,
  '5':  20,
  '6':  24,
  '8':  32,
  '10': 40,
  '12': 48,
  '16': 64,
} as const

export const radius = {
  sm:   6,   // inputs pequenos, chips
  md:   10,  // cards de membro, seções
  lg:   14,  // cards grandes, bottom sheet
  xl:   20,  // modal, tela de resultado
  full: 9999, // pills, badges, avatar
} as const

export const shadow = {
  card: {
    shadowColor:   '#2D3B1F',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius:  6,
    elevation:     3,
  },
  header: {
    shadowColor:   '#2D3B1F',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius:  4,
    elevation:     4,
  },
  button: {
    shadowColor:   '#C9775D',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius:  8,
    elevation:     5,
  },
} as const
