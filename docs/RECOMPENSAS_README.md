# Recompensas (canje de NPP) — cómo funciona

Sistema de canje de puntos NightPass (NPP). Los clientes **ganan** NPP (check-ins,
eventos, rachas, referidos) y aquí los **canjean** por recompensas. Modelo
económico completo en [RECOMPENSAS_CANJE.md](./RECOMPENSAS_CANJE.md).

## En una frase

El bar define recompensas (ej. "trago de bienvenida 400 NPP"). El cliente las
canjea desde la app → recibe un **cupón con QR** → lo muestra en el bar → el staff
lo valida. Los NPP se descuentan al canjear.

---

## Para el cliente (app `/app/recompensas`)

1. **Ver catálogo** — sección "Canjea tus NPP": recompensas activas de bares de su
   zona, con su costo en NPP. Si no le alcanza, el botón dice "Te faltan NPP".
2. **Canjear** — toca "Canjear". Se descuentan los NPP y se genera un cupón.
3. **Mostrar el cupón** — aparece en "Mis cupones activos" con un **QR + código**.
   Lo muestra al staff del bar. Vence en 72h (configurable por recompensa).

Gastar NPP **no baja su tier** — el tier se calcula solo con puntos ganados.

## Para el bar / organizador (panel `Mi local → Recompensas`)

1. **Crear recompensa** — botón "Nueva". Hay **plantillas sugeridas** (trago 400,
   2x1 800, 10% en tu cuenta 1000) o se crea a la medida: título, descripción,
   costo en NPP.
2. **Activar/desactivar** — toggle por recompensa. Las inactivas no aparecen al
   cliente.
3. **Validar cupón** — el cliente muestra su código; el staff lo escribe en
   "Validar cupón" → confirma nombre + recompensa → queda marcado como usado.
   (Escaneo con cámara: fase próxima; por ahora el código se valida a mano.)

> Los perks de bar los **fondea el bar** (es su consumo) — NightPass no cobra esa
> cuenta, así que para NP el costo es $0. Es fidelización que trae al cliente de
> vuelta.

---

## Reglas que protegen el negocio

- **Descuentos de boleto** (los que procesa NP por Stripe): lo que NP fondea nunca
  supera su comisión de la orden → NP siempre queda ≥ $0. Descuentos mayores los
  opta y fondea el organizador. (La aplicación en checkout es Fase 2.)
- **Débito al canjear**, no al usar → no se puede canjear sin saldo real. Si el
  balance quedara negativo, la transacción hace rollback.
- **Idempotente** — un canje = un débito (`redeem:<redemptionId>` en el ledger).
- **Límite por usuario** opcional por recompensa.
- **Cupón con vencimiento** (default 72h); los vencidos pasan a `EXPIRED`.
- Solo el staff dueño del venue/organizador puede validar sus cupones.

---

## Mapa técnico

### Backend (`server-nightpass`)
- **Modelos** (`prisma/schema.prisma`): `Reward`, `RewardRedemption` + enums
  `RewardKind`, `RewardFunder`, `RewardDiscountType`, `RedemptionStatus`. Tipo de
  ledger `REDEEM` (puntos negativos).
- **`LoyaltyService`**: `getBalance(userId)`, `debit({userId, points, idempotencyKey})`
  (REDEEM, sin multiplicador, guard de balance negativo). `recomputeTotals` excluye
  `REDEEM` del `yearPoints` para que gastar no degrade el tier.
- **`RewardsModule`** (`src/rewards/`): CRUD del dueño + canje del cliente + uso por
  staff.

| Método | Ruta | Rol | Qué hace |
|--------|------|-----|----------|
| POST | `/rewards` | OWNER/STAFF/PROMOTER | Crear recompensa |
| GET | `/rewards/mine?venueId=` | OWNER/STAFF/PROMOTER | Listar las propias |
| PATCH | `/rewards/:id` | dueño | Editar |
| DELETE | `/rewards/:id` | dueño | Eliminar |
| GET | `/rewards/available?venueId=&city=` | cliente | Catálogo canjeable + balance |
| POST | `/rewards/:id/redeem` | cliente | Canjear → cupón |
| GET | `/me/redemptions` | cliente | Mis cupones |
| POST | `/rewards/redemptions/use` | staff | Validar cupón por código |

### Frontend (`cliente-nightpass`)
- **Cliente** `src/features/rewards/`: `RewardsSection` (catálogo + canje + cupón
  QR + mis cupones). Montado en `/app/recompensas`.
- **Panel** `src/features/rewards-admin/`: `RewardsManager` (CRUD + validador de
  cupón). Página `/mi-local/recompensas` + entrada en el sidebar.
- Route handlers proxy en `src/app/api/rewards/*` y `src/app/api/me/redemptions`.
- QR con `qrcode.react`.

---

## Pendientes (fases siguientes)

- **Descuento de boleto en checkout** (Fase 2): aplicar el cupón sobre la orden con
  el cap a la comisión NP, ligado a `orderId`.
- **Escaneo con cámara** del cupón en el scanner (hoy es código manual).
- **Recompensas del organizador** en su panel (`mi-organizador`) — el backend ya lo
  soporta; falta la UI (reusar `RewardsManager` con `promoterId`).
- Expiración por cron (hoy es lazy al consultar) y métricas de canje.
- Decidir si se devuelven NPP al expirar un cupón (propuesto: no).
