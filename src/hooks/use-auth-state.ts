import { useEffect, useState } from "react";

type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  createdAt?: string;
};

export function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await response.json().catch(() => null);

        if (!isMounted) return;

        if (response.ok && data?.user?.id) {
          setUser(data.user as AuthUser);
        } else {
          setUser(null);
        }
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
  };
}