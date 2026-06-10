/**
 * lib/constants.ts
 * Konstanta bersama untuk seluruh aplikasi SiPantau.
 */

export const DIVISI_LABEL: Record<string, string> = {
  sekditjen: 'Sekretaris Direktorat Jenderal Penegakan Hukum',
  dit_ppsa:  'Direktorat Pengaduan, Pengawasan dan Sanksi Administrasi',
  balai_gakkum: 'Balai Gakkum Kementerian Kehutanan',
}

export const DIVISI_LABEL_SHORT: Record<string, string> = {
  sekditjen: 'Sekditjen',
  dit_ppsa:  'Dit. PPSA',
  balai_gakkum: 'Balai Gakkum',
}

export const DIVISI_COLOR: Record<string, string> = {
  sekditjen: '#7c3aed',
  dit_ppsa:  '#0d9488',
  balai_gakkum: '#2563eb',
}

export const DIVISI_OPTIONS = [
  { value: 'sekditjen', label: 'Sekditjen' },
  { value: 'dit_ppsa',  label: 'Dit. PPSA' },
  { value: 'balai_gakkum', label: 'Balai Gakkum' },
]
