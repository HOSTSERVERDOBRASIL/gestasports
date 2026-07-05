import "fastify";
import type { UserRole } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    // Each is an array of two preHandlers (see auth.plugin.ts): jwtVerify()/role/module checks,
    // then a separate hook that establishes the AsyncLocalStorage tenant context.
    authenticate: ((request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>)[];
    authorize: (
      roles: UserRole[]
    ) => ((request: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>)[];
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      tenantId: string | null;
      role: UserRole;
      roles: UserRole[];
      name: string;
      email: string;
    };
    user: {
      sub: string;
      tenantId: string | null;
      role: UserRole;
      roles: UserRole[];
      name: string;
      email: string;
    };
  }
}
