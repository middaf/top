import React, { useState } from 'react';
import { supabaseDb } from "../../database/supabaseUtils";

const GenerateWithdrawalCode = ({ onClose }) => {
    const [userId, setUserId] = useState('');
    const [amount, setAmount] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const generateRandomCode = () => {
        const MIN = 100000;
        const MAX = 999999;
        if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
            const array = new Uint32Array(1);
            window.crypto.getRandomValues(array);
            const random = array[0] / (0xffffffff + 1);
            return Math.floor(random * (MAX - MIN + 1) + MIN).toString();
        }
        const fallback = Math.floor(Math.random() * (MAX - MIN + 1) + MIN);
        return fallback.toString();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsGenerating(true);

        if (!userId || !amount) {
            setError('Please fill in all fields');
            setIsGenerating(false);
            return;
        }

        try {
            const code = generateRandomCode();
            
            await supabaseDb.createWithdrawalCode({
                code,
                user_id: userId,
                amount: parseFloat(amount),
                used: false
            });

            setSuccess(`Code ${code} generated successfully for user ${userId}`);
            setUserId('');
            setAmount('');

        } catch (err) {
            console.error('Error generating code:', err);
            setError('Failed to generate code. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="generateCodeSection" style={{
            padding: '20px',
            backgroundColor: 'var(--dark-clr2)',
            borderRadius: '10px',
            marginBottom: '20px'
        }}>
            <form onSubmit={handleSubmit} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }}>
                <h3 style={{
                    fontSize: '1.2em',
                    color: 'var(--text-deco)',
                    marginBottom: '10px'
                }}>Generate Withdrawal Code</h3>
                
                <div>
                    <label htmlFor="userId" style={{color: 'var(--text-deco)', marginBottom: '5px', display: 'block'}}>
                        User ID
                    </label>
                    <input
                        type="text"
                        id="userId"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="Enter user ID"
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid var(--dark-clr4)',
                            background: 'var(--dark-clr3)',
                            color: 'var(--text-deco)'
                        }}
                    />
                </div>

                <div>
                    <label htmlFor="amount" style={{color: 'var(--text-deco)', marginBottom: '5px', display: 'block'}}>
                        Amount ($)
                    </label>
                    <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter withdrawal amount"
                        min="0"
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid var(--dark-clr4)',
                            background: 'var(--dark-clr3)',
                            color: 'var(--text-deco)'
                        }}
                    />
                </div>

                {error && (
                    <p style={{color: 'var(--danger-clr)', fontSize: '0.9em'}}>{error}</p>
                )}
                
                {success && (
                    <p style={{color: 'var(--green-clr)', fontSize: '0.9em'}}>{success}</p>
                )}

                <button
                    type="submit"
                    disabled={isGenerating}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: 'var(--primary-clr)',
                        color: 'var(--text-deco)',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        opacity: isGenerating ? 0.7 : 1
                    }}
                >
                    {isGenerating ? 'Generating...' : 'Generate Code'}
                </button>
            </form>
        </div>
    );
};

export default GenerateWithdrawalCode;