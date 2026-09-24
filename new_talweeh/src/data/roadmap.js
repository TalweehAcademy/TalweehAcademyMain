// The study roadmap: for each science, which text to study at each level — from the Talweeh curriculum
// document (the 2-Year Arabic Program modules and the ʿIlm Intensive levels), regrouped by discipline
// rather than by year. Levels follow the document's own course codes: 101 → Level 1, 201 → Level 2,
// 301 → Level 3, "Advanced" → Level 4 (and 5 where there are two advanced stages).
// `course` is the slug of the Talweeh course that teaches the text, where one exists; the roadmap shows
// those as available. A step without a named text is taught from the teacher's notes or is still to be set.
// `also` lists other Talweeh courses in the same science that sit alongside the core path.

export const LEVEL_NAMES = ['Foundations', 'Intermediate', 'Upper-intermediate', 'Advanced', 'Advanced II']

export const ROADMAP = [
  {
    k: 'arabic', name: 'Arabic Language', ar: 'اللغة العربية',
    blurb: 'Reading and understanding classical Arabic, from a first overview to graded readers.',
    levels: [
      [{ code: 'Arabic 101', text: 'Introduction to Arabic', note: 'Teacher’s notes', course: 'arabic-crash-course' }],
      [{ code: 'Arabic 201', text: 'Qaṣaṣ al-Nabiyyīn' }],
      [{ code: 'Arabic 301', text: 'Min Adab al-Islām', course: 'min-adab-al-islam' }],
    ],
  },
  {
    k: 'nahw', name: 'Naḥw', ar: 'النحو', sub: 'Grammar',
    blurb: 'Sentence structure and grammatical case, from al-Ājurrūmiyyah’s tradition up to Ibn al-Ḥājib.',
    levels: [
      [{ code: 'Naḥw 101', text: 'Al-Shadharah al-Dhahabiyyah' }],
      [{ code: 'Naḥw 201', text: 'Al-Tuḥfah al-Saniyyah', course: 'al-tuhfat-al-saniyyah' }],
      [{ code: 'Naḥw 301', text: 'Mutammimah al-Ājurrūmiyyah', course: 'mutammimah-al-ajurrumiyyah' }, { code: 'Iʿrāb 101', text: 'Al-Iʿrāb ʿan Qawāʿid al-Iʿrāb', course: 'al-irab-an-qawaid-al-irab' }],
      [{ code: 'Advanced Naḥw 1', text: 'Sharḥ Qaṭr al-Nadā wa-Ball al-Ṣadā', course: 'sharh-qatr-al-nada-wa-ball-al-sada' }],
      [{ code: 'Advanced Naḥw 2', text: 'Kāfiyah' }],
    ],
  },
  {
    k: 'sarf', name: 'Ṣarf', ar: 'الصرف', sub: 'Morphology',
    blurb: 'Word patterns and verb forms, from Binā’ al-Afʿāl to Ibn Mālik’s Lāmiyyah.',
    levels: [
      [{ code: 'Ṣarf 101', text: 'Matn Binā’ al-Afʿāl' }],
      [{ code: 'Ṣarf 201', text: 'Taṣrīf al-ʿIzzī' }],
      [{ code: 'Ṣarf 301', text: 'Sawāṭiʿ al-Jumān' }],
      [{ code: 'Advanced Ṣarf', text: 'Lāmiyyat al-Afʿāl' }],
    ],
  },
  {
    k: 'balaghah', name: 'Balāghah', ar: 'البلاغة', sub: 'Rhetoric',
    blurb: 'The eloquence of Arabic, and of the Qurʾān.',
    levels: [
      [{ code: 'Balāghah 101', text: 'Taysīr al-Balāghah' }],
      [{ code: 'Balāghah 201', text: 'Al-Risālah al-Samarqandiyyah / al-Jawhar al-Maknūn' }],
      [],
      [{ code: 'Advanced Balāghah', text: 'Talkhīṣ al-Miftāḥ' }],
    ],
  },
  {
    k: 'mantiq', name: 'Manṭiq', ar: 'المنطق', sub: 'Logic',
    blurb: 'The tools of reasoning used across the scholarly tradition.',
    levels: [
      [{ code: 'Manṭiq 101', text: 'Introduction to Manṭiq', note: 'Teacher’s notes' }],
      [{ code: 'Manṭiq 201', text: 'Isāghūjī' }],
      [{ code: 'Manṭiq 301', text: 'Mirqāh' }],
      [{ code: 'Advanced Manṭiq', text: 'Sharḥ al-Tahdhīb' }],
    ],
  },
  {
    k: 'adab', name: 'Adab', ar: 'الأدب', sub: 'Literature & poetry',
    blurb: 'Classical poems of counsel, read for their language and their wisdom.',
    levels: [
      [{ code: 'Adab 101', text: 'Tāʾiyyat al-Ilbīrī', course: 'taiyyah-of-al-ilbiri' }],
      [{ code: 'Adab 201', text: 'Lāmiyyat Ibn al-Wardī' }],
    ],
    also: ['lamiyyat-abi-talib'],
  },
  {
    k: 'fiqh', name: 'Ḥanafī Fiqh', ar: 'الفقه الحنفي', sub: 'Jurisprudence',
    blurb: 'Practical rulings in the Ḥanafī school, from Nūr al-Īḍāḥ to al-Hidāyah.',
    levels: [
      [{ code: 'Ḥanafī Fiqh 101', text: 'Nūr al-Īḍāḥ', course: 'nur-al-idah' }, { code: 'Qawāʿid Fiqhiyyah 101', text: 'Legal maxims', note: 'Teacher’s notes' }],
      [{ code: 'Ḥanafī Fiqh 201', text: 'Mukhtaṣar al-Qudūrī', course: 'mukhtasar-al-quduri-qism-al-ibadat', courses: ['mukhtasar-al-quduri-qism-al-ibadat', 'mukhtasar-al-quduri-al-uqubat'] }, { code: 'Qawāʿid Fiqhiyyah 201', text: 'Sharḥ al-Qawāʿid al-Fiqhiyyah (al-Zarqāʾ, on the Majallah)' }],
      [{ code: 'Ḥanafī Fiqh 301', text: 'Fatḥ Bāb al-ʿInāyah / Tuḥfat al-Fuqahāʾ' }],
      [{ code: 'Advanced Ḥanafī Fiqh 1', text: 'Al-Hidāyah fī Sharḥ Bidāyat al-Mubtadī (Part 1)' }],
      [{ code: 'Advanced Ḥanafī Fiqh 2', text: 'Al-Hidāyah fī Sharḥ Bidāyat al-Mubtadī (Part 2)' }],
    ],
    also: ['introduction-to-hanafi-fiqh'],
  },
  {
    k: 'usul', name: 'Uṣūl al-Fiqh', ar: 'أصول الفقه', sub: 'Legal theory',
    blurb: 'How rulings are derived — along the jurists’ (fuqahāʾ) and the theologians’ (mutakallimūn) paths.',
    levels: [
      [
        { code: 'Uṣūl al-Fiqh 101', text: 'Mabādiʾ al-Uṣūl' },
        { code: 'Ḥanafī Uṣūl al-Fiqh 101', text: 'Ḥanafī Uṣūl al-Fiqh 101 (Mabādiʾ al-Uṣūl Refined)', course: 'hanafi-usul-al-fiqh-101', note: 'A structured first study of Ḥanafī legal theory from Shaykh Omer Khurshid’s refined text, bridging the gaps of the standard Mabādiʾ al-Uṣūl.' },
      ],
      [{ code: 'Uṣūl al-Fuqahāʾ 201', text: 'Uṣūl al-Shāshī', course: 'usul-al-shashi', path: 'Fuqahāʾ' }, { code: 'Uṣūl al-Mutakallimīn 201', text: 'Sharḥ al-Waraqāt', course: 'sharh-al-waraqat-of-al-mahalli', path: 'Mutakallimīn' }],
      [{ code: 'Uṣūl al-Fuqahāʾ 301', text: 'Al-Ḥusāmī / a commentary on al-Manār', path: 'Fuqahāʾ' }, { code: 'Uṣūl al-Mutakallimīn 301', text: 'Al-Lumaʿ', path: 'Mutakallimīn' }],
      [{ code: 'Advanced Uṣūl al-Fuqahāʾ', text: 'Al-Tawḍīḥ fī Ḥall Ghawāmiḍ al-Tanqīḥ', path: 'Fuqahāʾ' }, { code: 'Advanced Uṣūl al-Mutakallimīn', text: 'Jamʿ al-Jawāmiʿ', path: 'Mutakallimīn' }],
      [{ code: 'Advanced Comparative Uṣūl', text: 'Musallam al-Thubūt', course: 'musallam-al-thubut' }],
    ],
    also: ['introduction-to-usul-al-fiqh'],
  },
  {
    k: 'aqidah', name: 'ʿAqīdah', ar: 'العقيدة', sub: 'Theology',
    blurb: 'The creed of Ahl al-Sunnah and how it is understood and defended.',
    levels: [
      [{ code: 'ʿAqīdah 101', text: 'Tahdhīb al-Sanūsiyyah' }],
      [{ code: 'ʿAqīdah 201', text: 'ʿUmdat al-ʿAqāʾid' }],
      [{ code: 'ʿAqīdah 301', text: 'Al-Masāʾil al-Khamsūn fī Uṣūl al-Dīn' }],
      [{ code: 'Advanced ʿAqīdah 1', text: 'Al-Iqtiṣād fī al-Iʿtiqād' }],
      [{ code: 'Advanced ʿAqīdah 2', text: 'Sharḥ al-ʿAqāʾid al-Nasafiyyah' }],
    ],
    also: ['introduction-to-usul-al-din'],
  },
  {
    k: 'tajwid', name: 'Tajwīd & Qirāʾāt', ar: 'التجويد والقراءات', sub: 'Recitation',
    blurb: 'Reciting the Qurʾān as it was revealed, up to the seven canonical readings.',
    levels: [
      [{ code: 'Tajwīd 101', text: 'Tajwīd foundations', note: 'Teacher’s notes', course: 'tajwid-mastery-level-one' }],
      [{ code: 'Tajwīd 201', text: 'Al-Muqaddimah al-Jazariyyah' }],
      [],
      [{ code: 'Advanced Tajwīd 1', text: 'Al-Shāṭibiyyah' }],
      [{ code: 'Advanced Tajwīd 2', text: 'Al-Kashf ʿan Wujūh al-Qirāʾāt al-Sabʿ' }],
    ],
  },
  {
    k: 'tafsir', name: 'Tafsīr & ʿUlūm al-Qurʾān', ar: 'التفسير وعلوم القرآن', sub: 'Exegesis',
    blurb: 'The meanings of the Qurʾān and the sciences that serve it.',
    levels: [
      [{ code: 'Tafsīr 101', text: 'Juzʾ ʿAmma', course: 'tafsir-of-juz-amma' }],
      [{ code: 'ʿUlūm al-Qurʾān', text: 'Text to be announced' }],
      [{ code: 'Tafsīr 301', text: 'Tafsīr al-Jalālayn' }],
      [{ code: 'Advanced Tafsīr', text: 'Tafsīr al-Bayḍāwī' }],
    ],
  },
  {
    k: 'mustalah', name: 'Muṣṭalaḥ al-Ḥadīth', ar: 'مصطلح الحديث', sub: 'Ḥadīth sciences',
    blurb: 'How the ḥadīth masters named and judged narrations.',
    levels: [
      [{ code: 'Muṣṭalaḥ 101', text: 'Nukhbat al-Fikar', course: 'nukhbat-al-fikr' }],
      [{ code: 'Muṣṭalaḥ 201', text: 'Al-Mūqiẓah / al-Taqrīb wa al-Taysīr' }],
      [],
      [{ code: 'Advanced Muṣṭalaḥ', text: 'Tadrīb al-Rāwī', course: 'tadrib-al-rawi' }],
    ],
    also: ['introduction-to-usul-al-hadith', 'tadwin-al-sunnah', 'makanat-al-sunnah', 'takwin-al-asanid', 'al-jarh-wa-l-tadil', 'al-athbat-wal-faharis', 'takhri-j-al-h-adi-th-q2zxxj'],
  },
  {
    k: 'hadith', name: 'Ḥadīth', ar: 'الحديث', sub: 'The collections',
    blurb: 'From the Forty Ḥadīth to the Dawrat al-Ḥadīth — reading the great collections.',
    levels: [
      [{ code: 'Ḥadīth 101', text: 'Al-Arbaʿūn al-Nawawiyyah' }],
      [{ code: 'Aḥādīth al-Aḥkām 101', text: 'Āthār al-Sunan' }],
      [{ code: 'Aḥādīth al-Aḥkām', text: 'Mishkāt al-Maṣābīḥ' }],
      [],
      [
        { code: 'Dawrat al-Ḥadīth', text: 'Ṣaḥīḥ al-Bukhārī' }, { code: 'Dawrat al-Ḥadīth', text: 'Ṣaḥīḥ Muslim' },
        { code: 'Dawrat al-Ḥadīth', text: 'Sunan al-Nasāʾī' }, { code: 'Dawrat al-Ḥadīth', text: 'Sunan Abī Dāwūd' },
        { code: 'Dawrat al-Ḥadīth', text: 'Sunan al-Tirmidhī' }, { code: 'Dawrat al-Ḥadīth', text: 'Sunan Ibn Mājah' },
        { code: 'Dawrat al-Ḥadīth', text: 'Muwaṭṭaʾ Mālik' }, { code: 'Dawrat al-Ḥadīth', text: 'Muwaṭṭaʾ Muḥammad', course: 'muwatta-muhammad' },
        { code: 'Dawrat al-Ḥadīth', text: 'Sharḥ Maʿānī al-Āthār' },
      ],
    ],
    also: ['introduction-to-al-muwattayn', 'al-shamail-al-muhammadiyyah', 'al-adab-al-mufrad'],
  },
]
