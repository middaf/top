import React, { useState, useEffect } from 'react';
import { db } from '../../database/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import styles from './KYC.module.css';

export default function KYC({ currentUser }) {
  const [idNumber, setIdNumber] = useState('');
  const [idType, setIdType] = useState('National ID');
  const [idFile, setIdFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [kycStatus, setKycStatus] = useState('');
  const [step, setStep] = useState(1);

  const storage = getStorage();

  useEffect(() => {
    const fetchKycStatus = async () => {
      if (!currentUser?.id) return;
      const userRef = doc(db, 'userlogs', currentUser.id);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        setKycStatus(userDoc.data().kycStatus || '');
      }
    };
    fetchKycStatus();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return alert('User not authenticated');
    if (!idNumber) return alert('Please enter ID number');

    setSubmitting(true);
    try {
      const uploaded = {};
      if (idFile) {
        const path = `kyc/${currentUser.id}/id_${Date.now()}_${idFile.name}`;
        const idRef = ref(storage, path);
        await uploadBytes(idRef, idFile);
        uploaded.idUrl = await getDownloadURL(idRef);
      }
      if (selfieFile) {
        const path = `kyc/${currentUser.id}/selfie_${Date.now()}_${selfieFile.name}`;
        const selfieRef = ref(storage, path);
        await uploadBytes(selfieRef, selfieFile);
        uploaded.selfieUrl = await getDownloadURL(selfieRef);
      }

      // Create kyc record
      await addDoc(collection(db, 'kyc'), {
        userId: currentUser.id,
        idnum: currentUser.idnum,
        userName: currentUser.name || '',
        idType,
        idNumber,
        idUrl: uploaded.idUrl || null,
        selfieUrl: uploaded.selfieUrl || null,
        status: 'Pending',
        submittedAt: serverTimestamp(),
      });

      // Update user doc kycStatus
      const userRef = doc(db, 'userlogs', currentUser.id);
      await updateDoc(userRef, { kycStatus: 'Pending', kycSubmittedAt: serverTimestamp() });

      alert('KYC submitted successfully');
      setIdNumber('');
      setIdFile(null);
      setSelfieFile(null);
    } catch (err) {
      console.error('KYC submit error', err);
      alert('Error submitting KYC');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatus = () => {
    if (!kycStatus) return null;
    const statusClasses = {
      'Pending': styles.pending,
      'Verified': styles.verified,
      'Rejected': styles.rejected
    };
    return (
      <div className={`${styles.statusBox} ${statusClasses[kycStatus] || ''}`}>
        <h3>KYC Status: {kycStatus}</h3>
        {kycStatus === 'Rejected' && (
          <p>Your KYC was rejected. Please submit again with correct documentation.</p>
        )}
      </div>
    );
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 2));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="investmentMainCntn">
      <div className={styles.overviewSection}>
        <h2>KYC & Verification</h2>
      </div>

      <div className={styles.kycContainer}>
        {renderStatus()}
        
        <div className={styles.stepIndicator}>
          <span className={step === 1 ? styles.active : ''} />
          <span className={step === 2 ? styles.active : ''} />
        </div>

        <form onSubmit={handleSubmit} className={styles.kycForm}>
          {step === 1 ? (
            <>
              <div className={styles.formGroup}>
                <label>ID Type</label>
                <select value={idType} onChange={(e) => setIdType(e.target.value)}>
                  <option>National ID</option>
                  <option>Passport</option>
                  <option>Driver&apos;s License</option>
                </select>
                <p className={styles.helper}>Choose the type of identification document you&apos;ll provide</p>
              </div>

              <div className={styles.formGroup}>
                <label>ID Number</label>
                <input 
                  type="text" 
                  value={idNumber} 
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Enter your ID number"
                />
                <p className={styles.helper}>Enter the number exactly as it appears on your ID</p>
              </div>

              <button 
                type="button" 
                className={styles.submitButton}
                onClick={nextStep}
                disabled={!idNumber || !idType}
              >
                Continue to Document Upload
              </button>
            </>
          ) : (
            <>
              <div className={styles.fileUpload}>
                <div className={styles.formGroup}>
                  <label>ID Document</label>
                  <div className={styles.fileInput}>
                    <div className={styles.uploadBox}>
                      <i className="icofont-upload-alt"></i>
                      <p>Drop your ID document here or click to browse</p>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*,.pdf" 
                      onChange={(e) => setIdFile(e.target.files[0])} 
                    />
                  </div>
                  {idFile && (
                    <div className={styles.filePreview}>
                      <i className="icofont-file-alt"></i>
                      <span>{idFile.name}</span>
                    </div>
                  )}
                  <p className={styles.helper}>Upload a clear photo or scan of your ID document</p>
                </div>

                <div className={styles.formGroup}>
                  <label>Selfie with ID</label>
                  <div className={styles.fileInput}>
                    <div className={styles.uploadBox}>
                      <i className="icofont-camera"></i>
                      <p>Take a selfie holding your ID or upload one</p>
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setSelfieFile(e.target.files[0])} 
                    />
                  </div>
                  {selfieFile && (
                    <div className={styles.filePreview}>
                      <i className="icofont-file-image"></i>
                      <span>{selfieFile.name}</span>
                    </div>
                  )}
                  <p className={styles.helper}>Hold your ID next to your face in good lighting</p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  className={styles.submitButton} 
                  style={{ background: '#6c757d' }}
                  onClick={prevStep}
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={submitting || !idFile || !selfieFile}
                >
                  {submitting ? 'Submitting...' : 'Submit KYC'}
                </button>
              </div>
            </>
          )}
        </form>

        <div style={{ marginTop: 16 }}>
          <p>Current status: {currentUser?.kycStatus || 'Not submitted'}</p>
        </div>
      </div>
    </div>
  );
}
