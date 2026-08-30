// src/utils/activityCategories.ts
// Client-side grouping of the dynamically-fetched activity_log `action`
// values into human categories, for the Tracker's filter picker. Kept
// client-side (rather than a backend category column) so a newly-logged
// action shows up immediately without a migration — it just falls into
// "Other" until a keyword rule is added here.

export interface ActivityCategory {
  key: string;
  labelKey: string; // admin-namespace translation key
}

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  { key: 'account', labelKey: 'trackerCategoryAccount' },
  { key: 'social', labelKey: 'trackerCategorySocial' },
  { key: 'family', labelKey: 'trackerCategoryFamily' },
  { key: 'matrimony', labelKey: 'trackerCategoryMatrimony' },
  { key: 'jobs', labelKey: 'trackerCategoryJobs' },
  { key: 'live', labelKey: 'trackerCategoryLive' },
  { key: 'moderation', labelKey: 'trackerCategoryModeration' },
  { key: 'admin', labelKey: 'trackerCategoryAdmin' },
  { key: 'finance', labelKey: 'trackerCategoryFinance' },
  { key: 'other', labelKey: 'trackerCategoryOther' },
];

// Ordered keyword rules — first match wins. Checked against the raw
// action string (e.g. 'member_banned', 'story_deleted_by_admin').
const RULES: { category: string; test: RegExp }[] = [
  { category: 'moderation', test: /banned|unbanned|removed|kicked|deleted_by_admin|force_ended|blocked|reported/ },
  { category: 'admin', test: /^admin_|superadmin/ },
  { category: 'live', test: /live_/ },
  { category: 'matrimony', test: /matrimony|match_/ },
  { category: 'jobs', test: /^job_|job_applied|job_posted/ },
  { category: 'family', test: /family|member_|membership|household/ },
  { category: 'finance', test: /expense|donation|payment|invoice/ },
  { category: 'social', test: /post|comment|like|follow|story|chat|message/ },
  { category: 'account', test: /login|logout|otp|password|profile|register|signup|token/ },
];

export function categorizeAction(action: string): string {
  for (const rule of RULES) {
    if (rule.test.test(action)) return rule.category;
  }
  return 'other';
}

export function groupActionsByCategory(actions: string[]): { category: string; actions: string[] }[] {
  const buckets = new Map<string, string[]>();
  for (const action of actions) {
    const cat = categorizeAction(action);
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(action);
  }
  // Preserve ACTIVITY_CATEGORIES order, skip empty categories.
  return ACTIVITY_CATEGORIES
    .map(c => ({ category: c.key, actions: buckets.get(c.key) || [] }))
    .filter(g => g.actions.length > 0);
}

// Actions worth visually flagging in the feed — destructive/high-stakes
// admin or moderation operations, not routine member activity.
export const HIGH_STAKES_ACTIONS = new Set([
  'member_banned', 'admin_banned', 'admin_created', 'admin_deleted',
  'expense_deleted', 'live_viewer_removed', 'live_force_ended',
  'story_deleted_by_admin', 'post_deleted_by_admin', 'comment_deleted_by_admin',
  'admin_password_reset', 'member_deleted',
]);

export function isHighStakesAction(action: string): boolean {
  return HIGH_STAKES_ACTIONS.has(action);
}
