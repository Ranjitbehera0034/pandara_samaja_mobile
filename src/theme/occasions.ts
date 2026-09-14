// src/theme/occasions.ts
// Date-driven festival/holiday theming — a small, extensible config
// rather than hardcoded logic in the screens that render it. Ships via
// OTA (pure data + JS, no native asset/module changes), matching the
// mobile AGENTS.md rule that pure JS/TS changes don't need a new build.
//
// Only fixed-date national holidays are populated for now (MM-DD is
// stable every year). Lunar/lunisolar festivals that matter for an
// Odisha samaj specifically (Diwali, Rath Yatra, Durga Puja) shift dates
// every year and are deliberately NOT guessed here — a wrong date would
// be a visible, confusing bug on the actual day for real members.
// Add them via `lunarDates` below once real per-year dates are
// confirmed (e.g. from a published Odisha government holiday calendar),
// not derived by any calculation in this file.
export interface Occasion {
  id: string;
  label: string;
  // MM-DD, inclusive on both ends. Crossing year-end (e.g. 12-30..01-02)
  // is not needed by anything currently defined, so it's not supported.
  startMonthDay: string;
  endMonthDay: string;
  accentColor: string;
  ringColors: [string, string, string];
  // Login-greeting content (WelcomeModal) — always Odia, matching that
  // component's existing deliberate house convention (see its own file
  // comment), independent of the member's selected app language.
  emoji: string;
  greetingTitle: string;
  // {name} is replaced with the member's name, or removed entirely if unknown.
  greetingMessage: string;
}

const FIXED_OCCASIONS: Occasion[] = [
  {
    id: 'independence_day',
    label: 'Independence Day',
    startMonthDay: '08-15',
    endMonthDay: '08-15',
    accentColor: '#FF9933',
    ringColors: ['#FF9933', '#FFFFFF', '#138808'],
    emoji: '🇮🇳',
    greetingTitle: 'ସ୍ୱାଧୀନତା ଦିବସର ଶୁଭକାମନା',
    greetingMessage: '{name}ସ୍ୱାଧୀନତା ଦିବସର ହାର୍ଦ୍ଦିକ ଶୁଭକାମନା ଓ ଅଭିନନ୍ଦନ।',
  },
  {
    id: 'republic_day',
    label: 'Republic Day',
    startMonthDay: '01-26',
    endMonthDay: '01-26',
    accentColor: '#FF9933',
    ringColors: ['#FF9933', '#FFFFFF', '#138808'],
    emoji: '🇮🇳',
    greetingTitle: 'ଗଣତନ୍ତ୍ର ଦିବସର ଶୁଭକାମନା',
    greetingMessage: '{name}ଗଣତନ୍ତ୍ର ଦିବସର ହାର୍ଦ୍ଦିକ ଶୁଭକାମନା।',
  },
];

// Populated only with dates verified against an authoritative source
// (drikpanchang.com / publicholidays.in, cross-checked, 2026-09-14) — not
// derived by any calculation in this file, per the comment above. Ganesh
// Chaturthi's colors are a warm vermilion/saffron/gold treatment,
// deliberately different from the national-holiday tricolor ring: this is
// a religious/cultural festival, not a civic one, and reusing the flag
// colors here would read as wrong to anyone who noticed.
const LUNAR_OCCASIONS: (Omit<Occasion, 'startMonthDay' | 'endMonthDay'> & { date: string })[] = [
  {
    id: 'ganesh_chaturthi_2026', label: 'Ganesh Chaturthi', date: '2026-09-14',
    accentColor: '#E2725B', ringColors: ['#DC143C', '#FF8C00', '#FFD700'],
    emoji: '🙏🐘',
    greetingTitle: 'ଶ୍ରୀ ଗଣେଶ ଚତୁର୍ଥୀର ଶୁଭେଚ୍ଛା',
    greetingMessage: '{name}ଶ୍ରୀ ଗଣେଶ ଚତୁର୍ଥୀର ହାର୍ଦ୍ଦିକ ଶୁଭେଚ୍ଛା। ବିଘ୍ନହର୍ତ୍ତା ଗଣେଶଙ୍କ ଆଶୀର୍ବାଦ ଆପଣଙ୍କ ଉପରେ ସଦା ରହୁ।',
  },
  {
    id: 'ganesh_chaturthi_2027', label: 'Ganesh Chaturthi', date: '2027-09-04',
    accentColor: '#E2725B', ringColors: ['#DC143C', '#FF8C00', '#FFD700'],
    emoji: '🙏🐘',
    greetingTitle: 'ଶ୍ରୀ ଗଣେଶ ଚତୁର୍ଥୀର ଶୁଭେଚ୍ଛା',
    greetingMessage: '{name}ଶ୍ରୀ ଗଣେଶ ଚତୁର୍ଥୀର ହାର୍ଦ୍ଦିକ ଶୁଭେଚ୍ଛା। ବିଘ୍ନହର୍ତ୍ତା ଗଣେଶଙ୍କ ଆଶୀର୍ବାଦ ଆପଣଙ୍କ ଉପରେ ସଦା ରହୁ।',
  },
  {
    id: 'ganesh_chaturthi_2028', label: 'Ganesh Chaturthi', date: '2028-08-23',
    accentColor: '#E2725B', ringColors: ['#DC143C', '#FF8C00', '#FFD700'],
    emoji: '🙏🐘',
    greetingTitle: 'ଶ୍ରୀ ଗଣେଶ ଚତୁର୍ଥୀର ଶୁଭେଚ୍ଛା',
    greetingMessage: '{name}ଶ୍ରୀ ଗଣେଶ ଚତୁର୍ଥୀର ହାର୍ଦ୍ଦିକ ଶୁଭେଚ୍ଛା। ବିଘ୍ନହର୍ତ୍ତା ଗଣେଶଙ୍କ ଆଶୀର୍ବାଦ ଆପଣଙ୍କ ଉପରେ ସଦା ରହୁ।',
  },
];

function toMonthDay(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${toMonthDay(date)}`;
}

// Returns the active occasion for `date` (defaults to now), or null on an
// ordinary day. If more than one somehow matches, the first fixed-date
// occasion wins, then the first lunar one — no current entries overlap.
export function getActiveOccasion(date: Date = new Date()): Occasion | null {
  const monthDay = toMonthDay(date);
  const fixed = FIXED_OCCASIONS.find(o => monthDay >= o.startMonthDay && monthDay <= o.endMonthDay);
  if (fixed) return fixed;

  const isoDate = toIsoDate(date);
  const lunar = LUNAR_OCCASIONS.find(o => o.date === isoDate);
  if (lunar) return { ...lunar, startMonthDay: monthDay, endMonthDay: monthDay };

  return null;
}
