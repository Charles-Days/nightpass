import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersQuery } from './dto/list-users.query';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQuery) {
    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.search) {
      const term = query.search.trim();
      if (term) {
        where.OR = [
          { email: { contains: term, mode: 'insensitive' } },
          { name: { contains: term, mode: 'insensitive' } },
        ];
      }
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: PUBLIC_USER_SELECT,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...PUBLIC_USER_SELECT,
        applications: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            venueName: true,
            city: true,
            status: true,
            createdAt: true,
            reviewedAt: true,
          },
        },
        ownedVenues: {
          select: {
            venue: {
              select: {
                id: true,
                slug: true,
                name: true,
                city: true,
                status: true,
              },
            },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /** Cambia el rol de un usuario (solo admin). No permite cambiar el propio rol
   *  (evita auto-bloqueo). El admin es responsable de las implicaciones del rol. */
  async updateRole(adminId: string, id: string, role: Role) {
    if (id === adminId) {
      throw new BadRequestException('No puedes cambiar tu propio rol');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.role !== role) {
      await this.prisma.user.update({ where: { id }, data: { role } });
    }
    return this.getById(id);
  }
}
