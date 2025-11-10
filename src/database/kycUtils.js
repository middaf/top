import { db } from './firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export const getKycStatus = async (userId) => {
  if (!userId) return null;
  
  try {
    const userRef = doc(db, 'userlogs', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data().kycStatus || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting KYC status:', error);
    return null;
  }
};

export const isKycVerified = (kycStatus) => {
  return kycStatus === 'Verified';
};

export const getKycRequirementMessage = (kycStatus) => {
  switch (kycStatus) {
    case null:
      return 'KYC verification is required before making withdrawals. Please complete your KYC verification.';
    case 'Pending':
      return 'Your KYC verification is pending. Please wait for admin approval before making withdrawals.';
    case 'Rejected':
      return 'Your KYC verification was rejected. Please submit new documentation.';
    default:
      return 'Unknown KYC status. Please contact support.';
  }
};