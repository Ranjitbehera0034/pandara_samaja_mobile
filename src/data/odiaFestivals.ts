export type FestivalIcon =
  | 'Sun' | 'Flag' | 'Landmark' | 'Sparkles' | 'Heart' | 'Music'
  | 'BookOpen' | 'Gift' | 'PartyPopper' | 'Flame';

// Fallback only, for a holiday entry that somehow has no color of its own
// — every real entry below sets its own. Shared across SplashScreen,
// WelcomeModal, and the Feed header tint, defined once here so the three
// screens can't drift from each other.
export const FESTIVAL_ACCENT_COLOR = '#D97706';

export interface Festival {
  date: string; // YYYY-MM-DD
  en: string;
  or: string;
  icon: FestivalIcon; // fallback badge, used when imageKey has no photo
  imageKey?: string; // key into FESTIVAL_IMAGES (src/data/festivalImages.ts)
  kind: 'holiday' | 'obs';
  uncertain?: boolean;
  // Each festival's own theme color (SplashScreen/WelcomeModal/Feed header
  // tint) — chosen for a real association with that specific festival
  // (Nuakhai's harvest green, Krishna's blue for Janmashtami, etc.) rather
  // than one shared color for every festival alike.
  color?: string;
}

// Deliberately not a complete year of festivals. Each entry here was
// cross-checked against at least two independent sources (govt holiday
// trackers, dedicated festival-date sites) during this session — see the
// chat history for the specific searches. Lunar-calendar festivals not
// yet verified this way (Maha Shivaratri, Holi, Ram Navami, Pana
// Sankranti, Raja Parba, Kumar Purnima, Kartik Purnima, etc.) are
// intentionally left out rather than guessed; add them here once verified
// the same way, following the pattern below. This is meant to be updated
// roughly once a year — no app code changes needed for a date correction,
// just this file.
export const ODIA_FESTIVALS_2026: Festival[] = [
  { date: '2026-01-14', en: 'Makar Sankranti', or: 'ମକର ସଂକ୍ରାନ୍ତି', icon: 'Sun', imageKey: 'makar_sankranti', kind: 'holiday', color: '#0EA5E9' },
  { date: '2026-01-26', en: 'Republic Day', or: 'ଗଣତନ୍ତ୍ର ଦିବସ', icon: 'Flag', imageKey: 'republic_day', kind: 'holiday', color: '#FF9933' },
  { date: '2026-04-01', en: 'Utkal Divas', or: 'ଉତ୍କଳ ଦିବସ', icon: 'Landmark', imageKey: 'utkal_divas', kind: 'holiday', color: '#7C2D12' },
  { date: '2026-07-16', en: 'Ratha Yatra', or: 'ରଥଯାତ୍ରା', icon: 'Sparkles', imageKey: 'ratha_yatra', kind: 'holiday', color: '#D97706' },
  { date: '2026-08-15', en: '80th Independence Day', or: '୮୦ତମ ସ୍ଵାଧୀନତା ଦିବସ', icon: 'Flag', imageKey: 'independence_day', kind: 'holiday', color: '#FF9933' },
  { date: '2026-08-28', en: 'Raksha Bandhan', or: 'ରକ୍ଷାବନ୍ଧନ', icon: 'Heart', imageKey: 'raksha_bandhan', kind: 'holiday', color: '#EC4899' },
  { date: '2026-09-04', en: 'Janmashtami', or: 'ଜନ୍ମାଷ୍ଟମୀ', icon: 'Music', imageKey: 'janmashtami', kind: 'holiday', color: '#4F46E5' },
  { date: '2026-09-05', en: "Teachers' Day", or: 'ଶିକ୍ଷକ ଦିବସ', icon: 'BookOpen', kind: 'obs' },
  // No photo yet — ganesh_chaturthi.jpg is missing from the batch that was
  // generated (26 of 27 requested photos came in). Falls back to the icon
  // badge until it's added to assets/festivals/ and wired in above.
  { date: '2026-09-14', en: 'Ganesh Chaturthi', or: 'ଗଣେଶ ଚତୁର୍ଥୀ', icon: 'Sparkles', kind: 'holiday', color: '#DC143C' },
  // Green per explicit request — Nuakhai is a harvest festival, green for
  // the new crop, distinct from every other festival's color here.
  { date: '2026-09-15', en: 'Nuakhai — most likely date, unconfirmed', or: 'ନୂଆଖାଇ', icon: 'Gift', imageKey: 'nuakhai', kind: 'holiday', uncertain: true, color: '#16A34A' },
  { date: '2026-10-02', en: 'Gandhi Jayanti', or: 'ଗାନ୍ଧୀ ଜୟନ୍ତୀ', icon: 'Landmark', imageKey: 'gandhi_jayanti', kind: 'holiday', color: '#2563EB' },
  { date: '2026-10-20', en: 'Vijaya Dashami (Durga Puja)', or: 'ବିଜୟା ଦଶମୀ (ଦୁର୍ଗା ପୂଜା)', icon: 'PartyPopper', imageKey: 'durga_puja', kind: 'holiday', color: '#9D174D' },
  { date: '2026-11-08', en: 'Diwali', or: 'ଦୀପାବଳି', icon: 'Flame', imageKey: 'diwali', kind: 'holiday', color: '#F59E0B' },
  { date: '2026-12-25', en: 'Christmas', or: 'ବଡ଼ଦିନ', icon: 'Gift', imageKey: 'christmas', kind: 'holiday', color: '#DC2626' },
];

// Single lookup used by SplashScreen/WelcomeModal/the Feed header tint —
// all three should agree on "is today a festival," so this is the one
// place that decides it. 'obs' entries (e.g. Teachers' Day) don't trigger
// the festive treatment, only 'kind: holiday' does.
export function getTodayFestival(date: Date = new Date()): Festival | null {
  // Local date components, not toISOString() — that's UTC, which would
  // show yesterday's festival until 5:30am for anyone in IST.
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return ODIA_FESTIVALS_2026.find(f => f.date === iso && f.kind === 'holiday') || null;
}
