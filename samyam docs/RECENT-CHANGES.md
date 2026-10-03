# Recent changes to Holistic Mind

Recorded: 13 September 2026. This covers the recent recommendation, evaluation, comfort-preference, and journal-encryption work. The documentation organisation described below was completed after that implementation.

## 1. Recommendation engine and local environment

The local Python setup was repaired around Python 3.12 and `recommender/.venv312`, matching the pinned dependency stack. Editor/type-checking configuration uses that environment. The older virtual environment was retained.

ONNX outputs are converted to NumPy arrays and their shapes are checked before embedding processing. Production fallback reporting avoids logging user text. The ONNX benchmark refuses lexical fallback, so a missing model cannot produce a report incorrectly labelled as semantic embeddings.

Known contraindications are applied before selection, including breath-hold restrictions for high-activation states. Later variety/rotation logic cannot reintroduce excluded exercises. The support-alignment helper was renamed to describe its actual behaviour.

## 2. Benchmark and graphs

The evaluation now records repeated seeded runs, separate lexical/ONNX modes, latency summaries, bootstrap intervals, environment details, and source hashes. It generates JSON results, a self-contained interactive HTML dashboard, and PNG/SVG charts.

The dashboard supports metric comparisons, a searchable/filterable persona heatmap, per-run result inspection, and exports. The original persona inputs and labels were retained. Remaining label/input/metadata mismatches remain visible rather than being hidden by changing the benchmark to favour the engine.

