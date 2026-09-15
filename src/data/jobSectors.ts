// src/data/jobSectors.ts
// Fixed sector list for government job postings — "under government we
// have banking, police, teacher, doctor etc" was the actual ask; this
// covers those plus what's genuinely on the board today (checked against
// production job_postings): PFRDA/IOB/BOB/SBI/NBL/IIFCL -> Banking &
// Finance, Odisha Police -> Police & Defence, Railway Recruitment Board
// -> Railway, AIIMS/National Health Mission -> Medical & Health, OPSC/SSC
// general posts -> Administrative & Civil Services, RRVUN/RCF/AAI/IOCL/
// GPCB/NMDFC/UIICL (PSUs, not banks) -> Engineering & PSU.
//
// Free text like job.eligibility and course category (see migration
// 017's and 028's comments) rather than a DB enum — the scraper's
// classifier and the mobile filter UI both read from this one list, sector
// is just whichever string they agreed on, so a new sector can be added
// here without a schema change.
export interface JobSector {
  key: string; // exact string stored in job_postings.sector
  en: string;
  or: string;
}

export const JOB_SECTORS: JobSector[] = [
  { key: 'Banking & Finance', en: 'Banking & Finance', or: 'ବ୍ୟାଙ୍କିଂ ଓ ଆର୍ଥିକ' },
  { key: 'Police & Defence', en: 'Police & Defence', or: 'ପୋଲିସ୍ ଓ ପ୍ରତିରକ୍ଷା' },
  { key: 'Railway', en: 'Railway', or: 'ରେଳବାଇ' },
  { key: 'Medical & Health', en: 'Medical & Health', or: 'ଚିକିତ୍ସା ଓ ସ୍ୱାସ୍ଥ୍ୟ' },
  { key: 'Teaching & Education', en: 'Teaching & Education', or: 'ଶିକ୍ଷକତା ଓ ଶିକ୍ଷା' },
  { key: 'Engineering & PSU', en: 'Engineering & PSU', or: 'ଇଞ୍ଜିନିୟରିଂ ଓ PSU' },
  { key: 'Administrative & Civil Services', en: 'Administrative & Civil Services', or: 'ପ୍ରଶାସନିକ ଓ ସିଭିଲ ସର୍ଭିସ' },
  { key: 'Other', en: 'Other', or: 'ଅନ୍ୟାନ୍ୟ' },
];

export function jobSectorLabel(key: string | null | undefined, lang: 'en' | 'od'): string {
  if (!key) return '';
  const found = JOB_SECTORS.find(s => s.key === key);
  if (!found) return key;
  return lang === 'od' ? found.or : found.en;
}
