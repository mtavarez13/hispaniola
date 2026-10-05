# Hispaniola Pay Android

Cliente Android nativo de Hispaniola Pay, desarrollado con Java y las APIs nativas de Android. No utiliza WebView.

## Módulos nativos

- Inicio de sesión real con Firebase Authentication.
- Billetera principal, bolsillo de ahorro y tasas sincronizadas.
- Envíos en tiempo real a MonCash y NatCash mediante API protegida.
- Reserva atómica de saldo, idempotencia y protección contra duplicados.
- Historial, estados y comprobantes de remesas.

Los saldos, las credenciales del proveedor y la contabilidad no se guardan en el dispositivo. El APK usa Firebase ID tokens y el backend valida saldo y ejecuta las operaciones.

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
