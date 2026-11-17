import type { FastifyRequest, FastifyReply } from 'fastify';

export interface UserPayload {
  sub: string;
  type: 'student' | 'staff';
  role?: 'DISPATCHER' | 'ADMIN' | 'AUDITOR';
  email: string;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UserPayload;
    user: UserPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    studentAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    staffAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyStaffJwt: (token: string) => Promise<{ staffId: string; role: string }>;
  }
}

export async function studentAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Authentication required' });
  }

  const user = request.user as UserPayload;
  if (!user || user.type !== 'student') {
    return reply.code(403).send({ error: 'Student access required' });
  }
}

export async function staffAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Authentication required' });
  }

  const user = request.user as UserPayload;
  if (!user || user.type !== 'staff') {
    return reply.code(403).send({ error: 'Staff access required' });
  }
}
