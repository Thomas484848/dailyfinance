"use client";

export default function Error() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold">Une erreur est survenue.</h1>
      <p className="mt-2 text-muted-foreground">
        Rechargez la page ou essayez a nouveau.
      </p>
    </div>
  );
}
