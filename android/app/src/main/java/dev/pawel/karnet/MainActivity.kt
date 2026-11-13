package dev.pawel.karnet

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import java.util.UUID

class MainActivity : Activity() {
    private val client = ConvexClient()
    private lateinit var status: TextView
    private lateinit var email: EditText
    private lateinit var password: EditText
    private lateinit var name: EditText
    private var role = "client"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 48, 48, 48)
            setBackgroundColor(Color.parseColor("#12150F"))
        }
        title("Karnet", root)
        email = field("E-mail", root)
        password = field("Hasło", root).apply { inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD }
        name = field("Imię i nazwisko", root)
        val roleButton = button("Rola: klient", root)
        roleButton.setOnClickListener {
            role = if (role == "client") "trainer" else "client"
            roleButton.text = if (role == "trainer") "Rola: trener" else "Rola: klient"
        }
        val login = button("Zaloguj", root)
        val signup = button("Załóż konto", root)
        status = TextView(this).apply {
            setTextColor(Color.parseColor("#F4F0E6"))
            textSize = 16f
            text = "Zaloguj się tym samym kontem co w aplikacji web."
        }
        root.addView(status)
        login.setOnClickListener { runAuth(signUp = false) }
        signup.setOnClickListener { runAuth(signUp = true) }
        setContentView(ScrollView(this).apply {
            addView(root, ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        })
    }

    private fun runAuth(signUp: Boolean) {
        val address = email.text.toString().trim().lowercase()
        val secret = password.text.toString()
        val person = name.text.toString().trim()
        status.text = "Łączenie…"
        Thread {
            try {
                if (signUp) client.signUp(address, secret, person, role) else client.signIn(address, secret)
                client.registerDevice(deviceToken())
                val me = client.me()
                val text = when (me?.optString("role")) {
                    "trainer" -> trainerText(client.listClients())
                    "client" -> clientText(client.clientHome())
                    else -> "Konto bez roli. Dokończ je w aplikacji web."
                }
                show(text)
            } catch (error: Exception) {
                show(error.message ?: "Coś poszło nie tak.")
            }
        }.start()
    }

    private fun trainerText(rows: org.json.JSONArray): String {
        if (rows.length() == 0) return "Brak klientów."
        return buildString {
            append("Twoi klienci\n")
            for (index in 0 until rows.length()) {
                val row = rows.getJSONObject(index)
                append("\n")
                append(row.optString("name"))
                append(" · ")
                append(row.optString("email"))
                append("\nTreningi: ")
                append(if (row.isNull("lessonsRemaining")) "—" else row.optInt("lessonsRemaining").toString())
            }
        }
    }

    private fun clientText(home: org.json.JSONObject): String {
        val lessons = if (home.isNull("lessonsRemaining")) "—" else home.opt("lessonsRemaining").toString()
        val notes = home.optJSONArray("notifications")
        return buildString {
            append("Twój karnet\nTreningi: ")
            append(lessons)
            append("\nTrener: ")
            append(if (home.isNull("trainerName")) "brak" else home.optString("trainerName"))
            append("\n\nPowiadomienia: ")
            append(notes?.length() ?: 0)
            if (notes != null) {
                for (index in 0 until notes.length()) {
                    val item = notes.getJSONObject(index)
                    append("\n• ")
                    append(item.optString("title"))
                    append(" — ")
                    append(item.optString("body"))
                }
            }
        }
    }

    private fun deviceToken(): String {
        val prefs = getSharedPreferences("karnet", MODE_PRIVATE)
        val existing = prefs.getString("device", null)
        if (existing != null) return existing
        val created = "android-${UUID.randomUUID()}"
        prefs.edit().putString("device", created).apply()
        return created
    }

    private fun show(text: String) {
        runOnUiThread { status.text = text }
    }

    private fun title(text: String, root: LinearLayout) {
        root.addView(TextView(this).apply {
            this.text = text
            textSize = 32f
            setTextColor(Color.parseColor("#E7C36A"))
        })
    }

    private fun field(hint: String, root: LinearLayout): EditText {
        val input = EditText(this).apply {
            this.hint = hint
            setHintTextColor(Color.parseColor("#B7B09F"))
            setTextColor(Color.parseColor("#F4F0E6"))
        }
        root.addView(input)
        return input
    }

    private fun button(label: String, root: LinearLayout): Button {
        val button = Button(this).apply { text = label }
        root.addView(button)
        return button
    }
}
