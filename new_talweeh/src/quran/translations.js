// English translations offered by the reader (DIRECT_TRANSLATIONS in quran.jsx), from Tanzil (tanzil.net/trans).
// Plain data, also read by scripts/build-quran-data.mjs. Muhammad Asad's is not offered: Tanzil does not carry it.
export const TRANSLATIONS = [
  ['en.sahih', 'Saheeh International'], ['en.pickthall', 'Marmaduke Pickthall'], ['en.yusufali', 'Abdullah Yusuf Ali'],
  ['en.ahmedali', 'Ahmed Ali'], ['en.ahmedraza', 'Ahmed Raza Khan'], ['en.arberry', 'A. J. Arberry'],
  ['en.daryabadi', 'Abdul Majid Daryabadi'], ['en.hilali', 'Hilali & Khan'], ['en.qaribullah', 'Qaribullah & Darwish'],
  ['en.sarwar', 'Muhammad Sarwar'], ['en.maududi', 'Abul Ala Maududi'], ['en.shakir', 'Mohammad Habib Shakir'],
  ['en.itani', 'Talal Itani'], ['en.mubarakpuri', 'Mubarakpuri'], ['en.qarai', 'Ali Quli Qarai'], ['en.wahiduddin', 'Wahiduddin Khan'],
].map(([edition, name]) => ({ edition, name }))
