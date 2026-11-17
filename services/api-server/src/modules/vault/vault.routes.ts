import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuditLogQuerySchema } from './vault.schemas.js';
import type { VaultService } from './vault.service.js';

/**
 * Staff-only vault routes.
 *
 * All routes in this module require a valid staff JWT with
 * role ADMIN or AUDITOR.
 */
export async function vaultRoutes(
  fastify: FastifyInstance,
  opts: { vaultService: VaultService },
): Promise<void> {
  const { vaultService } = opts;

  // ────────────────────────────────────────────────────────────
  //  Middleware: verify staff JWT + role check (ADMIN | AUDITOR)
  // ────────────────────────────────────────────────────────────

  fastify.addHook(
    'preHandler',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // fastify-jwt populates request.user on successful verification
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({ error: 'Authentication required' });
      }

      const user = request.user as { role?: string; sub?: string; type?: string };

      // Ensure this is a staff token (not a student token)
      if (user.type !== 'staff') {
        return reply.code(403).send({ error: 'Staff access required' });
      }

      const allowedRoles = ['ADMIN', 'AUDITOR'];
      if (!user.role || !allowedRoles.includes(user.role)) {
        return reply.code(403).send({ error: 'Insufficient permissions. ADMIN or AUDITOR role required.' });
      }
    },
  );

  // ────────────────────────────────────────────────────────────
  //  GET /api/v1/panel/audit-logs
  // ────────────────────────────────────────────────────────────

  fastify.get(
    '/api/v1/panel/audit-logs',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParsed = AuditLogQuerySchema.safeParse(request.query);

      if (!queryParsed.success) {
        return reply.code(400).send({
          error: 'Invalid query parameters',
          details: queryParsed.error.flatten().fieldErrors,
        });
      }

      const { limit, offset, triggerReason } = queryParsed.data;

      const result = await vaultService.getAuditLogs({
        limit,
        offset,
        triggerReason,
      });

      return reply.code(200).send({
        data: result.logs,
        pagination: {
          total: result.total,
          limit,
          offset,
        },
      });
    },
  );
}
