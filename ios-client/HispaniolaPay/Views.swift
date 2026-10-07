import SwiftUI

private let navy = Color(red: 0.03, green: 0.13, blue: 0.29)
private let brandBlue = Color(red: 0.06, green: 0.36, blue: 0.77)

private func walletCurrency(_ account: Account?) -> String { account?.primaryCurrency == "DOP" ? "DOP" : "USD" }
private func walletBalance(_ account: Account?) -> Double { account?.walletBalance ?? account?.walletBalanceUSD ?? 0 }
private func walletSavings(_ account: Account?) -> Double { account?.savingsBalance ?? account?.savingsBalanceUSD ?? 0 }
private func walletMoney(_ value: Double, account: Account?) -> String { value.formatted(.currency(code: walletCurrency(account))) }

struct LoginView: View {
    @EnvironmentObject var session: AppSession
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                Image("BrandMark").resizable().scaledToFit().frame(width: 104, height: 104).padding(.top, 44)
                Text("HispaniolaPay").font(.system(size: 32, weight: .black, design: .rounded)).foregroundStyle(navy)
                Text("Tu billetera entre RD y Haití").foregroundStyle(.secondary)
                VStack(spacing: 14) {
                    TextField("Correo electrónico", text: $email).textInputAutocapitalization(.never).keyboardType(.emailAddress).textContentType(.username).padding().background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
                    SecureField("Contraseña", text: $password).textContentType(.password).padding().background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 14))
                    Button { Task { await session.login(email: email, password: password) } } label: { Text("Iniciar sesión").fontWeight(.bold).frame(maxWidth: .infinity).padding() }.buttonStyle(.plain).foregroundStyle(.white).background(brandBlue, in: RoundedRectangle(cornerRadius: 15)).disabled(email.isEmpty || password.count < 6)
                }.padding(20).background(.background, in: RoundedRectangle(cornerRadius: 24)).shadow(color: .black.opacity(0.08), radius: 18, y: 8).padding(.top, 15)
                Label("Acceso protegido y saldo sincronizado", systemImage: "lock.shield.fill").font(.caption).foregroundStyle(.secondary)
            }.padding(.horizontal, 22)
        }.background(Color(.systemGroupedBackground).ignoresSafeArea())
    }
}

struct RootView: View {
    var body: some View {
        TabView {
            NavigationStack { HomeView() }.tabItem { Label("Inicio", systemImage: "house.fill") }
            NavigationStack { DepositView() }.tabItem { Label("Depositar", systemImage: "plus.circle.fill") }
            NavigationStack { SendView() }.tabItem { Label("Enviar", systemImage: "paperplane.fill") }
            NavigationStack { NotificationsView() }.tabItem { Label("Avisos", systemImage: "bell.fill") }
            NavigationStack { ProfileView() }.tabItem { Label("Perfil", systemImage: "person.crop.circle.fill") }
        }.tint(brandBlue)
    }
}

struct HomeView: View {
    @EnvironmentObject var session: AppSession
    @State private var cardAppeared = false
    private var account: Account? { session.accountData?.account }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 16) {
                    HStack { Image("BrandMark").resizable().scaledToFit().frame(width: 40, height: 40); Text("HispaniolaPay").font(.headline); Spacer(); Button { Task { await session.synchronize(showAnimation: true) } } label: { Image(systemName: "arrow.clockwise") } }
                    Text("Hola, \(account?.name.split(separator: " ").first.map(String.init) ?? "Cliente")").font(.title.bold())
                    Text("Saldo disponible").font(.caption.weight(.bold)).foregroundStyle(.white.opacity(0.75))
                    Text(walletMoney(walletBalance(account), account: account)).font(.system(size: 38, weight: .black, design: .rounded))
                    HStack { Label("Sincronizado ahora", systemImage: "checkmark.circle.fill"); Spacer(); Text("Ahorro: \(walletMoney(walletSavings(account), account: account))") }.font(.caption.weight(.semibold))
                }.padding(22).foregroundStyle(.white).background(LinearGradient(colors: [navy, brandBlue], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 28)).shadow(color: brandBlue.opacity(0.2), radius: 14, y: 8).scaleEffect(cardAppeared ? 1 : 0.96).offset(y: cardAppeared ? 0 : 14).opacity(cardAppeared ? 1 : 0)

                if let rate = account?.benefitRatePercent, rate > 0 { Label("Beneficio acumulado RD$ \((account?.benefitAccruedDOP ?? 0), specifier: "%.2f") · \(rate, specifier: "%.2f")%", systemImage: "gift.fill").font(.subheadline.bold()).foregroundStyle(.orange).padding(15).frame(maxWidth: .infinity, alignment: .leading).background(Color.orange.opacity(0.1), in: RoundedRectangle(cornerRadius: 17)) }

                Text("Actividad reciente").font(.title3.bold())
                if session.accountData?.movements.isEmpty != false { EmptyCard(icon: "arrow.left.arrow.right", title: "Sin movimientos", detail: "Tus depósitos y remesas aparecerán aquí.") }
                ForEach((session.accountData?.movements ?? []).prefix(8)) { item in MovementRow(item: item) }
            }.padding()
        }.navigationBarHidden(true).refreshable { await session.synchronize() }.onAppear { withAnimation(.spring(response: 0.55, dampingFraction: 0.82)) { cardAppeared = true } }
    }
}

