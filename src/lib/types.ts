export type UserRole = 'admin' | 'agent' | 'customer';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  country: string;
  walletBalance: number; // Saldo disponible para envíos (USD)
  savingsBalance?: number; // Billetera con ahorro / Bolsillo protegido (USD)
  walletBalanceDOP?: number; // Saldo equivalente o local en DOP
  phone?: string;
  idNumber?: string; // Cédula o Pasaporte
  clientCode?: string; // Código único de cliente para depósitos en sub-agentes (e.g. CLI-8942)
}

export interface ClientDepositRecord {
  id: string; // e.g. "DEP-8921"
  clientId: string;
  clientName: string;
  clientCode: string;
  clientPhone?: string;
  amount: number; // Monto entregado por el cliente
  currency: 'USD' | 'DOP';
  amountCreditedUSD: number; // Monto neto acreditado a la billetera en USD
  method: 'sub_agent' | 'bank_transfer';
  subAgentId?: string; // SA-101, etc.
  subAgentName?: string;
  subAgentLocation?: string;
  bankName?: 'Banreservas' | 'Banco BHD' | 'Banco Popular';
  bankReference?: string;
  targetPocket: 'main' | 'savings'; // Billetera principal o ahorro
  status: 'completed' | 'pending' | 'rejected';
  voucherCode: string;
  notes?: string;
  createdAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

export interface ClientWalletMovement {
  id: string; // e.g. "MOV-1029"
  clientId: string;
  type: 'deposit_sub_agent' | 'deposit_bank' | 'transfer_to_savings' | 'withdraw_from_savings' | 'remittance_moncash' | 'remittance_natcash';
  title: string;
  description: string;
  amountUSD: number;
  direction: 'in' | 'out' | 'transfer';
  targetPocket: 'main' | 'savings';
  date: string;
  referenceId?: string;
  recipient?: string;
  status: 'completed' | 'pending' | 'failed';
  receiptCode?: string;
}

export type TransactionStatus = 'pending' | 'paid' | 'cancelled';

export interface Transaction {
  id: string;
  senderId: string;
  senderName: string;
  receiverName: string;
  receiverPhone: string;
  receiverPassport: string; // Documento de identidad para seguridad
  amountSent: number; // in USD
  feeAmount: number; // 5% fee
  agentReceptorFee: number; // 1.50 local fixed
  agentPagadorFee: number; // 2% of amount paid
  amountAfterFee: number; // amountSent - feeAmount
  amountReceived: number; // amountAfterFee * exchangeRate
  status: TransactionStatus;
  originCountry: string;
  destinationCountry: string;
  exchangeRate: number;
  withdrawCode: string;
  createdAt: Date;
}

export interface ExchangeRate {
  country: string;
  currency: string;
  rate: number; // 1 USD to X
}

export interface HaitiDepositTransaction {
  id: string;
  requestId: number | string;
  txId: string;
  transactionId?: string;
  operator: 'MonCash' | 'NatCash';
  toAccountNumber: string; // 509XXXXXXXX
  recipientName: string;
  recipientAccountId?: string;
  amountUSD: number;
  amountHTG: number;
  feeHTG: number;
  totalAmountHTG: number;
  content: string;
  verifyCode?: string;
  status: 'initialized' | 'confirmed' | 'cancelled' | 'failed' | 'pending';
  senderName: string;
  senderPhone?: string;
  timestamp: number;
  isSandbox?: boolean;
  createdAt: string;

