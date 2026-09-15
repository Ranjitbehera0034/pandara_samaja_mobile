// src/data/courseCategories.ts
// Fixed list of course categories, shared by the admin create/edit picker
// and the member-facing filter chips on CoursesScreen. The `category`
// column is a plain VARCHAR (see backend migrations/025_courses.sql) and
// courseModel.listPublished filters with an exact `category = $N` match —
// free text on the admin side would silently break member-side filtering
// the moment spelling drifted, so both sides read from this one list
// instead of typing the string twice.
//
// Chosen to cover both halves of what's actually asked for: exam-prep
// categories that mirror the organizations already on the Jobs board
// (banking-recruitment postings routed through IBPS, Railway Recruitment
// Board, Odisha Police, AIIMS/health missions, OPSC/SSC-style admin
// posts), plus the general skill/education categories requested
// separately (Odia school, college, software, hardware).
export interface CourseCategory {
  key: string; // exact string stored in courses.category
  en: string;
  or: string;
}

export const COURSE_CATEGORIES: CourseCategory[] = [
  { key: 'Banking & Finance Exam Prep', en: 'Banking & Finance Exam Prep', or: 'ବ୍ୟାଙ୍କିଂ ଓ ଆର୍ଥିକ ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି' },
  { key: 'Railway Exam Prep', en: 'Railway Exam Prep', or: 'ରେଳବାଇ ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି' },
  { key: 'Police & Defence Exam Prep', en: 'Police & Defence Exam Prep', or: 'ପୋଲିସ୍ ଓ ପ୍ରତିରକ୍ଷା ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି' },
  { key: 'Teaching & Education Exam Prep', en: 'Teaching & Education Exam Prep', or: 'ଶିକ୍ଷକତା ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି' },
  { key: 'Medical & Health Exam Prep', en: 'Medical & Health Exam Prep', or: 'ଚିକିତ୍ସା ଓ ସ୍ୱାସ୍ଥ୍ୟ ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି' },
  { key: 'Administrative & Civil Services', en: 'Administrative & Civil Services (OPSC/SSC)', or: 'ପ୍ରଶାସନିକ ଓ ସିଭିଲ ସର୍ଭିସ (OPSC/SSC)' },
  { key: 'Odia School', en: 'Odia School (Class 6-12)', or: 'ଓଡ଼ିଆ ବିଦ୍ୟାଳୟ (ଶ୍ରେଣୀ 6-12)' },
  { key: 'College & Higher Education', en: 'College & Higher Education', or: 'ମହାବିଦ୍ୟାଳୟ ଓ ଉଚ୍ଚ ଶିକ୍ଷା' },
  { key: 'Software Skills', en: 'Software Skills', or: 'ସଫ୍ଟୱେର୍ ଦକ୍ଷତା' },
  { key: 'Hardware Skills', en: 'Hardware Skills', or: 'ହାର୍ଡୱେର୍ ଦକ୍ଷତା' },
];

export function courseCategoryLabel(key: string | null | undefined, lang: 'en' | 'od'): string {
  if (!key) return '';
  const found = COURSE_CATEGORIES.find(c => c.key === key);
  if (!found) return key; // an older free-text category from before this list existed
  return lang === 'od' ? found.or : found.en;
}
