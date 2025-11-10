import { useState, useRef, useEffect, useContext } from 'react';
import { motion } from "framer-motion";
import Link from 'next/link';
import Image from 'next/image';
import app, { db } from '../database/firebaseConfig';
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { themeContext } from '../../providers/ThemeProvider';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { config, validatePassword } from '../utils/config';

const Signup = () => {
  const [passwordShow, setPasswordShow] = useState(false);
  const [users, setUsers] = useState([]);
  const [errMsg, setErrMsg] = useState("");
  const [verify, setVerify] = useState("Default");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  const router = useRouter();
  const ctx = useContext(themeContext);
  const { registerFromPath } = ctx;

  const colRef = collection(db, "userlogs");
  const colRefNotif = collection(db, "notifications");

  // Human verification handler (simulated)
  const handleVerify = () => {
    if (verify === "Default") {
      setVerify("verifying");
      setTimeout(() => {
        setVerify("verified");
        if (inputRef.current) inputRef.current.checked = true;
      }, 3000);
    } else {
      if (inputRef.current) inputRef.current.checked = true;
    }
  };

  const removeErr = () => {
    setTimeout(() => setErrMsg(""), 3500);
  };

  const dateString = new Date().toISOString().split("T")[0];

  const emptyUser = {
    name: "",
    avatar: "avatar_1",
    email: "",
    password: "",
    balance: 0,
    date: dateString,
    accountStatus: "No Active Plan",
    investmentCount: 0,
    referralCount: 0,
    admin: false,
    idnum: 101010,
    userName: "John Doe",
    bonus: 50,
    authStatus: "unseen",
    dateUpdated: new Date().toISOString()
  };

  const [toLocaleStorage, setToLocalStorage] = useState(emptyUser);

  // Generate random numeric id safely in browser
  const generatePassword = () => {
    if (typeof window === "undefined" || !window.crypto) return String(Math.floor(Math.random() * 90000000) + 10000000);
    const characters = "0123456789";
    const array = new Uint8Array(8);
    window.crypto.getRandomValues(array);
    return Array.from(array).map(v => characters[v % characters.length]).join('');
  };

  // Load users and generate id once in browser
  useEffect(() => {
    const newId = generatePassword();
    setToLocalStorage(prev => ({ ...prev, idnum: newId }));

    getDocs(colRef).then(snapshot => {
      const books = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setUsers(books);
    }).catch(err => console.error('Error fetching users:', err));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;

    try {
      setIsLoading(true); // Set loading state at start

      // Validate inputs
      if (!toLocaleStorage.email?.includes('@')) {
        throw new Error(config.errorMessages.invalidEmail);
      }

      if (!validatePassword(toLocaleStorage.password)) {
        throw new Error(config.errorMessages.weakPassword);
      }

      // Programmatic validation for simulated verification
      if (!inputRef.current?.checked || verify !== "verified") {
        throw new Error(config.errorMessages.verificationNeeded);
      }

      // Terms checkbox (name="checkbox")
      const termsChecked = form.elements['checkbox']?.checked;
      if (!termsChecked) {
        throw new Error("You must agree to the terms and conditions.");
      }

        // Check for existing account by email
      const alreadyExist = users.find(elem => elem.email === toLocaleStorage.email);
      if (alreadyExist) {
        throw new Error("An account already exists with this email. Try logging in.");
      }
      // Validate required fields
      if (!toLocaleStorage.name?.trim()) {
        throw new Error("Please enter your full name");
      }

      // Check for existing account by email one more time (in case of race condition)
      const emailQuery = query(colRef, where("email", "==", toLocaleStorage.email));
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        setErrMsg(config.errorMessages.emailInUse);
        removeErr();
        return;
      }

      // Create Firebase Auth user first
      const auth = getAuth(app);
      const userCredential = await createUserWithEmailAndPassword(auth, toLocaleStorage.email, toLocaleStorage.password);
      const createdUser = userCredential.user;

      // Ensure generated idnum is unique among existing users
      let candidateId = toLocaleStorage.idnum || generatePassword();
      while (users.some(u => String(u.idnum) === String(candidateId))) {
        candidateId = generatePassword();
      }
      // Persist the resolved id back to local state
      if (candidateId !== toLocaleStorage.idnum) {
        setToLocalStorage(prev => ({ ...prev, idnum: candidateId }));
      }

      // Build notification for sign up bonus
      const notificationPush = {
        message: "You just received $50 sign up bonus",
        dateTime: new Date().toISOString(),
        idnum: candidateId,
        status: "unseen",
        type: "signup_bonus"
      };

      // Prepare Firestore user doc (don't store plaintext password)
      const userDoc = {
        ...toLocaleStorage,
        idnum: candidateId,
        uid: createdUser.uid,
        email: createdUser.email, // Use email from Firebase Auth
        password: "******",
        dateCreated: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      // Save notification and user document
      await addDoc(colRefNotif, notificationPush);
      const userRef = await addDoc(colRef, userDoc);

      // Store user data safely (no password) in localStorage
      const safeUserData = { ...userDoc, id: userRef.id };
      delete safeUserData.password;
  localStorage.setItem("activeUser", JSON.stringify(safeUserData));
  try { sessionStorage.setItem("activeUser", JSON.stringify(safeUserData)); } catch (e) { /* ignore */ }

      // Reset form state
      form.reset();
      setVerify("Default");
      setToLocalStorage({ ...emptyUser, idnum: generatePassword(), date: dateString });

      // Redirect
      router.push(registerFromPath || "/");
    } catch (err) {
      console.error('Signup error:', err);
      let message;
      
      if (err.message) {
        // Use validation error messages directly
        message = err.message;
      } else {
        // Handle Firebase Auth errors
        switch(err?.code) {
          case 'auth/email-already-in-use':
            message = config.errorMessages.emailInUse;
            break;
          case 'auth/invalid-email':
            message = config.errorMessages.invalidEmail;
            break;
          case 'auth/weak-password':
            message = config.errorMessages.weakPassword;
            break;
          case 'auth/network-request-failed':
            message = 'Network error. Please check your internet connection.';
            break;
          default:
            message = config.errorMessages.serverError;
        }
      }
      
      setErrMsg(message);
      removeErr();

      // Reset verification state on error
      setVerify("Default");
      if (inputRef.current) {
        inputRef.current.checked = false;
      }
    } finally {
      setIsLoading(false); // Always clear loading state
    }
  };

  return (
    <div className='signupCntn'>
      <Head>
        <title>Sign up</title>
        <meta property="og:title" content="Sign up"/>
        <link rel="icon" href="/topmintSmall.png" />
        <link rel="shortcut icon" href="/topmintSmall.png" />
      </Head>

      <div className="leftSide">
        <video src="signup_vid2.mp4" autoPlay loop muted></video>
        <div className="overlay">
          <h2>&quot;When it rains gold, <br /> put out the bucket, <br /> not the thimble.&quot;</h2>
          <p><span>--</span>  Warren Buffett  <span>--</span></p>
        </div>
      </div>

      <div className="rightSide">
        <form onSubmit={handleSubmit}>
          <Link href={"/"} className='topsignuplink'><Image src="/topmintLogo.png" alt="logo" width={160} height={40} style={{ height: 'auto' }} /></Link>
          <h1>Sign Up with Email</h1>
          <div className="inputcontainer">
            <div className="inputCntn">
              <input
                onChange={(e) => setToLocalStorage({...toLocaleStorage, email: e.target.value})}
                type='email' name='email' placeholder='Email' required/>
              <span><i className="icofont-ui-email"></i></span>
            </div>
            <div className="inputCntn">
              <input
                onChange={(e) => setToLocalStorage({...toLocaleStorage, name: e.target.value})}
                type="text" name='name' placeholder='Fullname' required/>
              <span><i className="icofont-ui-user"></i></span>
            </div>
            <div className="passcntn">
              <input
                onChange={(e) => setToLocalStorage({...toLocaleStorage, password: e.target.value})}
                type={passwordShow ? "text" : "password"} name='password' placeholder='Password' required/>
              <button type="button" onClick={() => setPasswordShow(prev => !prev)}>
                <i className={`icofont-eye-${!passwordShow ? "alt" : "blocked"}`}></i>
              </button>
            </div>

            <div className="_cloudflr_verifcation_widget">
              <div className="verification_Box">
                <div className="checkbox_cntn" onClick={handleVerify}>
                  {/* remove required so browser doesn't block submit before our checks */}
                  <input ref={inputRef} type="checkbox" />
                  {verify === "Default" && (<span aria-hidden="true" className="unchecked"></span>)}
                  {verify === "verifying" && (<i aria-hidden="true" className="icofont-spinner-alt-2"></i>)}
                  {verify === "verified" && (<i aria-hidden="true" className="icofont-check-circled"></i>)}
                </div>
                <div className="verification_status">
                  {verify === "Default" && (<p>Human Verification</p>)}
                  {verify === "verifying" && (<p>Verifying...</p>)}
                  {verify === "verified" && (<p>Verified</p>)}
                </div>
              </div>
              <div className="service_provider">
                <p>Protected by <img src="/cloudflare.png" alt="cloudflare" style={{ height: 'auto' }} /></p>
              </div>
            </div>

            {errMsg && <p className='errorMsg'>{errMsg}</p>}

            <label className="form-control2">
              <input type="checkbox" name="checkbox" required/>
              I agree to all terms and conditions of Topmint Invesment Incorp.
            </label>

            <button 
              type="submit" 
              className={`fancyBtn ${isLoading ? 'loading' : ''}`}
              style={{
                opacity: (isLoading || verify !== "verified") ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                pointerEvents: isLoading ? 'none' : 'auto'
              }}
            >
              {isLoading ? (
                <span>
                  <i className="icofont-spinner-alt-2 spinning" style={{ marginRight: '8px' }}></i>
                  Creating Account...
                </span>
              ) : (
                <span>Create an Account</span>
              )}
            </button>
          </div>
          <p className='haveanaccount'>Have an account? <Link href={"/signin"}>Sign In</Link></p>
        </form>
      </div>
    </div>
  );
};

export default Signup;