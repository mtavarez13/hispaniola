import Foundation

actor APIClient {
    static let shared = APIClient()
    private let appURL = URL(string: "https://hispaniola--studio-4779362907-870c5.us-east4.hosted.app")!
    private let firebaseKey = "AIzaSyBkV_WnRauCZKhjVirr8g_rv1j6GBi0dA8"
    private let decoder = JSONDecoder()

    func login(email: String, password: String) async throws -> LoginResponse {
        let url = URL(string: "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=\(firebaseKey)")!
        return try await request(url: url, method: "POST", body: ["email": email, "password": password, "returnSecureToken": true], token: nil)
    }

    func refresh(refreshToken: String) async throws -> RefreshResponse {
        let url = URL(string: "https://securetoken.googleapis.com/v1/token?key=\(firebaseKey)")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        let encoded = refreshToken.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? refreshToken
        request.httpBody = "grant_type=refresh_token&refresh_token=\(encoded)".data(using: .utf8)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else { throw AppError.message("La sesión venció. Inicia sesión nuevamente.") }
        return try decoder.decode(RefreshResponse.self, from: data)
    }

    func account(token: String) async throws -> AccountEnvelope {
        try await request(path: "/api/mobile/account", token: token)
    }

    func deposits(token: String) async throws -> DepositEnvelope {
        try await request(path: "/api/mobile/deposits", token: token)
    }

    func notifications(token: String) async throws -> NotificationEnvelope {
        try await request(path: "/api/mobile/notifications", token: token)
    }

    func createDeposit(token: String, methodId: String, amount: Double, reference: String) async throws {
        let _: APIMessage = try await request(path: "/api/mobile/deposits", method: "POST", body: ["methodId": methodId, "amount": amount, "reference": reference], token: token)
    }

    func send(token: String, operatorName: String, recipientName: String, phone: String, amount: Double) async throws {
        let body: [String: Any] = ["operator": operatorName, "recipientName": recipientName, "recipientPhone": phone, "amountUSD": amount, "idempotencyKey": UUID().uuidString]
        let _: APIMessage = try await request(path: "/api/mobile/remittances", method: "POST", body: body, token: token)
    }

    func updateProfile(token: String, name: String, phone: String, idNumber: String, country: String) async throws {
        let _: APIMessage = try await request(path: "/api/mobile/profile", method: "PATCH", body: ["name": name, "phone": phone, "idNumber": idNumber, "country": country], token: token)
    }

    private func request<T: Decodable>(path: String, method: String = "GET", body: [String: Any]? = nil, token: String) async throws -> T {
        try await request(url: appURL.appending(path: path), method: method, body: body, token: token)
    }

    private func request<T: Decodable>(url: URL, method: String, body: [String: Any]?, token: String?) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 65
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body { request.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw AppError.message("Respuesta inválida del servidor") }
        guard 200..<300 ~= http.statusCode else {
            let payload = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            let message = payload?["error"] as? String ?? ((payload?["error"] as? [String: Any])?["message"] as? String) ?? "No se pudo completar la operación"
            throw AppError.message(message)
        }
        return try decoder.decode(T.self, from: data)
    }
}
