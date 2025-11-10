import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AnimatePresence } from 'framer-motion';
import ThemeProvider from '../../providers/ThemeProvider';
import '../styles/contact.css';
import '../styles/dashboard.css';
import '../styles/signup.css';
import '../styles/home.css';
import '../styles/global.css';
import '../styles/admin-components.css';
import ErrorBoundary from '../components/ErrorBoundary';
import { config } from '../utils/config';

// ChatBot is rendered only on the user dashboard (profile page).
// Moved rendering into the profile page so admin pages don't load the widget.

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const publicPaths = ['/signin', '/signin_admin', '/signup'];
  const [sessionInterval, setSessionInterval] = useState(null);

    useEffect(() => {
        let timeoutHandle;
        
        // Update last activity and setup session expiry checks
        const updateActivity = () => {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            timeoutHandle = setTimeout(() => {
                try { localStorage.setItem('lastActivity', Date.now().toString()); } catch (e) { /* ignore */ }
            }, 1000); // Debounce activity updates
        };

        const checkSessionExpiry = () => {
            try {
                const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0', 10);
                const now = Date.now();
                if (lastActivity === 0) {
                    updateActivity();
                    return true;
                }
                
                // Skip expiry check if we're already on a public path
                if (publicPaths.includes(router.pathname)) {
                    return true;
                }
                
                if (now - lastActivity > config.sessionTimeout) {
                    // Get current path before clearing storage
                    const currentPath = router.pathname;
                    localStorage.clear();
                    try { sessionStorage.clear(); } catch (e) { }
                    // Only navigate if not already on signin
                    if (currentPath !== '/signin') {
                        router.push('/signin?systemRedirect=true');
                    }
                    return false;
                }
                return true;
            } catch (e) {
                console.error('Session expiry check failed:', e);
                return true;
            }
        };    // attach listeners
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);
    updateActivity();

    const interval = setInterval(checkSessionExpiry, 60000);
    setSessionInterval(interval);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      if (interval) clearInterval(interval);
    };
  }, [router]);

  useEffect(() => {
    // Route-guard: redirect unauthenticated users away from protected pages
    const handleRouteChange = (url) => {
      if (typeof window === 'undefined') return;
      const path = url.split('?')[0];
      const user = JSON.parse(localStorage.getItem('activeUser') || 'null');

      // update activity
      try { localStorage.setItem('lastActivity', Date.now().toString()); } catch (e) {}

      // Check if the current navigation is part of our routing logic to prevent loops
      const isSystemNavigation = router.asPath.includes('?systemRedirect=true');
      
      // Skip route guard checks if we're already doing a system redirect
      if (isSystemNavigation) return;

      if (!publicPaths.includes(path) && !user?.id) {
        // avoid pushing to signin if we're already navigating there
        if (path !== '/signin') {
          router.push('/signin?systemRedirect=true');
        }
        return;
      }

      if (publicPaths.includes(path) && user?.id) {
        const dest = user.admin ? '/dashboard_admin' : '/profile';
        // only navigate if not already on the destination
        if (path !== dest) {
          router.push(`${dest}?systemRedirect=true`);
        }
      }
    };

    handleRouteChange(router.pathname);
    router.events.on('routeChangeStart', handleRouteChange);
    return () => router.events.off('routeChangeStart', handleRouteChange);
  }, [router]);

  return (
    <ThemeProvider>
      <Head>
        <title>TopmintInvest</title>
        <meta charSet="UTF-8"/>
        <meta httpEquiv="X-UA-Compatible" content="IE=edge"/>
        <meta name="theme-color" content='#0672CD'/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <link rel="icon" href="/topmintSmall.png"/>
        <link rel="apple-touch-icon" href="/topmintSmall.png"/>
        <meta property="og:title" content="Topmintinvest"/>
        <meta property="og:description" content="Topmint Investment corporation is a trusted paying binary and Cryptocurrency trading company. Earn high returns from our proven trading strategies."/>
      </Head>
      <AnimatePresence mode='wait'>
          <div className="app-wrapper" key="app-content">
          {/* ChatBot is rendered inside the user profile page only */}
          <Component {...pageProps} />
        </div>
      </AnimatePresence>
    </ThemeProvider>
  );
}