struct MovementRow: View {
    let item: WalletMovement
    var body: some View {
        HStack(spacing: 13) {
            Image(systemName: item.direction == "in" ? "arrow.down.left" : "arrow.up.right").font(.headline).foregroundStyle(item.direction == "in" ? .green : brandBlue).frame(width: 42, height: 42).background((item.direction == "in" ? Color.green : brandBlue).opacity(0.12), in: Circle())
            VStack(alignment: .leading, spacing: 3) { Text(item.title).font(.subheadline.bold()); Text(item.description).font(.caption).foregroundStyle(.secondary).lineLimit(1) }
            Spacer()
            Text("\(item.direction == "in" ? "+" : "−")\((item.amount ?? item.amountUSD).formatted(.currency(code: item.currency == "DOP" ? "DOP" : "USD")))").font(.subheadline.bold()).foregroundStyle(item.direction == "in" ? .green : .primary)
        }.padding(14).background(.background, in: RoundedRectangle(cornerRadius: 17)).overlay(RoundedRectangle(cornerRadius: 17).stroke(Color(.separator).opacity(0.25)))
    }
}

struct DepositView: View {
    @EnvironmentObject var session: AppSession
    @State private var selected = ""
    @State private var amount = ""
    @State private var reference = ""
    @State private var success = false
    private var methods: [DepositMethod] { session.depositData?.methods.filter(\.enabled) ?? [] }
    private var method: DepositMethod? { methods.first(where: { $0.id == selected }) ?? methods.first }

    var body: some View {
        Form {
            Section { Label("El 100% del depósito validado se acredita a tu billetera.", systemImage: "checkmark.shield.fill").foregroundStyle(.green) } header: { Text("Comisión 0%") }
            Section("Método autorizado") {
                Picker("Método", selection: $selected) { ForEach(methods) { Text("\($0.label) · \($0.currency)").tag($0.id) } }
                if let method { VStack(alignment: .leading, spacing: 7) { Text(method.recipient).font(.headline); Text(method.account).font(.system(.body, design: .monospaced)).textSelection(.enabled); Text(method.detail).font(.caption); Text(method.instructions).font(.caption).foregroundStyle(.secondary) }.padding(.vertical, 5) }
            }
            Section("Reportar depósito") {
                TextField("Monto", text: $amount).keyboardType(.decimalPad)
                TextField("Referencia o comprobante", text: $reference).textInputAutocapitalization(.characters)
                Button("Enviar para validar") { guard let method, let value = Double(amount), value > 0 else { return }; Task { success = await session.submitDeposit(methodId: method.id, amount: value, reference: reference); if success { amount = ""; reference = "" } } }.disabled(method == nil || reference.count < 4)
            }
            Section("Depósitos recientes") { ForEach(session.depositData?.deposits ?? []) { item in HStack { VStack(alignment: .leading) { Text(item.methodLabel).font(.subheadline.bold()); Text("\(item.amount, specifier: "%.2f") \(item.currency) · \(item.reference)").font(.caption).foregroundStyle(.secondary) }; Spacer(); StatusBadge(status: item.status) } } }
        }.navigationTitle("Depositar").onAppear { if selected.isEmpty { selected = methods.first?.id ?? "" } }.alert("Depósito recibido", isPresented: $success) { Button("Aceptar") {} } message: { Text("Quedó pendiente de validación. Te notificaremos al acreditar el saldo.") }
    }
}

struct SendView: View {
    @EnvironmentObject var session: AppSession
    @State private var selectedOperator = "NatCash"
    @State private var name = ""
    @State private var phone = ""
    @State private var amount = ""
    @State private var success = false
    private var value: Double { Double(amount) ?? 0 }
    private var fee: Double { value * (session.accountData?.rates.remittanceFeePercent ?? 0) / 100 }
    private var account: Account? { session.accountData?.account }
    private var valueUSD: Double { walletCurrency(account) == "DOP" ? value / (session.accountData?.rates.dopPerUsd ?? 58.5) : value }
    private var htg: Double { max(0, valueUSD - valueUSD * (session.accountData?.rates.remittanceFeePercent ?? 0) / 100) * (session.accountData?.rates.htgPerUsd ?? 0) }

