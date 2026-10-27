"use server";

import { safeNext } from '@/lib/continuation';
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";

async function callbackUrl(nextPath?: string) {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") || "http";
  const origin = host ? `${proto}://${host}` : "http://localhost:3000";
  if (nextPath) return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  return `${origin}/auth/callback`;
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  // If password is provided, try password login
  if (password) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { message: error.message };
    }

    revalidatePath("/", "layout");
    redirect(safeNext(formData.get("next")));
  } 
  // Otherwise fall back to Magic Link / OTP
  else {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // This ensures the link sent to email points to the correct domain
        emailRedirectTo: await callbackUrl(safeNext(formData.get("next"))),
      },
    });

    if (error) {
      return { message: error.message };
    }

    return redirect("/login?message=Check email to continue sign in process&next="+encodeURIComponent(safeNext(formData.get("next"))));
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  const data = {
    email,
    password,
    options: {
      // This ensures the confirmation link points to the correct domain
      emailRedirectTo: await callbackUrl(safeNext(formData.get("next"))),
    },
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    return { message: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/login?message=Check email to continue sign in process&next="+encodeURIComponent(safeNext(formData.get("next"))));
}

export async function signInWithGoogle(formData?: FormData) {
  const supabase = await createClient();
  const next = safeNext(formData?.get("next") ?? null);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: await callbackUrl(next),
    },
  });

  if (error) {
    return { message: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signInWithDiscord(formData?: FormData) {
  const supabase = await createClient();
  const next = safeNext(formData?.get("next") ?? null);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: await callbackUrl(next),
    },
  });

  if (error) {
    return { message: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}