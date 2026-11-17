import type { FastifyInstance } from 'fastify';
import {
  CreateStudentSchema,
  UpdateStudentSchema,
  ListStudentsQuerySchema,
  BulkImportStudentsSchema,
} from './students.schemas.js';
import type { StudentsService } from './students.service.js';
import { createLogger } from '../../config/logger.js';

const log = createLogger('students-routes');

export async function studentsRoutes(
  app: FastifyInstance,
  opts: { studentsService: StudentsService },
): Promise<void> {
  const { studentsService } = opts;

  // -------------------------------------------------------------
  // GET /api/v1/panel/students
  // -------------------------------------------------------------
  app.get(
    '/api/v1/panel/students',
    { preHandler: [app.staffAuth] },
    async (request, reply) => {
      const parsed = ListStudentsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      try {
        const result = await studentsService.listStudents(parsed.data);
        return reply.code(200).send(result);
      } catch (err) {
        log.error('List students error', { error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to list students' });
      }
    },
  );

  // -------------------------------------------------------------
  // POST /api/v1/panel/students (Add new student)
  // -------------------------------------------------------------
  app.post(
    '/api/v1/panel/students',
    { preHandler: [app.staffAuth] },
    async (request, reply) => {
      const parsed = CreateStudentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      try {
        const student = await studentsService.createStudent(parsed.data);
        return reply.code(201).send({ student });
      } catch (err) {
        log.error('Create student error', { error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to create student' });
      }
    },
  );

  // -------------------------------------------------------------
  // PUT /api/v1/panel/students/:studentId
  // -------------------------------------------------------------
  app.put(
    '/api/v1/panel/students/:studentId',
    { preHandler: [app.staffAuth] },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };
      const parsed = UpdateStudentSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      try {
        await studentsService.updateStudent(studentId, parsed.data);
        return reply.code(200).send({ status: 'UPDATED' });
      } catch (err) {
        log.error('Update student error', { error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to update student' });
      }
    },
  );

  // -------------------------------------------------------------
  // DELETE /api/v1/panel/students/:studentId
  // -------------------------------------------------------------
  app.delete(
    '/api/v1/panel/students/:studentId',
    { preHandler: [app.staffAuth] },
    async (request, reply) => {
      const { studentId } = request.params as { studentId: string };

      try {
        await studentsService.deleteStudent(studentId);
        return reply.code(200).send({ status: 'DELETED' });
      } catch (err) {
        log.error('Delete student error', { error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to delete student' });
      }
    },
  );

  // -------------------------------------------------------------
  // POST /api/v1/panel/students/bulk
  // -------------------------------------------------------------
  app.post(
    '/api/v1/panel/students/bulk',
    { preHandler: [app.staffAuth] },
    async (request, reply) => {
      const parsed = BulkImportStudentsSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      try {
        const result = await studentsService.bulkImport(parsed.data.students);
        return reply.code(200).send(result);
      } catch (err) {
        log.error('Bulk import error', { error: (err as Error).message });
        return reply.code(500).send({ error: 'Failed to bulk import students' });
      }
    },
  );
}
