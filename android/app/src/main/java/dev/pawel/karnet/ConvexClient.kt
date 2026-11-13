package dev.pawel.karnet

import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class ConvexClient {
    var accessToken: String? = null
    var refreshToken: String? = null
    private var accessFetchedAt: Long = 0

    fun signIn(email: String, password: String) {
        val value = call(
            "mutation",
            "auth:signInWithUsernamePassword",
            JSONObject().put("username", email).put("password", password),
            false,
        )
        storeSession(value as JSONObject)
    }

    fun signUp(email: String, password: String, name: String, role: String) {
        val value = call(
            "mutation",
            "auth:signUpWithUsernamePassword",
            JSONObject().put("username", email).put("password", password),
            false,
        )
        storeSession(value as JSONObject)
        call(
            "mutation",
            "users:completeProfile",
            JSONObject().put("name", name).put("email", email).put("role", role),
            true,
        )
    }

    fun me(): JSONObject? {
        val value = call("query", "users:me", JSONObject(), true)
        return if (value == JSONObject.NULL) null else value as JSONObject
    }

    fun listClients(): JSONArray {
        val value = call("query", "crm:listClients", JSONObject(), true)
        return value as JSONArray
    }

    fun clientHome(): JSONObject {
        val value = call("query", "crm:clientHome", JSONObject(), true)
        return value as JSONObject
    }

    fun registerDevice(token: String) {
        call(
            "mutation",
            "notifications:registerDevice",
            JSONObject().put("token", token).put("platform", "android"),
            true,
        )
    }

    private fun storeSession(value: JSONObject) {
        if (value.optString("status") != "complete") {
            val code = value.optJSONObject("userError")?.optString("error") ?: "UNKNOWN"
            throw IllegalStateException(polishAuthError(code))
        }
        val tokens = value.getJSONObject("tokens")
        accessToken = tokens.getString("accessToken")
        refreshToken = tokens.getString("refreshToken")
        accessFetchedAt = System.currentTimeMillis()
    }

    private fun ensureFresh() {
        val refresh = refreshToken ?: return
        if (accessToken != null && System.currentTimeMillis() - accessFetchedAt < 45_000) return
        val value = call(
            "mutation",
            "auth:refreshSession",
            JSONObject().put("refreshToken", refresh),
            false,
        ) as JSONObject
        if (value.optString("kind") == "noSession") {
            accessToken = null
            refreshToken = null
            throw IllegalStateException("Sesja wygasła. Zaloguj się ponownie.")
        }
        val tokens = value.optJSONObject("tokens") ?: return
        accessToken = tokens.getString("accessToken")
        refreshToken = tokens.getString("refreshToken")
        accessFetchedAt = System.currentTimeMillis()
    }

    private fun call(kind: String, path: String, args: JSONObject, authenticated: Boolean): Any {
        if (authenticated) ensureFresh()
        val connection = URL("${BuildConfig.CONVEX_URL}/api/$kind").openConnection() as HttpURLConnection
        connection.requestMethod = "POST"
        connection.setRequestProperty("Content-Type", "application/json")
        connection.connectTimeout = 20_000
        connection.readTimeout = 20_000
        if (authenticated && accessToken != null) {
            connection.setRequestProperty("Authorization", "Bearer $accessToken")
        }
        connection.doOutput = true
        val body = JSONObject().put("path", path).put("args", args).put("format", "json")
        connection.outputStream.use { it.write(body.toString().toByteArray()) }
        val stream = if (connection.responseCode >= 400) connection.errorStream else connection.inputStream
        val text = stream.bufferedReader().readText()
        val json = JSONObject(text)
        if (json.optString("status") == "success") {
            return json.opt("value") ?: JSONObject.NULL
        }
        val data = json.opt("errorData")
        if (data is String) throw IllegalStateException(data)
        throw IllegalStateException(json.optString("errorMessage", "Błąd serwera."))
    }
}

private fun polishAuthError(code: String): String = when (code) {
    "INVALID_CREDENTIALS" -> "Złe hasło."
    "USER_NOT_FOUND" -> "Nie ma konta z tym e-mailem."
    "USERNAME_TAKEN" -> "Ten e-mail jest już zajęty."
    "PASSWORD_TOO_SHORT" -> "Hasło musi mieć co najmniej 10 znaków."
    "PASSWORD_TOO_COMMON" -> "To hasło jest zbyt popularne."
    else -> "Nie udało się zalogować."
}
