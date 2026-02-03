import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'edge';

export async function GET() {
  // @ts-ignore
  const db = process.env.DB;
  const prisma = getPrisma(db);

  try {
    const templates = await prisma.template.findMany();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Fetch templates error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}
