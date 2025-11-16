import { AnimatePresence, motion } from "framer-motion";
import { useState, useContext, useEffect, useCallback } from "react";
import Navbar from "../components/home/Navbar";
import Link from "next/link";
import Image from 'next/image';
import DashboardSect from "../components/dashboard/dashboardSect";
import ProfileSect from "../components/dashboard/profileSect";
import { supabase, supabaseDb, supabaseRealtime } from "../database/supabaseUtils";
import { useRouter } from "next/router";
import DynamicWidget from "../components/dashboard/dynamicWidget";
import InvestmentSect from "../components/dashboard/investmentSect";
import { themeContext } from "../../providers/ThemeProvider";
import PaymentSect from "../components/dashboard/PaymentSect";
import WithdrawalSect from "../components/dashboard/WithdrawalSect";
import profileStyles from "../components/dashboard/Profile.module.css";
import WithdrawalPayment from "../components/dashboard/WithdrawPayment";
import NotificationSect from "../components/dashboard/NotificationSect";
import LoanSect from "../components/dashboard/LoanSect";
import KYC from "../components/dashboard/KYC";
import Head from "next/head";
import Script from "next/script";

const Profile = () => {
  const router = useRouter();
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
    idnum: 101010, // Use default value instead of currentUser?.idnum
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

  const [kycStatus, setKycStatus] = useState('pending');

  const openTawkChat = useCallback((detail = {}) => {
    if (typeof window === 'undefined' || currentUser?.admin) {
      return false;
    }

    const api = window.Tawk_API;
    if (!api || typeof api.maximize !== 'function') {
      return false;
    }

    try {
      if (typeof api.showWidget === 'function') {
        api.showWidget();
      }
      api.maximize();

      if (detail?.prefillMessage && typeof api.setAttributes === 'function') {
        const message = String(detail.prefillMessage).slice(0, 600);
        api.setAttributes({ Last_Request_Context: message }, (error) => {
          if (error) {
            console.warn('Tawk.to attribute error:', error);
          }
        });
      }
    } catch (error) {
      console.warn('Unable to open Tawk.to chat:', error);
      return false;
    }

    return true;
  }, [currentUser?.admin]);

  const flushPendingTawkChat = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const pendingDetail = window.__pendingTawkOpen;
    if (pendingDetail && openTawkChat(pendingDetail)) {
      window.__pendingTawkOpen = null;
    }
  }, [openTawkChat]);

  useEffect(() => {
    if (currentUser?.admin) {
      return undefined;
    }

    const handleOpenChat = (event) => {
      const detail = event?.detail || {};
      const opened = openTawkChat(detail);
      if (!opened && typeof window !== 'undefined') {
        window.__pendingTawkOpen = detail;
      }
    };

    window.addEventListener('openChatBot', handleOpenChat);
    return () => window.removeEventListener('openChatBot', handleOpenChat);
  }, [currentUser?.admin, openTawkChat]);

  // Supabase real-time subscriptions must be registered inside useEffect to avoid
  // running on the server and causing hydration/side-effect issues.
  useEffect(() => {
    // we need an idnum to subscribe to related collections (investments/notifications)
    if (!currentUser?.idnum) return;

    // Subscribe to investments
    const investmentsSubscription = supabaseRealtime.subscribeToInvestments(
      currentUser.idnum,
      (payload) => {
        console.log('Investments change:', payload);
        // Refresh investments data
        supabaseDb.getInvestmentsByIdnum(currentUser.idnum).then(({ data, error }) => {
          if (!error && data) {
            setInvestments(data);
          }
        });
      }
    );

    // Subscribe to notifications
    const notificationsSubscription = supabaseRealtime.subscribeToNotifications(
      currentUser.idnum,
      (payload) => {
        console.log('Notifications change detected:', payload);
        // Refresh notifications data
        supabaseDb.getNotificationsByIdnum(currentUser.idnum).then(({ data, error }) => {
          if (!error && data) {
            console.log('Updated notifications data:', data);
            setNotifications(data);
          } else {
            console.error('Error fetching updated notifications:', error);
          }
        });
      }
    );

    // Initial data load
    supabaseDb.getInvestmentsByIdnum(currentUser.idnum).then(({ data, error }) => {
      if (!error && data) {
        setInvestments(data);
      }
    });

    supabaseDb.getNotificationsByIdnum(currentUser.idnum).then(({ data, error }) => {
      if (!error && data) {
        console.log('Initial notifications loaded:', data);
        setNotifications(data);
      } else {
        console.error('Error loading initial notifications:', error);
      }
    });

    // Initial KYC status load
    if (currentUser?.id) {
      supabaseDb.getKYCByUserId(currentUser.id).then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setKycStatus(data[0].status || 'pending');
        } else {
          setKycStatus('pending');
        }
      });
    }

    // KYC status subscription
    let kycSubscription = null;
    if (currentUser?.id) {
      kycSubscription = supabase
        .channel('user-kyc-dashboard')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'kyc',
          filter: `user_id=eq.${currentUser.id}`
        }, (payload) => {
          console.log('KYC status change in dashboard:', payload);
          if (payload.new) {
            setKycStatus(payload.new.status || 'pending');
          } else if (payload.eventType === 'DELETE') {
            setKycStatus('pending');
          }
        })
        .subscribe();
    }

    return () => {
      investmentsSubscription.unsubscribe();
      notificationsSubscription.unsubscribe();
      if (kycSubscription) kycSubscription.unsubscribe();
    };
  }, [currentUser?.idnum]);

  // Router moved to top of component
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

  // Handle hash navigation for sections like #packages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash) {
        // If navigating to packages, ensure we're on the Dashboard section
        if (hash === '#packages') {
          setProfileState('Dashboard');
        }
        // Small delay to ensure DOM is rendered
        setTimeout(() => {
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 200);
      }
    }
  }, []);

  useEffect(() => {
    // Check both localStorage and sessionStorage for user
    let user = null;
    try {
      user = JSON.parse(sessionStorage.getItem("activeUser")) || 
             JSON.parse(localStorage.getItem("activeUser"));
    } catch (e) {
      console.warn("Error parsing user data:", e);
    }
    
    // If no user data found at all, redirect to signin
    if (!user || !user.email) {
      console.log("No valid user data found, redirecting to signin");
      setregisterFromPath("/profile");
      router.push("/signin");
      return;
    }
    let subscription = null;
    async function setupListener() {
      let userDocId = user.id;
      // If no doc ID, query by idnum
      if (!userDocId && user.idnum) {
        const { data, error } = await supabaseDb.getUserByIdnum(user.idnum);
        if (!error && data) {
          userDocId = data.id;
        }
      }

      if (userDocId) {
        // Subscribe to user data changes
        subscription = supabaseRealtime.subscribeToUser(userDocId, (payload) => {
          console.log('🔄 User data change in profile setupListener:', payload);
          if (payload.new) {
            const userData = payload.new;
            console.log('📝 Updating currentUser with new data:', userData);
            console.log('🔍 KYC status in update:', userData.kyc_status);
            setCurrentUser(userData);
            sessionStorage.setItem("activeUser", JSON.stringify(userData));
          }
        });

        // Initial load
        const { data, error } = await supabaseDb.getUserById(userDocId);
        if (!error && data) {
          const userData = data;
          setCurrentUser(userData);
          sessionStorage.setItem("activeUser", JSON.stringify(userData));
        } else {
          console.warn("User document not found, using cached data");
          setCurrentUser(user);
        }
      } else {
        console.warn("No user document ID found, using cached data");
        setCurrentUser(user);
      }
    }
    setupListener();
    return () => { if (subscription) subscription.unsubscribe(); };
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

  // Prices are working correctly

  // Balance is now working correctly

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
              Available Balance {!currentUser && <span style={{fontSize: '0.8rem', color: '#999'}}>(Loading...)</span>}
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
                ? (() => {
                    const userBalance = parseFloat(currentUser?.balance || 0);
                    const capital = parseFloat(totalCapital || 0);
                    const roi = parseFloat(totalROI || 0);
                    const bonus = parseFloat(totalBonus || 0);
                    const total = userBalance + capital + roi + bonus;
                    return total.toLocaleString();
                  })()
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
            {/* KYC Verified Banner */}
            {kycStatus === 'verified' && (
              <div style={{
                background: 'linear-gradient(135deg, #067c4d 0%, #0a9b6b 100%)',
                border: '2px solid #067c4d',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                boxShadow: '0 4px 15px rgba(6, 124, 77, 0.3)',
                animation: 'fadeIn 0.5s ease-in-out',
                maxWidth: '100%'
              }}>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i className="icofont-check" style={{ 
                    fontSize: '1.5rem', 
                    color: 'white',
                    fontWeight: 'bold'
                  }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    color: 'white', 
                    margin: '0 0 0.2rem 0', 
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    ✅ Identity Verified
                  </h3>
                  <p style={{ 
                    color: 'rgba(255, 255, 255, 0.9)', 
                    margin: 0, 
                    fontSize: '0.9rem',
                    lineHeight: '1.3'
                  }}>
                    Your KYC verification is complete. Enjoy full access to all platform features.
                  </p>
                </div>
              </div>
            )}
            
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
                <img src="/topmintLogo.png" className="theLogo" alt="logo" style={{ height: 'auto', width: '160px' }} />
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

      {/* Load Tawk.to chat widget only for non-admin users */}
      {!currentUser?.admin && (
        <Script
          src="https://embed.tawk.to/6917d2021d89b1195dfc3d49/1ja2gomk8"
          strategy="afterInteractive"
          onLoad={() => {
            console.log('Tawk.to loaded successfully');
            if (typeof window !== 'undefined' && window.Tawk_API) {
              const originalSetAttributes = window.Tawk_API.setAttributes;
              if (originalSetAttributes) {
                window.Tawk_API.setAttributes = function(attributes, callback) {
                  try {
                    return originalSetAttributes.call(this, attributes, callback);
                  } catch (e) {
                    console.warn('Tawk.to setAttributes error:', e);
                  }
                };
              }
              flushPendingTawkChat();
            }
          }}
          onError={(e) => {
            console.warn('Tawk.to failed to load - this is normal in development:', e);
          }}
          onReady={() => {
            if (typeof window !== 'undefined' && window.Tawk_API) {
              console.log('Tawk.to API ready');
              try {
                window.Tawk_API.hideWidget();
                setTimeout(() => {
                  window.Tawk_API.showWidget();
                }, 2000);
              } catch (e) {
                console.warn('Tawk.to widget control error:', e);
              }
              flushPendingTawkChat();
            }
          }}
        />
      )}

    </div>
  );
};

export default Profile;
