# Recompensas — Canje de NPP (spec)

> Estado: **modelo cerrado, sin implementar**. Define cómo se canjean los NPP que
> hoy solo se ganan. Decisiones tomadas con el negocio (2026-06): fondeo de
> boleto **capeado a la comisión NP**, catálogo **por venue desde su panel**,
> construir en una fase posterior.

Relacionado: [LOYALTY_AND_AFORO.md](./LOYALTY_AND_AFORO.md) (cómo se ganan los NPP).

---

## 1. Principio rector: NightPass no pierde dinero

Cada recompensa tiene un **fondeador** explícito. NP solo absorbe costo cuando le
sobra margen para hacerlo.

| Tipo de recompensa | Procesa el cobro | Fondea el descuento | Pérdida NP |
|--------------------|------------------|---------------------|-----------|
| **Perk en bar** (10% en tu cuenta, trago de bienvenida, line-skip) | El bar (efectivo/POS propio, NP no lo toca) | El bar | **$0** |
| **Descuento en boleto** (online vía Stripe) | NP | NP (capeado) u organizador | acotada |

**Regla dura del boleto:** el descuento que **NP** fondea nunca supera la comisión
NP de esa orden (`platformFeePct`, default 8%). Implementación:
`descuentoNP = min(valorRecompensa, comisionNPdeLaOrden)`. Así NP siempre queda
≥ $0. Para descuentos mayores, el **organizador opta** y los fondea él (sale de su
liquidación, no de NP).

---

## 2. Valuación del NPP

Ancla operativa: **1 NPP ≈ $0.02 MXN** de valor de descuento.

- Para el bar es baratísimo (1000 NPP = ~$20 de su propia cuenta, que además le
  trae al cliente de vuelta).
- Para el cliente es tangible y se siente "ganado".

No es dinero real ni canjeable a efectivo — solo poder de descuento dentro de NP.

---

## 3. Velocidad de ganancia → metas alcanzables

Con los montos actuales (evento 25 / bar 10·día / primer bar 15 / racha 5·día):

| Perfil | NPP/mes | Tiempo a 1000 NPP |
|--------|---------|-------------------|
| Casual (2-3 salidas/mes) | ~60–100 | ~3 meses |
| Activo (1-2/semana) | ~180–250 | ~1 mes |
| Fiestero (racha + eventos) | ~400+ | ~2-3 semanas |

Las metas se calibran a esto: que un activo llegue a un perk en ~1 mes.

---

## 4. Catálogo propuesto (v1)

### Perks de bar — venue-funded, pérdida NP $0
| Recompensa | NPP sugerido |
|-----------|--------------|
| Shot / trago de bienvenida | 400 |
| 2x1 en entrada / line-skip | 800 |
| 10% en tu cuenta del bar (próxima visita) | 1000 |

### Descuentos de boleto — capeado a comisión NP
| Recompensa | NPP | Fondea |
|-----------|-----|--------|
| $25 MXN off | 700 | NP (si $25 ≤ comisión de la orden, si no se capea) |
| 5% off (máx $40) | 1200 | NP (5% < 8% comisión → siempre positivo) |
| 10%+ off | configurable | solo si el organizador lo activa |

El venue/organizador elige cuáles activa y a cuántos NPP, partiendo de estas
plantillas sugeridas (no parte de cero).

---

## 5. Modelo de datos (Prisma)

```prisma
enum RewardKind {
  VENUE_PERK        // lo valida el staff en barra/puerta, no toca Stripe
  TICKET_DISCOUNT   // se aplica en checkout online
}

enum RewardFunder {
  VENUE
  PROMOTER
  NIGHTPASS
}

enum RewardDiscountType {
  NONE        // perk no monetario (trago, line-skip)
  PERCENT     // % sobre la orden (boleto)
  FIXED       // monto fijo MXN
}

model Reward {
  id            String   @id @default(uuid(7)) @db.Uuid
  // Dueño que la ofrece (uno de los dos).
  venueId       String?  @db.Uuid
  promoterId    String?  @db.Uuid
  kind          RewardKind
  funder        RewardFunder
  title         String
  description   String?
  costNpp       Int                       // NPP que cuesta canjearla
  discountType  RewardDiscountType @default(NONE)
  discountValue Int       @default(0)     // % (1-100) o centavos según type
  maxDiscountCents Int?                   // tope para PERCENT
  active        Boolean  @default(true)
  perUserLimit  Int?                      // canjes por usuario (null = sin límite)
  expiresInH    Int      @default(72)     // vigencia del cupón tras canjear
  createdAt     DateTime @default(now())
  // ...índices por venueId/promoterId/active
}

enum RedemptionStatus { PENDING, USED, EXPIRED, REVERSED }

model RewardRedemption {
  id            String   @id @default(uuid(7)) @db.Uuid
  rewardId      String   @db.Uuid
  userId        String   @db.Uuid
  costNpp       Int                       // snapshot del costo al canjear
  status        RedemptionStatus @default(PENDING)
  code          String   @unique          // token corto para el QR/cupón
  // Para TICKET_DISCOUNT: a qué orden se aplicó y cuánto descontó de verdad.
  orderId       String?  @db.Uuid
  appliedCents  Int?
  redeemedAt    DateTime @default(now())
  usedAt        DateTime?
  expiresAt     DateTime
  // idempotencyKey del débito en el ledger: `redeem:<redemptionId>`
}
```

