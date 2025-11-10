import { AnimatePresence, motion } from "framer-motion";
import { useState, useContext, useEffect } from "react";
import Navbar from "../components/home/Navbar";
import Link from "next/link";
import Image from 'next/image';
import DashboardSect from "../components/dashboard/dashboardSect";
import ProfileSect from "../components/dashboard/profileSect";
import { db } from "../database/firebaseConfig";
import profileStyles from "../components/dashboard/Profile.module.css";
import {
  getFirestore,
  collection,
  where,
  query,
  onSnapshot,
  doc,
  getDoc,
  getDocs
} from "firebase/firestore";
import { useRouter } from "next/router";
import DynamicWidget from "../components/dashboard/dynamicWidget";
import dynamic from 'next/dynamic';
// Dynamic import ChatBot to avoid SSR issues
const ChatBot = dynamic(
  () => import('../components/ChatBot').then((mod) => ({ default: mod.ChatBot })),
  { ssr: false }
);
import InvestmentSect from "../components/dashboard/investmentSect";
import { themeContext } from "../../providers/ThemeProvider";
import PaymentSect from "../components/dashboard/PaymentSect";
import WithdrawalSect from "../components/dashboard/WithdrawalSect";
import WithdrawalPayment from "../components/dashboard/WithdrawPayment";
import NotificationSect from "../components/dashboard/NotificationSect";
import LoanSect from "../components/dashboard/LoanSect";
import KYC from "../components/dashboard/KYC";
import Head from "next/head";

