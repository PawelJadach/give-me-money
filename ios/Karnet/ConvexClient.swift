import Foundation

struct ConvexClient {
    var accessToken: String?
    var refreshToken: String?
    var accessFetchedAt: Date?

    private var base: URL {
        URL(string: AppConfig.convexURL)!
    }

    mutating func signIn(email: String, password: String) async throws {
        let value = try await call(
            kind: "mutation",
            path: "auth:signInWithUsernamePassword",
            args: ["username": email, "password": password],
            authenticated: false
        )
        try storeSession(value)
    }

    mutating func signUp(email: String, password: String, name: String, role: String) async throws {
        let value = try await call(
            kind: "mutation",
            path: "auth:signUpWithUsernamePassword",
            args: ["username": email, "password": password],
            authenticated: false
        )
        try storeSession(value)
        _ = try await call(
            kind: "mutation",
            path: "users:completeProfile",
            args: ["name": name, "email": email, "role": role],
            authenticated: true
        )
    }

    mutating func me() async throws -> [String: Any]? {
        let value = try await call(kind: "query", path: "users:me", args: [:], authenticated: true)
        if value is NSNull { return nil }
        return value as? [String: Any]
    }

    mutating func listClients() async throws -> [[String: Any]] {
        let value = try await call(kind: "query", path: "crm:listClients", args: [:], authenticated: true)
        return value as? [[String: Any]] ?? []
    }

    mutating func clientHome() async throws -> [String: Any] {
        let value = try await call(kind: "query", path: "crm:clientHome", args: [:], authenticated: true)
        return value as? [String: Any] ?? [:]
    }

    mutating func registerDevice(token: String) async throws {
        _ = try await call(
            kind: "mutation",
            path: "notifications:registerDevice",
            args: ["token": token, "platform": "ios"],
            authenticated: true
        )
    }

    mutating func sendReminder(clientId: String) async throws {
        _ = try await call(
            kind: "mutation",
            path: "crm:sendReminder",
            args: ["clientId": clientId],
            authenticated: true
        )
    }

    private mutating func storeSession(_ value: Any) throws {
        guard let object = value as? [String: Any] else {
            throw ConvexFailure("Pusta odpowiedź logowania.")
        }
        if let status = object["status"] as? String, status != "complete" {
            let code = (object["userError"] as? [String: Any])?["error"] as? String ?? "UNKNOWN"
            throw ConvexFailure(polishAuthError(code))
        }
        guard let tokens = object["tokens"] as? [String: Any],
              let access = tokens["accessToken"] as? String,
              let refresh = tokens["refreshToken"] as? String
        else {
            throw ConvexFailure("Brak sesji w odpowiedzi.")
        }
        accessToken = access
        refreshToken = refresh
        accessFetchedAt = Date()
    }

    private mutating func ensureFresh() async throws {
        guard let refreshToken else { return }
        if let accessToken, let accessFetchedAt, Date().timeIntervalSince(accessFetchedAt) < 45 {
            _ = accessToken
            return
        }
        let value = try await call(
            kind: "mutation",
            path: "auth:refreshSession",
            args: ["refreshToken": refreshToken],
            authenticated: false
        )
        guard let object = value as? [String: Any] else {
            throw ConvexFailure("Nie udało się odświeżyć sesji.")
        }
        if object["kind"] as? String == "noSession" {
            accessToken = nil
            self.refreshToken = nil
            throw ConvexFailure("Sesja wygasła. Zaloguj się ponownie.")
        }
        if let tokens = object["tokens"] as? [String: Any],
           let access = tokens["accessToken"] as? String,
           let refresh = tokens["refreshToken"] as? String {
            accessToken = access
            self.refreshToken = refresh
            accessFetchedAt = Date()
        }
    }

    private mutating func call(kind: String, path: String, args: [String: Any], authenticated: Bool) async throws -> Any {
        if authenticated {
            try await ensureFresh()
        }
        let endpoint = base
            .appendingPathComponent("api")
            .appendingPathComponent(kind)
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if authenticated, let accessToken {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: [
            "path": path,
            "args": args,
            "format": "json",
        ])
        let (data, response) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        if let status = json["status"] as? String, status == "success" {
            return json["value"] ?? NSNull()
        }
        if let dataMessage = json["errorData"] as? String {
            throw ConvexFailure(dataMessage)
        }
        let http = (response as? HTTPURLResponse)?.statusCode ?? 0
        let message = json["errorMessage"] as? String ?? "Błąd serwera (\(http))."
        throw ConvexFailure(message)
    }
}

struct ConvexFailure: Error, LocalizedError {
    let message: String
    init(_ message: String) { self.message = message }
    var errorDescription: String? { message }
}

func polishAuthError(_ code: String) -> String {
    switch code {
    case "INVALID_CREDENTIALS": return "Złe hasło."
    case "USER_NOT_FOUND": return "Nie ma konta z tym e-mailem."
    case "USERNAME_TAKEN": return "Ten e-mail jest już zajęty."
    case "PASSWORD_TOO_SHORT": return "Hasło musi mieć co najmniej 10 znaków."
    case "PASSWORD_TOO_COMMON": return "To hasło jest zbyt popularne."
    default: return "Nie udało się zalogować."
    }
}