  // Norma General de Tasas y Reparto de Beneficios
  feePercent?: number; // e.g. 8.0% cobrado al público
  feeUSD?: number; // Monto en USD del fee cobrado
  bencashFeePercent?: number; // e.g. 3.0%
  bencashFeeUSD?: number; // Monto para BenCash API
  subAgentFeePercent?: number; // e.g. 2.0%
  subAgentFeeUSD?: number; // Monto para el Sub-Agente
  subAgentId?: string; // ID del Sub-Agente originador (e.g. SA-101)
  subAgentName?: string; // Nombre del Sub-Agente
  hispaniolaProfitPercent?: number; // e.g. 3.0%
  hispaniolaProfitUSD?: number; // Margen neto para Hispaniola Pay
}

export interface BenCashConfig {
  baseUrl: string;
  privateKeyMasked?: string;
  moncashEnabled: boolean;
  natcashEnabled: boolean;
  sandboxMode: boolean;
  defaultVerifyCode: string;
}

export interface OfficialBankAccount {
  id: string;
  bankName: string; // e.g. "Banco de Reservas (Banreservas)", "Banco BHD", "Banco Popular"
  accountNumber: string; // e.g. "960-2481029-3"
  accountType: 'corriente' | 'ahorros';
  currency: 'DOP' | 'USD';
  holderName: string; // e.g. "Hispaniola Pay SRL"
  documentId: string; // e.g. "RNC: 1-32-84910-2"
  instructions?: string;
  active: boolean;
  logoColor?: string;
}

export interface GmailBankTransfer {
  id: string; // Unique ID
  gmailMessageId?: string;
  bank: 'Banreservas' | 'Banco BHD' | 'Banco Popular' | 'Otro Banco RD';
  senderName: string; // Persona que realizó la transferencia/depósito
  senderAccount?: string; // Número de cuenta origen (enmascarado)
  destinationAccount?: string; // Cuenta destino oficial
  referenceNumber: string; // No. de referencia o comprobante bancario
  amountDOP: number; // Monto recibido en pesos dominicanos
  amountUSD: number; // Equivalente en USD calculado
  amountHTG?: number; // Payout estimado en Gourdes para Haití
  status: 'pending_approval' | 'approved' | 'rejected' | 'dispatched';
  detectedAt: string; // ISO date del correo
  emailSubject: string;
  emailSnippet: string;
  memoOrConcept?: string;
  recipientName?: string; // Nombre del destinatario en Haití para el envío
  recipientPhone?: string; // Número MonCash/Natcash (509...)
  operator?: 'MonCash' | 'NatCash';
  approvedByAdminEmail?: string;
  approvedAt?: string;
  dispatchedTxId?: string;
  rawSenderEmail?: string;
  notes?: string;
}

export interface SystemSettings {
  // Public Rates (Tasa a todo público)
  publicRateDOP: number; // e.g. 58.50
  publicRateHTG: number; // e.g. 132.20
  publicRateUSD: number; // 1.00

  // Norma General de Tasas y Reparto de Beneficios (Envíos a Haití)
  haitiPublicFeePercent?: number; // e.g. 8.0% (Tasa fijada por admin al público general para Haití)
  haitiBencashSharePercent?: number; // e.g. 3.0% (Beneficio / Costo de BenCash API)
  haitiSubAgentSharePercent?: number; // e.g. 2.0% (Beneficio para Sub-Agente afiliado)
  haitiHispaniolaSharePercent?: number; // e.g. 3.0% (Margen de beneficios para Hispaniola Pay)

  // Agent Rates & Commissions (Tasa / Ganancia a ganar los agentes)
  agentRateDOP: number; // e.g. 59.20 (Wholesale / Agent Exchange Rate)
  agentRateHTG: number; // e.g. 133.80 (Wholesale / Agent Exchange Rate)
  agentReceptionFeeUSD: number; // e.g. 1.50 USD fixed commission per received transaction
  agentPayoutPercentage: number; // e.g. 2.0% commission of payout amount
  platformFeePercentage: number; // e.g. 5.0% platform fee

  // BenCash API Channel Integration for Haiti
  bencashBaseUrl?: string;
  bencashPrivateKey?: string;
  moncashActive?: boolean;
  natcashActive?: boolean;

  // WhatsApp Messaging API & Automation
  whatsappApiEnabled?: boolean;
  whatsappProvider?: 'cloud_api' | 'custom_gateway' | 'direct_web';
  whatsappApiToken?: string;
  whatsappPhoneNumberId?: string;
  whatsappBusinessAccountId?: string;
  whatsappGatewayUrl?: string;
  whatsappNotifySender?: boolean;
  whatsappNotifyRecipient?: boolean;
  whatsappNotifyInvoices?: boolean;
  whatsappSenderTemplate?: string;
  whatsappRecipientTemplate?: string;

  // Personalización de Logo y Marca (Admin)
  appLogoUrl?: string;
  appLogoText?: string;

  // Cuentas Oficiales de Bancos Dominicanos para Recibir Remesas
  officialBankAccounts?: OfficialBankAccount[];

  // Remesas y Cuentas desde Estados Unidos (Zelle, Cash App, PayPal)
  usRemittanceAccounts?: USRemittanceAccounts;

  // Sub-Agentes autorizados para la Página Principal (Editables por Admin)
  landingSubAgents?: LandingSubAgent[];

