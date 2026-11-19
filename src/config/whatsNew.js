/**
 * End-user "What's New" entries — NEWEST FIRST.
 *
 * When you ship user-facing changes, add a new entry at the top with `version`
 * set to today's date as YYYY.MM.DD — or YYYY.MM.DD.N for the 2nd+ release in a
 * single day (the pre-commit hook stamps this automatically). Plain-language,
 * benefit-focused
 * bullets. The next time each person opens the app, the popup shows every entry
 * newer than what their device last saw — so if several releases stacked up
 * between visits, they see them all at once (tracked per-device in localStorage).
 *
 * Skip adding an entry when a release has nothing a user would notice
 * (refactors, config, infra) — the popup only fires when a newer `version` appears.
 */
export const WHATS_NEW = [
  {
    version: '2026.11.19',
    date: 'November 2026',
    items: [
      '🐝 Sign in with Hive — open LearnLeaf from Hive and you are signed in already, with no second login.',
    ],
  },
  {
    version: '2026.11.17',
    date: 'November 2026',
    items: [
      '🔗 Connected apps — let another of your apps (like Fridge Board) read and update your tasks. Find it under Account & Preferences: name the app, copy its key, and revoke it there whenever you like.',
    ],
  },
  {
    version: '2026.08.25',
    date: 'August 2026',
    items: [
      '📊 Import tasks from a spreadsheet — paste rows straight from Excel or Google Sheets (or pick a CSV file) on the Tasks page, check the preview, then add them all at once.',
      '✨ Subjects and projects named in your sheet are matched to the ones you already have, and any new ones are created for you.',
    ],
  },
  {
    version: '2026.07.26',
    date: 'July 2026',
    items: [
      '🐛 Spot a bug or have an idea? There’s now a “Report a bug or request a feature” link in the footer.',
    ],
  },
];
