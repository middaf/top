import React, { useEffect, useState } from 'react';
import { supabase, supabaseRealtime } from '../../database/supabaseUtils';
import styles from './LoanSect.module.css';

export default function LoanSect({ currentUser }) {
  const [loans, setLoans] = useState([]);
  const [formStep, setFormStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const formatLoanDate = (timestamp) => {
    if (!timestamp) return '-';
    try {
      return new Date(timestamp).toLocaleString();
    } catch (error) {
      console.warn('Unable to format loan date:', error);
      return '-';
    }
  };
  
  // Form state
  const [loanData, setLoanData] = useState({
    amount: '',
    purpose: '',
    employmentStatus: '',
    employer: '',
    monthlyIncome: '',
    paymentFrequency: 'Monthly',
    employmentDuration: '',
    previousLoans: 'No',
    collateral: 'No',
    collateralType: '',
    collateralValue: '',
    creditScore: '',
    references: [{
      name: '',
      relationship: '',
      phone: '',
      email: ''
    }],
    bankName: '',
    accountNumber: '',
    accountType: 'Savings',
    residentialStatus: 'Own',
    monthlyRent: '',
    residenceDuration: '',
    dependents: '0',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    },
    preferredDuration: '3',
    preferredPaymentDate: '1',
    agreeToTerms: false
  });

  useEffect(() => {
    if (!currentUser?.idnum) return;

    const fetchLoans = async () => {
      try {
        const { data, error } = await supabase
          .from('loans')
          .select('*')
          .eq('idnum', currentUser.idnum)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setLoans(data);
        } else if (error) {
          console.error('Loan fetch error:', error);
        }
      } catch (error) {
        console.error('Unexpected error fetching loans:', error);
      }
    };

    fetchLoans();

    // Set up real-time subscription for loans
    const subscription = supabaseRealtime.subscribeToLoans(currentUser.idnum, (payload) => {
      console.log('Loan change:', payload);
      // Refresh loans when there's a change
      fetchLoans();
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [currentUser?.idnum]);

  const handleInputChange = (e, section = null, index = null) => {
    const { name, value, type, checked } = e.target;
    
    if (section === 'references') {
      const updatedRefs = [...loanData.references];
      updatedRefs[index] = { ...updatedRefs[index], [name]: value };
      setLoanData(prev => ({ ...prev, references: updatedRefs }));
    } else if (section === 'emergencyContact') {
      setLoanData(prev => ({
        ...prev,
        emergencyContact: { ...prev.emergencyContact, [name]: value }
      }));
    } else {
      setLoanData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleAddReference = () => {
    setLoanData(prev => ({
      ...prev,
      references: [...prev.references, { name: '', relationship: '', phone: '', email: '' }]
    }));
  };

  const handleRemoveReference = (index) => {
    setLoanData(prev => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index)
    }));
  };

  const nextStep = () => setFormStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setFormStep(prev => Math.max(prev - 1, 1));

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!loanData.amount || isNaN(Number(loanData.amount))) {
      alert('Please enter a valid loan amount');
      return;
    }
    if (!loanData.agreeToTerms) {
      alert('Please agree to the terms and conditions');
      return;
    }

    setSubmitting(true);
    try {
      const loanSubmitData = {
        ...loanData,
        amount: Number(loanData.amount),
        monthlyIncome: Number(loanData.monthlyIncome) || 0,
        collateralValue: Number(loanData.collateralValue) || 0,
        idnum: currentUser.idnum,
        user_id: currentUser.id || null,
        user_name: currentUser.name || '',
        status: 'Pending'
      };

      const { error } = await supabaseDb.createLoan(loanSubmitData);
      if (error) throw error;
      
      setLoanData({
        amount: '',
        purpose: '',
        employmentStatus: '',
        employer: '',
        monthlyIncome: '',
        paymentFrequency: 'Monthly',
        employmentDuration: '',
        previousLoans: 'No',
        collateral: 'No',
        collateralType: '',
        collateralValue: '',
        creditScore: '',
        references: [{
          name: '',
          relationship: '',
          phone: '',
          email: ''
        }],
        bankName: '',
        accountNumber: '',
        accountType: 'Savings',
        residentialStatus: 'Own',
        monthlyRent: '',
        residenceDuration: '',
        dependents: '0',
        emergencyContact: {
          name: '',
          relationship: '',
          phone: '',
          email: ''
        },
        preferredDuration: '3',
        preferredPaymentDate: '1',
        agreeToTerms: false
      });
      setFormStep(1);
      alert('Loan request submitted successfully');
    } catch (err) {
      console.error('Loan request error', err);
      alert('Error submitting loan request');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormStep = () => {
    switch (formStep) {
      case 1:
        return (
          <div className={styles.formStep}>
            <h3>Basic Loan Information</h3>
            <div className={styles.formGroup}>
              <label>Loan Amount *</label>
              <input
                type="number"
                name="amount"
                value={loanData.amount}
                onChange={handleInputChange}
                placeholder="Enter amount"
                required
              />
            </div>
            <div className="formGroup">
              <label>Purpose of Loan *</label>
              <select
                name="purpose"
                value={loanData.purpose}
                onChange={handleInputChange}
                required
              >
                <option value="">Select purpose</option>
                <option value="Business">Business</option>
                <option value="Education">Education</option>
                <option value="Medical">Medical</option>
                <option value="Debt Consolidation">Debt Consolidation</option>
                <option value="Home Improvement">Home Improvement</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="formGroup">
              <label>Preferred Loan Duration (months) *</label>
              <select
                name="preferredDuration"
                value={loanData.preferredDuration}
                onChange={handleInputChange}
                required
              >
                <option value="3">3 months</option>
                <option value="6">6 months</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
              </select>
            </div>
            <div className="formGroup">
              <label>Preferred Payment Date *</label>
              <select
                name="preferredPaymentDate"
                value={loanData.preferredPaymentDate}
                onChange={handleInputChange}
                required
              >
                {[...Array(28)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}th of each month
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="formStep">
            <h3>Employment & Income</h3>
            <div className="formGroup">
              <label>Employment Status *</label>
              <select
                name="employmentStatus"
                value={loanData.employmentStatus}
                onChange={handleInputChange}
                required
              >
                <option value="">Select status</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Self-employed">Self-employed</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Retired">Retired</option>
              </select>
            </div>
            <div className="formGroup">
              <label>Employer Name</label>
              <input
                type="text"
                name="employer"
                value={loanData.employer}
                onChange={handleInputChange}
                placeholder="Enter employer name"
              />
            </div>
            <div className="formGroup">
              <label>Monthly Income *</label>
              <input
                type="number"
                name="monthlyIncome"
                value={loanData.monthlyIncome}
                onChange={handleInputChange}
                placeholder="Enter monthly income"
                required
              />
            </div>
            <div className="formGroup">
              <label>Employment Duration *</label>
              <input
                type="text"
                name="employmentDuration"
                value={loanData.employmentDuration}
                onChange={handleInputChange}
                placeholder="e.g., 2 years"
                required
              />
            </div>
            <div className="formGroup">
              <label>Previous Loans?</label>
              <select
                name="previousLoans"
                value={loanData.previousLoans}
                onChange={handleInputChange}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="formStep">
            <h3>Collateral & References</h3>
            <div className="formGroup">
              <label>Willing to Provide Collateral?</label>
              <select
                name="collateral"
                value={loanData.collateral}
                onChange={handleInputChange}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            {loanData.collateral === 'Yes' && (
              <>
                <div className="formGroup">
                  <label>Collateral Type</label>
                  <select
                    name="collateralType"
                    value={loanData.collateralType}
                    onChange={handleInputChange}
                  >
                    <option value="">Select type</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Investment">Investment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="formGroup">
                  <label>Collateral Value</label>
                  <input
                    type="number"
                    name="collateralValue"
                    value={loanData.collateralValue}
                    onChange={handleInputChange}
                    placeholder="Enter collateral value"
                  />
                </div>
              </>
            )}
            
            <h4>References</h4>
            {loanData.references.map((ref, index) => (
              <div key={index} className="reference-section">
                <h5>Reference #{index + 1}</h5>
                <div className="formGroup">
                  <label>Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={ref.name}
                    onChange={(e) => handleInputChange(e, 'references', index)}
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Relationship *</label>
                  <input
                    type="text"
                    name="relationship"
                    value={ref.relationship}
                    onChange={(e) => handleInputChange(e, 'references', index)}
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={ref.phone}
                    onChange={(e) => handleInputChange(e, 'references', index)}
                    required
                  />
                </div>
                <div className="formGroup">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={ref.email}
                    onChange={(e) => handleInputChange(e, 'references', index)}
                  />
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveReference(index)}
                    className="remove-btn"
                  >
                    Remove Reference
                  </button>
                )}
              </div>
            ))}
            {loanData.references.length < 3 && (
              <button
                type="button"
                onClick={handleAddReference}
                className="add-btn"
              >
                Add Another Reference
              </button>
            )}
          </div>
        );

      case 4:
        return (
          <div className="formStep">
            <h3>Banking & Personal Information</h3>
            <div className="formGroup">
              <label>Bank Name *</label>
              <input
                type="text"
                name="bankName"
                value={loanData.bankName}
                onChange={handleInputChange}
                placeholder="Enter bank name"
                required
              />
            </div>
            <div className="formGroup">
              <label>Account Number *</label>
              <input
                type="text"
                name="accountNumber"
                value={loanData.accountNumber}
                onChange={handleInputChange}
                placeholder="Enter account number"
                required
              />
            </div>
            <div className="formGroup">
              <label>Account Type</label>
              <select
                name="accountType"
                value={loanData.accountType}
                onChange={handleInputChange}
              >
                <option value="Savings">Savings</option>
                <option value="Checking">Checking</option>
                <option value="Current">Current</option>
              </select>
            </div>

            <h4>Emergency Contact</h4>
            <div className="formGroup">
              <label>Name *</label>
              <input
                type="text"
                name="name"
                value={loanData.emergencyContact.name}
                onChange={(e) => handleInputChange(e, 'emergencyContact')}
                required
              />
            </div>
            <div className="formGroup">
              <label>Relationship *</label>
              <input
                type="text"
                name="relationship"
                value={loanData.emergencyContact.relationship}
                onChange={(e) => handleInputChange(e, 'emergencyContact')}
                required
              />
            </div>
            <div className="formGroup">
              <label>Phone *</label>
              <input
                type="tel"
                name="phone"
                value={loanData.emergencyContact.phone}
                onChange={(e) => handleInputChange(e, 'emergencyContact')}
                required
              />
            </div>
            <div className="formGroup">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={loanData.emergencyContact.email}
                onChange={(e) => handleInputChange(e, 'emergencyContact')}
              />
            </div>

            <div className="formGroup checkbox">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={loanData.agreeToTerms}
                onChange={handleInputChange}
                required
              />
              <label>
                I agree to the terms and conditions, and I confirm that all information provided is accurate
              </label>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="investmentMainCntn">
      <div className="overviewSection">
        <h2>Your Loans ({loans.length})</h2>
      </div>

      <div className="myinvestmentSection">
        <form onSubmit={handleRequest} className={styles['loan-form']}>
          <div className={styles['form-progress']} data-step={formStep}>
            <div className={`${styles['progress-step']} ${formStep >= 1 ? styles.active : ''}`}>1</div>
            <div className={`${styles['progress-step']} ${formStep >= 2 ? styles.active : ''}`}>2</div>
            <div className={`${styles['progress-step']} ${formStep >= 3 ? styles.active : ''}`}>3</div>
            <div className={`${styles['progress-step']} ${formStep >= 4 ? styles.active : ''}`}>4</div>
          </div>

          {renderFormStep()}

          <div className={styles['form-buttons']}>
            {formStep > 1 && (
              <button type="button" onClick={prevStep} className={styles['prev-btn']}>
                Previous
              </button>
            )}
            {formStep < 4 && (
              <button type="button" onClick={nextStep} className={styles['next-btn']}>
                Next
              </button>
            )}
            {formStep === 4 && (
              <button type="submit" className={styles['submit-btn']} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Loan Request'}
              </button>
            )}
          </div>
        </form>

        <h3 className={styles['section-title']}>Loan History</h3>
        {loans.length === 0 ? (
          <div className={styles.emptyTable}>
            <i className="icofont-exclamation-tringle"></i>
            <p>No loan requests yet.</p>
          </div>
        ) : (
          <div className="historyTable">
            <div className="investmentTablehead header">
              <div className="unitheadsect">S/N</div>
              <div className="unitheadsect">Amount</div>
              <div className="unitheadsect">Purpose</div>
              <div className="unitheadsect">Status</div>
              <div className="unitheadsect">Requested On</div>
            </div>
            {loans.map((ln, idx) => (
              <div className="investmentTablehead" key={ln.id}>
                <div className="unitheadsect">{idx + 1}</div>
                <div className="unitheadsect">${Number(ln.amount || 0).toLocaleString()}</div>
                <div className="unitheadsect">{ln.purpose || '-'}</div>
                <div className="unitheadsect">{ln.status || 'Pending'}</div>
                <div className="unitheadsect">{formatLoanDate(ln.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
