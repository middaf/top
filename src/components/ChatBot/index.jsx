import { useState, useEffect, useRef } from 'react';
import { supabase, supabaseDb, supabaseRealtime } from '../../database/supabaseUtils';
import styles from './ChatBot.module.css';

function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [highlightedOption, setHighlightedOption] = useState(null);
    const messagesEndRef = useRef(null);

    // Function to scroll to the bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Derive a stable activeId from storage so we can re-subscribe when the logged
    // in user changes while the chat widget is open. Reading storage here keeps
    // the component responsive to changes from sign-in / sign-out flows.
    let _active = {};
    try { _active = JSON.parse(sessionStorage.getItem('activeUser') || localStorage.getItem('activeUser') || '{}'); } catch (e) { _active = {}; }
    const activeId = _active?.idnum || _active?.uid || _active?.id || null;

    useEffect(() => {
        if (!isOpen) return undefined;

        // If we don't have an active id, don't subscribe to global chats
        if (!activeId) {
            setMessages([]);
            return undefined;
        }

        // Query only for the current user's chats to preserve privacy.
        const unsubscribe = supabaseRealtime.subscribeToChatMessages(activeId, (payload) => {
            // Refresh messages when there's a change
            supabaseDb.getChatMessages(activeId).then(({ data, error }) => {
                if (!error && data) {
                    const newMessages = data.map(msg => ({
                        id: msg.id,
                        ...msg,
                        text: msg.message,
                        sender: msg.is_admin ? 'bot' : 'user'
                    }));
                    setMessages(newMessages);
                    // Scroll to bottom when new messages arrive
                    setTimeout(scrollToBottom, 100);
                }
            });
        });

        // Initial load of messages
        supabaseDb.getChatMessages(activeId).then(({ data, error }) => {
            if (!error && data) {
                const initialMessages = data.map(msg => ({
                    id: msg.id,
                    ...msg,
                    text: msg.message,
                    sender: msg.is_admin ? 'bot' : 'user'
                }));
                setMessages(initialMessages);
                setTimeout(scrollToBottom, 100);
            }
        });

        // Cleanup subscription on unmount or when activeId/isOpen changes
        return () => {
            try { unsubscribe && unsubscribe(); } catch (e) { /* ignore cleanup errors */ }
        };
    }, [isOpen, activeId]);

    // Scroll to bottom when chat opens or messages change
    useEffect(() => {
        if (isOpen && messages.length > 0) {
            scrollToBottom();
        }
    }, [isOpen, messages.length]);

    // Listen for global open event dispatched from other parts of the app
    useEffect(() => {
        const handleOpen = async (e) => {
            // support dispatching a CustomEvent with detail: { prefillMessage, highlight, autoSend }
            const detail = e?.detail || {};
            
            // First set the open state
            setIsOpen(true);
            
            // Then set the input message and highlight after a short delay to ensure the chat is mounted
            setTimeout(() => {
                if (detail.prefillMessage) setInputMessage(detail.prefillMessage);
                if (detail.highlight) setHighlightedOption(detail.highlight);
                
                // if autoSend is requested, send the message
                if (detail.autoSend && detail.prefillMessage) {
                    // derive user info from sessionStorage
                    let active = {};
                    try { 
                        active = JSON.parse(sessionStorage.getItem('activeUser') || localStorage.getItem('activeUser') || '{}'); 
                    } catch (e) { 
                        console.error('Error parsing user data:', e);
                        active = {}; 
                    }

                    supabaseDb.addChatMessage({
                        message: detail.prefillMessage,
                        user_id: active?.idnum || active?.uid,
                        user_name: active?.name || active?.userName || active?.email,
                        is_admin: false,
                        type: 'withdrawal-request'
                    }).catch(err => {
                        console.error('Auto-send failed:', err);
                    });
                }
            }, 100);
        };

        window.addEventListener('openChatBot', handleOpen);
        return () => window.removeEventListener('openChatBot', handleOpen);
    }, []);

    // helper to send a message programmatically
    const sendMessage = async (text) => {
        if (!text || !text.trim()) return;
        const body = text.trim();
        setIsLoading(true);
        try {
            // derive user info from sessionStorage if available
            let active = {};
            try { active = JSON.parse(sessionStorage.getItem('activeUser') || sessionStorage.getItem('activeUser') || '{}'); } catch (e) { active = {}; }
            const userId = active?.idnum || active?.uid || 'user123';
            const userName = active?.name || active?.userName || active?.email || 'User';

            await supabaseDb.addChatMessage({
                message: body,
                user_id: userId,
                user_name: userName,
                is_admin: false
            });
            setInputMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;
        await sendMessage(inputMessage);
    };

    return (
        <div className={styles.chatbotContainer}>
            <button 
                className={styles.chatToggle}
                onClick={() => setIsOpen(prev => !prev)}
            >
                <i className="icofont-chat"></i>
            </button>

            {isOpen && (
                <div className={styles.chatWindow}>
                    <div className={styles.chatHeader}>
                        <h3>TopMint Support</h3>
                        <button onClick={() => setIsOpen(false)}>×</button>
                    </div>
                    
                    <div className={styles.messageContainer}>
                        {messages.map((msg, idx) => (
                            <div 
                                key={idx} 
                                className={`${styles.message} ${styles[msg.sender]}`}
                            >
                                {msg.text}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* quick suggestions / highlighted action */}
                    <div className={styles.suggestions}>
                        <button
                            className={`${styles.suggestionBtn} ${highlightedOption === 'request-withdrawal' ? styles.highlight : ''}`}
                            onClick={async () => {
                                const amount = (() => {
                                    try { const a = JSON.parse(sessionStorage.getItem('activeUser') || '{}'); return a?.balance || '0'; } catch(e){ return '0'; }
                                })();
                                const pre = `Request withdrawal code for ${amount}`;
                                setInputMessage(pre);
                                setHighlightedOption('request-withdrawal');
                                // send the request to admin as notification
                                try {
                                    await sendMessage(pre);
                                } catch (err) {
                                    console.error('Failed to send suggestion message:', err);
                                }
                            }}
                        >Request withdrawal code</button>
                        <button className={styles.suggestionBtn} onClick={() => { setInputMessage('I need help with my account'); setHighlightedOption('help'); }}>Account help</button>
                        <button className={styles.suggestionBtn} onClick={() => { setInputMessage('Payment issue'); setHighlightedOption('payment'); }}>Payment issue</button>
                    </div>

                    <form onSubmit={handleSend} className={styles.inputContainer}>
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Type your message..."
                        />
                        <button type="submit">Send</button>
                    </form>
                </div>
            )}
        </div>
    );
}

// Make sure to use a named export
export { ChatBot };
// Also provide a default export
export default ChatBot;