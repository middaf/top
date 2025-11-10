import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import KYCComponent from '../components/dashboard/KYC';
import Head from 'next/head';

export default function KYCPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // Check if user is logged in
        const userStr = localStorage.getItem('activeUser');
        if (!userStr) {
            router.push('/signin');
            return;
        }
        try {
            const user = JSON.parse(userStr);
            setCurrentUser(user);
        } catch (err) {
            console.error('Error parsing user data:', err);
            localStorage.removeItem('activeUser');
            router.push('/signin');
        }
    }, []);

    if (!currentUser) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                background: '#f5f5f5'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>KYC Verification</title>
                <meta name="description" content="Complete your KYC verification to enable withdrawals" />
            </Head>
            
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '20px',
                minHeight: '100vh',
                background: '#fff'
            }}>
                <div style={{
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h1 style={{ margin: 0 }}>KYC Verification</h1>
                    <button
                        onClick={() => router.back()}
                        style={{
                            padding: '8px 16px',
                            background: 'transparent',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        ← Back
                    </button>
                </div>
                
                <KYCComponent currentUser={currentUser} />
            </div>
        </>
    );
}