El **débito de NPP** se registra en el ledger existente (`LoyaltyEvent`) con un
tipo nuevo `REDEEM` (puntos negativos), igual que `ADMIN_ADJUST` salta multiplier
y streak. `idempotencyKey = redeem:<redemptionId>` evita doble cobro.

---

## 6. Flujos

### a) El venue/organizador define recompensas (panel web)
`Mi local` / `Mi organizador` → nueva sección **Recompensas** → activa plantillas
o crea propias (título, tipo, NPP, vigencia). Solo `VENUE_PERK` para venues;
`TICKET_DISCOUNT` para organizadores (con el cap NP aplicado automático).

### b) El cliente canjea (app cliente)
`/app/recompensas` → catálogo de recompensas disponibles (las de bares cercanos +
descuentos de boleto activos) → "Canjear (1000 NPP)":
1. Valida saldo ≥ costNpp.
2. **Débito atómico**: crea `RewardRedemption(PENDING)` + `LoyaltyEvent(REDEEM, -costNpp)` en una transacción. Si el saldo no alcanza, rollback.
3. Genera `code` → cupón con QR + cuenta regresiva (`expiresAt`).

### c) Validación
- **VENUE_PERK**: el staff abre el scanner (mismo `/scanner` que ya existe) → lee
  el QR del cupón → backend marca `USED`. Sin Stripe.
- **TICKET_DISCOUNT**: en el checkout online el cliente aplica el cupón →
  `appliedCents = min(valor, comisiónNPdeLaOrden)` (si funder=NP) → se descuenta
  del total → al pagar, `USED` + se liga `orderId`.

### d) Expiración / reverso
- Cron o lazy-check: cupones `PENDING` vencidos → `EXPIRED`.
- Política a decidir: ¿devolver NPP al expirar? **Propuesto: NO** (incentiva usar;
  evita farmeo de canjear-y-revertir). Si se decide devolver, `REVERSED` +
  `LoyaltyEvent(REDEEM, +costNpp)` con key `reverse:<redemptionId>`.

---

## 7. Anti-abuso

- Débito **al canjear**, no al usar → no se puede canjear con saldo prestado.
- `perUserLimit` por recompensa.
- Cupón con `expiresAt` corto (default 72h).
- `TICKET_DISCOUNT` siempre re-calcula el cap contra la comisión real de la orden
  en el momento del pago (no confía en el valor guardado).
- Un solo cupón activo por recompensa por usuario (opcional, configurable).

---

## 8. Fases de implementación

**MVP (perks de bar, pérdida $0):**
1. Modelos `Reward` + `RewardRedemption` + enum `REDEEM` en ledger + migración.
2. `RewardsModule`: CRUD de recompensas (panel venue), `GET /rewards` (cliente),
   `POST /rewards/:id/redeem`, `POST /rewards/redemptions/:code/use` (scanner).
3. UI panel: sección Recompensas en `mi-local`.
4. UI cliente: catálogo + canje + cupón QR en `/app/recompensas`.
5. Validación en el scanner existente.

**Fase 2 (descuentos de boleto):**
6. Aplicar cupón en checkout, cap a comisión NP, ligar a `orderId`.
7. Opt-in del organizador para descuentos > comisión.

**Fase 3 (pulido):**
8. Expiración por cron, métricas de canje, plantillas sugeridas.

---

## 9. Decisiones abiertas (confirmar antes de construir)

- ¿Se devuelven NPP al expirar un cupón? (propuesto: no)
- ¿Tope global de NPP que un venue regala al mes? (proteger al venue de sí mismo)
- Montos NPP finales del catálogo v1 (la tabla §4 es propuesta).
- ¿`VENUE_PERK` también para eventos sin venue (solo organizador)?
