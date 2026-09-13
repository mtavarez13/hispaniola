# **App Name**: RemitFlow

## Core Features:

- Autenticación de Usuarios y Roles: Sistema de autenticación segura para usuarios (clientes, agentes, administradores) utilizando Firebase Auth, con gestión de roles almacenados en Firestore.
- Dashboard del Cliente y Envío de Remesas: Interfaz para que los clientes ingresen detalles del remitente y beneficiario, monto a enviar y visualicen automáticamente la comisión y el monto que recibirá el beneficiario.
- Cálculo Automático de Tarifas y Tasa de Cambio: Componente para calcular automáticamente el 5% de tarifa para el remitente y mostrar el monto al beneficiario basado en tasas de cambio en tiempo real (USD a DOP/HTG) de Firestore.
- Dashboard del Agente y Gestión de Pagos: Interfaz para que los agentes registren nuevas transacciones de envío y validen códigos de retiro para el pago a los beneficiarios.
- Gestión de Transacciones y Estados: Sistema para registrar, consultar y actualizar el estado de las transacciones (pendiente, pagado, cancelado) en Firestore, incluyendo detalles como ID, remitente, beneficiario, montos y tarifas.
- Seguridad con Reglas de Firestore: Implementación de Firestore Security Rules para asegurar que los agentes solo puedan ver y gestionar sus propias transacciones, mientras que los administradores tengan visibilidad de todas las operaciones.
- Actualización de Billeteras con Cloud Functions: Firebase Cloud Functions para procesar la finalización de transacciones, calcular automáticamente las comisiones de los agentes (receptor y pagador) y actualizar sus saldos de billetera en Firestore.

## Style Guidelines:

- Esquema de color claro. Color primario: un azul oscuro sofisticado (#334A8A) para transmitir fiabilidad y profesionalismo. Fondo: un azul grisáceo muy claro (#F2F5FB) para un aspecto limpio y calmado.
- Color de acento: Un cian vibrante (#2EB1C3) para resaltar elementos interactivos y llamadas a la acción, manteniendo un buen contraste y energía.
- Fuente de cuerpo y titular: 'Inter' (sans-serif) por su legibilidad, modernidad y neutralidad, ideal para aplicaciones financieras que requieren claridad en los datos.
- Utilizar un conjunto de iconos modernos y minimalistas, enfocados en la funcionalidad, que representen claramente las acciones de envío, recepción, monedero, seguridad y roles de usuario.
- Diseño adaptable y responsivo que garantice una experiencia óptima en dispositivos móviles y de escritorio, con una estructura de grid que facilite la organización y lectura de la información.
- Animaciones sutiles y fluidas para transiciones entre pantallas, carga de datos y confirmaciones de acciones, proporcionando retroalimentación visual al usuario sin ser intrusivas.