"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";
import AmbientOrbit from "@/components/auth/ambient-orbit";
import { TrendingUpIcon } from "@/components/icons/trending-up-icon";

export default function LoginClient() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("jwt_token")) {
      router.replace("/");
    }
  }, [router]);

  return (
    <div className="container relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 font-display">
      <Link
        href="/register"
        className="absolute right-4 top-4 md:right-8 md:top-8 text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Creer un compte
      </Link>
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
        <div className="absolute inset-0 bg-black" />
        <AmbientOrbit />
        <div className="relative z-20 flex items-center gap-4 text-2xl font-semibold tracking-wide">
          <TrendingUpIcon size={36} strokeWidth={2} />
          Daily Finance
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-sm">
              &ldquo;Analysez une action facilement, en toute clarte.&rdquo;
            </p>
            <footer className="text-xs">Daily Finance</footer>
          </blockquote>
        </div>
      </div>
      <div className="flex h-full items-center justify-center lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-3 text-center">
            <CardTitle className="mx-auto w-fit whitespace-nowrap text-center text-[28px] font-semibold leading-tight tracking-tight text-white">
              Connexion
            </CardTitle>
            <CardDescription className="mx-auto max-w-[320px] text-sm leading-relaxed">
              L&apos;analyse facile pour les actions cotees en bourse.
            </CardDescription>
          </div>
          <AuthForm mode="login" onSuccess={() => router.replace("/")} />
          <p className="px-8 text-center text-xs text-muted-foreground">
            En continuant, vous acceptez nos{" "}
            <Link href="#" className="underline underline-offset-4">
              conditions d&apos;utilisation
            </Link>{" "}
            et{" "}
            <Link href="#" className="underline underline-offset-4">
              politique de confidentialite
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

