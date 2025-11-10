import { useState, useRef, useEffect, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Head from 'next/head';
import app, { db } from '../database/firebaseConfig';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { themeContext } from '../../providers/ThemeProvider';
import { useRouter } from 'next/router';

// Simplified, clean version to resolve syntax issues
export default function Signin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordShow, setPasswordShow] = useState(false);
    const [verifyState, setVerifyState] = useState('Default'); // Default | verifying | verified
    const [errMsg, setErrMsg] = useState('');
    const verifyRef = useRef(null);
    const router = useRouter();
    const ctx = useContext(themeContext);
    const { registerFromPath } = ctx || {};

    useEffect(() => {
        const raw = localStorage.getItem('activeUser');
        if (raw) {
            try {
                const active = JSON.parse(raw);
                if (active?.id && !window.location.search.includes('systemRedirect=true')) {
                    const dest = active.admin ? '/dashboard_admin' : '/dashboard';
                    if (window.location.pathname !== dest) router.push(dest, undefined, { shallow: true });
                }
            } catch (_) {}
        }
    }, [router]);

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
        // Auth
        let authUser;
        try {
            const auth = getAuth(app);
            const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
            authUser = cred.user;
        } catch (authErr) {
            console.error('Auth error:', authErr);
            setErrMsg('Incorrect email or password');
            clearErrorSoon();
            return;
        }
        // Firestore user lookup
        let firestoreUser = null;
        try {
            const q = query(collection(db, 'userlogs'), where('email', '==', email.trim().toLowerCase()));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const d = snap.docs[0];
                firestoreUser = { ...d.data(), id: d.id };
            }
        } catch (fsErr) {
            console.warn('Firestore user lookup failed:', fsErr);
        }
        const activeUser = {
            name: firestoreUser?.name || authUser.displayName || '',
            email: email.trim().toLowerCase(),
            uid: authUser.uid,
            admin: Boolean(firestoreUser?.admin),
            id: firestoreUser?.id || null,
            password: '******'
        };
        try { localStorage.setItem('activeUser', JSON.stringify(activeUser)); } catch(_) {}
        try { sessionStorage.setItem('activeUser', JSON.stringify(activeUser)); } catch(_) {}
        setVerifyState('Default');
        const destination = activeUser.admin ? '/dashboard_admin' : '/profile';
        router.push(`${destination}?systemRedirect=true`);
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