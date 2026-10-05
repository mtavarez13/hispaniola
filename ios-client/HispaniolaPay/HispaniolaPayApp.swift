import SwiftUI

@main
struct HispaniolaPayApp: App {
    @StateObject private var session = AppSession()
    @AppStorage("appearance") private var appearance = "system"

    var body: some Scene {
        WindowGroup {
            ZStack {
                if session.token == nil { LoginView() } else { RootView() }
                if session.isSyncing { SyncAnimationView().transition(.opacity) }
            }
            .environmentObject(session)
            .preferredColorScheme(appearance == "dark" ? .dark : appearance == "light" ? .light : nil)
            .animation(.easeInOut(duration: 0.2), value: session.isSyncing)
            .task { await session.start() }
            .alert("HispaniolaPay", isPresented: Binding(get: { session.errorMessage != nil }, set: { if !$0 { session.errorMessage = nil } })) {
                Button("Entendido") { session.errorMessage = nil }
            } message: { Text(session.errorMessage ?? "") }
        }
    }
}
