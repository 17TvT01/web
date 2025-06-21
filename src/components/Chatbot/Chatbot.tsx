import { useState, useRef, useEffect } from 'react';
import '../../assets/css/components/chatbot.css';

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

export const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            text: 'Xin chào! Tôi có thể giúp gì cho bạn?',
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now(),
            text: inputValue.trim(),
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsTyping(true);

        // Simulate bot response
        setTimeout(() => {
            const botMessage: Message = {
                id: Date.now(),
                text: 'Xin lỗi, tôi đang được phát triển và chưa thể trả lời câu hỏi của bạn.',
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMessage]);
            setIsTyping(false);
        }, 1500);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
            <button className="chat-toggle" onClick={handleToggle}>
                <i className={`fas fa-${isOpen ? 'times' : 'comments'}`}></i>
                {!isOpen && <span className="chat-tooltip">Chat với chúng tôi</span>}
            </button>

            <div className="chatbot-window">
                <div className="chat-header">
                    <div className="chat-title">
                        <i className="fas fa-robot"></i>
                        <h3>Hỗ trợ trực tuyến</h3>
                    </div>
                    <button className="minimize-btn" onClick={handleToggle}>
                        <i className="fas fa-minus"></i>
                    </button>
                </div>

                <div className="chat-messages">
                    {messages.map(message => (
                        <div 
                            key={message.id} 
                            className={`message ${message.sender}-message`}
                        >
                            {message.sender === 'bot' && (
                                <div className="avatar">
                                    <i className="fas fa-robot"></i>
                                </div>
                            )}
                            <div className="message-content">
                                <div className="message-text">{message.text}</div>
                                <div className="message-time">
                                    {formatTime(message.timestamp)}
                                </div>
                            </div>
                            {message.sender === 'user' && (
                                <div className="avatar">
                                    <i className="fas fa-user"></i>
                                </div>
                            )}
                        </div>
                    ))}
                    {isTyping && (
                        <div className="message bot-message">
                            <div className="avatar">
                                <i className="fas fa-robot"></i>
                            </div>
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form className="chat-input-form" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Nhập tin nhắn..."
                        value={inputValue}
                        onChange={handleInputChange}
                    />
                    <button type="submit" disabled={!inputValue.trim()}>
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        </div>
    );
};