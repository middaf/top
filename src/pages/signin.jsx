import { useState, useRef, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import { supabase, supabaseAuth, supabaseDb } from '../database/supabaseUtils';
import { themeContext } from '../../providers/ThemeProvider';

// Simplified, clean version to resolve syntax issues
export default function Signin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordShow, setPasswordShow] = useState(false);
    const [verifyState, setVerifyState] = useState('Default'); // Default | verifying | verified
    const [errMsg, setErrMsg] = useState('');
    const verifyRef = useRef(null);
    const ctx = useContext(themeContext);
    const { registerFromPath } = ctx || {};

    // No automatic redirects - signin page is completely independent

    const handleVerify = () => {
        if (verifyState === 'Default') {
            setVerifyState('verifying');
            setTimeout(() => {
                setVerifyState('verified');
                if (verifyRef.current) verifyRef.current.checked = true;
            }, 2000);
        } else {
            setVerifyState('verified');
            if (verifyRef.current) verifyRef.current.checked = true;
        }
    };

    function clearErrorSoon() {
        setTimeout(() => setErrMsg(''), 3000);
    }

    async function handleSignIn(e) {
        e.preventDefault();
        if (!verifyRef.current?.checked) {
            setErrMsg('Please complete the human verification');
            clearErrorSoon();
            return;
        }
        if (!email.trim() || !password) {
            setErrMsg('Please enter email and password');
            clearErrorSoon();
            return;
        }
        // Auth with Supabase
        let authResult;
        try {
            authResult = await supabaseAuth.signIn(email.trim(), password);
            if (authResult.error) {
                throw authResult.error;
            }
        } catch (authErr) {
            console.error('Auth error:', authErr);
            setErrMsg('Incorrect email or password');
            clearErrorSoon();
            return;
        }

        // Supabase user lookup
        let dbUser = null;
        try {
            const userResult = await supabaseDb.getUserByEmail(email.trim().toLowerCase());
            if (userResult.data) {
                dbUser = userResult.data;
            }
        } catch (dbErr) {
            console.warn('Database user lookup failed:', dbErr);
        }

        // Check if account is suspended
        if (dbUser?.account_status === 'suspended') {
            setErrMsg('Your account has been suspended. Please contact support.');
            clearErrorSoon();
            return;
        }
        
        const activeUser = {
            name: dbUser?.name || authResult.data.user?.user_metadata?.name || '',
            email: email.trim().toLowerCase(),
            uid: authResult.data.user?.id,
            admin: Boolean(dbUser?.admin),
            id: dbUser?.id || null,
            idnum: dbUser?.idnum || null,
            password: '******'
        };
        try { localStorage.setItem('activeUser', JSON.stringify(activeUser)); } catch(_) {}
        try { sessionStorage.setItem('activeUser', JSON.stringify(activeUser)); } catch(_) {}
        setVerifyState('Default');

        // Simple redirect without system flags
        const destination = activeUser.admin ? '/dashboard_admin' : '/profile';
        window.location.href = destination; // Use direct navigation to avoid router conflicts
    }

    return (
        <div className='signupCntn'>
            <Head>
                <title>Sign In</title>
                <meta property='og:title' content='Sign In' />
            </Head>
            <div className='leftSide'>
                <video src='signup_vid2.mp4' autoPlay loop muted />
                <div className='overlay'>
                    <h2>&quot;Look First -<br /> Then Leap.&quot;</h2>
                    <p><span>--</span> Alex Hennold <span>--</span></p>
                </div>
            </div>
            <div className='rightSide'>
                <form onSubmit={handleSignIn}>
                    <Link href='/' className='topsignuplink'>
                        <Image src='/topmintLogo.png' alt='logo' width={160} height={40} style={{ height: 'auto' }} />
                    </Link>
                    <h1>Sign In with Email</h1>
                    <div className='inputcontainer'>
                        <div className='inputCntn'>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                type='email'
                                name='email'
                                placeholder='Email'
                                required
                            />
                            <span><i className='icofont-ui-email'></i></span>
                        </div>
                        <div className='passcntn'>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type={passwordShow ? 'text' : 'password'}
                                name='password'
                                placeholder='Password'
                                required
                            />
                            <button type='button' onClick={() => setPasswordShow(p => !p)}>
                                <i className={`icofont-eye-${!passwordShow ? 'alt' : 'blocked'}`}></i>
                            </button>
                        </div>
                        <div className='_cloudflr_verifcation_widget'>
                            <div className='verification_Box'>
                                <div className='checkbox_cntn' onClick={handleVerify}>
                                    <input ref={verifyRef} type='checkbox' />
                                    {verifyState === 'Default' && <span aria-hidden='true' className='unchecked'></span>}
                                    {verifyState === 'verifying' && <i aria-hidden='true' className='icofont-spinner-alt-2'></i>}
                                    {verifyState === 'verified' && <i aria-hidden='true' className='icofont-check-circled'></i>}
                                </div>
                                <div className='verification_status'>
                                    {verifyState === 'Default' && <p>Human Verification</p>}
                                    {verifyState === 'verifying' && <p>Verifying...</p>}
                                    {verifyState === 'verified' && <p>Verified</p>}
                                </div>
                            </div>
                            <div className='service_provider'>
                                <p>Protected by <Image src='/cloudflare.png' alt='cloudflare' width={120} height={40} style={{ height: 'auto' }} /></p>
                            </div>
                        </div>
                        {errMsg && <p className='errorMsg'>{errMsg}</p>}
                        <label className='form-control2'>
                            <input type='checkbox' name='remember' /> Remember me
                        </label>
                        <button type='submit' className='fancyBtn'>Sign In</button>
                    </div>
                    <p className='haveanaccount'>Are you an admin? <Link href='/signin_admin'>Sign In as admin</Link></p>
                    <p className='haveanaccount'>Don&apos;t have an account? <Link href='/signup'>Sign Up</Link></p>
                </form>
            </div>
        </div>
    );
}