"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode: AuthMode;
  onSuccess?: () => void;
};

export function AuthForm({ mode, onSuccess }: AuthFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });
  const passwordMinLength = 8;
  const isRegister = mode === "register";
  const hasUppercase = /[A-Z]/.test(form.password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(form.password);
  const digitCount = (form.password.match(/\d/g) ?? []).length;
  const hasTwoDigits = digitCount >= 2;
  const passwordErrors: string[] = [];
  if (isRegister && form.password.length > 0) {
    if (form.password.length < passwordMinLength) {
      passwordErrors.push(`${passwordMinLength} caracteres minimum.`);
    }
    if (!hasUppercase) {
      passwordErrors.push("1 majuscule.");
    }
    if (!hasSpecialChar) {
      passwordErrors.push("1 caractere special.");
    }
    if (!hasTwoDigits) {
      passwordErrors.push("2 chiffres.");
    }
  }
  const isPasswordTooShort =
    isRegister && form.password.length > 0 && form.password.length < passwordMinLength;
  const isPasswordRuleMissing =
    isRegister &&
    form.password.length > 0 &&
    (!hasUppercase || !hasSpecialChar || !hasTwoDigits || isPasswordTooShort);
  const isPasswordMismatch =
    isRegister &&
    form.confirmPassword.length > 0 &&
    form.password !== form.confirmPassword;
  const isSubmitDisabled =
    isLoading ||
    (isRegister &&
      (!form.password ||
        !form.confirmPassword ||
        isPasswordRuleMissing ||
        isPasswordMismatch));

  async function handleLogin(email: string, password: string) {
    const res = await apiFetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new Error("Identifiants invalides");
    }
    const data = await res.json();
    if (!data.token) {
      throw new Error("Token manquant");
    }
    window.localStorage.setItem("jwt_token", data.token);
    window.localStorage.setItem("user_email", email);
    window.dispatchEvent(new Event("storage"));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    try {
      if (mode === "register") {
        if (
          !hasUppercase ||
          !hasSpecialChar ||
          !hasTwoDigits ||
          form.password.length < passwordMinLength
        ) {
          throw new Error(
            `Le mot de passe doit contenir ${passwordMinLength} caracteres, 1 majuscule, 1 caractere special et 2 chiffres.`
          );
        }
        if (form.password !== form.confirmPassword) {
          throw new Error("Les mots de passe ne correspondent pas.");
        }
      }
      if (mode === "register") {
        const res = await apiFetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            firstName: form.firstName,
            lastName: form.lastName,
          }),
        });
        if (!res.ok) {
          throw new Error("Inscription impossible");
        }
        await handleLogin(form.email, form.password);
      } else {
        await handleLogin(form.email, form.password);
      }
      toast({ title: mode === "login" ? "Connexion reussie" : "Compte cree" });
      onSuccess?.();
    } catch (error) {
      toast({
        title: mode === "login" ? "Connexion impossible" : "Erreur inscription",
        description: error instanceof Error ? error.message : "Erreur inconnue",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={onSubmit}>
        <div className="grid gap-3">
          {mode === "register" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="firstName" className="text-xs">Prenom</Label>
                <Input
                  id="firstName"
                  placeholder="Jean"
                  value={form.firstName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName" className="text-xs">Nom</Label>
                <Input
                  id="lastName"
                  placeholder="Dupont"
                  value={form.lastName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                />
              </div>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-xs">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nom@exemple.com"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-xs">
              Mot de passe
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
          </div>
          {mode === "register" && (
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword" className="text-xs">
                Confirmer le mot de passe
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                }
              />
              {passwordErrors.length > 0 && (
                <p className="text-xs text-destructive">
                  {passwordErrors.join(" ")}
                </p>
              )}
              {!isPasswordRuleMissing && isPasswordMismatch && (
                <p className="text-xs text-destructive">
                  Les mots de passe ne correspondent pas.
                </p>
              )}
            </div>
          )}
          <Button type="submit" disabled={isSubmitDisabled}>
            {mode === "login" ? "Se connecter" : "Creer mon compte"}
          </Button>
        </div>
      </form>
    </div>
  );
}