Read [How evaluation works](HOW-THE-FUNCTIONALITY-WORKS.md#5-how-the-recommendation-evaluation-works) or [the technical benchmark guide](RECOMMENDATION-BENCHMARK.md).

## 3. Explicit comfort preferences

The last daily check-in step now allows users to avoid self-touch, breath holds, head/eye scanning, and inward body scans. These choices are saved in the existing check-in answers JSON. Older check-ins remain compatible.

The server maps preferences into exclusions and contraindication signals. The mobile fallback shares that mapping. The Home screen honours an empty successful recommendation response rather than replacing it with unfiltered exercises.

These are explicit preferences, not inferred diagnoses or hidden journal analysis. They apply to the check-in that stores them.

## 4. Device-only journal encryption

| Before | Current source implementation |
| --- | --- |
| Journal pack, prompt/title, and body were stored as readable text. | The device encrypts those fields before uploading new entries. |
| The backend sent recent journal text to Python. | The recommendation route no longer queries journals and sends `journal_texts: []`. |
| Journal access depended on account login alone. | The user also needs a device key or recovery key. |
| There was no device-key recovery flow. | Setup asks the user to save a recovery key; additional devices can import it. |
| Existing plaintext entries had no conversion flow. | An unlocked client encrypts and verifies each entry before replacing its plaintext database fields. |

New modules cover authenticated encryption, account-scoped SecureStore keys, journal session state, and setup/recovery/migration controls. The backend adds encrypted envelopes and a create-once vault record. New journal writes accept ciphertext only, and journal parser/database errors are sanitised.

The Journal screen, free-writing editor, and History screen use the new flow. Locking removes the active key and clears unsaved journal drafts. Retries reuse the pending save's ID and ciphertext while the session retains it; server inserts are idempotent for the same ID/envelope. Legacy migration is conditional and resumable.

This preserves the original words inside encrypted content. No journal embeddings are stored or uploaded. Full details are in [Journal privacy](journal-privacy.md).

## 5. Verification already completed

These results were recorded during implementation; reorganising the documents did not rerun application tests.

| Check | Result |
| --- | --- |
| Python engine/evaluation tests | 23 passed |
| Comfort-preference tests | 4 passed |
| Journal cryptography and actual API tests using an isolated PGlite database | 4 passed |
| Mobile TypeScript check | Passed |
| Backend TypeScript build | Passed |
| Expo web export | Passed |
| Expo iOS JavaScript/Hermes bundle export | Passed; this is not a signed native app build or a device test |
| Browser functional check with synthetic data and mocked API responses | Setup, interrupted migration/retry, encrypted saving, locking, wrong-key rejection, and recovery passed; outgoing writes contained no journal text or recovery secret |

Visual inspection found a recovery-panel placement issue, which was corrected. The web export and TypeScript check passed after the correction. The final browser rerun was blocked by automatic approval review because the session had reached its usage limit, so that last layout correction was not rechecked in the browser.

To repeat automated checks, run these from the **repository root**, not inside `samyam docs`:

```bash
npm run test:journal
npm run test:comfort
npm run recommender:test
npm run recommender:typecheck
npx tsc --noEmit
npm run api:build
```

The journal API tests need permission to open a temporary localhost listener. They use synthetic data and an in-memory database, not the real configured database.

## 6. Current limits and remaining release work

- The encryption implementation has not been deployed. No existing real-user journal has been migrated.
- Native clients need rebuilding to include `expo-crypto`; physical-device key storage, reinstall, and recovery still need testing.
- The implementation has not had an independent cryptographic/security review.
- Losing every device key and the recovery key makes encrypted entries unrecoverable. Key rotation, automatic background locking, and an extra biometric challenge are not implemented.
- Migrating a database row does not erase older backups or exports. Their retention still matters.
- Check-ins and feedback remain readable by the backend; encrypting journals does not encrypt every account field.
- Saved benchmark reports still use the original synthetic journal inputs. Their scores are not a measurement of the new production input path, and they are not clinical validation.

## 7. Documentation organisation

All project-authored Markdown documents found in the repository were moved into `samyam docs`. The two 15-week journals, both recommendation explanations, features/requirements, deployment guide, privacy guide, and benchmark guide are collected here. Dependency and generated-environment documentation was left with its owning packages.

The root `README.md` became `PROJECT-README.md`; the evaluation `README.md` became `RECOMMENDATION-BENCHMARK.md` to avoid a name collision. The Holistic Mind progress summary was found as a `.txt` file and moved here with its contents unchanged. The development journals retain their original text. Earlier technical narratives carry a notice directing readers to the current functionality guide.

New documents:

- [Documentation index](README.md)
- [How the functionality works](HOW-THE-FUNCTIONALITY-WORKS.md)
- [This recent-changes record](RECENT-CHANGES.md)

Relative Markdown links were adjusted for the new locations. Benchmark HTML/JSON/chart artifacts remain in `recommender/evaluation`; the guides link to them. No runtime application code was changed for this documentation request.

## 8. Follow-up: native simulator and live backend verification

On 15 September 2026, the missing ExpoCrypto native dependency and simulator Keychain entitlement error were resolved through a native rebuild with simulator signing enabled. Native encryption, SecureStore readback, key persistence and decryption after app restart, and simulator-to-backend connectivity passed. Live backend journal/migration and hybrid-v4 ONNX recommendation checks also passed using temporary synthetic accounts that were removed afterward.

Read [Device and backend test results](DEVICE-AND-BACKEND-TEST-RESULTS.md) for the exact scope, fixes, and remaining physical-device/UI validation. These follow-up results do not imply production deployment or migration of existing user journals.

## 9. 3 October 2026: sign-in and journal recovery refinement

- Google sign-in on the iPhone simulator reached account choice, then reported a network error. The configured API URL is `http://127.0.0.1:4000`; the Node backend was stopped. It has been started locally and `/ready` returns HTTP 200. The iOS client ID, callback scheme, and backend/web client IDs were checked for consistency. Google sign-in now checks API readiness before opening the Google account picker and gives a specific app-server message for fetch failures. A Google SDK failure is labeled separately. An end-to-end Google account login still requires a user retry; no Google credentials were used during this check.
- Apple sign-in buttons were removed from the login and signup screens. Existing backend and account-deletion support for Apple identities remains so current Apple-only accounts can still be handled. Re-enabling the login button later is separate work.
- The journal privacy panel now has a clearer setup and restore flow, a native Copy recovery key action, clipboard failure feedback, and a reminder to clear a copied key after storing it safely. The encryption format and stored keys were not changed.
- Installed ExpoClipboard 8.0.8 and linked it with CocoaPods. The signed iOS simulator build passed and launched. The app's ignored local Xcode environment file had pointed at an obsolete Node binary; it now points at the working Homebrew Node path.
- TypeScript, backend build, web export, and the four journal cryptography/API tests passed. The backend remains a local development process; it must be running for simulator sign-in. Physical-device Google sign-in and hands-on recovery UI remain to be checked.

## 10. Journal controls and scrolling navigation

The unlocked Journal screen and History screen no longer embed the large journal recovery/lock panel beneath content. Profile/Settings now has a **Journal security** row leading to a dedicated page for the lock, recovery key, and any older-entry encryption. The Journal screen still prompts for unlock or setup when access is needed. History shows a brief notice while reflections cannot be displayed.

The native iOS tab navigator already had `minimizeBehavior="onScrollDown"`. Home and Journal already configured their main scroll views for automatic content inset adjustment; Explore and Library now do the same. This makes the four main tabs consistent with the iOS 26 native collapsing tab bar. On other platforms the native iOS minimize animation is unavailable; their normal tab bar remains usable. TypeScript, iOS export, and web export were checked after the UI changes.
