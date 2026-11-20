# Publishing Mini Dunkers

## Done
- The game, the server, accounts, online play, and a privacy page at `/privacy.html`.
- Play as a guest, and account deletion inside the game (Settings → Delete Account).
- The Android app: `Desktop\Mini Dunkers - Play Store\mini-dunkers-1.0.0-code1.aab`, built from `app/`.
- The store listing words: `app/store-listing.md`.

## Not done
1. A Google Play app for it: in the Play Console, **Create app** → "Mini Dunkers". It is a separate
   app from Mini Strikers, under the same developer account.
2. Store pictures (the feature graphic and screenshots).
3. The iPhone app (needs a Mac with Xcode).
4. Coin packs are off (no store products for this app).

## The signing key
The `.aab` is signed with the same *upload key* as Mini Strikers, kept in
`C:\Users\NoahL\AndroidBuild\signing\` (outside OneDrive, never committed). Google allows one upload
key for several apps; Play App Signing gives each app its own app-signing key. Back that folder up.

## Building the Android file again
1. Raise `versionCode` (and `versionName`) in `app/version.json`.
2. `powershell -ExecutionPolicy Bypass -File app\build-android.ps1`
3. The new file appears in `Desktop\Mini Dunkers - Play Store`.

It builds in `C:\Users\NoahL\AndroidBuild\work-dunkers`, its own folder: Mini Strikers builds in
`work`, so the two Android projects never mix. The app id `com.irizarrygames.minidunkers` cannot be
changed after the first upload.

## Steps, in order
1. Upload the `.aab` to a Closed testing track (a new app on a personal account needs 12 testers for
   14 days before production), then apply for production access.
2. Listing: `app/store-listing.md`. Fill in the age-rating questionnaire and the Data safety form
   (answers are in the listing file).
3. A reviewer account: make a demo account on the live game and put it in the review notes.
