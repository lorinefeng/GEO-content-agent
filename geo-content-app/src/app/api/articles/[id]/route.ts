import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'edge';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // @ts-ignore
  const db = process.env.DB;
  const prisma = getPrisma(db);
  const { id } = params;

  try {
    const deleted = await prisma.article.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error('Delete article error:', error);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}
