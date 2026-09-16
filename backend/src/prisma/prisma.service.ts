import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();

    // SQLite defaults to "DELETE" journal mode, where every write takes an
    // exclusive lock on the whole file and blocks all concurrent reads too.
    // WAL lets one writer and many readers run at the same time — critical
    // once real traffic (multiple companies) hits the API concurrently.
    // journal_mode persists in the file itself; busy_timeout is per-connection
    // and must be re-applied on every boot, which is why both live here.
    // Both PRAGMAs return their new value as a result row, which SQLite's
    // `execute` protocol rejects — they must go through `queryRawUnsafe`.
    await this.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await this.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
