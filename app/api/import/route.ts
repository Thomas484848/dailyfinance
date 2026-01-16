import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verifier la cle secrete
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.IMPORT_SECRET_KEY;

    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Non autorise' },
        { status: 401 }
      );
    }

    // En environnement serverless, on ne peut pas executer de scripts longs
    // On retourne les instructions
    return NextResponse.json({
      message: 'Import non disponible via API en environnement serverless',
      instructions: [
        'Executez la commande suivante en local:',
        'npm run import:stocks',
        '',
        'Ou deployez un worker/job separe pour les imports.',
      ],
    });
  } catch (error) {
    console.error('POST /api/import error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'import' },
      { status: 500 }
    );
  }
}

