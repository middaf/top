/* eslint-disable */
import React, { useState } from 'react'
import { supabaseDb } from "../../database/supabaseUtils";

const UnitUserSect = ({ userData, setProfileState, setUserData}) => {

    const handleDetailUpdate = async () => {
        try {
            await supabaseDb.updateUserDetails(userData?.id, {
                name: userData?.name,
                userName: userData?.userName,
                authStatus: "seen"
            });
            setProfileState("Users");
        } catch (error) {
            console.error("Error updating user details:", error);
        }
    };

  // Admin can add balance or bonus to a user
  const [addBalance, setAddBalance] = useState(0);
  const [addBonus, setAddBonus] = useState(0);

  const handleAddFunds = async () => {
    const ok = window.confirm(`Add $${addBalance || 0} balance and $${addBonus || 0} bonus to ${userData?.name || userData?.idnum}?`);
    if (!ok) return;

    try {
      const adminData = (typeof window !== 'undefined') ? JSON.parse(localStorage.getItem('adminData') || 'null') : null;
      const modifiedBy = adminData?.id || adminData?.userName || 'admin';

      await supabaseDb.addFundsToUser(userData?.id, {
        balance: parseFloat(addBalance) || 0,
        bonus: parseFloat(addBonus) || 0,
        modifiedBy
      });

      // Update local state shown in form
      setUserData({
          ...userData,
          balance: (parseFloat(userData?.balance) || 0) + (parseFloat(addBalance) || 0),
          bonus: (parseFloat(userData?.bonus) || 0) + (parseFloat(addBonus) || 0)
      });
      setAddBalance(0);
      setAddBonus(0);
      setProfileState("Users");
    } catch (err) {
      console.error('Error adding funds to user:', err);
    }
  };




  return (
    <div className="profileMainCntn">
      <div className="profileEditableDisplay">
          <h2>User Details</h2>
          <div className="theFormField">
            <div className="unitInputField">
              <label htmlFor="name">Name</label>
              <input type="text" value={userData?.name} onChange={(e) => {setUserData({...userData, name: e.target.value})}}/>
            </div>
            <div className="unitInputField">
              <label htmlFor="name">UserName</label>
              <input type="text" value={userData?.userName} onChange={(e) => {setUserData({...userData, userName: e.target.value})}}/>
            </div>
            <div className="unitInputField">
              <label htmlFor="name">User Email</label>
              <input type="text" disabled value={userData?.email} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Account Cryptic Id.</label>
              <input type="text" disabled value={userData?.id} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Account Register Id.</label>
              <input type="text" disabled value={userData?.idnum} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Joined on</label>
              <input type="text" disabled value={new Date(userData?.date).toLocaleDateString("en-US", {day: "numeric", month: "short", year: "numeric", }) } />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Current Balance</label>
              <input type="text" disabled value={`$${(parseFloat(userData?.balance) || 0).toLocaleString()}`} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Current Bonus</label>
              <input type="text" disabled value={`$${(parseFloat(userData?.bonus) || 0).toLocaleString()}`} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Add Balance</label>
              <input type="number" value={addBalance} onChange={(e) => setAddBalance(e.target.value)} />
            </div>
            <div className="unitInputField">
              <label htmlFor="name">Add Bonus</label>
              <input type="number" value={addBonus} onChange={(e) => setAddBonus(e.target.value)} />
            </div>
            
          </div>

      <div className="flex-align-jusc">                   
        <button type="button" onClick={handleDetailUpdate}>Update Details</button>
        <button type="button" onClick={handleAddFunds} className="activateBtn">Add Balance/Bonus</button>
      </div>
        </div>
    </div>
  )
}

export default UnitUserSect
