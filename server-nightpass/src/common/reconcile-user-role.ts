import { Logger } from '@nestjs/common';
import { Prisma, Role, VenueStaffStatus } from '@prisma/client';

const logger = new Logger('reconcileUserRole');

const PANEL_ROLES: Role[] = [
  Role.VENUE_OWNER,
  Role.VENUE_STAFF,
  Role.PROMOTER,
  Role.PROMOTER_STAFF,
  Role.RP,
];

/**
 * Degrada a CUSTOMER a un usuario que ya no tiene NINGUNA membresía de panel.
 *
 * Cuenta TODAS las fuentes de rol de panel a la vez — dueño de local, staff
 * activo, miembro de organizador y perfil RP — para evitar dejar roles
 * huérfanos cuando un usuario tiene más de una membresía a la vez (p.ej. un
 * PROMOTER que además es dueño de un local: quitarlo del organizador NO debe
 * degradarlo mientras siga siendo dueño). Solo degrada roles de panel — nunca
 * toca ADMIN ni a quien ya sea CUSTOMER.
 *
 * Debe llamarse DENTRO de una `$transaction`, después de remover la membresía.
 */
export async function reconcileUserRole(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  try {
    const [ownedVenues, activeStaff, promoterMemberships, rpProfiles] =
      await Promise.all([
        tx.venueOwner.count({ where: { userId } }),
        tx.venueStaff.count({
          where: { userId, status: { not: VenueStaffStatus.REVOKED } },
        }),
        tx.promoterMember.count({ where: { userId } }),
        tx.rpProfile.count({ where: { userId } }),
      ]);

    const remaining =
      ownedVenues + activeStaff + promoterMemberships + rpProfiles;
    if (remaining === 0) {
      await tx.user.updateMany({
        where: { id: userId, role: { in: PANEL_ROLES } },
        data: { role: Role.CUSTOMER },
      });
    }
  } catch (err) {
    // Cleanup best-effort: degradar el rol es secundario a la operación que nos
    // llama (remover la membresía, que ya ocurrió en la misma tx). Un fallo aquí
    // deja a lo sumo un rol de panel huérfano, recuperable, y no debe abortar el
    // flujo principal. Por eso solo logueamos y NO relanzamos.
    logger.error(
      `No se pudo reconciliar el rol del usuario ${userId} (degradar a CUSTOMER): ${(err as Error).message}`,
      (err as Error).stack,
    );
  }
}
