# 🧾 FinanzAI Hub

Sistema de gestión fiscal inteligente para empresas mexicanas con OCR mediante IA (Claude), base de datos en tiempo real (Supabase), y despliegue en Netlify.

![FinanzAI Hub](https://img.shields.io/badge/version-2.0.0-blue)
![React](https://img.shields.io/badge/React-18.3-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E)

## ✨ Características

- 🔐 **Autenticación real** con Supabase Auth (registro, login, recuperación)
- 👥 **Control de usuarios** con roles (admin, editor, viewer)
- 📄 **Carga de facturas CFDI** con extracción automática por IA (Claude)
- 📦 **Gestión de remisiones** y notas de venta
- 🏢 **Catálogo de proveedores** con saldos en tiempo real
- 💾 **Almacenamiento de comprobantes** con descarga individual
- 🚫 **Detección de duplicados** por UUID, RFC+Folio, o combinación
- 🤖 **Chatbot financiero** que responde consultas sobre tus documentos
- 📊 **Exportación a Excel** con resumen y estadísticas

## 🚀 Despliegue Rápido

### Paso 1: Configurar Supabase (Base de Datos)

1. **Crear cuenta en Supabase**: https://supabase.com
2. **Crear nuevo proyecto** (elige la región más cercana a México)
3. **Ejecutar el esquema SQL**:
   - Ve a **SQL Editor** en el dashboard de Supabase
   - Copia y pega el contenido de `supabase-schema.sql`
   - Ejecuta el script
4. **Obtener credenciales**:
   - Ve a **Settings > API**
   - Copia `Project URL` y `anon public key`

### Paso 2: Configurar Anthropic (IA Claude)

1. **Obtener API Key**: https://console.anthropic.com/
2. Guarda tu API Key de forma segura

### Paso 3: Desplegar en Netlify

1. **Crear cuenta en Netlify**: https://netlify.com
2. **Conectar repositorio** o subir el proyecto manualmente
3. **Configurar variables de entorno** en Netlify:
   - Ve a **Site Settings > Environment Variables**
   - Agrega las siguientes variables:

   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
   ```

4. **Desplegar**:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

### Paso 4: Configurar Supabase Storage

1. En Supabase, ve a **Storage**
2. El bucket `invoices` debería crearse automáticamente con el SQL
3. Si no existe, créalo manualmente con acceso público

## 📁 Estructura del Proyecto

```
finanzai-hub/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Login.tsx        # Autenticación
│   │   ├── Sidebar.tsx      # Navegación
│   │   ├── InvoiceDashboard.tsx
│   │   ├── RemissionDashboard.tsx
│   │   ├── SupplierDatabase.tsx
│   │   ├── ChatBot.tsx      # Asistente IA
│   │   ├── AdminPanel.tsx   # Gestión de usuarios
│   │   └── FileUploader.tsx # Carga con OCR
│   ├── services/
│   │   ├── authService.ts   # Autenticación
│   │   ├── invoiceService.ts # Facturas + Storage
│   │   └── aiService.ts     # Claude API
│   ├── lib/
│   │   └── supabase.ts      # Cliente Supabase
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── netlify/
│   └── functions/
│       └── claude-api.mjs   # Serverless function
├── supabase-schema.sql      # Esquema de BD
├── netlify.toml
├── package.json
└── README.md
```

## 🔧 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Crear archivo .env con tus credenciales
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev
```

## 💰 Costos Estimados

| Servicio | Plan Gratuito | Notas |
|----------|--------------|-------|
| **Supabase** | 500MB DB, 1GB Storage, 50,000 auth | Suficiente para empezar |
| **Anthropic Claude** | No gratuito | ~$0.003/1K tokens input, ~$0.015/1K output |
| **Netlify** | 100GB bandwidth, 300 min build | Tier gratuito muy generoso |

**Estimación mensual para uso moderado (100 facturas/mes)**: ~$5-10 USD en Claude API

## 🔒 Seguridad

- ✅ Row Level Security (RLS) en todas las tablas
- ✅ API Keys solo en backend (Netlify Functions)
- ✅ Autenticación via JWT con Supabase
- ✅ Archivos almacenados con URLs seguras

## 📝 Uso del Chatbot

El asistente puede responder preguntas como:

- *"¿Se entregó el pedido con código ABC123?"*
- *"¿Cuánto le debo al proveedor X?"*
- *"¿Qué facturas están pendientes de pago?"*
- *"Muéstrame las facturas de enero"*
- *"¿Cuántas unidades de [producto] compramos?"*

## 🤝 Soporte

Para problemas o preguntas:
1. Revisa la documentación de [Supabase](https://supabase.com/docs)
2. Consulta la [API de Anthropic](https://docs.anthropic.com/)
3. Lee la guía de [Netlify Functions](https://docs.netlify.com/functions/overview/)

---

Desarrollado con 💜 para empresas mexicanas
