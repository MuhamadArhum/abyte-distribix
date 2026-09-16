import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

function mockHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host: any = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  };
  return { host, status, json };
}

describe('PrismaExceptionFilter', () => {
  let filter: PrismaExceptionFilter;

  beforeEach(() => {
    filter = new PrismaExceptionFilter();
  });

  it('maps P2002 (unique constraint) to 409 with a friendly, field-specific message', () => {
    const { host, status, json } = mockHost();
    const err = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on the fields: (`invoiceNumber`)',
      { code: 'P2002', clientVersion: '6.19.3', meta: { target: ['invoiceNumber'] } },
    );

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 409,
      message: expect.stringContaining('invoiceNumber'),
    }));
  });

  it('maps P2003 (foreign key constraint) to 409 with a friendly message, no raw Prisma internals', () => {
    const { host, status, json } = mockHost();
    const err = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed on the field: `purchaseId`',
      { code: 'P2003', clientVersion: '6.19.3', meta: { field_name: 'purchaseId' } },
    );

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(409);
    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(409);
    expect(body.message).not.toMatch(/Prisma|constraint failed on the field/i);
  });

  it('maps a genuine SQLite lock/timeout error to 503, not 500 or 409', () => {
    const { host, status, json } = mockHost();
    const err = new Error(
      'Transaction API error: Transaction already closed: A query cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms, however 5518 ms passed.',
    );

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 503 }));
  });

  it('maps a "database is locked" style message to 503', () => {
    const { host, status, json } = mockHost();
    filter.catch(new Error('SQLITE_BUSY: database is locked'), host);
    expect(status).toHaveBeenCalledWith(503);
  });

  it('passes an existing HttpException through unchanged (e.g. business validation errors)', () => {
    const { host, status, json } = mockHost();
    const err = new BadRequestException('Insufficient filled stock for this cylinder type');

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(err.getResponse());
  });

  it('does not classify an unrelated/unknown error as busy — falls back to a generic 500 with no internal leakage', () => {
    const { host, status, json } = mockHost();
    filter.catch(new TypeError('Cannot read properties of undefined (reading \'foo\')'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.message).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toMatch(/Cannot read properties/);
  });

  it('maps P2025 (record not found) to 404, not 503', () => {
    const { host, status, json } = mockHost();
    const err = new Prisma.PrismaClientKnownRequestError('An operation failed because it depends on one or more records that were required but not found.', {
      code: 'P2025',
      clientVersion: '6.19.3',
    });

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(404);
  });
});
