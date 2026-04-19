export function mapFirebaseAuthError(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    const code = String((e as { code: string }).code);
    const map: Record<string, string> = {
      "auth/email-already-in-use": "Email already registered",
      "auth/invalid-email": "Invalid email",
      "auth/weak-password": "Password is too weak",
      "auth/user-not-found": "Invalid credentials",
      "auth/wrong-password": "Invalid credentials",
      "auth/invalid-credential": "Invalid credentials",
      "auth/too-many-requests": "Too many attempts. Try again later.",
    };
    if (map[code]) return map[code];
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}
