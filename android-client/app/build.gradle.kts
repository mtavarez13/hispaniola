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
        versionCode = 2
        versionName = "1.1.0-native-preview"

        val defaultAppUrl = "https://hispaniola--studio-4779362907-870c5.us-east4.hosted.app"
        val appUrl = providers.gradleProperty("HISPANIOLA_APP_URL").orElse(defaultAppUrl).get()
        buildConfigField("String", "APP_URL", "\"$appUrl\"")
    }

    buildFeatures {
        buildConfig = true
    }
}
