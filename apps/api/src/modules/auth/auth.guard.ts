import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { ROLES_KEY } from "./roles.decorator";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.headers["x-user-id"] as string;
    const sessionToken = request.headers["x-session-token"] as string;

    if (!userId) {
      throw new UnauthorizedException("Authentication required");
    }

    if (sessionToken) {
      const session = await this.prisma.session.findFirst({
        where: { token: sessionToken, userId, expiresAt: { gt: new Date() } },
        include: { user: true },
      });

      if (!session) {
        throw new UnauthorizedException("Invalid or expired session");
      }

      request.user = session.user;
    } else {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new UnauthorizedException("User not found");
      request.user = user;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && !requiredRoles.includes(request.user.role)) {
      throw new UnauthorizedException("Insufficient permissions");
    }

    return true;
  }
}
