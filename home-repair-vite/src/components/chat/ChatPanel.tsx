import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { config } from '../../lib/config';
import { getToken } from '../../lib/api/auth';
import { api } from '../../lib/api/client';
import { X, Send, MessageSquare } from 'lucide-react';

interface ChatContact {
  id: string;
  username: string;
  displayName: string;
  role: string;
  status: string;
}

interface ChatMsg {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  type: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function ChatPanel({ open, onClose }: ChatPanelProps) {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatContact[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const connectSocket = useCallback(() => {
    const token = getToken();
    if (!token || !config.useBackend) return;
    const serverUrl = config.apiUrl.replace(/\/api$/, '');
    const socket = io(serverUrl, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('chat:new_message', (msg: ChatMsg) => {
      setMessages(prev => [...prev, msg]);
    });
    socket.on('chat:sent', (msg: ChatMsg) => {
      setMessages(prev => [...prev, msg]);
    });
    socketRef.current = socket;
  }, []);

  useEffect(() => {
    if (!open || !config.useBackend) return;
    api.get<ChatContact[]>('/chat/contacts').then(setContacts).catch(() => {});
    if (!socketRef.current) connectSocket();
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [open, connectSocket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      api.get<ChatContact[]>(`/chat/search?q=${encodeURIComponent(searchQuery)}`).then(setSearchResults).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const selectUser = async (u: ChatContact) => {
    setSelectedUser(u);
    const msgs = await api.get<ChatMsg[]>(`/chat/messages/${u.username}`);
    setMessages(msgs);
  };

  const sendMessage = () => {
    if (!inputText.trim() || !selectedUser || !socketRef.current) return;
    socketRef.current.emit('chat:send', { receiverId: selectedUser.username, text: inputText.trim() });
    setInputText('');
  };

  const addContact = async (u: ChatContact) => {
    try {
      await api.post('/chat/contacts', { contactId: u.username });
      setContacts(prev => [...prev, u]);
      setSearchResults([]);
      setSearchQuery('');
    } catch { /* already in contacts */ }
  };

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-[#111b21] border-l border-white/10 z-50 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-[#202c33]">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-[#00a884]" />
          <span className="text-white font-semibold text-sm">Chat</span>
        </div>
        <button onClick={onClose} className="text-[#8696a0] hover:text-white"><X size={18} /></button>
      </div>

      {/* Search */}
      <div className="p-2 bg-[#111b21]">
        <input
          placeholder="Search users..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-[#202c33] text-white text-sm rounded-lg px-3 py-2 border-none outline-none placeholder-[#8696a0]"
        />
        {searchResults.length > 0 && (
          <div className="bg-[#202c33] mt-1 rounded-lg overflow-hidden">
            {searchResults.map(u => (
              <button key={u.username} className="flex items-center gap-2 w-full px-3 py-2 hover:bg-white/5 text-sm text-left" onClick={() => addContact(u)}>
                <span className="w-7 h-7 rounded-full bg-[#00a884] flex items-center justify-center text-white text-xs font-bold">{u.displayName?.[0] || u.username[0]}</span>
                <span className="text-white">{u.displayName || u.username}</span>
                <span className="text-[#8696a0] text-xs ml-auto">Add</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Contacts sidebar */}
        <div className="w-32 border-r border-white/5 overflow-y-auto bg-[#111b21]">
          {contacts.map(c => (
            <button
              key={c.username}
              className={`w-full p-2 text-left hover:bg-[#202c33] transition-colors ${selectedUser?.username === c.username ? 'bg-[#202c33]' : ''}`}
              onClick={() => selectUser(c)}
            >
              <div className="w-8 h-8 rounded-full bg-[#00a884] flex items-center justify-center text-white text-xs font-bold mx-auto mb-1">
                {c.displayName?.[0] || c.username[0]}
              </div>
              <p className="text-xs text-white text-center truncate">{c.displayName || c.username}</p>
              <p className={`text-[10px] text-center ${c.status === 'online' ? 'text-green-400' : 'text-[#8696a0]'}`}>{c.status}</p>
            </button>
          ))}
          {contacts.length === 0 && <p className="text-xs text-[#8696a0] text-center p-4">No contacts</p>}
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-[#0b141a]">
          {selectedUser ? (
            <>
              <div className="p-2 border-b border-white/5 bg-[#202c33] flex justify-between items-center">
                <span className="text-white text-sm font-medium">{selectedUser.displayName || selectedUser.username}</span>
                <div className="flex items-center gap-3 pr-2">
                  <button onClick={() => import('../../lib/call').then(m => m.openCall(selectedUser.username, selectedUser.displayName || selectedUser.username, 'audio'))} className="text-[#00a884] hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  </button>
                  <button onClick={() => import('../../lib/call').then(m => m.openCall(selectedUser.username, selectedUser.displayName || selectedUser.username, 'video'))} className="text-[#00a884] hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {messages.map(m => {
                  const isMine = m.senderId === selectedUser?.username;
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] px-3 py-1.5 rounded-lg text-sm ${isMine ? 'bg-[#202c33] text-white' : 'bg-[#005c4b] text-white'}`}>
                        {m.text}
                        <p className="text-[10px] text-[#8696a0] text-right mt-0.5">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-2 border-t border-white/5 bg-[#202c33] flex gap-2">
                <input
                  placeholder="Type a message"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  className="flex-1 bg-[#2a3942] text-white text-sm rounded-lg px-3 py-2 border-none outline-none placeholder-[#8696a0]"
                />
                <button onClick={sendMessage} className="p-2 text-[#00a884] hover:text-white"><Send size={18} /></button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-[#8696a0] text-sm">Select a contact</div>
          )}
        </div>
      </div>
    </div>
  );
}
