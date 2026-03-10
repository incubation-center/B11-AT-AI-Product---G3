"use server";

import { auth } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { getBaseUrl } from "@/lib/url-utils";

export const signIn = async (email: string, password: string) => {
  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });
    return {
      success: true,
      message: "Sign in successful",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: { error: e.message || "An error occurred" },
    };
  }
};

export const signUp = async (
  username: string,
  email: string,
  password: string
) => {
  try {
    await auth.api.signUpEmail({
      body: {
        name: username,
        email,
        password,
      },
    });

    return {
      success: true,
      message: "Sign up successful",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: { error: e.message || "An error occurred during sign up" },
    };
  }
};

export const logout = async () => {
  try {
    // provide a minimal headers object; better-auth expects headers in the request options
    await auth.api.signOut({ headers: new Headers() });
    return {
      success: true,
      message: "Logged out successfully",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: { error: e.message || "An error occurred during logout" },
    };
  }
};

export const requestPasswordReset = async (email: string) => {
  try {
    const baseUrl = getBaseUrl();
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${baseUrl}/reset-password`,
      },
    });

    return {
      success: true,
      message:
        "If an account with that email exists, a reset link has been sent.",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: {
        error: e.message || "An error occurred while requesting password reset",
      },
    };
  }
};

export const resetPassword = async (token: string, newPassword: string) => {
  try {
    const { data, error } = await authClient.resetPassword({
      newPassword: newPassword,
      token,
    });
    console.log("resetpw", data, error);

    return { success: true, message: "Password has been reset" };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: {
        error: e.message || "An error occurred while resetting password",
      },
    };
  }
};
