import React, { useState, useRef, useEffect } from 'react';
import api from '../lib/api';
import { Bot, X, Send, Sparkles } from 'lucide-react';

export default function GlobalAIChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "Hi! I'm ScreenSprout AI. Ask me about your family's screen time! 💡" }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!question.trim()) return;

        const userQ = question;
        setMessages(prev => [...prev, { role: 'user', text: userQ }]);
        setQuestion('');
        setLoading(true);

        try {
            const res = await api.post('/reports/ask-ai', { question: userQ });
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: res.data.answer,
                context: res.data.contextUsed
            }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I couldn't reach the server. Please try again later." }]);
        }
        setLoading(false);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="animate-bounce"
                style={{
                    position: 'fixed',
                    bottom: '30px',
                    right: '30px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    zIndex: 9999
                }}
            >
                <Sparkles size={28} />
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '380px',
            height: '550px',
            maxHeight: '80vh',
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden',
            border: '1px solid #e5e7eb'
        }} className="animate-slide-up">
            {/* Header */}
            <div style={{
                background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
                color: 'white',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Bot size={20} />
                    </div>
                    
                    <div>
                        <span style={{ fontWeight: '600', fontSize: '16px' }}>ScreenSprout AI</span>
                        <div style={{ fontSize: '12px', opacity: 0.8 }}>Ask me anything</div>
                    </div>
                </div>
                
                <button
                    onClick={() => setIsOpen(false)}
                    style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'white', 
                        padding: 0, 
                        cursor: 'pointer',
                        width: 'auto',
                        boxShadow: 'none'
                    }}
                >
                    <X size={24} />
                </button>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1,
                padding: '20px',
                overflowY: 'auto',
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                {messages.map((msg, idx) => (
                    <div 
                        key={idx} 
                        style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%'
                        }}
                    >
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: '16px',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            background: msg.role === 'user' ? 'linear-gradient(135deg, #2563EB, #14B8A6)' : 'white',
                            color: msg.role === 'user' ? 'white' : '#374151',
                            border: msg.role === 'assistant' ? '1px solid #e5e7eb' : 'none',
                            borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                            borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                            boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                
                {loading && (
                    <div style={{ 
                        alignSelf: 'flex-start', 
                        background: 'white', 
                        padding: '12px 16px', 
                        borderRadius: '16px', 
                        border: '1px solid #e5e7eb',
                        borderBottomLeftRadius: '4px'
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            alignItems: 'center'
                        }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                background: '#2563EB',
                                borderRadius: '50%',
                                animation: 'bounce 0.6s infinite alternate'
                            }} />
                            <span style={{
                                width: '8px',
                                height: '8px',
                                background: '#2563EB',
                                borderRadius: '50%',
                                animation: 'bounce 0.6s infinite alternate 0.2s'
                            }} />
                            <span style={{
                                width: '8px',
                                height: '8px',
                                background: '#2563EB',
                                borderRadius: '50%',
                                animation: 'bounce 0.6s infinite alternate 0.4s'
                            }} />
                        </div>
                    </div>
                )}
                
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} style={{
                padding: '16px 20px',
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                gap: '12px',
                background: 'white'
            }}>
                <input
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Ask about screen time..."
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: '24px',
                        border: '2px solid #e5e7eb',
                        fontSize: '14px',
                        marginBottom: 0
                    }}
                />
                
                <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    style={{
                        background: 'linear-gradient(135deg, #2563EB, #14B8A6)',
                        color: 'white',
                        borderRadius: '50%',
                        width: '44px',
                        height: '44px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 0,
                        opacity: (loading || !question.trim()) ? 0.6 : 1
                    }}
                >
                    <Send size={18} />
                </button>
            </form>
            
            <style>{`
                @keyframes bounce {
                    from { transform: translateY(0); }
                    to { transform: translateY(-4px); }
                }
            `}</style>
        </div>
    );
}
