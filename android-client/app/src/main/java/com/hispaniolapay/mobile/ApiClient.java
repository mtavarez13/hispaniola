package com.hispaniolapay.mobile;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

final class ApiClient {
    private static final String PREFS = "hispaniola_secure_session";
    private final SharedPreferences prefs;

    ApiClient(Context context) {
        prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    boolean hasSession() {
        return !prefs.getString("refreshToken", "").isEmpty();
    }

    void logout() {
        prefs.edit().clear().apply();
    }

    JSONObject login(String email, String password) throws Exception {
        JSONObject payload = new JSONObject()
                .put("email", email.trim())
                .put("password", password)
                .put("returnSecureToken", true);
        JSONObject response = request(
                "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + BuildConfig.FIREBASE_API_KEY,
                "POST", payload, null, 25000);
        saveTokens(
                response.optString("idToken"),
                response.optString("refreshToken"),
                response.optLong("expiresIn", 3600));
        return response;
    }

    JSONObject loginWithGoogle(String googleIdToken) throws Exception {
        String postBody = "id_token=" + URLEncoder.encode(googleIdToken, "UTF-8") + "&providerId=google.com";
        JSONObject payload = new JSONObject()
                .put("postBody", postBody)
                .put("requestUri", "https://studio-4779362907-870c5.firebaseapp.com/__/auth/handler")
                .put("returnSecureToken", true)
                .put("returnIdpCredential", true);
        JSONObject response = request(
                "https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=" + BuildConfig.FIREBASE_API_KEY,
                "POST", payload, null, 25000);
        saveTokens(response.optString("idToken"), response.optString("refreshToken"), response.optLong("expiresIn", 3600));
        return response;
    }

    JSONObject account() throws Exception {
        return authorizedRequest(BuildConfig.APP_URL + "/api/mobile/account", "GET", null, 25000);
    }

    JSONObject sendRemittance(JSONObject payload) throws Exception {
        return authorizedRequest(BuildConfig.APP_URL + "/api/mobile/remittances", "POST", payload, 65000);
    }

    JSONObject notifications() throws Exception {
        return authorizedRequest(BuildConfig.APP_URL + "/api/mobile/notifications", "GET", null, 25000);
    }

    JSONObject markNotificationsRead(String notificationId) throws Exception {
        return authorizedRequest(BuildConfig.APP_URL + "/api/mobile/notifications", "PATCH",
                new JSONObject().put("notificationId", notificationId == null ? "" : notificationId), 25000);
    }

    JSONObject registerDeviceToken(String token) throws Exception {
        return authorizedRequest(BuildConfig.APP_URL + "/api/mobile/device-token", "POST",
                new JSONObject().put("token", token).put("appVersion", BuildConfig.VERSION_NAME), 25000);
    }

    private JSONObject authorizedRequest(String url, String method, JSONObject payload, int timeout) throws Exception {
        String token = validIdToken();
        try {
            return request(url, method, payload, token, timeout);
        } catch (ApiException error) {
            if (error.statusCode != 401) throw error;
            refresh();
            return request(url, method, payload, prefs.getString("idToken", ""), timeout);
        }
    }

    private String validIdToken() throws Exception {
        String token = prefs.getString("idToken", "");
        long expiresAt = prefs.getLong("expiresAt", 0);
        if (token.isEmpty() || System.currentTimeMillis() > expiresAt - 120000) {
            refresh();
            token = prefs.getString("idToken", "");
        }
        if (token.isEmpty()) throw new ApiException(401, "Inicia sesión nuevamente");
        return token;
    }

    private void refresh() throws Exception {
        String refreshToken = prefs.getString("refreshToken", "");
        if (refreshToken.isEmpty()) throw new ApiException(401, "La sesión venció");

        URL url = new URL("https://securetoken.googleapis.com/v1/token?key=" + BuildConfig.FIREBASE_API_KEY);
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("POST");
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(20000);
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
        String form = "grant_type=refresh_token&refresh_token=" + URLEncoder.encode(refreshToken, "UTF-8");
        try (OutputStream output = connection.getOutputStream()) {
            output.write(form.getBytes(StandardCharsets.UTF_8));
        }
        int status = connection.getResponseCode();
        JSONObject response = readJson(connection, status);
        if (status < 200 || status >= 300) {
            throw new ApiException(status, firebaseError(response, "No se pudo renovar la sesión"));
        }
        saveTokens(
                response.optString("id_token"),
                response.optString("refresh_token", refreshToken),
                response.optLong("expires_in", 3600));
    }

    private void saveTokens(String idToken, String refreshToken, long expiresInSeconds) {
        prefs.edit()
                .putString("idToken", idToken)
                .putString("refreshToken", refreshToken)
                .putLong("expiresAt", System.currentTimeMillis() + expiresInSeconds * 1000L)
                .apply();
    }

    private JSONObject request(String target, String method, JSONObject payload, String token, int timeout) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(target).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(18000);
        connection.setReadTimeout(timeout);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("User-Agent", "HispaniolaPay-Android/2.0");
        if (token != null && !token.isEmpty()) connection.setRequestProperty("Authorization", "Bearer " + token);
        if (payload != null) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            try (OutputStream output = connection.getOutputStream()) {
                output.write(payload.toString().getBytes(StandardCharsets.UTF_8));
            }
        }
        int status = connection.getResponseCode();
        JSONObject response = readJson(connection, status);
        if (status < 200 || status >= 300 || !response.optBoolean("success", true)) {
            String message = response.optString("error", response.optString("message", "Error del servidor"));
            if (message.isEmpty()) message = "Error HTTP " + status;
            throw new ApiException(status, message, response);
        }
        return response;
    }

    private JSONObject readJson(HttpURLConnection connection, int status) throws Exception {
        InputStream stream = status >= 200 && status < 400 ? connection.getInputStream() : connection.getErrorStream();
        if (stream == null) return new JSONObject();
        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
        }
        return body.length() == 0 ? new JSONObject() : new JSONObject(body.toString());
    }

    private String firebaseError(JSONObject response, String fallback) {
        JSONObject error = response.optJSONObject("error");
        String code = error == null ? "" : error.optString("message");
        if (code.contains("INVALID_LOGIN_CREDENTIALS") || code.contains("INVALID_PASSWORD") || code.contains("EMAIL_NOT_FOUND")) {
            return "Correo o contraseña incorrectos";
        }
        if (code.contains("TOO_MANY_ATTEMPTS")) return "Demasiados intentos. Espera unos minutos";
        return fallback;
    }

    static final class ApiException extends Exception {
        final int statusCode;
        final JSONObject response;

        ApiException(int statusCode, String message) {
            this(statusCode, message, null);
        }

        ApiException(int statusCode, String message, JSONObject response) {
            super(message);
            this.statusCode = statusCode;
            this.response = response;
        }
    }
}
