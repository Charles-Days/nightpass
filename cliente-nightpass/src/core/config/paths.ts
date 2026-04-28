export const paths = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  solicitarLocal: '/solicitar-local',
  adminApplications: '/admin/solicitudes',
  adminUsers: '/admin/usuarios',
  adminVenues: '/admin/locales',
  cambiarPassword: '/cambiar-password',
  miLocal: '/mi-local',
  miLocalEventos: '/mi-local/eventos',
  miLocalStaff: '/mi-local/staff',
} as const;

export type AppPath = (typeof paths)[keyof typeof paths];
