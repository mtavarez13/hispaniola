import Foundation

@MainActor
final class AppSession: ObservableObject {
    @Published var token: String?
    @Published var accountData: AccountEnvelope?
    @Published var depositData: DepositEnvelope?
    @Published var notificationData: NotificationEnvelope?
    @Published var isSyncing = false
    @Published var errorMessage: String?

    init() { token = TokenStore.read(account: "idToken") }

    func start() async {
        guard token != nil else { return }
        await synchronize(showAnimation: true)
    }

    func login(email: String, password: String) async {
        isSyncing = true; errorMessage = nil
        do {
            let result = try await APIClient.shared.login(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
            token = result.idToken
            TokenStore.save(result.idToken, account: "idToken")
            TokenStore.save(result.refreshToken, account: "refreshToken")
            UserDefaults.standard.set(Date().addingTimeInterval(Double(result.expiresIn) ?? 3600).timeIntervalSince1970, forKey: "hispaniolapay.expiresAt")
            await synchronize(showAnimation: false)
        } catch { errorMessage = error.localizedDescription }
        isSyncing = false
    }

    func synchronize(showAnimation: Bool = false) async {
        guard let token = await validToken() else { return }
        if showAnimation { isSyncing = true }
        do {
            async let account = APIClient.shared.account(token: token)
            async let deposits = APIClient.shared.deposits(token: token)
            async let notifications = APIClient.shared.notifications(token: token)
            accountData = try await account
            depositData = try await deposits
            notificationData = try await notifications
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
            if error.localizedDescription.localizedCaseInsensitiveContains("sesión") { logout() }
        }
        isSyncing = false
    }

    func submitDeposit(methodId: String, amount: Double, reference: String) async -> Bool {
        guard let token = await validToken() else { return false }; isSyncing = true
        do { try await APIClient.shared.createDeposit(token: token, methodId: methodId, amount: amount, reference: reference); await synchronize(); return true }
        catch { errorMessage = error.localizedDescription; isSyncing = false; return false }
    }

    func send(operatorName: String, recipientName: String, phone: String, amount: Double) async -> Bool {
        guard let token = await validToken() else { return false }; isSyncing = true
        do { try await APIClient.shared.send(token: token, operatorName: operatorName, recipientName: recipientName, phone: phone, amount: amount); await synchronize(); return true }
        catch { errorMessage = error.localizedDescription; isSyncing = false; return false }
    }

    func saveProfile(name: String, phone: String, idNumber: String, country: String) async -> Bool {
        guard let token = await validToken() else { return false }; isSyncing = true
        do { try await APIClient.shared.updateProfile(token: token, name: name, phone: phone, idNumber: idNumber, country: country); await synchronize(); return true }
        catch { errorMessage = error.localizedDescription; isSyncing = false; return false }
    }

    func logout() {
        token = nil; accountData = nil; depositData = nil; notificationData = nil
        TokenStore.delete(account: "idToken")
        TokenStore.delete(account: "refreshToken")
        UserDefaults.standard.removeObject(forKey: "hispaniolapay.expiresAt")
    }

    private func validToken() async -> String? {
        let expiresAt = UserDefaults.standard.double(forKey: "hispaniolapay.expiresAt")
        if let token, expiresAt > Date().addingTimeInterval(120).timeIntervalSince1970 { return token }
        guard let refreshToken = TokenStore.read(account: "refreshToken") else { logout(); return nil }
        do {
            let result = try await APIClient.shared.refresh(refreshToken: refreshToken)
            token = result.idToken
            TokenStore.save(result.idToken, account: "idToken")
            TokenStore.save(result.refreshToken, account: "refreshToken")
            UserDefaults.standard.set(Date().addingTimeInterval(Double(result.expiresIn) ?? 3600).timeIntervalSince1970, forKey: "hispaniolapay.expiresAt")
            return result.idToken
        } catch { errorMessage = error.localizedDescription; logout(); return nil }
    }
}
