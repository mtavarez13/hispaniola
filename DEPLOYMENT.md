# Despliegue de HispaniolaPay en Firebase App Hosting

## Plataforma elegida

Este proyecto es una aplicacion **Next.js full-stack**: incluye rutas `src/app/api/**`, renderizado dinamico y claves que solo deben existir en el servidor. Por ello se debe publicar en **Firebase App Hosting**, no en Firebase Hosting clasico.

## Bloqueadores de seguridad antes de publicar

No cree un backend publico todavia. La revision inicial encontro estos problemas criticos:

1. `firestore.rules` permite leer y escribir toda la base de datos a cualquier visitante (`if true`).
2. Las rutas administrativas de socios no comprueban una sesion ni un rol de administrador.
3. `GET /api/bencash/config` entrega la clave privada de BenCash en la respuesta.
4. El cliente permite crear sesiones sinteticas locales y deriva el rol `admin` desde el correo. Eso no es una identidad verificable para produccion.

Las reglas de Firestore no deben endurecerse de forma aislada: la aplicacion escribe datos sensibles directamente desde el navegador. Primero hay que mover las operaciones privilegiadas a rutas de servidor que verifiquen Firebase Auth y roles asignados con custom claims.

## Preparacion completada

- `package.json` fija Node.js 22 para las compilaciones.
- `apphosting.yaml` declara los secretos de Gemini, BenCash y WhatsApp mediante Cloud Secret Manager.
- Las credenciales no se incluyen en el repositorio.

## Pasos para el despliegue, cuando se corrijan los bloqueadores

1. Instale Node.js 22 y Firebase CLI en una maquina con acceso a su cuenta de Firebase.
2. Desde la raiz del proyecto, ejecute `npm ci` y `npm run build`.
3. Inicie sesion con `firebase login` y seleccione el proyecto `studio-4779362907-870c5` (o un proyecto de produccion separado).
4. Cree los secretos indicados en `apphosting.yaml` con `firebase apphosting:secrets:set NOMBRE`.
5. Cree el backend de App Hosting, conectelo a un repositorio GitHub y elija la rama de produccion. App Hosting requiere un proyecto con facturacion Blaze.
6. Tras el primer rollout, valide autenticacion, permisos de Firestore, rutas API, y las integraciones de BenCash/WhatsApp antes de abrir el dominio al publico.

## Recomendacion de entornos

Use dos proyectos Firebase distintos: uno de pruebas (con las APIs sandbox) y uno de produccion. No reutilice el proyecto de Studio ni sus datos para transacciones reales.
