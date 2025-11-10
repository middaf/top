import React, { useEffect, useState } from 'react';
import { db } from "../../database/firebaseConfig";
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";

const UsersAdmin = ({ activeUsers = [], investments = [], withdrawals = [], setProfileState, setUserData}) => {
  const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Calculate user stats
    const userStats = activeUsers.reduce((stats, user) => {
        const userInvestments = investments.filter(inv => inv.idnum === user.idnum);
        const userWithdrawals = withdrawals.filter(w => w.idnum === user.idnum);
        
        return {
            totalUsers: stats.totalUsers + 1,
            activeUsers: stats.activeUsers + (userInvestments.some(inv => inv.status === 'Active') ? 1 : 0),
            totalBalance: stats.totalBalance + (parseFloat(user.balance) || 0),
            avgInvestment: stats.avgInvestment + (userInvestments.reduce((sum, inv) => sum + (parseFloat(inv.capital) || 0), 0) / (userInvestments.length || 1))
        };
    }, { totalUsers: 0, activeUsers: 0, totalBalance: 0, avgInvestment: 0 });

    useEffect(() => {
        if (Array.isArray(activeUsers)) {
            activeUsers.forEach(async(elem) => {
                try {
                    const docRef = doc(db, "userlogs", elem.id);
                    await updateDoc(docRef, {
                        authStatus: "seen"
                    })
                } catch (error) {
                    console.log(error);
                }
            });
        }
    }, [activeUsers]);

    // Handle delete user
    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        
        setIsProcessing(true);
        try {
            // Delete user document
            await deleteDoc(doc(db, "userlogs", selectedUser.id));
            
            // Delete related investments
            const investmentsQuery = query(
                collection(db, "investments"),
                where("userId", "==", selectedUser.id)
            );
            const investmentDocs = await getDocs(investmentsQuery);
            investmentDocs.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            
            // Delete related withdrawals
            const withdrawalsQuery = query(
                collection(db, "withdrawals"),
                where("userId", "==", selectedUser.id)
            );
            const withdrawalDocs = await getDocs(withdrawalsQuery);
            withdrawalDocs.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            
            alert(`User ${selectedUser.name} has been deleted successfully`);
            setShowDeleteModal(false);
            setSelectedUser(null);
            window.location.reload();
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Failed to delete user. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle suspend/activate user
    const handleToggleSuspend = async () => {
        if (!selectedUser) return;
        
        setIsProcessing(true);
        try {
            const newStatus = selectedUser.accountStatus === "suspended" ? "active" : "suspended";
            await updateDoc(doc(db, "userlogs", selectedUser.id), {
                accountStatus: newStatus
            });
            
            alert(`User ${selectedUser.name} has been ${newStatus === "suspended" ? "suspended" : "activated"} successfully`);
            setShowSuspendModal(false);
            setSelectedUser(null);
            window.location.reload();
        } catch (error) {
            console.error("Error updating user status:", error);
            alert("Failed to update user status. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };  const filteredUsers = activeUsers.filter(user => {
    return !searchTerm || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.idnum.toString().includes(searchTerm);
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aValue = sortField === 'date' ? new Date(a[sortField]) : a[sortField];
    let bValue = sortField === 'date' ? new Date(b[sortField]) : b[sortField];
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  return (
    <div className="investmentMainCntn">
      <div className="overviewSection">
        <div className="dashboardStats">
          <div className="statCard">
            <h3>Total Users</h3>
            <h2>{userStats.totalUsers}</h2>
          </div>
          <div className="statCard">
            <h3>Active Users</h3>
            <h2>{userStats.activeUsers}</h2>
          </div>
          <div className="statCard">
            <h3>Total Balance</h3>
            <h2>${userStats.totalBalance.toLocaleString()}</h2>
          </div>
          <div className="statCard">
            <h3>Avg Investment</h3>
            <h2>${Math.round(userStats.avgInvestment).toLocaleString()}</h2>
          </div>
        </div>
        <div className="filterSection">
          <div className="searchBox">
            <input 
              type="text" 
              placeholder="Search by name, email or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="sortOptions">
            <select onChange={(e) => setSortField(e.target.value)}>
              <option value="date">Join Date</option>
              <option value="balance">Balance</option>
              <option value="investmentCount">Investments</option>
            </select>
            <button onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}>
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>
    <div className="myinvestmentSection">
      <h2>Users Data ({filteredUsers.length})</h2>
      {
          activeUsers.length > 0 ? (
              <div className="historyTable">
                                              <thead>
                                <tr>
                                    <th>S/N</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Cryptic ID</th>
                                    <th>Joined On</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                  {
                      sortedUsers.map((elem, idx) => (
                          <div className="investmentTablehead" key={`${elem.idnum}-UAdmin_${idx}`}>
                              <div className="unitheadsect">{idx + 1}</div>
                              <div className="unitheadsect" onClick={() => {setUserData(elem); setProfileState("Edit User")}} style={{cursor: 'pointer'}}>{elem?.name}</div>
                              <div className="unitheadsect">{elem?.email}</div>
                              <div className="unitheadsect">{elem?.id}</div>
                              <div className="unitheadsect">{new Date(elem?.date).toLocaleDateString("en-US", {day: "numeric", month: "short", year: "numeric", })}</div>
                              <div className="unitheadsect">
                                  <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      backgroundColor: elem.accountStatus === 'suspended' ? '#ffebee' : '#e8f5e9',
                                      color: elem.accountStatus === 'suspended' ? '#c62828' : '#2e7d32'
                                  }}>
                                      {elem.accountStatus === 'suspended' ? 'Suspended' : 'Active'}
                                  </span>
                              </div>
                              <div className="unitheadsect">
                                  <div style={{display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap'}}>
                                      <button
                                          onClick={() => {
                                              setSelectedUser(elem);
                                              setShowSuspendModal(true);
                                          }}
                                          style={{
                                              padding: '6px 12px',
                                              borderRadius: '4px',
                                              border: 'none',
                                              cursor: 'pointer',
                                              fontSize: '12px',
                                              fontWeight: 'bold',
                                              backgroundColor: elem.accountStatus === 'suspended' ? '#4caf50' : '#ff9800',
                                              color: 'white'
                                          }}
                                      >
                                          {elem.accountStatus === 'suspended' ? 'Activate' : 'Suspend'}
                                      </button>
                                      <button
                                          onClick={() => {
                                              setSelectedUser(elem);
                                              setShowDeleteModal(true);
                                          }}
                                          style={{
                                              padding: '6px 12px',
                                              borderRadius: '4px',
                                              border: 'none',
                                              cursor: 'pointer',
                                              fontSize: '12px',
                                              fontWeight: 'bold',
                                              backgroundColor: '#f44336',
                                              color: 'white'
                                          }}
                                      >
                                          Delete
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ))
                  }
              </div>

          ) : (

              <div className="emptyTable">
                  <i className="icofont-exclamation-tringle"></i>
                  <p>
                      You currently have no active user.
                  </p>
              </div>
          )
      }
    </div>

    {/* Delete Confirmation Modal */}
    {showDeleteModal && (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                maxWidth: '400px',
                width: '90%'
            }}>
                <h3 style={{marginTop: 0, color: '#333'}}>Confirm Delete</h3>
                <p style={{color: '#666'}}>
                    Are you sure you want to delete user <strong>{selectedUser?.name}</strong>? 
                    This action will permanently delete the user and all their related data (investments, withdrawals, etc.). 
                    This cannot be undone.
                </p>
                <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px'}}>
                    <button
                        onClick={() => {
                            setShowDeleteModal(false);
                            setSelectedUser(null);
                        }}
                        disabled={isProcessing}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            backgroundColor: 'white',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            opacity: isProcessing ? 0.5 : 1
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDeleteUser}
                        disabled={isProcessing}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: '#f44336',
                            color: 'white',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            opacity: isProcessing ? 0.5 : 1
                        }}
                    >
                        {isProcessing ? 'Deleting...' : 'Delete User'}
                    </button>
                </div>
            </div>
        </div>
    )}

    {/* Suspend/Activate Confirmation Modal */}
    {showSuspendModal && (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                maxWidth: '400px',
                width: '90%'
            }}>
                <h3 style={{marginTop: 0, color: '#333'}}>
                    Confirm {selectedUser?.accountStatus === 'suspended' ? 'Activation' : 'Suspension'}
                </h3>
                <p style={{color: '#666'}}>
                    Are you sure you want to {selectedUser?.accountStatus === 'suspended' ? 'activate' : 'suspend'} user <strong>{selectedUser?.name}</strong>?
                    {selectedUser?.accountStatus !== 'suspended' && ' The user will not be able to log in while suspended.'}
                </p>
                <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px'}}>
                    <button
                        onClick={() => {
                            setShowSuspendModal(false);
                            setSelectedUser(null);
                        }}
                        disabled={isProcessing}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            backgroundColor: 'white',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            opacity: isProcessing ? 0.5 : 1
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleToggleSuspend}
                        disabled={isProcessing}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: selectedUser?.accountStatus === 'suspended' ? '#4caf50' : '#ff9800',
                            color: 'white',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            opacity: isProcessing ? 0.5 : 1
                        }}
                    >
                        {isProcessing ? 'Processing...' : (selectedUser?.accountStatus === 'suspended' ? 'Activate User' : 'Suspend User')}
                    </button>
                </div>
            </div>
        </div>
    )}

  </div>
  )
}

export default UsersAdmin