const Profile = () => {
  const [passwordShow, setPasswordShow] = useState(true);
  const [profilestate, setProfileState] = useState("Dashboard");
  const [bitPrice, setBitPrice] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);
  const [investments, setInvestments] = useState([]);
  const handleLogOut = () => {
    localStorage.clear();
    sessionStorage.clear();
    router.replace("/signin");
  };

  const [notifications, setNotifications] = useState([]);

  const [showsidePanel, setShowSidePanel] = useState(true);


  const ctx = useContext(themeContext);
  const { setregisterFromPath } = ctx;
  const currentDate = new Date();

  const currentDayOfMonth = currentDate.getDate();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const dateString =
    currentYear + "-" + (currentMonth + 1) + "-" + currentDayOfMonth;
  const [currentUser, setCurrentUser] = useState({
    name: "",
    avatar: "avatar_1",
    email: "",
    password: "",
    balance: 50,
    date: dateString,
    accountStatus: "No Active Plan",
    investmentCount: 0,
    referralCount: 0,
    admin: false,
    idnum: 101010,
    userName: "John Doe",
    authStatus: "unseen"
  });

  const [investData, setInvestData] = useState({
    idnum: currentUser?.idnum,
    plan: "Gold",
    status: "Pending",
    capital: 0,
    date: new Date().toISOString(),
    duration: 5,
    paymentOption: "Bitcoin",
    roi: 0,
    bonus: 0,
    authStatus: "unseen",
    admin: false,
  });
  const [withdrawData, setWithdrawData] = useState({
    idnum: currentUser?.idnum,
    status: "Pending",
    amount: 200,
    date: new Date().toISOString(),
    paymentOption: "Bitcoin",
    authStatus: "unseen",
    admin: false,
    address: "****************"
  });
  const [widgetState, setWidgetState] = useState({
    state: false,
    type: "avatar",
  });

  // Firestore subscriptions must be registered inside useEffect to avoid
  // running on the server and causing hydration/side-effect issues.
  useEffect(() => {
    // we need an idnum to subscribe to related collections (investments/notifications)
    if (!currentUser?.idnum) return;

    const investCol = collection(db, "investments");
    const investQuery = query(investCol, where("idnum", "==", currentUser?.idnum));

    const unsubscribeInvest = onSnapshot(investQuery, (snapshot) => {
      const books = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      setInvestments(books);
    });

    const notifCol = collection(db, "notifications");
    const notifQuery = query(notifCol, where("idnum", "==", currentUser?.idnum));

    const unsubscribeNotif = onSnapshot(notifQuery, (snapshot) => {
      const utilNotif = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }));
      setNotifications(utilNotif);
    });

    return () => {
      unsubscribeInvest();
      unsubscribeNotif();
    };
  }, [currentUser?.idnum]);

  const router = useRouter();
  async function fetchData(path, stateSetter) {
    try {
      // Use local API proxy to avoid CORS issues
      const response = await fetch(`/api/price?ids=bitcoin,ethereum&vs_currencies=usd`);

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      console.log('Price API Response:', data);
      
      // If caller asks for bit price or eth price, set appropriately
      if (stateSetter === setBitPrice) {
        const price = data.bitcoin?.usd || 0;
        console.log('Setting BTC Price:', price);
        stateSetter(price);
      } else if (stateSetter === setEthPrice) {
        const price = data.ethereum?.usd || 0;
        console.log('Setting ETH Price:', price);
        stateSetter(price);
      } else {
        // fallback: if called generically, set both when possible
        if (data.bitcoin?.usd) {
          console.log('Setting BTC Price (generic):', data.bitcoin.usd);
          setBitPrice(data.bitcoin.usd);
        }
        if (data.ethereum?.usd) {
          console.log('Setting ETH Price (generic):', data.ethereum.usd);
          setEthPrice(data.ethereum.usd);
        }
      }
    } catch (error) {
      console.error("Error fetching price data:", error.message);
      // Set fallback prices on error
      setBitPrice(95000);
      setEthPrice(3500);
    }
  }

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  // Fetch both prices from our server-side proxy
  fetchData(null, null);

    setShowSidePanel(false)
  }, [profilestate]);

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem("activeUser")) || {};
    let unsub = null;
    async function setupListener() {
      let userDocId = user.id;
      // If no doc ID, query by idnum
      if (!userDocId && user.idnum) {
        const usersCol = collection(db, "userlogs");
        const q = query(usersCol, where("idnum", "==", user.idnum));
        const snap = await getDocs(q);
        if (!snap.empty) {
          userDocId = snap.docs[0].id;
        }
      }
      if (userDocId) {
        const docRef = doc(db, "userlogs", userDocId);
        unsub = onSnapshot(docRef, (doc) => {
          if (doc.exists()) {
            const userData = { ...doc.data(), id: doc.id };
            setCurrentUser(userData);
            sessionStorage.setItem("activeUser", JSON.stringify(userData));
          } else {
            setregisterFromPath("/profile");
            router.push("/signin");
          }
        }, (error) => {
          console.error("Error listening to user document:", error);
        });
      } else {
        setregisterFromPath("/profile");
        router.push("/signin");
      }
    }
    setupListener();
    return () => { if (unsub) unsub(); };
  }, []);






  //user dashboard values
  const totalCapital = investments
    .filter((elem) => elem?.status !== "Pending")
    .reduce((sum, currentObject) => {
      // Ensure that currentObject.capital is a number before adding it to the sum
      const capitalValue =
        typeof currentObject.capital === "number" ? currentObject.capital : 0;

      // Add the capital value to the sum
      return sum + capitalValue;
    }, 0);

  const totalROI = investments
    .filter((elem) => elem?.status !== "Pending")
    .reduce((sum, currentObject) => {
      // Ensure that currentObject.capital is a number before adding it to the sum
      const ROIvalue =
        typeof currentObject.roi === "number" ? currentObject.roi : 0;

      // Add the capital value to the sum
      return sum + ROIvalue;
    }, 0);

  const totalBonus = investments
    .filter((elem) => elem?.status !== "Pending")
    .reduce((sum, currentObject) => {
      // Ensure that currentObject.capital is a number before adding it to the sum
      const bonusValue =
        typeof currentObject.bonus === "number" ? currentObject.bonus : 0;

      // Add the capital value to the sum
      return sum + bonusValue;
    }, 0);

  useEffect(() => {
    // Fetch both prices at once
    fetchData(null, null);
  }, []);

  // Debug: Log whenever prices change
  useEffect(() => {
    console.log('=== PRICES UPDATED ===');
    console.log('BTC Price:', bitPrice, '(type:', typeof bitPrice, ')');
    console.log('ETH Price:', ethPrice, '(type:', typeof ethPrice, ')');
  }, [bitPrice, ethPrice]);

  //Animation variable
  const swipeParent = {
    init: {
      x: "-110%",
      opacity: 0,
    },
    finale: {
      x: 0,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 30,
        stiffness: 200,
        when: "beforeChildren",
      },
    },
    exit: {
      x: "-111%",
      opacity: 1,
      transition: {
        type: "spring",
        damping: 30,
        stiffness: 200,
        when: "afterChildren",
      },
    },
  };

  return (
    <div className="mainprofileSect">
      <Head>
          <title>User Dashboard</title>
          <meta property="og:title" content="User Dashboard"/>
      </Head>
      
      <div id="mobilenone" className="leftProfile">
        <div className="topmostRightPrile">
          <Link href={"/"}>
            <Image src="/topmintLogo.png" className="theLogo" alt="logo" width={160} height={40} style={{ height: 'auto' }} />
          </Link>
          <div className="panelPrfileDisp">
            <div
              className="left"
              style={{ backgroundImage: `url(/${currentUser?.avatar || 'avatar_1'}.png)` }}
            ></div>
            <div className="right">
              <h3>{currentUser?.name}</h3>
              <p>{currentUser?.email}</p>
            </div>
          </div>
        </div>
        <div className="centerRightProfile">
          <ul>
            <li
              className={profilestate === "Dashboard" ? "active" : ""}
              onClick={() => {
                setProfileState("Dashboard");
              }}
            >
              <i className="icofont-dashboard-web"></i> Dashboard
            </li>
            <li
              className={profilestate === "Profile" ? "active" : ""}
              onClick={() => {
                setProfileState("Profile");
              }}
            >
              <i className="icofont-ui-user"></i> Profile
            </li>
            <li
              className={profilestate === "Investments" ? "active" : ""}
              onClick={() => {
                setProfileState("Investments");
              }}
            >
              <i className="icofont-money-bag"></i> Investments
            </li>
            <li
              className={profilestate === "Withdrawals" ? "active" : ""}
              onClick={() => {
                setProfileState("Withdrawals");
              }}
            >
              <i className="icofont-pay"></i> Withdrawals
            </li>
            <li
              className={profilestate === "Notifications" ? "active" : ""}
              onClick={() => {
                setProfileState("Notifications");
              }}
            >
              <i className="icofont-alarm"></i> Notifications{" "}
              <span>
                {notifications.filter((elem) => elem?.status !== "seen").length}
              </span>
            </li>
            <li
              className={profilestate === "Loans" ? "active" : ""}
              onClick={() => {
                setProfileState("Loans");
              }}
            >
              <i className="icofont-wallet"></i> Loans
            </li>
            <li
              className={profilestate === "KYC" ? "active" : ""}
              onClick={() => {
                setProfileState("KYC");
              }}
            >
              <i className="icofont-id-card"></i> Verification
            </li>
            <Link href={"/contact"}>
              <i className="icofont-ui-text-loading"></i> Feedback
            </Link>
          </ul>
        </div>
        <div className={profileStyles.rightLeftProfile}>
          <button onClick={handleLogOut}>
            Log Out <i className="icofont-logout"></i>
          </button>
        </div>
      </div>
      <div className="rightProfile">
        <h1>
          {profilestate}{" "}
          <span>
            {new Date().toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            .
          </span>
        </h1>
        <div className="topmostRightProfile">
          <div className="unitUserEarningDisplay fancybg">
            <h3>
              Available Balance
              <span
                onClick={() => {
                  setPasswordShow((prev) => !prev);
                }}
              >
                <i
                  className={`icofont-eye-${!passwordShow ? "alt" : "blocked"}`}
                ></i>
              </span>
            </h3>
            <h2>
              $
              {passwordShow
                ? `${(
                    parseFloat(currentUser?.balance || 0) +
                    parseFloat(totalCapital || 0) +
                    parseFloat(totalROI || 0) +
                    parseFloat(totalBonus || 0)
                  ).toLocaleString()}`
                : "******"}
            </h2>
          </div>


          <div className="unitUserEarningDisplay fancybg">
            <h3>Total Earnings</h3>
            <h2>
              $
              {passwordShow
                ? `${(
                    (parseFloat(currentUser?.bonus || 0)) +
                    (parseFloat(totalROI || 0)) +
                    (parseFloat(totalCapital || 0)) +
                    (parseFloat(totalBonus || 0))
                  ).toLocaleString()}`
                : "******"}
            </h2>
          </div>

          <div className="unitUserEarningDisplay fancybg">
            <h3>Bonuses</h3>
            <h2>
              $
              {passwordShow
                ? `${((parseFloat(currentUser?.bonus || 0)) + (parseFloat(totalBonus || 0))).toLocaleString()}`
                : "******"}
            </h2>
          </div>

          <div className="unitUserEarningDisplay fancybg">
            <h3>Returns</h3>
            <h2>${passwordShow ? `${(parseFloat(totalROI || 0)).toLocaleString()}` : "******"}</h2>
          </div>
          <div className="unitUserEarningDisplay fancybg">
            <h3>Active / Pending Plans</h3>
            <h2>{investments.length}</h2>
          </div>
        </div>
        {profilestate === "Dashboard" && (
          <div className="dashboardWrapper">
            <div className="scrollableContent">
              <DashboardSect
                setWidgetState={setWidgetState}
                currentUser={currentUser}
                setInvestData={setInvestData}
              />
              {/* Debug panel removed - no user JSON exposed in dashboard */}
            </div>
          </div>
        )}
        {profilestate === "Profile" && (
          <ProfileSect
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            widgetState={widgetState}
            setWidgetState={setWidgetState}
          />
        )}
        {profilestate === "Investments" && (
          <InvestmentSect
            widgetState={widgetState}
            setWidgetState={setWidgetState}
            investData={investData}
            setInvestData={setInvestData}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            investments={investments}
          />
        )}
        {profilestate === "Notifications" && (
          <NotificationSect
            setWidgetState={setWidgetState}
            investData={investData}
            setInvestData={setInvestData}
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            notifications={notifications}
          />
        )}
        {profilestate === "Loans" && (
          <LoanSect currentUser={currentUser} />
        )}
        {profilestate === "KYC" && (
          <KYC currentUser={currentUser} />
        )}
        {profilestate === "Withdrawals" && (
          <WithdrawalSect
            currentUser={currentUser}
            setWidgetState={setWidgetState}
            totalBonus={totalBonus}
            totalCapital={totalCapital}
            totalROI={totalROI}
            setProfileState={setProfileState}
            setWithdrawData={setWithdrawData}
          />
        )}
        {profilestate === "Payments" && (
          <PaymentSect
            setProfileState={setProfileState}
            investData={investData}
            bitPrice={bitPrice}
            ethPrice={ethPrice}
          />
        )}
        {profilestate === "Withdrawal Payment" && (
          <WithdrawalPayment
            setProfileState={setProfileState}
            withdrawData={withdrawData}
            bitPrice={bitPrice}
            ethPrice={ethPrice}
            currentUser={currentUser}
          />
        )}
        <footer className="profilefooter">
          <p>
            Proudly powered by{" "}
            <a
              href="https://www.tradingview.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Trading view
            </a>
          </p>
          <p>|</p>
          <p>
            <i className="icofont-shield-alt"></i> Protected by{" "}
            <a
              href="https://www.cloudflare.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/cloudflare.png" alt="cloudflare" style={{ height: 'auto' }} />
            </a>
          </p>
        </footer>
      </div>
      <button
        id="floatingButton"
        type="button"
        className="menuBtn floatingBtn"
        onClick={() => {
          setShowSidePanel(true);
        }}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      {widgetState.state && (
        <DynamicWidget
          widgetState={widgetState}
          setWidgetState={setWidgetState}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          investData={investData}
          setInvestData={setInvestData}
          setProfileState={setProfileState}
          withdrawData={withdrawData}
          setWithdrawData={setWithdrawData}
          totalBonus={totalBonus}
          totalCapital={totalCapital}
          totalROI={totalROI}
        />
      )}

      {/* Render ChatBot for non-admin users across all profile states */}
      {typeof window !== 'undefined' && !currentUser?.admin && (
        <ChatBot />
      )}


      <AnimatePresence>
        {showsidePanel && (
          <motion.div 
            id="mobilepop" 
            className="leftProfile"
            initial="init"
            animate="finale"
            exit="exit"
            variants={swipeParent}
          >
            <div className="topmostRightPrile">
              <Link href={"/"}>
                <img src="/topmintLogo.png" className="theLogo" alt="logo" />
              </Link>
              <div className="panelPrfileDisp">
                <div
                  className="left"
                  style={{ backgroundImage: `url(/${currentUser?.avatar || 'avatar_1'}.png)` }}
                ></div>
                <div className="right">
                  <h3>{currentUser?.name}</h3>
                  <p>{currentUser?.email}</p>
                </div>
              </div>
            </div>
            <div className="centerRightProfile">
              <ul>
                <li
                  className={profilestate === "Dashboard" ? "active" : ""}
                  onClick={() => {
                    setProfileState("Dashboard");
                  }}
                >
                  <i className="icofont-dashboard-web"></i> Dashboard
                </li>
                <li
                  className={profilestate === "Profile" ? "active" : ""}
                  onClick={() => {
                    setProfileState("Profile");
                  }}
                >
                  <i className="icofont-ui-user"></i> Profile
                </li>
                <li
                  className={profilestate === "Investments" ? "active" : ""}
                  onClick={() => {
                    setProfileState("Investments");
                  }}
                >
                  <i className="icofont-money-bag"></i> Investments
                </li>
                <li
                  className={profilestate === "Withdrawals" ? "active" : ""}
                  onClick={() => {
                    setProfileState("Withdrawals");
                  }}
                >
                  <i className="icofont-pay"></i> Withdrawals
                </li>
                <li
                  className={profilestate === "Notifications" ? "active" : ""}
                  onClick={() => {
                    setProfileState("Notifications");
                  }}
                >
                  <i className="icofont-alarm"></i> Notifications{" "}
                  <span>
                    {
                      notifications.filter((elem) => elem?.status !== "seen")
                        .length
                    }
                  </span>
                </li>
                <Link href={"/contact"}>
                  <i className="icofont-ui-text-loading"></i> Feedback
                </Link>
              </ul>
            </div>
            <div className={profileStyles.rightLeftProfile}>
              <button onClick={handleLogOut}>
                Log Out <i className="icofont-logout"></i>
              </button>
            </div>

            <button type="button" className="panelCloseBtn" onClick={() => {setShowSidePanel(false)}}><i className="icofont-close-line"></i></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
