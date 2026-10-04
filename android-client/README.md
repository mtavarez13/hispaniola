# Hispaniola Pay Android

Cliente Android nativo de Hispaniola Pay, desarrollado con Java y las APIs nativas de Android. No utiliza WebView para mostrar el portal web.

## Módulos nativos

- Inicio y navegación de la app.
- Billetera principal y bolsillo de ahorro.
- Movimientos y recargas por sub-agente o transferencia bancaria RD.
- Formularios para envíos a MonCash y NatCash.
- Perfil y punto de integración para Firebase Auth y Firestore.

Los saldos, credenciales y operaciones financieras no se guardan ni se descuentan localmente. Las pantallas de envío quedan en estado pendiente hasta que el backend transaccional y Firebase estén conectados.

## Abrir en Android Studio

1. Abra Android Studio y elija **Open**.
2. Seleccione esta carpeta: `android-client`.
3. Espere la sincronización de Gradle 9.3.1.
4. Seleccione un emulador o teléfono Android con API 26 o superior y presione **Run**.

El proyecto contiene `gradlew.bat`, por lo que Android Studio puede sincronizarlo como un proyecto Gradle estándar. Para compilar desde la terminal de Windows:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat :app:assembleDebug
```

Para una publicación en Google Play se debe generar una clave de producción propia y un Android App Bundle (`.aab`); el APK de pruebas usa la firma de desarrollo.
