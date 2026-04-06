# FitLab APK Release Guide

This guide details the complete process for converting your FitLab web code into a production-ready, signed Android APK suitable for public distribution on free app stores (Amazon Appstore, Indus Appstore, APKPure, etc.).

## 1. Generating App Icons & Assets
To customize the logo on the phone's home screen, a high-resolution `1024x1024` PNG named `icon.png` is required.
1. Place your `icon.png` inside the `/assets` directory in the root of your project.
2. Install Capacitor Assets:
```bash
npm install -D @capacitor/assets
```
3. Run the generator to automatically slice the icon into all necessary Android DPI variants:
```bash
npx @capacitor/assets generate --android
```

## 2. Building the Production App
Before building the APK, the React web app must be compiled.
1. Bundle the frontend for production:
```bash
npm run build
```
2. Sync the compiled files and assets with the Android native project:
```bash
npx cap sync android
```

## 3. Building the Release Unsigned APK
A "Debug" build is insecure, runs unoptimized, and is rejected by stores.
1. Navigate into the native Android folder:
```bash
cd android
```
2. Ensure Java is correctly mapped in your environment (e.g., `$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`).
3. Use Gradle to compile a release-mode APK:
```bash
.\gradlew.bat assembleRelease
```
*Your file will appear in `android\app\build\outputs\apk\release\` named `app-release-unsigned.apk`.*

## 4. Creating a Developer Keystore
A cryptographic Keystore (`.jks`) acts as your digital thumbprint. You only create this once per app. **Never lose this file or its password, as it is required to upload future updates.**
Navigate to your release output folder and run:
```bash
keytool -genkey -v -keystore fitlab-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias fitlab-alias
```
*You will be prompted to enter a secure password and your organizational details.*

## 5. Cryptographically Signing the APK
You must inject your digital signature into the compiled release APK.
Run `jarsigner` on the unsigned APK using your new Keystore:
```bash
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore fitlab-release-key.jks app-release-unsigned.apk fitlab-alias
```
*(Any warnings about POSIX attributes are completely normal. The file `app-release-unsigned.apk` is now officially signed.)*

## 6. (Optional) Zipalign
For maximum execution speed on Android devices, compress and memory-align your signed APK using the `zipalign` tool (found somewhere in your `AppData/Local/Android/Sdk/build-tools/`):
```bash
zipalign -v 4 app-release-unsigned.apk FitLab-v1.0-Release.apk
```

## 7. App Store Distribution
Since `jarsigner` modified the original file, right-click `app-release-unsigned.apk` in Windows Explorer and rename it to `FitLab-v1.0.apk` so it looks professional.
- **Amazon Appstore:** Create a free developer account at `developer.amazon.com`, navigate to "App Submission," fill out your app assets, and upload your `.apk`.
- **Indus Appstore:** Create a console account at `developer.indusappstore.com` to target the massive Indian mobile market, and simply upload your `.apk`.
- **APKPure / Aptoide:** Create a developer account, claim ownership of your package name (`com.fitlab.app`), and submit the file for distribution tracking.