    var body: some View {
        Form {
            Section { HStack { Text("Disponible"); Spacer(); Text(walletMoney(walletBalance(account), account: account)).font(.headline).foregroundStyle(brandBlue) } }
            Section("Destino") { Picker("Operador", selection: $selectedOperator) { Text("NatCash").tag("NatCash"); Text("MonCash").tag("MonCash") }.pickerStyle(.segmented); TextField("Nombre del destinatario", text: $name); TextField("Número de Haití", text: $phone).keyboardType(.phonePad); TextField("Monto total \(walletCurrency(account))", text: $amount).keyboardType(.decimalPad) }
            Section("Resumen") { LabeledContent("Tarifa incluida", value: walletMoney(fee, account: account)); LabeledContent("Recibe", value: "\(htg, specifier: "%.2f") HTG") }
            Button("Enviar remesa") { Task { success = await session.send(operatorName: selectedOperator, recipientName: name, phone: phone, amount: value); if success { name = ""; phone = ""; amount = "" } } }.disabled(name.count < 3 || phone.filter(\.isNumber).count < 8 || value < 1 || value > walletBalance(account))
        }.navigationTitle("Enviar a Haití").alert("Remesa procesada", isPresented: $success) { Button("Aceptar") {} } message: { Text("El saldo fue actualizado en todos tus dispositivos.") }
    }
}

struct NotificationsView: View {
    @EnvironmentObject var session: AppSession
    var body: some View {
        List {
            if session.notificationData?.notifications.isEmpty != false { EmptyCard(icon: "bell.slash", title: "Todo al día", detail: "Aquí recibirás avisos de depósitos y remesas.") }
            ForEach(session.notificationData?.notifications ?? []) { item in VStack(alignment: .leading, spacing: 6) { HStack { Text(item.title).font(.headline); Spacer(); if !item.read { Circle().fill(brandBlue).frame(width: 8, height: 8) } }; Text(item.body).font(.subheadline).foregroundStyle(.secondary); Text(item.createdAt ?? "").font(.caption2).foregroundStyle(.tertiary) }.padding(.vertical, 6) }
        }.navigationTitle("Notificaciones").refreshable { await session.synchronize() }
    }
}

struct ProfileView: View {
    @EnvironmentObject var session: AppSession
    @AppStorage("appearance") private var appearance = "system"
    @State private var name = ""; @State private var phone = ""; @State private var idNumber = ""; @State private var country = "DO"; @State private var saved = false
    var body: some View {
        Form {
            Section { HStack(spacing: 14) { Image("BrandMark").resizable().scaledToFit().frame(width: 62, height: 62); VStack(alignment: .leading) { Text(session.accountData?.account.name ?? "Cliente").font(.headline); Text(session.accountData?.account.email ?? "").font(.caption).foregroundStyle(.secondary); Text(session.accountData?.account.clientCode ?? "").font(.caption.monospaced()).foregroundStyle(brandBlue) } } }
            Section("Billetera") { LabeledContent("Moneda principal", value: walletCurrency(session.accountData?.account)); if let rate = session.accountData?.account.benefitRatePercent, rate > 0 { LabeledContent("Beneficio acumulado", value: "RD$ \((session.accountData?.account.benefitAccruedDOP ?? 0), specifier: "%.2f")"); LabeledContent("Tasa de beneficio", value: "\(rate, specifier: "%.2f")%") } }
            Section("Editar perfil") { TextField("Nombre completo", text: $name); TextField("Teléfono", text: $phone).keyboardType(.phonePad); TextField("Cédula o pasaporte", text: $idNumber); Picker("País", selection: $country) { Text("República Dominicana").tag("DO"); Text("Haití").tag("HT"); Text("Estados Unidos").tag("US") }; Button("Guardar perfil") { Task { saved = await session.saveProfile(name: name, phone: phone, idNumber: idNumber, country: country) } }.disabled(name.count < 2) }
            Section("Apariencia") {
                Picker("Tema", selection: $appearance) { Text("Automático").tag("system"); Text("Claro").tag("light"); Text("Oscuro").tag("dark") }.pickerStyle(.segmented)
                Label("El modo automático sigue la configuración del iPhone.", systemImage: "circle.lefthalf.filled").font(.caption).foregroundStyle(.secondary)
            }
            Section { Button("Cerrar sesión", role: .destructive) { session.logout() } }
        }.navigationTitle("Mi perfil").onAppear { if let account = session.accountData?.account { name = account.name; phone = account.phone; idNumber = account.idNumber; country = account.country } }.alert("Perfil actualizado", isPresented: $saved) { Button("Aceptar") {} }
    }
}

struct StatusBadge: View {
    let status: String
    var body: some View { Text(status == "completed" ? "Acreditado" : status == "rejected" ? "Rechazado" : "Pendiente").font(.caption2.bold()).padding(.horizontal, 9).padding(.vertical, 5).background((status == "completed" ? Color.green : status == "rejected" ? Color.red : Color.orange).opacity(0.13), in: Capsule()).foregroundStyle(status == "completed" ? .green : status == "rejected" ? .red : .orange) }
}

struct EmptyCard: View {
    let icon: String; let title: String; let detail: String
    var body: some View { VStack(spacing: 8) { Image(systemName: icon).font(.title).foregroundStyle(.secondary); Text(title).font(.headline); Text(detail).font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center) }.frame(maxWidth: .infinity).padding(28) }
}
