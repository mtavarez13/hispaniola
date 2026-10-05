import Foundation

struct AccountEnvelope: Decodable {
    let success: Bool
    let account: Account
    let rates: Rates
    let movements: [WalletMovement]
    let refreshedAt: String?
}

struct Account: Decodable {
    let uid: String
    var name: String
    let email: String
    let role: String
    let clientCode: String
    var phone: String
    var idNumber: String
    var country: String
    let walletBalanceUSD: Double
    let savingsBalanceUSD: Double
}

struct Rates: Decodable {
    let htgPerUsd: Double
    let dopPerUsd: Double
    let remittanceFeePercent: Double
}

struct WalletMovement: Decodable, Identifiable {
    let id: String
    let type: String
    let title: String
    let description: String
    let direction: String
    let amountUSD: Double
    let status: String
    let referenceId: String?
    let receiptCode: String?
    let createdAt: String?
}

struct DepositEnvelope: Decodable {
    let success: Bool
    let feePercent: Double
    let methods: [DepositMethod]
    let deposits: [DepositRecord]
    let dopPerUsd: Double
}

struct DepositMethod: Decodable, Identifiable, Hashable {
    let id: String
    let type: String
    let label: String
    let currency: String
    let recipient: String
    let account: String
    let detail: String
    let instructions: String
    let enabled: Bool
}

struct DepositRecord: Decodable, Identifiable {
    let id: String
    let methodLabel: String
    let amount: Double
    let currency: String
    let amountCreditedUSD: Double
    let reference: String
    let status: String
    let rejectionReason: String?
    let createdAt: String?
}

struct NotificationEnvelope: Decodable {
    let success: Bool
    let unread: Int
    let notifications: [AppNotification]
}

struct AppNotification: Decodable, Identifiable {
    let id: String
    let title: String
    let body: String
    let type: String
    let read: Bool
    let createdAt: String?
}

struct LoginResponse: Decodable {
    let idToken: String
    let refreshToken: String
    let expiresIn: String
}

struct RefreshResponse: Decodable {
    let idToken: String
    let refreshToken: String
    let expiresIn: String
    enum CodingKeys: String, CodingKey { case idToken = "id_token"; case refreshToken = "refresh_token"; case expiresIn = "expires_in" }
}

struct APIMessage: Decodable { let success: Bool?; let error: String? }

enum AppError: LocalizedError {
    case message(String)
    var errorDescription: String? { if case let .message(value) = self { return value }; return "Error inesperado" }
}
