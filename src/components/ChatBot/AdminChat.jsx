import { useState, useEffect } from 'react';
import { db } from '../../database/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where } from 'firebase/firestore';
import { useRouter } from 'next/router';
import styles from './AdminChat.module.css';

export default function AdminChat() {
    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [inputMessage, setInputMessage] = useState('');
    const [userMessages, setUserMessages] = useState([]);
    const [isMobileView, setIsMobileView] = useState(false);
    const messageListRef = useState(null);

    const handleDashboardClick = () => {
        router.push('/dashboard_admin');
    };

    useEffect(() => {
        const handleResize = () => {
            setIsMobileView(window.innerWidth <= 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [showChatWindow, setShowChatWindow] = useState(false);

    const handleUserSelect = (userId) => {
        setSelectedUser(userId);
        if (isMobileView) {
            setShowChatWindow(true);
        }
    };

    const handleBackClick = () => {
        if (isMobileView) {
            setShowChatWindow(false);
        }
    };

    useEffect(() => {
        // Subscribe to get unique users who have messages
        const q = query(
            collection(db, 'chats'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const uniqueUsers = new Set();
            const userMap = new Map();

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.userId && !data.isAdmin) {
                    uniqueUsers.add(data.userId);
                    // Store most recent message for user preview
                    if (!userMap.has(data.userId)) {
                        userMap.set(data.userId, {
                            lastMessage: data.message,
                            timestamp: data.timestamp
                        });
                    }
                }
            });

            setUsers(Array.from(uniqueUsers).map(userId => ({
                id: userId,
                lastMessage: userMap.get(userId)?.lastMessage || '',
                timestamp: userMap.get(userId)?.timestamp
            })));
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!selectedUser) return;

        // Subscribe to messages for selected user
        const q = query(
            collection(db, 'chats'),
            where('userId', '==', selectedUser),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                isWithdrawalRequest: doc.data().type === 'withdrawal-request'
            }));
            setMessages(userMessages);
            
            // Scroll to bottom after messages update
            setTimeout(() => {
                const messageList = document.querySelector(`.${styles.messageList}`);
                if (messageList) {
                    messageList.scrollTop = messageList.scrollHeight;
                }
            }, 100);
        });

        return () => unsubscribe();
    }, [selectedUser]);

    const generateWithdrawalCode = async (userId, amount) => {
        try {
            const numericAmount = Number.parseFloat(amount);
            if (!userId || isNaN(numericAmount) || numericAmount <= 0) {
                throw new Error('Invalid user ID or amount');
            }

            // Enforce minimum withdrawal amount of $200 for admin-generated codes
            if (numericAmount < 200) {
                alert('Minimum withdrawal amount for code generation is $200');
                return;
            }

            // Generate a cryptographically secure random code (6 digits)
            const array = new Uint32Array(1);
            crypto.getRandomValues(array);
            const code = (array[0] % 900000 + 100000).toString();
            
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now

            // Store the code in Firestore with retries
            let retries = 3;
            while (retries > 0) {
                try {
                    await addDoc(collection(db, 'withdrawalCodes'), {
                        code,
                        userId,
                        amount: parseFloat(amount),
                        createdAt: serverTimestamp(),
                        expiresAt,
                        used: false,
                        status: 'active'
                    });
                    break;
                } catch (e) {
                    retries--;
                    if (retries === 0) throw e;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Send the code in chat with amount formatting
            await addDoc(collection(db, 'chats'), {
                message: `Your withdrawal code is: ${code}\nThis code will expire in 15 minutes.\nAmount: $${parseFloat(amount).toLocaleString('en-US', {minimumFractionDigits: 2})}`,
                userId,
                recipientId: userId,
                senderUserId: 'admin',
                userName: 'Admin',
                timestamp: serverTimestamp(),
                isAdmin: true,
                type: 'withdrawal-code'
            });

            // Create a notification for the user
            await addDoc(collection(db, 'notifications'), {
                userId,
                type: 'withdrawal_code',
                title: 'Withdrawal Code Generated',
                message: `A withdrawal code has been generated for your request of $${parseFloat(amount).toLocaleString('en-US', {minimumFractionDigits: 2})}. Check your chat messages.`,
                status: 'unseen',
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('Error generating code:', error);
            alert('Error generating withdrawal code. Please try again.');
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim() || !selectedUser) return;

        try {
            // Add admin message to Firestore
            await addDoc(collection(db, 'chats'), {
                message: inputMessage.trim(),
                userId: selectedUser, // Set recipient user ID
                recipientId: selectedUser,
                senderUserId: 'admin',
                userName: 'Admin',
                timestamp: serverTimestamp(),
                isAdmin: true
            });
            setInputMessage('');
        } catch (error) {
            console.error('Error:', error);
            alert('Error sending message. Please try again.');
        }
    };

    const extractWithdrawalInfo = (message) => {
        try {
            const patterns = [
                // Handle structured format with $ and commas
                /Amount:\s*\$([0-9,]+(\.[0-9]+)?)/i,
                // Handle "for X" format
                /for\s*\$?([0-9,]+(\.[0-9]+)?)/i,
                // Handle plain number with optional $
                /\$?([0-9,]+(\.[0-9]+)?)/
            ];

            let amount = 0;
            let userId = selectedUser;

            // Try each pattern until we find a match
            for (const pattern of patterns) {
                const match = message.match(pattern);
                if (match) {
                    amount = parseFloat(match[1].replace(/,/g, ''));
                    break;
                }
            }

            // Try to find user ID if present
            const userIdMatch = message.match(/User\s*ID:\s*([^\n\r]+)/i);
            if (userIdMatch) {
                userId = userIdMatch[1].trim();
            }

            // Validate amount
            if (isNaN(amount) || amount <= 0) {
                throw new Error('Invalid amount detected');
            }

            return { amount, userId };
        } catch (error) {
            console.error('Error extracting withdrawal info:', error, 'from message:', message);
            return { amount: 0, userId: selectedUser };
        }
    };

    return (
        <div className={styles.adminChatContainer}>
            <div className={`${styles.usersList} ${showChatWindow ? styles.hidden : ''}`}>
                <div className={styles.chatHeader}>
                    <button 
                        onClick={handleDashboardClick}
                        className={styles.dashboardButton}
                        aria-label="Back to Dashboard"
                    >
                        <span style={{ fontSize: '28px', lineHeight: 1 }}>‹</span>
                    </button>
                    <div className={styles.headerContent}>
                        <h3>Active Chats</h3>
                        <small>{users.length} active conversations</small>
                    </div>
                </div>
                <div className={styles.userList}>
                    {users.map((user) => (
                        <div 
                            key={user.id} 
                            className={`${styles.userItem} ${selectedUser === user.id ? styles.selectedUser : ''}`}
                            onClick={() => handleUserSelect(user.id)}
                        >
                            <strong>User {user.id}</strong>
                            <div className={styles.userPreview}>
                                <p>{user.lastMessage}</p>
                                <span className={styles.timestamp}>
                                    {user.timestamp?.toDate().toLocaleTimeString() || 'Just now'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className={`${styles.chatWindow} ${showChatWindow ? styles.visible : ''}`}>
                <div className={styles.chatHeader}>
                    {isMobileView && (
                        <button 
                            className={styles.backButton}
                            onClick={handleBackClick}
                            style={{ display: 'flex' }}
                            aria-label="Back to chat list"
                        >
                            <span style={{ fontSize: '28px', lineHeight: 1 }}>‹</span>
                        </button>
                    )}
                    {selectedUser ? (
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>User {selectedUser}</h3>
                            <small style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>Active now</small>
                        </div>
                    ) : (
                        <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Select a user to start chatting</h3>
                    )}
                </div>
                <div className={styles.messageList}>
                    {messages.map((msg) => (
                        <div key={msg.id} className={`${styles.message} ${msg.isAdmin ? styles.adminMessage : styles.userMessage}`}>
                            <div className={styles.messageHeader}>
                                <strong>{msg.userName || 'Unknown'}</strong>
                                <span className={styles.timestamp}>
                                    {msg.timestamp?.toDate().toLocaleTimeString() || 'Just now'}
                                </span>
                            </div>
                            <div className={styles.messageContent}>
                                {msg.message}
                                {msg.isWithdrawalRequest && (
                                    <div className={styles.withdrawalControls}>
                                        <button
                                            onClick={() => {
                                                const { amount, userId } = extractWithdrawalInfo(msg.message);
                                                if (!amount || amount <= 0) {
                                                    alert('Invalid withdrawal amount');
                                                    return;
                                                }
                                                if (!userId) {
                                                    alert('Could not determine user ID');
                                                    return;
                                                }
                                                generateWithdrawalCode(userId, amount);
                                            }}
                                            className={styles.generateCodeBtn}
                                        >
                                            Generate Withdrawal Code
                                        </button>
                                        <button
                                            onClick={() => {
                                                setInputMessage('Your withdrawal request has been denied. Please contact support for more information.');
                                            }}
                                            className={styles.denyRequestBtn}
                                        >
                                            Deny Request
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.messageInputContainer}>
                    <form onSubmit={handleSend} className={styles.messageForm}>
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Type a message..."
                            className={styles.messageInput}
                            disabled={!selectedUser}
                        />
                        <button
                            type="submit"
                            disabled={!selectedUser || !inputMessage.trim()}
                            className={styles.sendButton}
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}