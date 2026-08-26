# FoodTrekNow Android production release

FoodTrekNow's Android application lives in this repository under `android/` and uses the application ID `com.foodtreknow.app`. The native shell bundles the existing customer and vendor web application; it does not create or replace the web project.

## Release requirements

- Node.js 24
- Java 21
- Android SDK platform 36 and build tools 36.0.0
- A private Android upload keystore
- Google Play App Signing enabled for the Play Console application

The Android target and compile SDK are both API 36. Cleartext traffic and Android cloud backup are disabled for the production application.

## GitHub production environment

Create an environment named `google-play` under **Repository Settings → Environments**. Add an approval requirement before releases when the repository plan supports it.

Add these environment secrets:

- `ANDROID_KEYSTORE_BASE64`: the upload keystore encoded as a single Base64 value
- `ANDROID_KEYSTORE_PASSWORD`: the keystore password
- `ANDROID_KEY_ALIAS`: the upload key alias
- `ANDROID_KEY_PASSWORD`: the upload key password

Never commit the keystore or passwords. The repository ignores `.jks` and `.keystore` files and the workflow restores the key only inside the temporary GitHub runner directory.

## Generate a production bundle

1. Open the repository on GitHub.
2. Select **Actions → Android Production App Bundle**.
3. Select **Run workflow**.
4. Enter a semantic version such as `1.0.0`.
5. Enter an increasing integer version code, starting with `1`.
6. Run the workflow and approve the `google-play` environment if prompted.
7. Download the `FoodTrekNow-Android-...` artifact after the workflow succeeds.

The artifact contains the signed `app-release.aab` file for Google Play and a SHA-256 checksum. The workflow runs all application tests, synchronizes the current web assets, builds the App Bundle, and verifies its signature before uploading the artifact.

## Local maintenance

- `npm run mobile:sync:android` rebuilds the public web assets and synchronizes them into Android.
- `npm run mobile:assets:android` regenerates FoodTrekNow launcher icons and splash screens from `resources/logo.png`.
- `npm run mobile:open:android` opens the native project after Android Studio is installed.

Google Play requires the first release to enroll in Play App Signing. Preserve the upload keystore and passwords in a secure password manager because every later FoodTrekNow Android release uses the same upload identity.