  updatedAt?: string;
  updatedBy?: string;
}

export interface LandingSubAgent {
  id: string | number;
  name: string;
  country: 'DO' | 'HT' | 'US';
  zone: string;
  address: string;
  phone: string;
  isHQ?: boolean;
  active?: boolean;
  services?: string;
  hours?: string;
}

export interface USRemittanceAccounts {
  zelleEmail: string;
  zellePhone: string;
  zelleHolder: string;
  cashAppTag: string;
  cashAppHolder: string;
  payPalEmail: string;
  payPalLink: string;
  instructions?: string;
  active: boolean;
}

export interface RateAuditLog {
  id?: string;
  timestamp: string;
  updatedBy: string;
  publicRateDOP: number;
  publicRateHTG: number;
  agentRateDOP: number;
  agentRateHTG: number;
  agentPayoutPercentage: number;
  agentReceptionFeeUSD: number;
  note?: string;
}

export interface QikInvoice {
  id: string;
  fechaHora: string;
  noReferencia: string;
  servicio: string;
  telefono: string;
  montoServicio: number;
  cargoServicio: number;
  totalPagado: number;
  moneda: string; // "RD$"
  empresaEmisora: string; // "HISPANIOLA PAY"
  telefonoEmisora: string; // "809-323-3535"
  direccionEmisora: string; // "Las Matas De Santa Cruz/ Duarte No.30"
  senderEmail?: string;
  emailId?: string;
  rawSnippet?: string;
  subject?: string;
  createdAt: string;
  status: 'completado' | 'pendiente' | 'anulado';
  createdByName?: string;
  agentId?: string;
  agentName?: string;
  deductedFromBalance?: boolean;
  balanceAfterPayment?: number;
}

export interface MasterQikPool {
  totalBalanceRD: number;
  allocatedBalanceRD: number;
  availableBalanceRD: number;
  updatedAt: string;
  updatedBy: string;
}

export interface QikAgentAccount {
  id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  location: string;
  allocatedBalanceRD: number;
  currentBalanceRD: number;
  totalSpentRD: number;
  invoicesCount: number;
  status: 'active' | 'inactive' | 'suspended';
  lastActivityAt?: string;
}

export interface QikBalanceTransaction {
  id: string;
  type: 'topup_master' | 'allocate_agent' | 'return_from_agent' | 'invoice_payment' | 'manual_adjustment';
  agentId?: string;
  agentName?: string;
  amountRD: number;
  previousBalanceRD: number;
  newBalanceRD: number;
  invoiceId?: string;
  noReferencia?: string;
  serviceName?: string;
  timestamp: string;
  performedBy: string;
  note?: string;
}

export interface SubAgentModules {
  haitiRemittances: boolean; // Remesas Haití MonCash / NatCash
  sendMoney: boolean; // Envíos de Dinero y Giros
  payouts: boolean; // Pago y Desembolso de Remesas
  qikInvoices: boolean; // Facturas y Pagos de Servicios Qik
  mobileTopups: boolean; // Recargas Móviles
  accounting: boolean; // Contabilidad y Arqueo de Caja
  reports: boolean; // Reportes y Métricas de Comisión
}

export interface SubAgentLocation {
  country: 'DO' | 'HT';
  province: string; // e.g. "Santo Domingo", "Santiago", "Ouest", "Nord"
  municipality: string; // e.g. "Santo Domingo Este", "Pétion-Ville", "Dajabón"
  exactAddress: string; // e.g. "Calle Duarte #45, Edif. Central, Local 2B"
  reference?: string; // e.g. "Frente al Parque Central"
  gps: {
    lat: number;
    lng: number;
    accuracy?: number;
    addressResolved?: string;
  };
}

export interface SubAgent {
  id: string; // e.g. "SA-101"
  name: string; // Nombre comercial / Negocio
  owner: string; // Nombre del responsable / Dueño
  idNumber: string; // Cédula, RNC o Pasaporte
  email: string; // Email de acceso / login
  password?: string; // Contraseña provisoria
  phone: string; // Teléfono / WhatsApp
  status: 'active' | 'inactive' | 'suspended';

  // Configuración Financiera y de Beneficios
  commissionRatePercent: number; // Tasa en % de beneficios (e.g. 2.5%)
  localCurrency: 'DOP' | 'HTG' | 'USD'; // Moneda local del subagente
  walletBalance: number; // Balance operativo actual en su moneda local
  creditLimit?: number; // Límite de crédito opcional

  // Ubicación y GPS
  location: SubAgentLocation;

  // Módulos autorizados para usar
  modules: SubAgentModules;

  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  notes?: string;
}



