import { MhahPanchang } from 'mhah-panchang';

// Bhubaneswar coordinates — a reasonable single reference point for an
// Odisha-wide community app. Tithi/nakshatra boundary times can shift by
// a few minutes for other districts, never by a whole day.
const LAT = 20.2961;
const LON = 85.8245;

const engine = new MhahPanchang();

export interface PanchangDay {
  dayName: string;
  dayNameEn: string;
  sunrise: string;
  sunset: string;
  tithi: string;
  tithiEn: string;
  tithiEnd: string;
  paksha: string;
  pakshaEn: string;
  nakshatra: string;
  nakshatraEn: string;
  nakshatraEnd: string;
  yoga: string;
  yogaEn: string;
  karana: string;
  karanaEn: string;
  rashi: string;
  rashiEn: string;
  masa: string;
  masaEn: string;
  ritu: string;
  rituEn: string;
}

function toIST(d: Date): string {
  const t = new Date(d.getTime() + 5.5 * 3600 * 1000);
  const hh = String(t.getUTCHours()).padStart(2, '0');
  const mm = String(t.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// Tithi/nakshatra are assigned by the value prevailing at sunrise — the
// standard convention for everyday panchang display (a handful of specific
// festivals use their own midday/midnight "vyapini" rule instead, which is
// why festival dates are curated data in odiaFestivals.ts rather than
// derived from this generic sunrise rule).
export function getPanchangForDate(date: Date): PanchangDay {
  const noon = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 6, 0, 0));
  const sun = engine.sunTimer(noon, LAT, LON);
  const calc = engine.calculate(sun.sunRise);
  const cal = engine.calendar(sun.sunRise, LAT, LON);

  return {
    dayName: calc.Day.name,
    dayNameEn: calc.Day.name_en_UK,
    sunrise: toIST(sun.sunRise),
    sunset: toIST(sun.sunSet),
    tithi: calc.Tithi.name,
    tithiEn: calc.Tithi.name_en_IN,
    tithiEnd: toIST(calc.Tithi.end),
    paksha: calc.Paksha.name,
    pakshaEn: calc.Paksha.name_en_IN,
    nakshatra: calc.Nakshatra.name,
    nakshatraEn: calc.Nakshatra.name_en_IN,
    nakshatraEnd: toIST(calc.Nakshatra.end),
    yoga: calc.Yoga.name,
    yogaEn: calc.Yoga.name_en_IN,
    karana: calc.Karna.name,
    karanaEn: calc.Karna.name_en_IN,
    rashi: calc.Raasi.name,
    rashiEn: calc.Raasi.name_en_UK,
    masa: cal.Masa.name,
    masaEn: cal.Masa.name_en_IN,
    ritu: cal.Ritu.name,
    rituEn: cal.Ritu.name_en_UK,
  };
}
