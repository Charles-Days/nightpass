# UX Roadmap — Panel de gestión + Área cliente

> Origen: feedback de un usuario real probando con gente nueva. Problemas:
> 1. **Poco contraste** — el morado oscuro casi no se despega del fondo negro; cuesta encontrar objetos.
> 2. **Se pierden** — no hay jerarquía ni guía clara de qué es accionable.
> 3. **No leen** — la gente sigue botones ("siguiente"), no párrafos. Hay que arrastrarlas.

**Alcance:** las dos superficies web.
- **Panel de gestión** — grupo `app/(app)`, todos los roles: `ADMIN`, `VENUE_OWNER`, `RP`, `VENUE_STAFF`, `PROMOTER`.
- **Área cliente** — grupo `app/(customer)` (rutas `/app/*`), PWA móvil.

**Método:** cada fase = su rama + PR, deployable y reversible. Valores tuneables en `globals.css` (tokens) + clases sistemáticas.

---

## Fase 0 — Contraste base (panel) — ✅ PR #15 (en revisión)
Escalera de elevación de superficies, bordes definidos, `--muted-foreground` 0.708→0.78, `--card` 0.13→0.16, `--border` 12%→16%, primary 0.62→0.67, nav activo reforzado + barra de acento. Solo `app/(app)` + features del panel.

## Fase 0b — Contraste base (cliente `/app`) — ▶ siguiente
Mismo pase de elevación/bordes/texto en `app/(customer)` + features que viven ahí (loyalty, push, stories-public, geolocation, cash-wallet, auth customer), **tuneado para móvil** (touch targets ≥44px, contraste algo mayor por uso en exteriores/sol). El cliente fue excluido de #15 a propósito.

## Fase 1 — Legibilidad y jerarquía (ambas)
- **Color semántico de estado.** Badges (PENDING/ACTIVE/PAID/SUSPENDED/REDEEMED…) → verde=ok, ámbar=pendiente, rojo=problema, gris=inactivo. Estado legible de un vistazo. Un solo componente `StatusBadge` compartido.
- **Escala tipográfica única.** Título pantalla / título sección / dato / label. Tokens, no tamaños sueltos.
- **Focus states** visibles (teclado) en todo input/botón.
- **Skeletons** en cada carga (matar pantallas negras). Ya hay `loading.tsx` en varias rutas — homogeneizar.

## Fase 2 — Una acción primaria por pantalla (ambas)
- Auditar cada pantalla y definir LA acción principal.
- **Un solo botón primario sólido (gradiente) por pantalla**; el resto secundario/ghost. Hoy compiten varios del mismo peso.
- Acciones secundarias → menú `···`.
- Panel ejemplos: Solicitudes→"Revisar siguiente"; Mi local sin eventos→"Crear primer evento"; RP sin zona→"Definir zona"; Scanner→botón gigante.
- Cliente ejemplos: Home→"Descubrir/Comprar"; Evento→"Comprar pase" persistente (sticky bottom); Pase→"Mostrar QR".

## Fase 3 — Empty states que enseñan (ambas)
Cada lista vacía = ilustración + 1 frase + **botón de la acción**. No "no hay datos" → "Crea tu primer evento → [Crear]". El vacío se vuelve onboarding.
- Panel: eventos, staff, RPs, pases, stories, solicitudes.
- Cliente: sin pases, sin compras, sin recompensas, búsqueda sin resultados.

## Fase 4 — Onboarding guiado (ambas, por rol)
- **Checklist "Primeros pasos"** en el dashboard/home, desaparece al completarse.
  - Owner: completar local → crear evento → invitar staff → conectar pagos.
  - RP: definir zona → emitir primer pase.
  - Staff: probar scanner.
  - Cliente: activar ubicación → instalar PWA → activar notificaciones → primer evento.
- **Coachmarks** (1–2 máx) primera vez en pantallas clave: tooltip con flecha al botón principal. Sin tours largos.
- Persistir "ya lo vio" (backend o localStorage).

## Fase 5 — Navegación que ubica (ambas)
- **Header consistente** por pantalla: eyebrow + título + 1 línea "qué es esto" + acción primaria a la derecha. Mismo patrón en todas.
- **Breadcrumbs** en detalles (local > evento > tier).
- Panel: sidebar agrupado por tarea, esconder lo que el rol no usa.
- Cliente: bottom-nav con estado activo claro + íconos inequívocos.

## Fase 6 — Microcopy de botón (ambas)
- Labels = verbo + objeto ("Crear evento", no "Eventos").
- Quitar párrafos explicativos → tooltip o esconder.
- Confirmaciones = pregunta corta + 2 botones claros.
- Español neutro, consistente (tú/usted decidido una vez).

## Fase 7 — Medir y cerrar el loop
- Instrumentar eventos clave (dónde abandonan, qué no encuentran). Extender el tracking de visitas existente.
- Re-test con las mismas personas que se perdían. Iterar contraste/coachmarks con datos.

---

## Orden de ejecución (impacto/esfuerzo)
1. Fase 0 (eyeball) → calibrar contraste panel.
2. **Fase 0b** — contraste cliente (rápido, mecánico).
3. **Fase 1** — estado semántico + tipografía (rápido, alto valor, ambas).
4. **Fase 3 + Fase 2** — empty states + acción primaria (máximo impacto en "se pierden").
5. **Fase 4** — onboarding/checklist (el arrastre real).
6. **Fases 5–6** — nav + copy (pulido transversal).
7. **Fase 7** — medición continua.

## Convenciones
- Autoría git: solo Charles-Days, sin `Co-Authored-By`.
- shadcn/ui only. Sin MUI/Chakra/etc.
- Tokens en `globals.css`; no hardcodear colores nuevos sueltos.
- No tocar lógica de negocio en este roadmap — solo presentación/UX.
