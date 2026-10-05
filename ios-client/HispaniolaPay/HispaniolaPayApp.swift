import SwiftUI

@main
struct HispaniolaPayApp: App {
    @StateObject private var session = AppSession()

    var body: some Scene {
        WindowGroup {
            ZStack {
                if session.token == nil { LoginView() } else { RootView() }
                if session.isSyncing { SyncAnimationView().transition(.opacity) }
            }
            .environmentObject(session)
            .animation(.easeInOut(duration: 0.2), value: session.isSyncing)
            .task { await session.start() }
            .alert("HispaniolaPay", isPresented: Binding(get: { session.errorMessage != nil }, set: { if !$0 { session.errorMessage = nil } })) {
                Button("Entendido") { session.errorMessage = nil }
            } message: { Text(session.errorMessage ?? "") }
        }
    }
}
