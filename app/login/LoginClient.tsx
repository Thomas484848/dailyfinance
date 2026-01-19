"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";
import { TrendingUpIcon } from "@/components/icons/trending-up-icon";
import AmbientOrbit from "@/components/auth/ambient-orbit";

export default function LoginClient() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("jwt_token")) {
      router.replace("/");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 md:px-12 font-display relative overflow-hidden">
      <div className="absolute inset-0">
        <AmbientOrbit />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/70" />
      <div className="relative w-full max-w-md">
        <Card className="border-white/10 bg-white text-black shadow-2xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex items-center gap-3 text-xl font-semibold tracking-wide text-black">
              <TrendingUpIcon size={28} strokeWidth={2} />
              Daily Finance
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight text-black">
              Se connecter
            </CardTitle>
            <CardDescription className="text-neutral-600">
              Accedez a votre tableau de bord.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AuthForm mode="login" onSuccess={() => router.replace("/")} />
            <div className="text-center text-xs text-muted-foreground">
              Pas de compte ?{" "}
              <Link href="/register" className="underline underline-offset-4">
                Creer un compte
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
