import {useState} from "react";
import { useRouter } from "next/router";
import { db, app } from "../../database/firebaseConfig";
import { doc, updateDoc, getDoc, deleteDoc, query, collection, where, getDocs } from "firebase/firestore";
import { getAuth, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";


const ProfileSect = ({ currentUser, setCurrentUser, widgetState, setWidgetState}) => {
    const router = useRouter();
    const [passwordShow, setPasswordShow] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    
    const [passwordchange, setpasswordchange] = useState({
        old: "",
        new: "",
        msg: "",
        color: "#DC1262",
    })
    const removeErr = () => {
        setTimeout(() => {
            setpasswordchange({
                old: "",
                new: "",
                msg: "",
                color: "#DC1262",
            })
        }, 3500);
    }

    const handleDetailUpdate = () => {
        const docRef = doc(db, "userlogs", currentUser?.id)

        updateDoc(docRef, {
            name: currentUser?.name,
            userName: currentUser?.userName,
            avatar: currentUser?.avatar || 'avatar_1',
            dateUpdated: new Date().toISOString()
        });
        sessionStorage.setItem("activeUser", JSON.stringify(currentUser));
    }

    const handlePasswordChnage = () => {
        const docRef = doc(db, "userlogs", currentUser?.id)
        getDoc(docRef).then((doc) => {
            if(doc.data().password === passwordchange.old && passwordchange.new !== "") {
                updateDoc(docRef, {
                    password: passwordchange?.new
                }).then(() => {
                    setpasswordchange({...passwordchange, msg: "Password updated successfully.", color: "green"});
                    removeErr();
                });
            } else {
                setpasswordchange({...passwordchange, msg: "Invalid old password or new password", color: "#DC1262"})
            }
        })
    }

    const handleDeleteAccount = async () => {
        if (!deletePassword) {
            setDeleteError("Please enter your password to confirm deletion");
            return;
        }

        setIsDeleting(true);
        setDeleteError("");

        try {
            const auth = getAuth(app);
            const user = auth.currentUser;

            if (!user) {
                setDeleteError("You must be logged in to delete your account");
                setIsDeleting(false);
                return;
            }

            // Verify password by re-authenticating
            try {
                const credential = EmailAuthProvider.credential(
                    currentUser?.email,
                    deletePassword
                );
                await reauthenticateWithCredential(user, credential);
            } catch (authError) {
                setDeleteError("Incorrect password. Please try again.");
                setIsDeleting(false);
                return;
            }

            // Delete user data from Firestore
            try {
                // Delete user document
                const userDocRef = doc(db, "userlogs", currentUser?.id);
                await deleteDoc(userDocRef);

                // Delete user's investments
                const investmentsQuery = query(
                    collection(db, "investments"),
                    where("idnum", "==", currentUser?.idnum)
                );
                const investmentsSnapshot = await getDocs(investmentsQuery);
                const deleteInvestments = investmentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deleteInvestments);

                // Delete user's withdrawals
                const withdrawalsQuery = query(
                    collection(db, "withdrawals"),
                    where("idnum", "==", currentUser?.idnum)
                );
                const withdrawalsSnapshot = await getDocs(withdrawalsQuery);
                const deleteWithdrawals = withdrawalsSnapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deleteWithdrawals);

                // Delete user's notifications
                const notificationsQuery = query(
                    collection(db, "notifications"),
                    where("idnum", "==", currentUser?.idnum)
                );
                const notificationsSnapshot = await getDocs(notificationsQuery);
                const deleteNotifications = notificationsSnapshot.docs.map(doc => deleteDoc(doc.ref));
                await Promise.all(deleteNotifications);

            } catch (firestoreError) {
                console.error("Error deleting Firestore data:", firestoreError);
                // Continue with auth deletion even if Firestore fails
            }

            // Delete from Firebase Auth
            await deleteUser(user);

            // Clear session data
            try {
                sessionStorage.clear();
                localStorage.clear();
            } catch (e) {
                console.warn("Could not clear storage:", e);
            }

            // Redirect to homepage
            router.push("/");

        } catch (error) {
            console.error("Error deleting account:", error);
            setDeleteError("An error occurred while deleting your account. Please try again.");
            setIsDeleting(false);
        }
    }
  return (

    <>
      <div className="profileMainCntn">
        <div className="topmostProfileMainDisplay">
          <h2>Welcome back, {currentUser?.userName}.</h2>
          <div className="profileUtilCntn">
            <div className="profilepix" style={{backgroundImage: `url(/${currentUser?.avatar || 'avatar_1'}.png)`}} onClick={() => {setWidgetState({...widgetState, state: true})}}></div>
            <div className="profilebasicdata">
              <h3>{currentUser?.name}</h3>
              <p>{currentUser?.email}</p>
            </div>
          </div>
        </div>
        <div className="profileEditableDisplay">
          <h2>Profile Details</h2>
          <div className="theFormField">
            <div className="unitInputField">
              <label htmlFor="name">Fullname</label>
              <input type="text" value={currentUser?.name} onChange={(e) => {setCurrentUser({...currentUser, name: e.target.value})}}/>
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Username</label>
              <input type="text" value={currentUser?.userName} onChange={(e) => {setCurrentUser({...currentUser, userName: e.target.value})}}/>
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Email Address</label>
              <input type="text" disabled value={currentUser?.email} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Account Cryptic Id.</label>
              <input type="text" disabled value={currentUser?.id} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Account Register Id.</label>
              <input type="text" disabled value={currentUser?.idnum} />
            </div>
            
          </div>
          <button type="button" onClick={handleDetailUpdate}>Update Details</button>
        </div>
        <div className="profileEditableDisplay">
          <h2>Change Password</h2>
          <div className="theFormField">
            <div className="unitInputField">
              <label htmlFor="name">Old Password</label>
              <input type="text" onChange={(e) => {setpasswordchange({...passwordchange, old: e.target.value})}}/>
            </div>
            <div className="unitInputField">
              <label htmlFor="name">New Password</label>
              <input type={passwordShow ? "text": "password"} onChange={(e) => {setpasswordchange({...passwordchange, new: e.target.value})}}/>
              <span onClick={() => {setPasswordShow(prev => !prev)}}><i className={`icofont-eye-${!passwordShow? "alt": "blocked"}`}></i></span>
            </div>
            <p style={{color: `${passwordchange?.color}`}}>{passwordchange?.msg}</p>
          </div>
          <button type="button" onClick={handlePasswordChnage}>Update Password</button>
        </div>

        {/* Delete Account Section */}
        <div className="profileEditableDisplay" style={{ 
          borderColor: 'var(--danger-clr)',
          borderWidth: '2px',
          backgroundColor: 'rgba(220, 18, 98, 0.02)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <i className="icofont-warning" style={{ 
              color: 'var(--danger-clr)', 
              fontSize: '1.5rem' 
            }}></i>
            <h2 style={{ 
              color: 'var(--danger-clr)', 
              margin: 0 
            }}>
              Danger Zone
            </h2>
          </div>
          <p style={{ 
            marginBottom: '1.5rem', 
            fontSize: '0.95em',
            lineHeight: '1.6',
            color: 'var(--text-clr1)'
          }}>
            Once you delete your account, there is no going back. This action <strong>cannot be undone</strong>.
            All your data including investments, withdrawals, and account information will be permanently deleted.
          </p>
          <button 
            type="button" 
            onClick={() => setShowDeleteModal(true)}
            style={{
              backgroundColor: 'var(--danger-clr)',
              color: 'white',
              border: '2px solid var(--danger-clr)',
              padding: '0.9rem 1.8rem',
              cursor: 'pointer',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.95rem',
              transition: 'all 0.3s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(220, 18, 98, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(220, 18, 98, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(220, 18, 98, 0.3)';
            }}
          >
            <i className="icofont-trash"></i>
            Delete My Account
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="modalOverlay" style={{ padding: '10px' }}>
          <div className="modalCard" style={{ 
            maxWidth: '420px', 
            padding: '1.5rem',
            width: '100%',
            margin: '0 auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div style={{ 
                fontSize: 'clamp(2rem, 5vw, 2.5rem)', 
                marginBottom: '0.5rem',
                filter: 'drop-shadow(0 2px 4px rgba(220, 18, 98, 0.3))'
              }}>
                ⚠️
              </div>
              <h3 style={{ 
                color: 'var(--danger-clr)', 
                fontSize: 'clamp(1.1rem, 4vw, 1.3rem)',
                marginBottom: '0.3rem' 
              }}>
                Delete Account
              </h3>
            </div>
            
            <div style={{ 
              backgroundColor: 'rgba(220, 18, 98, 0.05)',
              border: '1px solid rgba(220, 18, 98, 0.2)',
              borderRadius: '8px',
              padding: 'clamp(0.6rem, 2vw, 0.8rem)',
              marginBottom: '1rem'
            }}>
              <p style={{ 
                marginBottom: '0.7rem', 
                lineHeight: '1.5',
                color: 'var(--text-clr1)',
                fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)'
              }}>
                <strong>Warning:</strong> This action is permanent. All data will be deleted:
              </p>
              <ul style={{ 
                marginBottom: '0',
                paddingLeft: '1.3rem', 
                lineHeight: '1.6',
                color: 'var(--text-clr1)',
                fontSize: 'clamp(0.8rem, 2.3vw, 0.85rem)'
              }}>
                <li>Account profile</li>
                <li>Investment records</li>
                <li>Withdrawal history</li>
                <li>Notifications</li>
              </ul>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label 
                htmlFor="deletePassword" 
                style={{ 
                  display: 'block', 
                  marginBottom: '0.4rem', 
                  fontWeight: '600',
                  color: 'var(--text-clr1)',
                  fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)'
                }}
              >
                Enter password to confirm:
              </label>
              <input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password"
                style={{
                  width: '100%',
                  padding: 'clamp(0.6rem, 2vw, 0.75rem)',
                  border: '2px solid var(--opac-clr3)',
                  borderRadius: '8px',
                  fontSize: 'clamp(0.9rem, 2.5vw, 0.95rem)',
                  backgroundColor: 'var(--bg-clr2)',
                  color: 'var(--text-clr1)',
                  transition: 'border-color 0.3s ease',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--danger-clr)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--opac-clr3)'}
                disabled={isDeleting}
              />
            </div>
            
            {deleteError && (
              <div style={{
                backgroundColor: 'rgba(220, 18, 98, 0.1)',
                border: '1px solid var(--danger-clr)',
                borderRadius: '6px',
                padding: 'clamp(0.5rem, 2vw, 0.6rem)',
                marginBottom: '1rem',
                color: 'var(--danger-clr)',
                fontSize: 'clamp(0.8rem, 2.3vw, 0.85rem)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                wordBreak: 'break-word'
              }}>
                <i className="icofont-warning" style={{ fontSize: 'clamp(1rem, 3vw, 1.1rem)', flexShrink: 0 }}></i>
                <span>{deleteError}</span>
              </div>
            )}
            
            <div className="modalActions" style={{ gap: '0.7rem' }}>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                disabled={isDeleting}
                style={{
                  padding: 'clamp(0.6rem, 2vw, 0.7rem) clamp(1rem, 3vw, 1.3rem)',
                  backgroundColor: 'var(--bg-clr2)',
                  border: '2px solid var(--opac-clr3)',
                  borderRadius: '8px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
                  color: 'var(--text-clr1)',
                  transition: 'all 0.3s ease',
                  opacity: isDeleting ? 0.5 : 1
                }}
                onMouseEnter={(e) => !isDeleting && (e.target.style.backgroundColor = 'var(--opac-clr3)')}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--bg-clr2)'}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                style={{
                  padding: 'clamp(0.6rem, 2vw, 0.7rem) clamp(1rem, 3vw, 1.3rem)',
                  backgroundColor: 'var(--danger-clr)',
                  color: 'white',
                  border: '2px solid var(--danger-clr)',
                  borderRadius: '8px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: 'clamp(0.85rem, 2.5vw, 0.9rem)',
                  transition: 'all 0.3s ease',
                  opacity: isDeleting ? 0.6 : 1,
                  boxShadow: '0 4px 12px rgba(220, 18, 98, 0.3)'
                }}
                onMouseEnter={(e) => !isDeleting && (e.target.style.transform = 'translateY(-2px)', e.target.style.boxShadow = '0 6px 16px rgba(220, 18, 98, 0.4)')}
                onMouseLeave={(e) => (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = '0 4px 12px rgba(220, 18, 98, 0.3)')}
              >
                {isDeleting ? (
                  <>
                    <i className="icofont-spinner icofont-spin" style={{ marginRight: '0.4rem' }}></i>
                    Deleting...
                  </>
                ) : (
                  'Delete Permanently'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileSect;
