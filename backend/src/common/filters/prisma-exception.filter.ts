import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Under a burst of concurrent writes, SQLite's single-writer lock can cause
 * a queued Prisma transaction to exceed its timeout — that specific,
 * recognizable condition becomes a friendly, retryable 503.
 *
 * A duplicate unique value (P2002) or an FK-blocked delete/update (P2003)
 * is NOT a busy/timeout condition — retrying an identical request would
 * fail identically forever, so those get their own clear 409 instead of
 * being lumped into "system busy." Nest's own HttpException handling
 * (BadRequestException, NotFoundException, the ValidationPipe, etc.)
 * passes through completely unchanged.
 */
@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();

    if (exception instanceof HttpException) {
      return response.status(exception.getStatus()).json(exception.getResponse());
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        const target = exception.meta?.target;
        const field = Array.isArray(target) ? target.join(', ') : typeof target === 'string' ? target : undefined;
        const message = field
          ? `A record with this ${field} already exists.`
          : 'A record with these values already exists.';
        return response.status(409).json({ statusCode: 409, error: 'Conflict', message });
      }

      if (exception.code === 'P2003') {
        return response.status(409).json({
          statusCode: 409,
          error: 'Conflict',
          message: 'This record cannot be deleted or changed because it is referenced by other records.',
        });
      }

      if (exception.code === 'P2025') {
        return response.status(404).json({
          statusCode: 404,
          error: 'Not Found',
          message: 'The requested record was not found.',
        });
      }

      // Any other known Prisma error code falls through to the busy/timeout
      // check below rather than being assumed to be one — most SQLite
      // lock/timeout failures surface with a message matching that check
      // regardless of whether they carry a PrismaClientKnownRequestError
      // wrapper or a plain Error.
    }

    const message = exception instanceof Error ? exception.message : String(exception);
    const isTimeoutOrBusy = /timeout|expired transaction|database is locked|SQLITE_BUSY|transaction api error/i.test(message);
    if (isTimeoutOrBusy) {
      return response.status(503).json({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'System is busy processing other requests — please try again in a moment.',
      });
    }

    // Unrecognized error — still hide internals, but as a generic 500.
    return response.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }
}
