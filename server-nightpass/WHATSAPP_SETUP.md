# WhatsApp (Meta Cloud API) — dónde nos quedamos

Estado del montaje de WhatsApp Cloud API (Meta) para NightPass. Retomar desde
la sección **"Qué falta"**.

_Última actualización: 2026-06-04._

---

## Decisión

- Proveedor: **Meta WhatsApp Cloud API** (oficial, lo más barato — sin markup de BSP).
- Para: confirmación de pase, recordatorio de evento, OTP, y avisos al RP.
- Costo (tarifa MX 2026, por mensaje entregado):
  - **Utility** (confirmación, aviso RP) ≈ **$0.01 USD / ~0.20 MXN** c/u
  - **Authentication** (OTP) ≈ menos de 1 centavo USD / ~0.10–0.18 MXN
  - **Marketing** = $0.0305 USD / ~0.55 MXN (el más caro)
  - **Servicio** (cliente escribe primero, respondes en 24h) = **GRATIS**
  - Ya NO existe el "1000 gratis/mes" (retirado en 2025). Se paga por mensaje
    iniciado por el negocio.
  - Meta cobra por el país del DESTINATARIO (clientes MX → tarifa MX).

---

## Ya hecho ✅

### En Meta (developers.facebook.com / business.facebook.com)
- Meta Business creado: **NightPass**.
- App creada: **nightpass-wa** (App ID `959525126881243`, tipo Negocios).
- Producto WhatsApp agregado.
- **Número real registrado y verificado** en el Cloud API: **+52 229 647 5242**
  (chip Bait, activado en mibait.com; se liberó su WhatsApp previa borrándola
  desde la app WhatsApp Business antes de migrarlo).
- **Método de pago (tarjeta) agregado** a la cuenta de WhatsApp Business.
- Perfil del negocio completado (Cuernavaca, Mor., CP 62137).

### IDs (no son secretos — van como env vars)
| Dato | Valor |
|------|-------|
| Phone Number ID (número real) | `1197255140131725` |
| WhatsApp Business Account ID (WABA) | `982123037960880` |
| App ID | `959525126881243` |

> El Phone Number ID de PRUEBA (`1139771572555354`) y su WABA
> (`1536142431567428`) ya no se usan — eran del número +1 de Meta.

### En el código (backend)
- Módulo `src/whatsapp/` (PR #10 — **verificar si ya se mergeó a main**):
  - `WhatsappService`: `sendTemplate()` (mensajes iniciados por el negocio) y
    `sendText()` (solo ventana 24h). Usa `fetch` nativo, sin SDK. **Modo no-op**
    si faltan credenciales.
  - `POST /whatsapp/test` (solo ADMIN) para probar el envío.
  - env vars declaradas en `env.schema.ts` y `.env.example`.

---

## Qué falta ⏭️ (retomar aquí)

### 1. Token permanente (System User)
El token temporal de API Setup dura 24h. Para producción:
1. business.facebook.com → **Configuración del negocio → Usuarios → Usuarios del sistema** → **Agregar**.
2. Nombre `nightpass-api`, rol **Administrador** → Crear.
3. **Agregar activos** → pestaña Apps → **nightpass-wa** → Control total → Guardar.
4. **Generar token** → app `nightpass-wa` → caducidad **Nunca** → permisos:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Generar → **copiar** (no se vuelve a mostrar).

### 2. Env vars en Coolify (servicio del API)
```
WHATSAPP_TOKEN=<token permanente del paso 1>       # SECRETO — solo en Coolify
WHATSAPP_PHONE_NUMBER_ID=1197255140131725
WHATSAPP_BUSINESS_ACCOUNT_ID=982123037960880
WHATSAPP_API_VERSION=v21.0
SMS_DEFAULT_COUNTRY_CODE=52
```
> Recordar las otras env ya pendientes de prod: `TRUST_PROXY=2`, `PASS_HMAC_SECRET=...`
> (sin ellas el API no arranca — son las validaciones de seguridad).

### 3. Verificar que envía
- Con el backend desplegado y las env puestas:
  `POST /api/v1/whatsapp/test` (como ADMIN) con `{ "to": "<tu número>", "templateName": "hello_world", "languageCode": "en_US" }`.
- Debe llegar el `hello_world` a ese WhatsApp.

### 4. Crear plantillas aprobadas (Meta)
business.facebook.com/wa/manage → **Message Templates → Create**. Pendiente
definir los textos exactos con variables `{{1}}`. Plantillas a crear:
- `confirmacion_pase` (UTILITY) — al cliente cuando obtiene su pase.
- `aviso_rp_boleto` (UTILITY) — al RP cuando un cliente solicita boleto físico.
- `otp_codigo` (AUTHENTICATION) — verificación de teléfono.
- (Opcional) `recordatorio_evento` (UTILITY).
> Esperan aprobación de Meta (minutos–horas).

### 5. Wire de los flujos (código — pendiente)
Una vez aprobadas las plantillas:
- Confirmación de pase → en `passes.service` (claim) y/o webhook de orden completada.
- Aviso al RP → en `physical-payments.service` (createRequest) → al RP asignado.
- OTP → nuevo flujo de verificación de teléfono.
- Necesita: tomar el `phone` del User/RP y normalizarlo (el service ya lo hace).

### 6. (Recomendado) Tope de gasto
Meta → **Facturación y pagos** → fijar un límite mensual (ej. $200 MXN) para no
llevarse sustos.

---

## Notas / gotchas aprendidos
- Chips prepago (Bait) suelen venir **reciclados con WhatsApp del dueño anterior**.
  Hay que liberarlos: registrar el número en la app **WhatsApp Business**
  (para no perder el WhatsApp personal) → Ajustes → Cuenta → **Eliminar mi cuenta** →
  esperar ~5 min → migrar a Cloud API.
- El Bait hay que **activarlo + recargarlo** en mibait.com antes de que reciba SMS/llamada.
- Si WhatsApp bloquea pedir código (muchos intentos) → espera 24h; el canal de
  Meta es distinto al de la app.
- Verificar por **llamada** si el número es fijo o el SMS no llega.
