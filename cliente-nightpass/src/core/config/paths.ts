export const paths = {
  home: '/',
  login: '/login',
  dashboard: '/dashboard',
  solicitarLocal: '/solicitar-local',
  adminApplications: '/admin/solicitudes',
  adminUsers: '/admin/usuarios',
  adminVenues: '/admin/locales',
  adminVenuesCreate: '/admin/locales/nuevo',
  cambiarPassword: '/cambiar-password',
  miLocal: '/mi-local',
  miLocalEditar: '/mi-local/editar',
  miLocalEventos: '/mi-local/eventos',
  miLocalStaff: '/mi-local/staff',
} as const;

export type AppPath = (typeof paths)[keyof typeof paths];
