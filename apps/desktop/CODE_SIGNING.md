# Code Signing Setup Guide

This guide covers setting up code signing for ScreenSprout Android and Windows Desktop applications.

## Table of Contents
- [Android Code Signing](#android-code-signing)
- [Windows Desktop Code Signing](#windows-desktop-code-signing)
- [GitHub Secrets Reference](#github-secrets-reference)

---

## Android Code Signing

### Overview
Android APKs must be signed before they can be installed on devices or distributed via the Play Store. We use a Java keystore (.jks or .keystore) file for signing.

### Required GitHub Secrets

| Secret Name | Description |
|-------------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded keystore file |
| `ANDROID_KEYSTORE_PASSWORD` | Password for the keystore file |
| `ANDROID_KEY_ALIAS` | Alias name of the key within the keystore |
| `ANDROID_KEY_PASSWORD` | Password for the specific key (may be same as keystore password) |

### Setting up Android Signing

#### Option 1: Using the Setup Script (Recommended)

1. Navigate to the mobile directory:
   ```bash
   cd screen-sprout-mobile
   ```

2. Run the setup script:
   ```bash
   chmod +x setup-android-signing.sh
   ./setup-android-signing.sh
   ```

3. The script will generate:
   - `screensprout-release.keystore` - The keystore file
   - `signing-secrets.txt` - Contains secrets and GitHub CLI commands

4. Add secrets to GitHub using the provided commands or manually via GitHub web UI.

5. **Delete `signing-secrets.txt` and the keystore file after uploading to GitHub!**

#### Option 2: Manual Setup

1. Generate a new keystore:
   ```bash
   keytool -genkey -v \
     -keystore screensprout-release.keystore \
     -alias screensprout \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000 \
     -storepass YOUR_KEYSTORE_PASSWORD \
     -keypass YOUR_KEY_PASSWORD \
     -dname "CN=ScreenSprout, OU=Development, O=ScreenSprout, L=Unknown, ST=Unknown, C=US"
   ```

2. Convert keystore to base64:
   ```bash
   base64 -w 0 screensprout-release.keystore
   ```

3. Add the following secrets to GitHub (Settings → Secrets and variables → Actions):
   - `ANDROID_KEYSTORE_BASE64`: The base64 output from step 2
   - `ANDROID_KEYSTORE_PASSWORD`: Your keystore password
   - `ANDROID_KEY_ALIAS`: `screensprout`
   - `ANDROID_KEY_PASSWORD`: Your key password

### How It Works in CI/CD

The release workflow (`release.yml`):
1. Decodes the base64 keystore during the build
2. Sets environment variables for Gradle signing configuration
3. Builds the signed APK using the configured keystore
4. Verifies the APK signature using `jarsigner`

### Build Configuration

The `app/build.gradle.kts` includes signing configuration:

```kotlin
signingConfigs {
    create("release") {
        storeFile = file(System.getenv("KEYSTORE_PATH") ?: "release.keystore")
        storePassword = System.getenv("KEYSTORE_PASSWORD") ?: ""
        keyAlias = System.getenv("KEY_ALIAS") ?: ""
        keyPassword = System.getenv("KEY_PASSWORD") ?: ""
    }
}
```

---

## Windows Desktop Code Signing

### Overview
Windows executables should be signed to avoid "Unknown Publisher" warnings. We use a self-signed certificate generated during the CI build.

### Windows Code Signing Options

#### Option 1: Self-Signed Certificate (Current Implementation)
**Pros:**
- Free
- Easy to set up
- No external dependencies

**Cons:**
- Shows "Unknown Publisher" (though less scary than unsigned)
- Requires SmartScreen bypass on first run
- Not suitable for enterprise distribution

#### Option 2: Code Signing Certificate (Recommended for Production)
**Providers:**
- DigiCert (~$474/year)
- Sectigo (~$179/year)
- Certum (Open Source discount available)

**Pros:**
- Trusted by Windows SmartScreen
- Shows verified publisher name
- Professional appearance

**Cons:**
- Annual cost
- Requires identity verification

#### Option 3: SignPath.io (Free for Open Source)
- Free for open source projects
- Cloud-based signing service
- Requires application and approval

### Required GitHub Secrets

| Secret Name | Description |
|-------------|-------------|
| `WINDOWS_CERT_PASSWORD` | Password for the self-signed certificate (any strong password) |

### Setting up Windows Signing

1. Generate a secure password:
   ```bash
   openssl rand -base64 32
   ```

2. Add to GitHub secrets:
   ```bash
   gh secret set WINDOWS_CERT_PASSWORD --body "YOUR_GENERATED_PASSWORD" -R ScreenSprout/screen-sprout-desktop
   ```

### How It Works in CI/CD

The workflow:
1. Creates a self-signed code signing certificate during the build
2. Signs all `.exe` files in the publish output
3. Uses DigiCert's timestamp server for long-term validity
4. Packages the signed executables into the release zip

---

## GitHub Secrets Reference

### Required Secrets Summary

#### Repository: `ScreenSprout/screen-sprout-mobile`

| Secret | Required For | How to Generate |
|--------|--------------|-----------------|
| `ANDROID_KEYSTORE_BASE64` | Android APK signing | `base64 -w 0 keystore.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | Android APK signing | Set when creating keystore |
| `ANDROID_KEY_ALIAS` | Android APK signing | Set when creating keystore |
| `ANDROID_KEY_PASSWORD` | Android APK signing | Set when creating keystore |

#### Repository: `ScreenSprout/screen-sprout-desktop`

| Secret | Required For | How to Generate |
|--------|--------------|-----------------|
| `WINDOWS_CERT_PASSWORD` | Windows EXE signing | `openssl rand -base64 32` |

### Adding Secrets via GitHub CLI

```bash
# Android secrets
gh secret set ANDROID_KEYSTORE_BASE64 --body "base64encodedstring" -R ScreenSprout/screen-sprout-mobile
gh secret set ANDROID_KEYSTORE_PASSWORD --body "yourpassword" -R ScreenSprout/screen-sprout-mobile
gh secret set ANDROID_KEY_ALIAS --body "screensprout" -R ScreenSprout/screen-sprout-mobile
gh secret set ANDROID_KEY_PASSWORD --body "yourpassword" -R ScreenSprout/screen-sprout-mobile

# Windows secret
gh secret set WINDOWS_CERT_PASSWORD --body "yourpassword" -R ScreenSprout/screen-sprout-desktop
```

### Adding Secrets via GitHub Web UI

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Enter the name and value
5. Click "Add secret"

---

## Security Best Practices

1. **Never commit keystore files to git**
   - Keystore files should always be in `.gitignore`
   - Use GitHub secrets for CI/CD builds

2. **Back up your keystore**
   - If you lose the keystore, you cannot update your app on Google Play
   - Store in a secure password manager or encrypted backup

3. **Use strong passwords**
   - Minimum 16 characters
   - Mix of uppercase, lowercase, numbers, and symbols

4. **Rotate secrets periodically**
   - Consider regenerating signing certificates every 2-3 years

5. **Limit access to secrets**
   - Only repository admins should have access to secrets
   - Use GitHub's environment protection rules for production

---

## Troubleshooting

### Android

**Error: "Cannot recover key"**
- Verify `ANDROID_KEYSTORE_PASSWORD` and `ANDROID_KEY_PASSWORD` are correct
- Check that `ANDROID_KEY_ALIAS` matches the alias in the keystore

**Error: "Keystore was tampered with"**
- The base64 encoding may be corrupted
- Regenerate the base64 string: `base64 -w 0 keystore.jks`

### Windows

**Error: "Access denied" during signing**
- The certificate may not be properly imported
- Check that `WINDOWS_CERT_PASSWORD` is correct

**Warning: "Unknown Publisher" still appears**
- Self-signed certificates always show this warning
- Purchase a code signing certificate from a trusted CA to resolve
