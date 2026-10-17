plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.hispaniolapay.mobile"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.hispaniolapay.mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = 33
        versionName = "2.25.0-optimizada"

        // The Android client talks to the stable Firebase backend. Private
        // provider credentials remain server-side and are never packaged here.
        val defaultAppUrl = "https://studio-4779362907-870c5.web.app"
        val appUrl = providers.gradleProperty("HISPANIOLA_APP_URL").orElse(defaultAppUrl).get()
        buildConfigField("String", "APP_URL", "\"$appUrl\"")
        buildConfigField("String", "FIREBASE_API_KEY", "\"AIzaSyBkV_WnRauCZKhjVirr8g_rv1j6GBi0dA8\"")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs.getByName("debug") {
        enableV1Signing = true
        enableV2Signing = true
        enableV3Signing = true
        enableV4Signing = true
    }
}

dependencies {
    implementation("androidx.core:core:1.15.0")
    implementation("com.google.firebase:firebase-messaging:24.1.1")
    implementation("com.google.android.gms:play-services-auth:21.3.0")
    implementation("com.google.zxing:core:3.5.3")
    implementation("com.caverock:androidsvg-aar:1.4")
}
