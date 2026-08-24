# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Release discipline

This app is live and growing a real user base — a broken build reaches
real people immediately, and OTA updates especially skip any store review
safety net. These rules exist because of a real incident (a data-loss
episode traced back to unaudited direct-database scripts, and a separate
OTA published from a commit that hadn't been pushed yet).

1. **Commit and push to git *before* publishing any OTA update, always.**
   Never run `publish:ota` from a dirty or unpushed working tree. `eas
   update` bundles whatever is on disk locally — if that hasn't been
   pushed, the deployed code and the GitHub history silently diverge,
   and a rollback or "what shipped when" question becomes unanswerable.

2. **Before shipping any build (OTA or native), state the blast radius.**
   Identify which existing features share the files/components a change
   touched, and say what was actually checked — not just "typecheck
   passed." Neither repo has an automated test suite yet, so this is
   manual reasoning plus typecheck today, not a real regression safety
   net — say so plainly rather than imply more confidence than that.
   Flag building real test coverage as the system grows, rather than
   quietly relying on manual review indefinitely.

3. **Database safety rules live in the backend repo's `CLAUDE.md`**
   (`Pandara_samaja_mobile_backend/CLAUDE.md`) — read them before writing
   or running any script that touches the shared production database,
   even from this repo (e.g. a one-off migration or diagnostic script).

# Design documentation (HLD/LLD)

For genuinely new features (a new content type, a new admin workflow, a
new external integration — the kind of thing with real architectural
decisions behind it), write a short HLD (what it does, how it fits the
existing system, key tradeoffs) and LLD (schema/API contracts, screen
breakdown, edge cases) before or alongside building it, and keep it in
the repo. Small fixes, label/copy changes, and bug fixes don't need this
— match the weight of the documentation to the weight of the change.
