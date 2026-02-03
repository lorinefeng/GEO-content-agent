import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'edge';

export async function PUT(
  req: NextRequest,
  { params }: { params: { strategy: string } }
) {
  // @ts-ignore
  const db = process.env.DB;
  const prisma = getPrisma(db);
  const { strategy } = params;

  try {
    const body = await req.json();
    const { prompt, name } = body;

    const template = await prisma.template.upsert({
      where: { strategy },
      update: { prompt, name: name || strategy },
      create: { strategy, prompt, name: name || strategy },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}
