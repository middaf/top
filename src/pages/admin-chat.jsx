import { useEffect, useState } from 'react';
import { supabaseAuth } from '../database/supabaseUtils';
import { useRouter } from 'next/router';
import AdminChat from '../components/ChatBot/AdminChat';

export default function AdminChatPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let mounted = true;

        const checkAdminStatus = async () => {
            try {
                const adminData = JSON.parse(localStorage.getItem('adminData') || 'null');
                const { data: { user }, error } = await supabaseAuth.getCurrentUser();

                if (error || !user) {
                    if (mounted) {
                        setLoading(false);
                        router.replace('/signin_admin');
                    }
                    return;
                }

                if (adminData?.email === user.email && adminData?.admin) {
                    if (mounted) {
                        setIsAdmin(true);
                        setLoading(false);
                    }
                } else {
                    if (mounted) {
                        setLoading(false);
                        router.replace('/signin_admin');
                    }
                }
            } catch (error) {
                console.error('Error verifying admin status:', error);
                if (mounted) {
                    setLoading(false);
                    router.replace('/signin_admin');
                }
            }
        };

        const unsubscribe = onAuthStateChanged(auth, () => {
            checkAdminStatus();
        });

        return () => {
            mounted = false;
            unsubscribe();
        };
    }, [router]);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                backgroundColor: '#f0f2f5'
            }}>
                <div style={{
                    padding: '20px',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                    Loading chat...
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return <AdminChat />;
}