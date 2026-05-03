# NightPass App — Claude context

App móvil **NightPass**: descubrir bares, eventos y pases digitales para la vida nocturna. Construida con Flutter, consume el backend NestJS en `../server-nightpass/`.

## Estado actual

**Fase 1 completa: Auth con email/password integrado al backend.** Pantallas de catálogo/checkout/stories existen con UI estática y se conectan al backend en fases siguientes.

> **Nota Fase A1 (backend):** desde el 2026-04-27 `/auth/me`, signin y signup devuelven un campo `role` (`CUSTOMER` por default para todos los signups móviles). El parser `User.fromJson` (`lib/models/user.dart`) ignora campos extra, así que **no hay cambios requeridos**. El campo se podrá usar más adelante si la app necesita diferenciar staff dentro de un local.

## Stack

| Capa | Tecnología | Versión |
| ---- | ---------- | ------- |
| Framework | Flutter | 3.41.7 |
| Dart SDK | — | ^3.11.5 |
| Routing | go_router | ^14.6.2 |
| Estado | flutter_riverpod | ^2.6.1 |
| HTTP client | dio | ^5.7.0 |
| Storage seguro | flutter_secure_storage | ^9.2.2 |
| Tipografías | google_fonts | ^6.2.1 |

## Comandos

```bash
flutter pub get                 # deps
flutter run                     # iOS Simulator (default)
flutter analyze                 # lint estático
flutter test                    # tests
flutter clean && flutter pub get # cuando algo se cachea raro
cd ios && pod install && cd ..  # cuando fallan pods después de cambiar deps nativas
```

### Conectar al backend (API_BASE_URL)

URL definida en `lib/api/api_client.dart` con `String.fromEnvironment`. Default: `http://localhost:7101/api/v1`.

| Target | Comando |
| ------ | ------- |
| iOS Simulator | `flutter run` |
| Emulador Android | `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:7101/api/v1` |
| iPhone físico | `flutter run --dart-define=API_BASE_URL=http://<IP-de-tu-Mac>:7101/api/v1` |
| Android físico | `flutter run --dart-define=API_BASE_URL=http://<IP-de-tu-Mac>:7101/api/v1` |

> `10.0.2.2` es el alias del emulador Android para alcanzar al host. iOS Simulator entiende `localhost` directamente. **Confusión común**: confundir simulador con dispositivo físico — revisa `flutter devices` para distinguir.

Backend debe estar corriendo (`cd ../server-nightpass && pnpm start:dev`).

## Estructura

```
lib/
├── main.dart                  # ProviderScope, bootstrap auth on init, MaterialApp.router
├── api/
│   ├── api_client.dart        # Dio + interceptor (auth header + auto-refresh en 401)
│   └── auth_api.dart          # signup / signin / refresh / me
├── models/
│   └── user.dart              # User, AuthTokens, AuthResult
├── services/
│   └── token_storage.dart     # Keychain (iOS) / EncryptedSharedPreferences (Android)
├── state/
│   └── auth_controller.dart   # Riverpod StateNotifier — bootstrap, signin, signup, signout
├── router/
│   └── app_router.dart        # routerProvider con redirect según AuthState
├── screens/
│   ├── splash_screen.dart     # espera bootstrap
│   ├── auth_screen.dart       # login (real)
│   ├── signup_screen.dart     # signup (real)
│   ├── home_screen.dart
│   └── ... (UI estática Fase 2+)
├── theme/
│   └── np_theme.dart          # NPColors, NPTextStyles, buildNPTheme()
└── widgets/
    ├── np_glass.dart          # tarjeta con BackdropFilter
    ├── np_button.dart         # NPPrimary (gradient) + NPGhost
    ├── np_text_field.dart     # input con estilo NPGlass + foco + error
    ├── np_backdrop.dart
    ├── np_logo.dart
    └── ...
```

## Convenciones del proyecto

### Tema

Toda UI usa `NPColors` y `NPTextStyles` de `theme/np_theme.dart`. Paleta morada (hero `#A855F7`, hero2 `#9333EA`) sobre fondo oscuro (`base #0A0A0F`). Tipografías: Space Grotesk (display/heading), Inter (body), Fira Code (mono).

### Widgets

Reutilizables con prefijo `NP` (ej. `NPGlass`, `NPPrimary`, `NPTextField`). Cuando un patrón visual se repita en 2+ pantallas, extraer a `widgets/`.

### Estado — Riverpod

- **Providers en top-level**, nunca dentro de clases o widgets.
- `Provider`/`StateNotifierProvider`/`FutureProvider` según necesidad.
- En `build()` del widget: `ref.watch(...)` para suscribirse a cambios.
- En handlers (onPressed, etc.): `ref.read(...)` para no suscribirse.
- Para evitar rebuilds innecesarios cuando solo necesitas parte del estado: `ref.watch(provider.select((s) => s.field))`.
- `ref.listen(...)` solo para side effects (snackbars, navegación imperativa).
- **No** inicializar providers desde widgets — los providers se auto-inicializan al ser leídos.

