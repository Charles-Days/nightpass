import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class NPColors {
  static const base = Color(0xFF0A0A0F);
  static const base2 = Color(0xFF11111B);
  static const deep = Color(0xFF1A0B2E);
  static const deep2 = Color(0xFF2D1B4E);
  static const hero = Color(0xFFA855F7);
  static const hero2 = Color(0xFF9333EA);
  static const magenta = Color(0xFFEC4899);
  static const neonOrange = Color(0xFFFF7A1A);
  static const neonAmber = Color(0xFFFFA94D);
  static const neonHot = Color(0xFFFF3D00);
  static const indigoDeep = Color(0xFF1E1147);
  static const violetGlow = Color(0xFFB266FF);
  static const cyan = Color(0xFF06B6D4);
  static const text = Color(0xFFF5F3FF);
  static Color textDim = const Color(0xFFF5F3FF).withValues(alpha: 0.62);
  static Color textFaint = const Color(0xFFF5F3FF).withValues(alpha: 0.40);
  static Color hairline = const Color(0xFFF5F3FF).withValues(alpha: 0.08);
  static Color glassBg = Colors.white.withValues(alpha: 0.05);
  static Color glassBorder = Colors.white.withValues(alpha: 0.08);
  static const success = Color(0xFF22C55E);
  static const successText = Color(0xFF86EFAC);
  static const warning = Color(0xFFFBBF24);
  static const heroSoft = Color(0xFFE9D5FF);
  static const magentaSoft = Color(0xFFFBCFE8);
  static const cyanSoft = Color(0xFFA5F3FC);
}

class NPTextStyles {
  static TextStyle display(double size, {FontWeight w = FontWeight.w700, Color? color, double letterSpacing = -0.02}) =>
      GoogleFonts.spaceGrotesk(
        fontSize: size,
        fontWeight: w,
        letterSpacing: size * letterSpacing,
        color: color ?? NPColors.text,
        height: 1.1,
      );

  static TextStyle heading(double size, {FontWeight w = FontWeight.w600, Color? color}) => GoogleFonts.spaceGrotesk(
        fontSize: size,
        fontWeight: w,
        color: color ?? NPColors.text,
      );

  static TextStyle body(double size, {FontWeight w = FontWeight.w400, Color? color, double height = 1.4}) =>
      GoogleFonts.inter(
        fontSize: size,
        fontWeight: w,
        color: color ?? NPColors.text,
        height: height,
      );

  static TextStyle label({Color? color, double size = 11, double spacing = 0.08}) => GoogleFonts.spaceGrotesk(
        fontSize: size,
        fontWeight: FontWeight.w500,
        letterSpacing: size * spacing,
        color: color ?? NPColors.textDim,
      );

  static TextStyle mono({double size = 13, Color? color, FontWeight w = FontWeight.w600}) =>
      GoogleFonts.firaCode(fontSize: size, fontWeight: w, color: color ?? NPColors.text, letterSpacing: size * 0.06);
}

ThemeData buildNPTheme() {
  return ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: NPColors.base,
    primaryColor: NPColors.hero,
    colorScheme: ColorScheme.dark(
      primary: NPColors.hero,
      secondary: NPColors.magenta,
      surface: NPColors.base,
      onSurface: NPColors.text,
    ),
    textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).apply(
      bodyColor: NPColors.text,
      displayColor: NPColors.text,
    ),
    useMaterial3: true,
  );
}
