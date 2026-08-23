/**
 * lib/constants.ts
 * Konstanta bersama untuk seluruh aplikasi SiPantau.
 */

export const DIVISI_LABEL: Record<string, string> = {
  sekditjen: 'Setditjen',
  dit_ppsa:  'Direktorat Pengaduan, Pengawasan dan Sanksi Administrasi',
  gakkum_sumatra: 'Balai Gakkum Sumatra',
  gakkum_jabalnusra: 'Balai Gakkum Jabalnusra (Jawa, Bali, Nusa Tenggara)',
  gakkum_kalimantan: 'Balai Gakkum Kalimantan',
  gakkum_sulawesi: 'Balai Gakkum Sulawesi',
  gakkum_malupapua: 'Balai Gakkum Maluku Papua',
  balai_gakkum: 'Balai Gakkum Kementerian Kehutanan',
}

export const DIVISI_LABEL_SHORT: Record<string, string> = {
  sekditjen: 'Setditjen',
  dit_ppsa:  'Dit. PPSA',
  gakkum_sumatra: 'Gakkum Sumatra',
  gakkum_jabalnusra: 'Gakkum Jabalnusra',
  gakkum_kalimantan: 'Gakkum Kalimantan',
  gakkum_sulawesi: 'Gakkum Sulawesi',
  gakkum_malupapua: 'Gakkum Malu-Papua',
  balai_gakkum: 'Balai Gakkum',
}

export const DIVISI_COLOR: Record<string, string> = {
  sekditjen: '#7c3aed',
  dit_ppsa:  '#0d9488',
  gakkum_sumatra: '#2563eb',
  gakkum_jabalnusra: '#0284c7',
  gakkum_kalimantan: '#10b981',
  gakkum_sulawesi: '#d97706',
  gakkum_malupapua: '#6366f1',
  balai_gakkum: '#2563eb',
}

export const DIVISI_OPTIONS = [
  { value: 'sekditjen', label: 'Setditjen' },
  { value: 'dit_ppsa',  label: 'Dit. PPSA' },
  { value: 'gakkum_sumatra', label: 'Gakkum Sumatra' },
  { value: 'gakkum_jabalnusra', label: 'Gakkum Jabalnusra' },
  { value: 'gakkum_kalimantan', label: 'Gakkum Kalimantan' },
  { value: 'gakkum_sulawesi', label: 'Gakkum Sulawesi' },
  { value: 'gakkum_malupapua', label: 'Gakkum Malu-Papua' },
  { value: 'balai_gakkum', label: 'Balai Gakkum (General)' },
]

