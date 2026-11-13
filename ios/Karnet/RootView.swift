import SwiftUI

@MainActor
final class Session: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    @Published var name = ""
    @Published var role = "trainer"
    @Published var signingUp = false
    @Published var error: String?
    @Published var busy = false
    @Published var me: [String: Any]?
    @Published var clients: [[String: Any]] = []
    @Published var home: [String: Any]?
    private var client = ConvexClient()

    var signedIn: Bool { client.refreshToken != nil && me != nil }

    func submit() async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            let address = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            if signingUp {
                try await client.signUp(email: address, password: password, name: name, role: role)
            } else {
                try await client.signIn(email: address, password: password)
            }
            try await client.registerDevice(token: deviceToken())
            try await reload()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func reload() async throws {
        me = try await client.me()
        if me?["role"] as? String == "trainer" {
            clients = try await client.listClients()
            home = nil
        } else if me?["role"] as? String == "client" {
            home = try await client.clientHome()
            clients = []
        }
    }

    func remind(_ clientId: String) async {
        do {
            try await client.sendReminder(clientId: clientId)
            error = "Przypomnienie zapisane."
        } catch {
            self.error = error.localizedDescription
        }
    }

    func signOut() {
        client = ConvexClient()
        me = nil
        clients = []
        home = nil
    }

    private func deviceToken() -> String {
        let key = "karnet-ios-device"
        if let existing = UserDefaults.standard.string(forKey: key) {
            return existing
        }
        let created = "ios-\(UUID().uuidString)"
        UserDefaults.standard.set(created, forKey: key)
        return created
    }
}

struct RootView: View {
    @StateObject private var session = Session()

    var body: some View {
        NavigationStack {
            Group {
                if session.me == nil {
                    auth
                } else if session.me?["role"] as? String == "trainer" {
                    trainer
                } else {
                    client
                }
            }
            .padding()
            .navigationTitle("Karnet")
            .toolbar {
                if session.me != nil {
                    Button("Wyloguj") { session.signOut() }
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var auth: some View {
        Form {
            TextField("E-mail", text: $session.email)
                .textInputAutocapitalization(.never)
                .keyboardType(.emailAddress)
            SecureField("Hasło", text: $session.password)
            if session.signingUp {
                TextField("Imię i nazwisko", text: $session.name)
                Picker("Rola", selection: $session.role) {
                    Text("Trener").tag("trainer")
                    Text("Klient").tag("client")
                }
            }
            if let error = session.error {
                Text(error).foregroundStyle(.orange)
            }
            Button(session.signingUp ? "Załóż konto" : "Zaloguj") {
                Task { await session.submit() }
            }
            .disabled(session.busy)
            Button(session.signingUp ? "Mam już konto" : "Nie mam konta") {
                session.signingUp.toggle()
            }
        }
    }

    private var trainer: some View {
        List(session.clients, id: \.clientKey) { row in
            VStack(alignment: .leading, spacing: 6) {
                Text(row["name"] as? String ?? "Klient").font(.headline)
                Text(row["email"] as? String ?? "").font(.subheadline)
                Text("Treningi: \(lessonText(row["lessonsRemaining"]))")
                Text("Karnet: \(passText(row["paidThrough"]))")
                if let id = row["clientId"] as? String {
                    Button("Wyślij przypomnienie") {
                        Task { await session.remind(id) }
                    }
                }
            }
        }
    }

    private var client: some View {
        List {
            Section("Stan") {
                Text("Treningi: \(lessonText(session.home?["lessonsRemaining"]))")
                Text("Karnet: \(passText(session.home?["paidThrough"]))")
                Text("Trener: \((session.home?["trainerName"] as? String) ?? "brak")")
            }
            Section("Powiadomienia") {
                let items = session.home?["notifications"] as? [[String: Any]] ?? []
                if items.isEmpty {
                    Text("Brak wiadomości.")
                }
                ForEach(items, id: \.noteKey) { item in
                    VStack(alignment: .leading) {
                        Text(item["title"] as? String ?? "").font(.headline)
                        Text(item["body"] as? String ?? "")
                    }
                }
            }
        }
    }

    private func lessonText(_ value: Any?) -> String {
        if let number = value as? NSNumber { return number.stringValue }
        return "—"
    }

    private func passText(_ value: Any?) -> String {
        guard let number = value as? NSNumber else { return "brak daty" }
        let date = Date(timeIntervalSince1970: number.doubleValue / 1000)
        return date.formatted(date: .abbreviated, time: .omitted)
    }
}

private extension Dictionary where Key == String, Value == Any {
    var clientKey: String { self["clientId"] as? String ?? UUID().uuidString }
    var noteKey: String { self["id"] as? String ?? UUID().uuidString }
}
