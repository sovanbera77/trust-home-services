import { useState, useRef, useEffect } from 'react';
import { Send, Bot, X, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { uuid } from '../../lib/utils';
import type { Docket } from '../../lib/types';

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

export default function AIChatbot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'bot', text: 'Hi! I am the TrustHome AI Assistant. How can I help you today? You can ask me about our services or describe an issue.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const addDocket = useStore(s => s.addDocket);
  const currentUser = useStore(s => s.currentUser);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Mock AI response delay
    setTimeout(async () => {
      let replyText = "I'm sorry, I didn't quite catch that. Can you provide more details?";
      const lowerInput = userMsg.text.toLowerCase();

      // Rule-based logic
      if (lowerInput.includes('ac') || lowerInput.includes('air conditioner')) {
        replyText = "It looks like you need help with your AC. We have excellent AC repair technicians. Would you like me to create a service request for this?";
      } else if (lowerInput.includes('plumb') || lowerInput.includes('leak') || lowerInput.includes('water')) {
        replyText = "Plumbing issues can be tricky! I have created a preliminary docket for a plumber to visit. Check your requests dashboard!";
        createAutoDocket('Plumbing Service', userMsg.text);
      } else if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
        replyText = "Hello there! How can I assist you with your home repairs today?";
      } else if (lowerInput.length > 20) {
        replyText = "I have noted your issue and created a service request for our team. We'll assign a technician shortly.";
        createAutoDocket('General Service Request', userMsg.text);
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: replyText }]);
      setIsTyping(false);
    }, 1500);
  };

  const createAutoDocket = (title: string, desc: string) => {
    if (!currentUser) return;
    const docket: Docket = {
      id: uuid(),
      customer: currentUser.username,
      title,
      desc,
      address: currentUser.address || 'Address on file',
      status: 'pending',
      type: 'repair',
      assignedTo: null,
      preferredDate: new Date().toISOString().split('T')[0],
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      chat: [],
      photoUrls: []
    };
    addDocket(docket);
  };

  return (
    <div className="fixed bottom-20 right-6 w-80 bg-[#111b21] border border-white/10 rounded-2xl shadow-2xl flex flex-col z-[100] overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <Bot size={20} />
          <span className="font-semibold text-sm">AI Assistant</span>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-[#0b141a]">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${m.sender === 'user' ? 'bg-[#005c4b] text-white rounded-br-sm' : 'bg-[#202c33] text-gray-200 rounded-bl-sm'}`}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#202c33] px-4 py-2 rounded-xl rounded-bl-sm flex items-center gap-2">
              <Loader2 size={14} className="text-gray-400 animate-spin" />
              <span className="text-xs text-gray-400">Typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-[#202c33] border-t border-white/5 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          className="flex-1 bg-[#2a3942] text-white text-sm rounded-full px-4 py-2 outline-none border border-transparent focus:border-indigo-500 transition-colors"
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim()}
          className="p-2 rounded-full bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
