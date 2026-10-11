package com.hispaniolapay.mobile;

import java.util.HashMap;
import java.util.Map;

/** Textos visibles del cliente móvil. Español es el idioma base. */
final class Translations {
    private static final Map<String, String> EN = new HashMap<>();
    private static final Map<String, String> HT = new HashMap<>();

    static {
        add("Tu billetera entre RD y Haití", "Your wallet between DR and Haiti", "Bous ou ant RD ak Ayiti");
        add("Accede a tu cuenta", "Sign in to your account", "Konekte sou kont ou");
        add("Consulta tu saldo y envía remesas en tiempo real.", "Check your balance and send money in real time.", "Tcheke balans ou epi voye lajan an tan reyèl.");
        add("Correo electrónico", "Email address", "Imèl");
        add("Contraseña", "Password", "Modpas");
        add("Iniciar sesión", "Sign in", "Konekte");
        add("Conectando…", "Connecting…", "Ap konekte…");
        add("G   Continuar con Google", "G   Continue with Google", "G   Kontinye ak Google");
        add("Escribe tu correo y contraseña.", "Enter your email and password.", "Antre imèl ou ak modpas ou.");
        add("Inicio", "Home", "Akèy");
        add("Billetera", "Wallet", "Bous");
        add("Depositar", "Deposit", "Depoze");
        add("Enviar", "Send", "Voye");
        add("Perfil", "Profile", "Pwofil");
        add("Acciones rápidas", "Quick actions", "Aksyon rapid");
        add("Actividad reciente", "Recent activity", "Aktivite resan");
        add("Tu dinero listo para cruzar fronteras", "Your money ready to cross borders", "Lajan ou pare pou travèse fwontyè");
        add("SALDO DISPONIBLE", "AVAILABLE BALANCE", "BALANS DISPONIB");
        add("● Sincronizado ahora  ·  Disponible para remesas", "● Synced now  ·  Available for transfers", "● Senkronize kounye a  ·  Disponib pou transfè");
        add("Transferir saldo", "Transfer balance", "Transfere balans");
        add("Depositar en billetera", "Deposit to wallet", "Depoze nan bous");
        add("Mi billetera", "My wallet", "Bous mwen");
        add("BOLSILLO DE AHORRO", "SAVINGS POCKET", "PÒCH EPAY");
        add("Fondos separados de tu saldo para envíos", "Funds separated from your sending balance", "Lajan separe ak balans pou voye a");
        add("+ Depositar sin comisión", "+ Deposit with no fee", "+ Depoze san frè");
        add("⇄ Transferir a cliente o subagente", "⇄ Transfer to a customer or sub-agent", "⇄ Transfere bay kliyan oswa sou-ajan");
        add("Equivalencias", "Currency equivalents", "Ekivalans lajan");
        add("Movimientos y remesas", "Transactions and remittances", "Mouvman ak transfè");
        add("Enviar a Haití", "Send to Haiti", "Voye ann Ayiti");
        add("Transferir saldo", "Transfer balance", "Transfere balans");
        add("Entre clientes y subagentes HispaniolaPay", "Between HispaniolaPay customers and sub-agents", "Ant kliyan ak sou-ajan HispaniolaPay");
        add("Código o correo del destinatario", "Recipient code or email", "Kòd oswa imèl moun k ap resevwa a");
        add("Revisar transferencia", "Review transfer", "Revize transfè a");
        add("Saldo insuficiente", "Insufficient balance", "Balans pa sifi");
        add("Revisa los datos", "Check the information", "Tcheke enfòmasyon yo");
        add("Mi perfil", "My profile", "Pwofil mwen");
        add("Datos vinculados a tu cuenta", "Information linked to your account", "Enfòmasyon ki lye ak kont ou");
        add("Editar información", "Edit information", "Modifye enfòmasyon");
        add("Nombre completo", "Full name", "Non konplè");
        add("Teléfono / WhatsApp", "Phone / WhatsApp", "Telefòn / WhatsApp");
        add("Cédula o pasaporte", "ID or passport", "Kat idantite oswa paspò");
        add("Guardar perfil", "Save profile", "Sove pwofil");
        add("Guardando…", "Saving…", "Ap sove…");
        add("Perfil actualizado correctamente.", "Profile updated successfully.", "Pwofil la mete ajou avèk siksè.");
        add("Apariencia", "Appearance", "Aparans");
        add("Claro", "Light", "Klè");
        add("Oscuro", "Dark", "Fènwa");
        add("Automático", "Automatic", "Otomatik");
        add("Idioma", "Language", "Lang");
        add("Español", "Spanish", "Panyòl");
        add("Inglés", "English", "Angle");
        add("Criollo haitiano", "Haitian Creole", "Kreyòl ayisyen");
        add("Cobrar con HispaniolaPay", "Get paid with HispaniolaPay", "Resevwa lajan ak HispaniolaPay");
        add("Mi código de cliente", "My customer code", "Kòd kliyan mwen");
        add("Copiar código", "Copy code", "Kopye kòd");
        add("Copiar enlace", "Copy link", "Kopye lyen");
        add("Compartir", "Share", "Pataje");
        add("Código copiado", "Code copied", "Kòd la kopye");
        add("Enlace copiado", "Link copied", "Lyen an kopye");
        add("Escanea para pagarme", "Scan to pay me", "Eskane pou peye mwen");
        add("Puedes enviarme saldo en HispaniolaPay usando mi código", "You can send me funds on HispaniolaPay using my code", "Ou ka voye lajan ban mwen sou HispaniolaPay avèk kòd mwen");
        add("Comparte tu QR, enlace o código para recibir saldo de otro usuario HispaniolaPay.", "Share your QR, link or code to receive funds from another HispaniolaPay user.", "Pataje QR, lyen oswa kòd ou pou resevwa lajan nan men yon lòt itilizatè HispaniolaPay.");
        add("Actualizar información", "Refresh information", "Rafrechi enfòmasyon");
        add("Cerrar sesión", "Sign out", "Dekonekte");
        add("Cancelar", "Cancel", "Anile");
        add("Salir", "Sign out", "Soti");
        add("Entendido", "Got it", "Dakò");
        add("Seguridad", "Security", "Sekirite");
        add("Todo al día", "You're all caught up", "Tout bagay ajou");
        add("Notificaciones", "Notifications", "Notifikasyon");
        add("Historial", "History", "Istwa");
        add("COMPLETADA", "COMPLETED", "FINI");
        add("RECHAZADA", "REJECTED", "REFIZE");
        add("EN REVISIÓN", "UNDER REVIEW", "AN REVIZYON");
        add("PROCESANDO", "PROCESSING", "AP TRETE");
        add("PENDIENTE", "PENDING", "ANNATANT");
    }

    private static void add(String es, String en, String ht) {
        EN.put(es, en);
        HT.put(es, ht);
    }

    static String get(String language, String source) {
        if (source == null || "es".equals(language)) return source;
        String translated = ("ht".equals(language) ? HT : EN).get(source);
        return translated == null ? source : translated;
    }

    private Translations() { }
}
