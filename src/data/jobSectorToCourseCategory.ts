// src/data/jobSectorToCourseCategory.ts
// Maps a job's sector (src/data/jobSectors.ts) to the matching course
// category (src/data/courseCategories.ts) so JobDetailScreen can suggest
// exam-prep courses relevant to that specific posting. The two taxonomies
// were deliberately named to mirror each other for this — most entries
// are a 1:1 name match; a few need an explicit map because "job sector"
// and "course category" aren't always spelled identically (e.g. jobs use
// "Banking & Finance", courses use "Banking & Finance Exam Prep").
//
// 'Engineering & PSU' has no dedicated exam-prep course category (PSU
// recruitment tests vary too widely by organization to curate one), so it
// falls back to general higher-education content (NPTEL) rather than
// nothing. 'Other' has no useful mapping — recommending a course for an
// unclassified job would be a guess, not a real match.
const JOB_SECTOR_TO_COURSE_CATEGORY: Record<string, string> = {
  'Banking & Finance': 'Banking & Finance Exam Prep',
  'Railway': 'Railway Exam Prep',
  'Police & Defence': 'Police & Defence Exam Prep',
  'Medical & Health': 'Medical & Health Exam Prep',
  'Teaching & Education': 'Teaching & Education Exam Prep',
  'Administrative & Civil Services': 'Administrative & Civil Services',
  'Engineering & PSU': 'College & Higher Education',
};

export function courseCategoryForJobSector(sector: string | null | undefined): string | null {
  if (!sector) return null;
  return JOB_SECTOR_TO_COURSE_CATEGORY[sector] || null;
}
