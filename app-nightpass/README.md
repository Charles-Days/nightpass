# NightPass

App móvil para descubrir bares, eventos y pases digitales para la vida nocturna.

Construida con **Flutter** (Dart SDK ^3.11.5), usa `go_router` para navegación y `google_fonts` para tipografías.

## Stack

- **Framework:** Flutter
- **Lenguaje:** Dart `^3.11.5`
- **Plataformas:** iOS y Android
- **Routing:** `go_router ^14.6.2`
- **Tipografías:** `google_fonts ^6.2.1`
- **HTTP client:** `dio ^5.7.0`
- **Storage seguro:** `flutter_secure_storage ^9.2.2` (Keychain iOS / EncryptedSharedPreferences Android)
- **Estado:** `flutter_riverpod ^2.6.1`

## Estructura

```
lib/
├── main.dart           # Entry point
├── router/             # Configuración de go_router
├── screens/            # Pantallas (home, search, pass, profile, auth, etc.)
├── theme/              # Tema y estilos
└── widgets/            # Widgets reutilizables
```

Pantallas principales: `splash`, `auth`, `home`, `search`, `bar_detail`, `event_detail`, `pass`, `checkout`, `stories_feed`, `story_viewer`, `friends_invite`, `profile`.

## Requisitos previos

- Flutter SDK instalado (`flutter --version` para verificar).
- Para iOS: Xcode + CocoaPods (`sudo gem install cocoapods`).
- Para Android: Android Studio + un emulador o dispositivo conectado.

Verifica que todo esté listo:

```bash
flutter doctor
```

## Cómo correr el proyecto

Desde la raíz del proyecto (`NIHP/`):

```bash
# 1. Instalar dependencias
flutter pub get

# 2. Ver dispositivos/emuladores disponibles
flutter devices

# 3. Correr la app (elige automáticamente el dispositivo)
flutter run

# Correr en un dispositivo específico
flutter run -d <device_id>

# Correr en iOS Simulator
flutter run -d ios

# Correr en Android Emulator
flutter run -d android

# Correr en Chrome (web, si está habilitado)
flutter run -d chrome
```

Mientras `flutter run` está activo:
- `r` → hot reload
- `R` → hot restart
- `q` → salir

## Conectar al backend (API_BASE_URL)

La app espera un backend NestJS corriendo en `../server-nightpass/` (ver su README). Antes de
correr la app, levanta el backend:

```bash
cd ../server-nightpass
pnpm db:seed       # crea usuarios de prueba (la primera vez)
pnpm start:dev
# espera "NightPass API listening on http://localhost:7101/api/v1"
```

### Usuario de prueba para login en la app

El seeder del backend crea un usuario `CUSTOMER` listo para entrar en la app móvil:

| Email | Password |
| --- | --- |
| `cliente@nightpass.local` | `ClienteTest123` |

(También crea un `ADMIN` para el panel web; ese no entra en la app móvil — el endpoint `/auth/signin-web` rechaza `CUSTOMER` con 403, pero `/auth/signin` que usa la móvil acepta cualquier rol.)

La URL del API se configura en tiempo de compilación con `--dart-define=API_BASE_URL=...`.
El default (sin flag) es `http://localhost:7101/api/v1`.

### Elige el comando según dónde corras la app

| Target | Comando |
| ------ | ------- |
| **iOS Simulator** (corriendo en tu Mac) | `flutter run` |
| **Emulador Android** (corriendo en tu Mac) | `flutter run --dart-define=API_BASE_URL=http://10.0.2.2:7101/api/v1` |
| **iPhone físico** (cable o WiFi) | `flutter run --dart-define=API_BASE_URL=http://<IP-de-tu-Mac>:7101/api/v1` |
| **Android físico** (cable o WiFi) | `flutter run --dart-define=API_BASE_URL=http://<IP-de-tu-Mac>:7101/api/v1` |

> ⚠️ **Confusión común:** "iPhone 16 Pro" en `flutter devices` puede ser **simulador**
> (corre en tu Mac) **o iPhone físico** (cable USB). No es lo mismo. Si dudas, mira la
> columna de la izquierda en `flutter devices`: `ios` = simulador, un identificador de
> hardware largo = físico. Usar la URL incorrecta da el error "No se pudo conectar al
> servidor."

### Por qué cada caso usa una URL distinta

- **iOS Simulator** comparte red con la Mac → `localhost` ya apunta al backend.
- **Emulador Android** corre en su propia VM aislada → `localhost` apunta a sí mismo.
  Google reserva el alias `10.0.2.2` para alcanzar al host desde el emulador.
- **Dispositivos físicos** (iPhone o Android) son otra máquina en la WiFi → necesitan la
  IP LAN de tu Mac para encontrar el backend.

### Cómo encontrar la IP de tu Mac (solo para dispositivo físico)

```bash
ipconfig getifaddr en0
```

Requisitos extra para físico:

1. Mac y dispositivo en la **misma red WiFi**.
2. La primera vez, macOS puede pedir permiso al firewall para que `node` acepte
   conexiones entrantes — acéptalo.
3. Si la WiFi cambia, la IP cambia — vuelve a correr `ipconfig getifaddr en0`.
4. **Android físico:** el manifest de **debug** (`android/app/src/debug/AndroidManifest.xml`)
   tiene `usesCleartextTraffic="true"` para permitir HTTP al backend local. El build
   release no lo hereda — producción seguirá exigiendo HTTPS.
5. **Android físico — USB Debugging:** Ajustes → Acerca del teléfono → tap 7 veces
   "Número de compilación" → atrás → Opciones de desarrollador → activa "Depuración USB".
   Al conectar el cable, acepta el prompt "¿Permitir depuración USB?".

### Probar conexión sin Flutter

Si `flutter run` corre pero la app dice "No se pudo conectar al servidor", abre el
navegador del propio dispositivo físico y entra a:

```
http://<IP-de-tu-Mac>:7101/api/v1/health
```

- Devuelve JSON con `status: "ok"` → red OK, problema está en la app.
- No carga / timeout → firewall del Mac o están en redes distintas.

## Comandos esenciales

```bash
# Dependencias
flutter pub get                  # instala paquetes
flutter pub upgrade              # actualiza paquetes
flutter pub outdated             # ver qué está desactualizado

# Limpieza (cuando algo se rompe raro)
flutter clean
flutter pub get

# Análisis y tests
flutter analyze                  # lint / análisis estático
flutter test                     # corre los tests en /test

# Builds
flutter build apk                # APK Android (release)
flutter build appbundle          # AAB para Play Store
flutter build ios                # iOS (requiere Xcode)
flutter build ipa                # IPA para App Store

# iOS — si fallan pods
cd ios && pod install && cd ..
```

## Tips

- Si cambias dependencias en `pubspec.yaml`, corre `flutter pub get`.
- Si iOS no compila después de cambiar paquetes nativos: `cd ios && pod install`.
- Si ves errores raros de cache: `flutter clean && flutter pub get`.
