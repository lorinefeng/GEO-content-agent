import { PrismaClient } from '../generated/prisma';
import { PrismaD1 } from '@prisma/adapter-d1';

let prisma: PrismaClient;

export function getPrisma(db?: any) {
  if (db) {
    const adapter = new PrismaD1(db);
    return new PrismaClient({ adapter });
  }
  
  // Local development or if DB is not provided
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}
