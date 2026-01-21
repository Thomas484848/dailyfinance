"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiFetch } from '@/lib/api-client';

export default function SettingsClient() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [alertsEmail, setAlertsEmail] = useState(true);
  const [alertsPrice, setAlertsPrice] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => {
      const tokenValue = window.localStorage.getItem('jwt_token');
      setToken(tokenValue);
      setAlertsEmail(window.localStorage.getItem('pref_alerts_email') !== 'false');
      setAlertsPrice(window.localStorage.getItem('pref_alerts_price') !== 'false');
    };
    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const res = await apiFetch('/user');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setEmail(data.email ?? '');
        setAvatarUrl(data.avatarUrl ?? null);
      } catch {
        // ignore
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [token]);
  useEffect(() => {
    if (token === null) {
      router.replace('/login');
    }
  }, [router, token]);

  if (token === undefined) return null;
  if (!token) return null;

  const savePreferences = () => {
    window.localStorage.setItem('pref_alerts_email', String(alertsEmail));
    window.localStorage.setItem('pref_alerts_price', String(alertsPrice));
    toast({ title: 'Preferences enregistrees' });
  };

  const handleAvatarChange = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Format invalide', description: 'Selectionnez une image.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) return;
      const updateProfile = async () => {
        try {
          const res = await apiFetch('/user', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatarUrl: result }),
          });
          if (!res.ok) {
            throw new Error('Erreur mise a jour');
          }
          const data = await res.json();
          setAvatarUrl(data.avatarUrl ?? result);
          toast({ title: 'Photo de profil mise a jour' });
        } catch (error) {
          toast({
            title: 'Erreur',
            description: error instanceof Error ? error.message : 'Erreur inconnue',
            variant: 'destructive',
          });
        }
      };
      updateProfile();
    };
    reader.readAsDataURL(file);
  };

  const deleteAccount = () => {
    const confirmed = window.confirm(
      'Cette action est definitive. Souhaitez-vous vraiment supprimer le compte ?'
    );
    if (!confirmed) return;
    window.localStorage.clear();
    window.location.reload();
  };

  const logout = () => {
    window.localStorage.removeItem('jwt_token');
    window.localStorage.removeItem('user_email');
    window.location.reload();
  };

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-white">Parametres</h1>
        <p className="text-xs text-muted-foreground">
          Gere vos preferences et ta securite en un seul endroit.
        </p>
      </div>

      <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Informations liees a ton compte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full border bg-muted">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="Photo de profil" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      Photo
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Photo de profil</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Email</label>
                <Input value={email} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Mot de passe</label>
                <Input type="password" value="********" readOnly />
              </div>
              <Button variant="outline">Modifier le mot de passe</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choisis ce que tu veux recevoir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Alertes email</p>
                  <p className="text-xs text-muted-foreground">Resume quotidien et news clefs.</p>
                </div>
                <input
                  type="checkbox"
                  checked={alertsEmail}
                  onChange={(event) => setAlertsEmail(event.target.checked)}
                  className="h-4 w-4 accent-black"
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Alertes de prix</p>
                  <p className="text-xs text-muted-foreground">Seuils personnalises.</p>
                </div>
                <input
                  type="checkbox"
                  checked={alertsPrice}
                  onChange={(event) => setAlertsPrice(event.target.checked)}
                  className="h-4 w-4 accent-black"
                />
              </label>
              <Button onClick={savePreferences}>Enregistrer</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Apparence</CardTitle>
              <CardDescription>Choisis le theme pour l'interface.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={theme === 'dark' ? 'secondary' : 'outline'}
                  onClick={() => setTheme('dark')}
                >
                  Sombre
                </Button>
                <Button
                  variant={theme === 'light' ? 'secondary' : 'outline'}
                  onClick={() => setTheme('light')}
                >
                  Clair
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Le theme est memorise pour ta prochaine connexion.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
              <CardDescription>Gestion du compte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="destructive" onClick={logout}>
                Se deconnecter
              </Button>
              <Button variant="outline" onClick={() => router.replace('/')}>
                Retour a l'accueil
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">Zone dangereuse</CardTitle>
              <CardDescription>Actions irreversibles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="destructive" onClick={deleteAccount}>
                Supprimer le compte
              </Button>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
