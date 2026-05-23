import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../api/passes_api.dart';
import '../state/orders_providers.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';

class ScannerScreen extends ConsumerStatefulWidget {
  const ScannerScreen({super.key});

  @override
  ConsumerState<ScannerScreen> createState() => _ScannerScreenState();
}

enum _ScanPhase { scanning, validating, result }

enum _GeofenceError { noRecentLocation, outOfRange }

class _GeofenceFailure {
  final _GeofenceError kind;
  final int? distanceM;
  const _GeofenceFailure(this.kind, {this.distanceM});
}

class _ScannerScreenState extends ConsumerState<ScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
    facing: CameraFacing.back,
  );
  _ScanPhase _phase = _ScanPhase.scanning;
  ScanResult? _last;
  String? _error;
  _GeofenceFailure? _geofence;
  String? _lastCode;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_phase == _ScanPhase.validating || _phase == _ScanPhase.result) return;
    final code = capture.barcodes
        .map((b) => b.rawValue)
        .firstWhere((v) => v != null && v.isNotEmpty, orElse: () => null);
    if (code == null || code == _lastCode) return;
    _lastCode = code;
    await _validate(code);
  }

  Future<void> _validate(String code) async {
    setState(() {
      _phase = _ScanPhase.validating;
      _error = null;
      _geofence = null;
    });
    try {
      await _controller.stop();
      final api = ref.read(passesApiProvider);
      final result = await api.scan(code);
      if (!mounted) return;
      setState(() {
        _phase = _ScanPhase.result;
        _last = result;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      final geofence = _readGeofenceError(e);
      if (geofence != null) {
        setState(() {
          _phase = _ScanPhase.result;
          _last = null;
          _error = null;
          _geofence = geofence;
        });
        return;
      }
      final msg = _readDioError(e);
      setState(() {
        _phase = _ScanPhase.result;
        _last = null;
        _error = msg;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _phase = _ScanPhase.result;
        _last = null;
        _error = e.toString();
      });
    }
  }

  String _readDioError(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['message'] is String) return data['message'] as String;
    if (data is Map && data['message'] is List) return (data['message'] as List).join(', ');
    return e.message ?? 'Error de red';
  }

  _GeofenceFailure? _readGeofenceError(DioException e) {
    if (e.response?.statusCode != 409) return null;
    final data = e.response?.data;
    if (data is! Map) return null;
    final code = data['code'];
    if (code == 'NO_RECENT_LOCATION') {
      return const _GeofenceFailure(_GeofenceError.noRecentLocation);
    }
    if (code == 'OUT_OF_RANGE') {
      final raw = data['distanceM'];
      final distance = raw is num
          ? raw.round()
          : (raw is String ? int.tryParse(raw) : null);
      return _GeofenceFailure(
        _GeofenceError.outOfRange,
        distanceM: distance,
      );
    }
    return null;
  }

  Future<void> _scanAgain() async {
    setState(() {
      _phase = _ScanPhase.scanning;
      _last = null;
      _error = null;
      _geofence = null;
      _lastCode = null;
    });
    await _controller.start();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Text('Escanear pase', style: NPTextStyles.display(22)),
                      const Spacer(),
                      IconButton(
                        icon: const Icon(Icons.flash_on_outlined, color: NPColors.text),
                        onPressed: () => _controller.toggleTorch(),
                      ),
                      IconButton(
                        icon: const Icon(Icons.cameraswitch_outlined, color: NPColors.text),
                        onPressed: () => _controller.switchCamera(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Apunta la cámara al QR del cliente. La validación es inmediata.',
                    style: NPTextStyles.body(12, color: NPColors.textDim),
                  ),
                  const SizedBox(height: 18),
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(22),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          MobileScanner(
                            controller: _controller,
                            onDetect: _onDetect,
                            errorBuilder: (context, error, _) => _CameraError(
                              message: error.errorDetails?.message ??
                                  'No se pudo abrir la cámara',
                            ),
                          ),
                          IgnorePointer(
                            child: Container(
                              decoration: BoxDecoration(
                                border: Border.all(
                                  color: NPColors.hero.withValues(alpha: 0.55),
                                  width: 3,
                                ),
                                borderRadius: BorderRadius.circular(22),
                              ),
                            ),
                          ),
                          if (_phase == _ScanPhase.validating)
                            Container(
                              color: Colors.black.withValues(alpha: 0.55),
                              alignment: Alignment.center,
                              child: const CircularProgressIndicator(
                                color: NPColors.hero,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (_phase == _ScanPhase.result)
            _ResultModal(
              result: _last,
              error: _error,
              geofence: _geofence,
              onAgain: _scanAgain,
            ),
        ],
      ),
    );
  }
}

