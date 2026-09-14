# HispaniolaPay - Plataforma Binacional de Remesas y Pagos

Plataforma integral de transferencias y pagos binacionales (República Dominicana y Haití), con integración a bancos dominicanos (Banreservas, Banco BHD, Banco Popular), billeteras móviles en Haití (MonCash, NatCash), servicios BenCash Group y API B2B independiente para socios comerciales.

---

## 📦 Guía de Compilación desde Archivo ZIP

Si has descargado este proyecto como archivo `.zip` desde Google AI Studio:

### 1. Requisitos Previos
- **Node.js**: Versión `20.x` o superior (Recomendado: Node.js 20 LTS o 22 LTS).
- **npm**: Versión `10.x` o superior.

### 2. Pasos de Instalación y Compilación
1. Descomprime el archivo `.zip` en una carpeta de tu preferencia.
2. Abre una terminal dentro de la carpeta raíz del proyecto.
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Compila el proyecto para producción:
   ```bash
   npm run build
   ```
5. Inicia la aplicación en producción:
   ```bash
   npm start
   ```
   La aplicación estará disponible en `http://localhost:3000`.

Para ejecutar en modo desarrollo con recarga en vivo:
```bash
npm run dev
```

---

## 🚀 Guía de Despliegue con GitHub y CI/CD

Si conectas este repositorio a **GitHub** para despliegues automáticos (Firebase App Hosting, Google Cloud Build, Vercel o Cloud Run):

### 1. Inicialización y Push a GitHub
```bash
# Si aún no has inicializado el repositorio Git local:
git init
git add .
git commit -m "feat: initial commit of HispaniolaPay"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### 2. Compatibilidad Multiplataforma (.npmrc)
El proyecto ya incluye un archivo `.npmrc` preconfigurado en la raíz:
- Garantiza la descarga y preservación de dependencias nativas opcionales (`@next/swc`, `@tailwindcss/oxide`, `lightningcss`, `sharp`) para servidores Linux (Ubuntu/Debian) y entornos locales (macOS/Windows).
- Evita el error `npm error code EUSAGE` durante la fase de `npm ci` en Google Cloud Build / Firebase App Hosting.

### 3. Variables de Entorno
Copia la plantilla `.env.example` a `.env.local` si deseas configurar servicios externos opcionales:
```bash
cp .env.example .env.local
```
- `GEMINI_API_KEY`: Clave de Google AI Studio / Gemini API.
- `BENCASH_BASE_URL` y `BENCASH_PRIVATE_KEY`: Credenciales opcionales de BenCash Group.
- `WHATSAPP_API_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID`: Credenciales opcionales de Meta Cloud API para notificaciones.

---

## 🛠️ Scripts Disponibles en `package.json`

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo en el puerto 3000 |
| `npm run build` | Compila la aplicación Next.js en modo producción (`standalone`) |
| `npm start` | Inicia el servidor de producción compilado |
| `npm run lint` | Ejecuta ESLint para validar sintaxis y reglas de código |

