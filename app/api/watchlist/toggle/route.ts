import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userKey, stockId } = body;

    if (!userKey || !stockId) {
      return NextResponse.json(
        { error: 'userKey et stockId requis' },
        { status: 400 }
      );
    }

    // Verifier si l'action existe
    const stock = await prisma.stock.findUnique({
      where: { id: stockId },
    });

    if (!stock) {
      return NextResponse.json(
        { error: 'Action non trouvee' },
        { status: 404 }
      );
    }

    // Verifier si deja dans la watchlist
    const existing = await prisma.watchlistItem.findUnique({
      where: {
        userKey_stockId: {
          userKey,
          stockId,
        },
      },
    });

    if (existing) {
      // Supprimer de la watchlist
      await prisma.watchlistItem.delete({
        where: { id: existing.id },
      });

      return NextResponse.json({
        added: false,
        message: 'Retire de la watchlist',
      });
    } else {
      // Ajouter a la watchlist
      await prisma.watchlistItem.create({
        data: {
          userKey,
          stockId,
        },
      });

      return NextResponse.json({
        added: true,
        message: 'Ajoute a la watchlist',
      });
    }
  } catch (error) {
    console.error('POST /api/watchlist/toggle error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise a jour de la watchlist' },
      { status: 500 }
    );
  }
}