### Auth flow

`AuthController` (en `state/auth_controller.dart`) es la única fuente de verdad del estado de auth. Pantallas llaman a `ref.read(authProvider.notifier).signin(...)` y observan `ref.watch(authProvider)`.

El router redirige automáticamente según `AuthStatus`:
- `unknown` → `/` (splash)
- `unauthenticated` → `/auth` (login) o `/signup`
- `authenticated` → `/home` o ruta solicitada

### Errores y loading

- El `AuthState` lleva `isLoading: bool` y `error: String?`.
- Pantallas muestran loader en el botón cuando `isLoading`.
- Errores del backend se muestran inline debajo del último input.
- El `AuthController._readError(DioException)` mapea errores de red y respuestas del backend a strings legibles en español.

### Routing

Rutas declaradas en `router/app_router.dart`. Navegación con `context.go('/path')` (replace) o `context.push('/path')` (stack). Splash bootstrappea auth y deja que el redirect del router decida destino.

## Best practices Flutter 2026

### Arquitectura

- **Separar UI de data layer.** UI = widgets + state controllers. Data = services + APIs + repositorios.
- **Feature-by-folder** cuando crezca (`features/auth/`, `features/venues/`, etc.). Por ahora la app es chica y la estructura por tipo (`screens/`, `widgets/`, `state/`) está bien.
- **Repository pattern**: las pantallas no llaman a Dio directo. Llaman a un service/controller que envuelve la API.

### Performance / widget tree

- **Const constructors** cuando puedas — el framework reutiliza la instancia.
- **Romper widgets grandes** en sub-widgets `const` para reducir rebuilds.
- **`ListView.builder`** para listas largas (lazy), no `ListView(children: [...])`.
- **`Selector` o `select` de Riverpod** para suscribirse solo al campo que importa.
- **Evita `setState` en widgets que tienen children pesados** — extrae a un widget separado para localizar el rebuild.

### Estado (Riverpod 2026)

- Riverpod es el recomendado actual para apps medianas/grandes. BLoC es alternativa para enterprise estricto.
- **Providers chicos y enfocados** — single responsibility. No metas todo en un mega-state.
- **Code generation con `@riverpod`** es lo más moderno (Riverpod 3+). Por ahora estamos en 2.6 con declaración manual — válido pero migrar cuando tengamos tiempo.

### Testing

- **Widget tests** para componentes (`np_text_field`, `np_button`).
- **Integration tests** para flujos completos (signup → home).
- Mockear el `AuthApi` y el `TokenStorage` con providers override en `ProviderScope.overrides`.

### Naming

- Archivos: `snake_case.dart` (ej. `auth_controller.dart`).
- Clases: `PascalCase`.
- Variables/métodos: `camelCase`.
- Privados: prefijo `_` (ej. `_email`, `_onSignIn`).

## Imágenes del catálogo

Las URLs de fotos (venues, eventos, portadas, galería) que devuelve el backend ya son **absolutas a Cloudflare R2** (`https://pub-xxxxxxx.r2.dev/<key>`). No hay que prefixarlas con `apiBaseUrl`. `Image.network(...)` o `CachedNetworkImage(...)` cargan directo desde R2 sin pasar por el backend.

Si en algún payload llega una URL relativa (`/uploads/...`), es legacy del driver `local` — habrá que prefixarla con `apiBaseUrl.replace('/api/v1', '')`. La migración a R2 fue Fase 2; nuevas subidas siempre devuelven URL absoluta.

## Cosas a NO hacer

- No llamar a `Dio` directamente desde widgets — siempre vía un service/controller.
- No guardar tokens en `SharedPreferences` ni en archivos planos — siempre `flutter_secure_storage`.
- No hardcodear URLs — usa `apiBaseUrl` del `api_client.dart`.
- No usar `setState` en widgets manejados por Riverpod — actualiza el provider y deja que el rebuild fluya.
- No bloquear el UI thread con trabajo síncrono pesado — usa `compute()` o `Isolate.run()`.
- No olvidar `dispose()` en TextEditingController, FocusNode, AnimationController, etc.
- No usar `BuildContext` después de un `await` sin chequear `if (!mounted) return;`.
- No commitear `.dart_tool/` ni `build/` (ya están en `.gitignore`).

## Limitaciones conocidas

- **Apple/Google Sign-In**: pantalla muestra botones con SnackBar "disponible pronto". Implementación real en Fase 1.5 (requiere certificados Apple Developer + Google client IDs).
- **Pantallas de catálogo/checkout/stories**: UI estática. Se conectan al backend en Fase 2+.
- **Web target**: no probado. iOS y Android.
- **Tests**: solo `flutter analyze` se corre. Cobertura de tests es Fase 5.

## Backend asociado

Backend en `../server-nightpass/` (NestJS + Prisma + Postgres + Redis). Ver su `CLAUDE.md`. Ambos proyectos viven bajo el monorepo `app-nightpass-APP/`.
