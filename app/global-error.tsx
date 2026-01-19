"use client";

export default function GlobalError() {
  return (
    <html lang="fr">
      <body className="bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center text-center">
          <h1 className="text-2xl font-semibold">Erreur critique.</h1>
          <p className="mt-2 text-muted-foreground">
            Rechargez la page. Si le probleme persiste, contactez le support.
          </p>
        </div>
      </body>
    </html>
  );
}
