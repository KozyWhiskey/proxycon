"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/utils/supabase/server";
import { getURL } from "@/lib/utils";

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
      return redirect("/login?message=Could not authenticate user");
    }

    revalidatePath("/", "layout");
    redirect("/");
  } 
  // Otherwise fall back to Magic Link / OTP
  else {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // This ensures the link sent to email points to the correct domain
        emailRedirectTo: `${getURL()}auth/callback`,
      },
    });

    if (error) {
      return redirect("/login?message=Could not authenticate user");
    }

    return redirect("/login?message=Check email to continue sign in process");
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
      emailRedirectTo: `${getURL()}auth/callback`,
    },
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    return redirect("/login?message=Could not authenticate user");
  }

  revalidatePath("/", "layout");
  redirect("/login?message=Check email to continue sign in process");
}