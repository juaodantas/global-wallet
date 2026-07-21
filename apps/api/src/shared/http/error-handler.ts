import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | Error, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      void reply.status(error.statusCode).send({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
      return;
    }

    if (error instanceof ZodError) {
      void reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: { issues: error.issues } } });
      return;
    }

    void reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  });
}
