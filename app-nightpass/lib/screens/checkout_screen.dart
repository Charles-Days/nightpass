import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../theme/np_theme.dart';
import '../widgets/np_backdrop.dart';
import '../widgets/np_button.dart';
import '../widgets/np_glass.dart';
import '../widgets/np_photo.dart';

class CheckoutScreen extends StatelessWidget {
  const CheckoutScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          const NPBackdrop(),
          SafeArea(
            bottom: false,
            child: ListView(
              padding: const EdgeInsets.only(top: 8, bottom: 130),
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 18),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () => context.canPop() ? context.pop() : context.go('/event'),
                        child: const Icon(Icons.arrow_back_ios_new_rounded, size: 20, color: NPColors.text),
                      ),
                      const SizedBox(width: 14),
                      Text('Checkout', style: NPTextStyles.display(22)),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                  child: NPGlass(
                    padding: const EdgeInsets.all(14),
                    radius: 18,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            SizedBox(
                              width: 56,
                              height: 56,
                              child: NPPhoto(
                                label: '',
                                height: 56,
                                hue: 320,
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('KAIROS — VIP Lounge',
                                      style: NPTextStyles.heading(15, w: FontWeight.w600)),
                                  const SizedBox(height: 2),
                                  Text('Lumen · Sat 26 Apr · 23:00',
                                      style: NPTextStyles.body(12, color: NPColors.textDim)),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Container(height: 1, color: NPColors.hairline),
                        _row('VIP Lounge × 1', '\$690.00'),
                        _row('Service fee', '\$24.00'),
                        _row('Tax (16%)', '\$110.40'),
                        Container(height: 1, color: NPColors.hairline),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Total', style: NPTextStyles.heading(14, w: FontWeight.w600)),
                            Text('\$824.40', style: NPTextStyles.display(22, color: NPColors.magenta)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
                  child: Text('PAY WITH', style: NPTextStyles.label(spacing: 0.1)),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                  child: NPGlass(
                    radius: 16,
                    borderColor: NPColors.hero,
                    borderWidth: 1.5,
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Container(
                          width: 38,
                          height: 26,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [NPColors.deep2, NPColors.deep],
                            ),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                          ),
                          child: const Center(child: Icon(Icons.credit_card, size: 14, color: NPColors.hero)),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('•••• 4827', style: NPTextStyles.heading(14, w: FontWeight.w600)),
                              Text('Visa · expires 09/28',
                                  style: NPTextStyles.body(11, color: NPColors.textDim)),
                            ],
                          ),
                        ),
                        Text('Change',
                            style: NPTextStyles.heading(12, w: FontWeight.w600, color: NPColors.hero)),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                  child: Row(
                    children: [
                      Expanded(
                          child: NPGhost(
                              child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [Icon(Icons.apple, size: 16), SizedBox(width: 6), Text('Apple Pay')],
                      ))),
                      const SizedBox(width: 10),
                      const Expanded(child: NPGhost(child: Text('+ Add card'))),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 6, 20, 14),
                  child: NPGlass(
                    padding: const EdgeInsets.all(12),
                    radius: 14,
                    child: Row(
                      children: [
                        const Icon(Icons.confirmation_number_outlined, size: 16, color: NPColors.hero),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text('Promo code', style: NPTextStyles.body(13, color: NPColors.textDim)),
                        ),
                        Text('Apply',
                            style: NPTextStyles.heading(12, w: FontWeight.w600, color: NPColors.hero)),
                      ],
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text(
                    'By confirming, you accept the venue\'s terms and the NightPass refund policy. Covers are non-transferable.',
                    style: NPTextStyles.body(11, color: NPColors.textFaint, height: 1.6),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, NPColors.base.withValues(alpha: 0.92)],
                  stops: const [0, 0.3],
                ),
              ),
              child: NPPrimary(
                full: true,
                onPressed: () => context.go('/pass'),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.lock_outline, size: 14, color: Colors.white),
                    SizedBox(width: 8),
                    Text('Pay \$824.40'),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(k, style: NPTextStyles.body(13, color: NPColors.textDim)),
            Text(v, style: NPTextStyles.heading(13, w: FontWeight.w500)),
          ],
        ),
      );
}
