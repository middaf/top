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
import '../styles/admin-dashboard.css';
import ErrorBoundary from '../components/ErrorBoundary';
import { config } from '../utils/config';

// ChatBot is rendered only on the user dashboard (profile page).
// Moved rendering into the profile page so admin pages don't load the widget.

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const publicPaths = ['/signin', '/signin_admin', '/signup'];
  const [sessionInterval, setSessionInterval] = useState(null);

  // Disable all session and activity tracking to prevent signin conflicts

  // Disable automatic route guard to prevent signin conflicts
  // Individual pages will handle their own auth checks if needed

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