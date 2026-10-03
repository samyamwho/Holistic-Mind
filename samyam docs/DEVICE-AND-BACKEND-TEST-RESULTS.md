# Device and backend test results

Verified on 15 September 2026 using the iPhone 17 Pro simulator with iOS 26.5, the local Node backend, PostgreSQL, and the Docker recommender. These are simulator and development-service results, not physical iPhone/Android or production-release validation.

## Errors found and resolved

### Missing native module: ExpoCrypto

The JavaScript included `expo-crypto`, but the installed iOS binary did not include its native module. Reloading Metro could not fix that mismatch.

CocoaPods was updated with `pod install`. The pod lockfiles and Expo's generated module provider now include ExpoCrypto 15.0.9. The iOS app was rebuilt and installed over the existing simulator app without erasing its data.

### SecureStore: required entitlement is not present

The first diagnostic simulator build disabled code signing, which caused keychain operations to fail. That build was replaced with an ad-hoc signed simulator build. Native SecureStore operations now pass. A physical-device signing certificate was not needed for this simulator build.

The successful build command, run from the repository root, was:

```bash
xcodebuild \
  -workspace ios/holisticmind.xcworkspace \
  -scheme holisticmind \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'platform=iOS Simulator,id=7DBE3F59-9C67-43C1-80BB-814CD1BF8C6B' \
  CODE_SIGN_IDENTITY=- \
  CODE_SIGNING_ALLOWED=YES \
  build
```

The device ID is specific to this Mac's existing simulator. For a different simulator, obtain its ID with `xcrun simctl list devices booted`. Keep simulator signing enabled when testing Keychain/SecureStore.

### Running services and launch problems

The recommender container had been running `hybrid-v3` despite the source being `hybrid-v4`. Only the recommender service was rebuilt and restarted. Actual recommendation responses now report `hybrid-v4:sentence-transformers/all-MiniLM-L6-v2:onnx`.

When work resumed, Metro and the backend were stopped. Docker also stopped during startup, causing PostgreSQL connection refusals. Docker was reopened, database readiness was confirmed, and the backend and Metro were restarted.

The app was launched directly with `simctl launch`, avoiding the failing Google URL-scheme development-client launch. Metro was started on localhost with `EXPO_PUBLIC_API_URL=http://127.0.0.1:4000`. This is the current simulator development session, not a persisted change to environment files. A physical phone needs a reachable network address instead of its own localhost.

Simulator restarts during boot interrupted installation. Allowing one uninterrupted startup resolved that interruption. Restarting only the application for the persistence test succeeded.

## Native runtime checks

These checks executed the project's actual journal modules inside the simulator's Hermes runtime through the React Native debugger. Only synthetic text and a temporary test key were used. No user recovery keys were printed or exported.

| Check | Result |
| --- | --- |
| Native ExpoCrypto available | Passed |
| Encrypt/decrypt original text on the native runtime | Passed |
| Emoji and Nepali text round trip | Passed |
| Recovery-code parsing and encrypted key-check validation | Passed |
| Different account cannot decrypt the same entry | Passed |
| SecureStore save and readback | Passed |
| Key survives terminating and relaunching the app | Passed |
| Entry decrypts using that persisted key after relaunch | Passed |
| Simulator reaches the backend readiness endpoint | Passed at `http://127.0.0.1:4000` |
| Temporary native key and encrypted fixture cleanup | Completed |

## Live backend checks

The checks called the running API using temporary synthetic accounts. They used the configured development database, not PGlite mocks. Test accounts and their associated records were removed afterward.

| Check | Result |
| --- | --- |
| Vault creation and recovery-key verification | Passed |
| Wrong recovery key is rejected locally | Passed |
| Plaintext journal writes are rejected by the API | Passed |
| Encrypted journal save and read/decrypt | Passed |
| Retrying the same entry does not create duplicates | Passed |
| A second account cannot list the first account's journals | Passed |
| Synthetic legacy entry migrates to encrypted content | Passed |
| Migrated `pack`, `prompt`, and `content` database fields become NULL | Passed |
| Migration retry is accepted without overwriting the encrypted entry | Passed |
| Daily check-in stores all four comfort choices | Passed |
| Live hybrid-v4 ONNX recommendation request | Passed; four results returned |
| All selected comfort exclusions honoured | Passed |
| Temporary test-account cleanup | Completed |

No existing user's journal was read, migrated, or deleted by these tests. Existing user data was preserved.

## Current scope and remaining checks

The missing-module and SecureStore entitlement errors are resolved in the installed simulator build. The simulator, Metro, backend API, and local recommendation path were working at the end of verification.

The tests above exercise native storage/cryptography, app restart, simulator-to-backend connectivity, and live API behavior. They do not constitute a complete automated native UI walkthrough. Physical-device testing, reinstall/recovery on a second physical device, independent security review, and production rollout remain separate work.

See [How the functionality works](HOW-THE-FUNCTIONALITY-WORKS.md) and [Journal privacy](journal-privacy.md) for the design and its limits.
