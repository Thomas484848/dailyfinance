// Hook toast simple (placeholder)
// Pour une implémentation complète, utilisez shadcn/ui toast

export function useToast() {
  const toast = ({
    title,
    description,
    variant,
  }: {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }) => {
    // Pour l'instant, on utilise un simple alert
    // TODO: Implémenter un vrai système de toast avec shadcn/ui
    const message = description ? `${title}\n${description}` : title;
    if (variant === 'destructive') {
      console.error(message);
    } else {
      console.log(message);
    }
    // Alert temporaire
    alert(message);
  };

  return { toast };
}