class _ResultModal extends StatelessWidget {
  final ScanResult? result;
  final String? error;
  final _GeofenceFailure? geofence;
  final VoidCallback onAgain;

  const _ResultModal({
    required this.result,
    required this.error,
    required this.geofence,
    required this.onAgain,
  });

  @override
  Widget build(BuildContext context) {
    final isGeofence = geofence != null;
    final isError = result == null && !isGeofence;
    final isAlreadyUsed = result != null && !result!.valid;
    final isValid = result != null && result!.valid;
    // Hide event details card when there's no successful scan result.
    final showDetails = !isError && !isGeofence;

    final Color accent;
    final IconData icon;
    final String title;
    final String subtitle;
    final String ctaLabel;
    if (isValid) {
      accent = const Color(0xFF22C55E);
      icon = Icons.check_rounded;
      title = '¡Pase válido!';
      subtitle = 'Acceso confirmado';
      ctaLabel = 'Escanear otro';
    } else if (isAlreadyUsed) {
      accent = const Color(0xFFF97316);
      icon = Icons.close_rounded;
      title = 'Pase ya canjeado';
      subtitle =
          '${result!.usedAt.toLocal().toString().substring(11, 16)} — ya entró antes';
      ctaLabel = 'Escanear otro';
    } else if (isGeofence &&
        geofence!.kind == _GeofenceError.noRecentLocation) {
      accent = const Color(0xFFF59E0B); // amber
      icon = Icons.warning_amber_rounded;
      title = 'Ubicación no disponible';
      subtitle =
          'Pídele al cliente que abra el pase en su app y vuelva a intentar.';
      ctaLabel = 'Reintentar';
    } else if (isGeofence && geofence!.kind == _GeofenceError.outOfRange) {
      accent = const Color(0xFFEF4444); // red
      icon = Icons.location_off_rounded;
      title = 'Cliente fuera de rango';
      final d = geofence!.distanceM;
      subtitle = d != null
          ? 'Cliente está a ${d}m del local. Verifica con identificación antes de admitir.'
          : 'Cliente está fuera del rango del local. Verifica con identificación antes de admitir.';
      ctaLabel = 'Reintentar';
    } else {
      accent = const Color(0xFFEF4444);
      icon = Icons.close_rounded;
      title = 'Pase inválido';
      subtitle = error ?? 'No se pudo validar';
      ctaLabel = 'Escanear otro';
    }

    return Positioned.fill(
      child: GestureDetector(
        onTap: onAgain,
        behavior: HitTestBehavior.opaque,
        child: Container(
          color: Colors.black.withValues(alpha: 0.78),
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: GestureDetector(
            onTap: () {},
            child: Container(
              padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
              decoration: BoxDecoration(
                color: const Color(0xFF150C24),
                borderRadius: BorderRadius.circular(28),
                border: Border.all(
                  color: accent.withValues(alpha: 0.55),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: accent.withValues(alpha: 0.35),
                    blurRadius: 60,
                    spreadRadius: 4,
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 96,
                    height: 96,
                    decoration: BoxDecoration(
                      color: accent.withValues(alpha: 0.18),
                      shape: BoxShape.circle,
                      border: Border.all(color: accent, width: 3),
                    ),
                    child: Icon(icon, color: accent, size: 64),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    title,
                    style: NPTextStyles.display(22, color: accent),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: NPTextStyles.body(13, color: NPColors.textDim),
                    textAlign: TextAlign.center,
                  ),
                  if (showDetails) ...[
                    const SizedBox(height: 18),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.04),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.08),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _row('Evento', result!.eventTitle),
                          if (result!.venueName != null)
                            _row('Local', result!.venueName!),
                          if (result!.attendeeName != null)
                            _row('Cliente', result!.attendeeName!),
                          if (result!.tierName != null)
                            _row('Tier', result!.tierName!),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 22),
                  NPPrimary(
                    full: true,
                    onPressed: onAgain,
                    child: Text(ctaLabel),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _row(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 66,
              child: Text(k,
                  style: NPTextStyles.body(11, color: NPColors.textFaint)),
            ),
            Expanded(
              child: Text(v,
                  style: NPTextStyles.body(12.5,
                      color: NPColors.text, w: FontWeight.w500)),
            ),
          ],
        ),
      );
}

class _CameraError extends StatelessWidget {
  final String message;
  const _CameraError({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      alignment: Alignment.center,
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.no_photography_outlined,
              size: 40, color: NPColors.textDim),
          const SizedBox(height: 12),
          Text(
            'Cámara no disponible',
            style: NPTextStyles.heading(14, w: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: NPTextStyles.body(11, color: NPColors.textDim),
          ),
        ],
      ),
    );
  }
}
