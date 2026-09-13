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
}

const FIXED_OCCASIONS: Occasion[] = [
  {
    id: 'independence_day',
    label: 'Independence Day',
    startMonthDay: '08-15',
    endMonthDay: '08-15',
    accentColor: '#FF9933',
    ringColors: ['#FF9933', '#FFFFFF', '#138808'],
  },
  {
    id: 'republic_day',
    label: 'Republic Day',
    startMonthDay: '01-26',
    endMonthDay: '01-26',
    accentColor: '#FF9933',
    ringColors: ['#FF9933', '#FFFFFF', '#138808'],
  },
];

// Populate with confirmed real dates for the current/next year, e.g.
// { id: 'diwali_2026', label: 'Diwali', date: '2026-11-08', ... }.
// Left empty deliberately — see the file-level comment above.
const LUNAR_OCCASIONS: { id: string; label: string; date: string; accentColor: string; ringColors: [string, string, string] }[] = [];

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
