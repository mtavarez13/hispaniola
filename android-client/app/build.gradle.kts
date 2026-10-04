plugins {
    id("com.android.application")
}

android {
    namespace = "com.hispaniolapay.mobile"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.hispaniolapay.mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "2.0.0-client"

        val defaultAppUrl = "https://hispaniola--studio-4779362907-870c5.us-east4.hosted.app"
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
}
