import SwiftUI

struct SyncAnimationView: View {
    @State private var floating = false
    @State private var moneyMoves = false

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(red: 0.95, green: 0.98, blue: 1), Color(red: 0.86, green: 0.93, blue: 1)], startPoint: .topLeading, endPoint: .bottomTrailing).ignoresSafeArea()
            VStack(spacing: 20) {
                Image("BrandMark").resizable().scaledToFit().frame(width: 96, height: 96)
                    .scaleEffect(floating ? 1.08 : 1).offset(y: floating ? -10 : 2)
                    .shadow(color: .blue.opacity(0.18), radius: 18, y: 10)
                HStack(spacing: 24) { Text("$"); Text("RD$"); Text("HTG") }
                    .font(.system(size: 17, weight: .black, design: .rounded)).foregroundStyle(.green)
                    .offset(x: moneyMoves ? 16 : -16).opacity(moneyMoves ? 1 : 0.35)
                ProgressView().tint(.blue).scaleEffect(1.15)
                VStack(spacing: 5) { Text("Sincronizando tu billetera").font(.headline); Text("Conectando tu dinero de forma segura").font(.caption).foregroundStyle(.secondary) }
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.25).repeatForever(autoreverses: true)) { floating = true }
            withAnimation(.easeInOut(duration: 1.7).repeatForever(autoreverses: true)) { moneyMoves = true }
        }
    }
}
