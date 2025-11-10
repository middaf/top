// ...existing code...
import { useState, useRef, useEffect, useContext } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import app, { db } from '../database/firebaseConfig';
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { themeContext } from '../../providers/ThemeProvider';
import { useRouter } from 'next/router';
import Head from 'next/head';

const Signin = () => {
    const [passwordShow, setPasswordShow] = useState(false);
    const [errMsg, setErrMsg] = useState("");
    const [verify, setVerify] = useState("Default");
    const inputRef = useRef(null);

    const router = useRouter();
    const ctx = useContext(themeContext);
    const { registerFromPath } = ctx;

    const [toLocaleStorage, setToLocalStorage] = useState({
        email: "",
        password: "",
    });

    // Function to clear all stored data
    const clearStoredData = () => {
        localStorage.removeItem("activeUser");
        localStorage.removeItem("adminId");
        localStorage.removeItem("adminData");
        sessionStorage.clear();
    };

    const colRef = collection(db, "userlogs");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrMsg("");
        clearStoredData(); // Clear any existing login data
        
        const { email, password } = toLocaleStorage;
        if (!email || !password) {
            setErrMsg("Please enter both email and password");
            removeErr();
            return;
        }

        setVerify("verifying");
        try {
            const auth = getAuth(app);
            
            // Sign in with Firebase Auth
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Check if user is admin
            const q = query(colRef, where("email", "==", email), where("admin", "==", true));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                setErrMsg("Not authorized as admin");
                setVerify("Default");
                await auth.signOut(); // Sign out if not admin
                return;
            }
            
            // Store admin info
            const adminDoc = {
                ...querySnapshot.docs[0].data(),
                uid: user.uid,
                id: querySnapshot.docs[0].id
            };

            // Set all required storage items
            localStorage.setItem("adminId", querySnapshot.docs[0].id);
            localStorage.setItem("adminData", JSON.stringify(adminDoc));
            localStorage.setItem("activeUser", JSON.stringify({
                ...adminDoc,
                isAdmin: true,
                admin: true
            }));
            
            setVerify("verified");
            // Use replace to prevent back navigation
            router.replace("/dashboard_admin");
        } catch (error) {
            console.error("Admin login error:", error);
            setErrMsg(error.message || "Login failed");
            setVerify("Default");
        }
    };    const removeErr = () => {
        setTimeout(() => {
            setErrMsg("");
        }, 3000);
    };

    const handleLogout = () => {
        localStorage.removeItem("activeUser");
        localStorage.removeItem("adminId");
        localStorage.removeItem("adminData");
        setErrMsg("");
        window.location.reload(); // Reload the page to clear any cached state
    };

    useEffect(() => {
        const active = JSON.parse(localStorage.getItem("activeUser") || "null");
        if (active && Object.keys(active).length > 0) {
            setErrMsg(
                <div>
                    An account is currently logged in. 
                    <button 
                        onClick={() => {
                            clearStoredData();
                            setErrMsg("");
                        }}
                        style={{
                            marginLeft: '10px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Clear Login State
                    </button>
                </div>
            );
        }
    }, []);

    // Remove old functions as they're no longer needed

    return (
        <div className='signupCntn'>
            <Head>
                <title>Sign In - Admin</title>
                <meta property="og:title" content="Sign In - Admin"/>
            </Head>
            <div className="leftSide">
                <video src="signup_vid2.mp4" autoPlay loop muted></video>
                <div className="overlay">
                    <h2>&quot;You have the power -<br /> Take charge.&quot;</h2>
                    <p><span>--</span>  Bruce Lernard  <span>--</span></p>
                </div>
            </div>

            <div className="rightSide">
                <form onSubmit={handleSubmit}>
                    <Link href={"/"} className='topsignuplink'><Image src="/topmintLogo.png" alt="logo" width={160} height={40} style={{ height: 'auto' }} /></Link>
                    <h1>Admin Sign In</h1>
                    <div className="inputcontainer">
                        <div className="inputCntn">
                            <input
                                type="email"
                                name="email"
                                placeholder="Enter Admin Email"
                                value={toLocaleStorage.email}
                                onChange={(e) => setToLocalStorage({ ...toLocaleStorage, email: e.target.value })}
                                required
                            />
                            <span><i className="icofont-user"></i></span>
                        </div>

                        <div className="passcntn">
                            <input
                                value={toLocaleStorage.password}
                                onChange={(e) => setToLocalStorage({...toLocaleStorage, password: e.target.value})}
                                type={passwordShow ? "text" : "password"}
                                name='password'
                                placeholder='Enter Password'
                                required
                            />
                            <button type="button" onClick={() => setPasswordShow(prev => !prev)}>
                                <i className={`icofont-eye${passwordShow ? "-blocked" : ""}`}></i>
                            </button>
                        </div>

                        { errMsg !== "" && (<p className='errorMsg'>{errMsg}</p>) }

                        <button 
                            type="submit" 
                            className='fancyBtn'
                            disabled={verify === "verifying"}
                        >
                            {verify === "verifying" ? (
                                <><i className="icofont-spinner-alt-2"></i> Signing in...</>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Signin;
// ...existing code...