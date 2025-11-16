import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function ClearLocalStoragePage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Clear browser storage
      localStorage.clear();
      sessionStorage.clear();

      // Attempt to sign out Supabase auth if available (best-effort)
      // This won't break the page if Supabase isn't loaded.
      try {
        // dynamic import to avoid SSR issues
        import('../database/supabaseConfig')
          .then(({ supabase }) => {
            try {
              supabase.auth.signOut().catch(() => {});
            } catch (e) {}
          })
          .catch(() => {});
      } catch (e) {}
    } catch (e) {
      // ignore
      console.error('Error clearing storage:', e);
    }

    // Small delay so user sees message, then redirect to admin signin
    const t = setTimeout(() => {
      router.replace('/signin_admin');
    }, 600);

    return () => clearTimeout(t);
  }, [router]);

  return (
    <div style={{ padding: 20 }}>
      <Head>
        <title>Clearing storage…</title>
      </Head>
      <h2>Clearing localStorage & sessionStorage</h2>
      <p>If your session was stored in the browser, it has now been cleared. You will be redirected to the admin sign-in page shortly.</p>
      <p>If you are not redirected automatically, click the button below:</p>
      <button onClick={() => { localStorage.clear(); sessionStorage.clear(); router.replace('/signin_admin'); }}>
        Clear now and go to sign in
      </button>
    </div>
  );
}
