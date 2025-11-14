import { useContext, useEffect, useState, useRef, useCallback } from 'react';  
import { io } from 'socket.io-client';  
import { DoctorContext } from '../contexts/doctorContext';  
import axios from 'axios';  
  
const ChatBox = ({ appointmentId, patientName }) => {  
  const { dToken, backendUrl } = useContext(DoctorContext);  
  const [messages, setMessages] = useState([]);  
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');  
  const socketRef = useRef(null);  
  const listRef = useRef(null);
  
  // Helpers
  const generateClientMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const upsertMessage = useCallback((list, incoming) => {
    const byClientId = typeof incoming?.clientMessageId === 'string'
      ? list.findIndex(m => m.clientMessageId && m.clientMessageId === incoming.clientMessageId)
      : -1;
    const byId = typeof incoming?._id === 'string'
      ? list.findIndex(m => m._id && m._id === incoming._id)
      : -1;
    const idx = byClientId !== -1 ? byClientId : byId;
    if (idx !== -1) {
      const merged = { ...list[idx], ...incoming };
      const next = [...list];
      next[idx] = merged;
      return next;
    }
    return [...list, incoming];
  }, []);
    
  useEffect(() => {  
    if (!dToken) return;  
      
    // Initialize socket connection with doctor token  
    socketRef.current = io(backendUrl, {  
      path: '/socket.io/',
      auth: { token: dToken },
      transports: ['websocket']
    });  
      
    // Join appointment room  
    socketRef.current.emit('join-appointment', appointmentId);  
      
    // Listen for messages  
    socketRef.current.on('receive-message', (message) => {  
      setMessages(prev => upsertMessage(prev, message));
      // If we just received an incoming message while chat is open, mark it read immediately
      try {
        if (message?.senderType && message.senderType !== 'doctor') {
          socketRef.current.emit('messages-read', { appointmentId });
        }
      } catch (_) {}

      // Auto-scroll only for live messages if near bottom or if outgoing (doctor)
      try {
        const el = listRef.current; //gives access to the actual DOM element of that container.
        if (el) {
          const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40; //pixels from the bottom
          //scrollHeight -->Total height of the scrollable content (all messages combined)
          //scrollTop -->How far the user has scrolled from the top
          //clientHeight -->Visible height of the container
          if (message?.senderType === 'doctor' || nearBottom) { //When the message is sent by the doctor or When the user is already near the bottom
            el.scrollTop = el.scrollHeight;
          }
        }
      } catch (_) {}
    });  
    // Listen for read-receipts to flip ticks on outgoing (doctor) messages
    socketRef.current.on('messages-read', (evt) => {
      try {
        if (!evt || evt.appointmentId !== appointmentId) return;
        // If the other side read messages, mark our outgoing messages as read
        if (evt.by !== 'doctor') {
          setMessages(prev => prev.map(m =>
            m.senderType === 'doctor' && !m.readAt
              ? { ...m, readAt: evt.readAt, localStatus: 'read' }
              : m
          ));
        }
      } catch (_) {}
    });
      
    // Load recent messages (paginated)
    loadInitialMessages();  

    // Immediately tell server this chat is in focus to mark reads without waiting for fetch
    socketRef.current.emit('messages-read', { appointmentId });

    const onFocus = () => {
      try { socketRef.current?.emit('messages-read', { appointmentId }); } catch (_) {}
    };
    window.addEventListener('focus', onFocus);
      
    return () => {  
      socketRef.current.disconnect();  
      window.removeEventListener('focus', onFocus);
    };  
  }, [appointmentId, dToken]);  
    
  const loadInitialMessages = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/doctor/messages/${appointmentId}`, {
        headers: { dtoken: dToken },
        params: { limit: 50 }
      });
      if (data?.success) {
        const desc = Array.isArray(data.messages) ? data.messages : [];
        const asc = [...desc].reverse();
        setMessages(asc);
        setCursor(data.cursor || null);
        setHasMore(!!data.hasMore);
        requestAnimationFrame(() => {
          try {
            if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
          } catch (_) {}
        });
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOlderMessages = async () => {
    if (!hasMore || loading) return;
    try {
      setLoading(true);
      const prevHeight = listRef.current?.scrollHeight || 0;
      const params = { limit: 50 };
      if (cursor?.before) params.before = cursor.before; else if (cursor?.id) params.before = cursor.id;
      const { data } = await axios.get(`${backendUrl}/api/doctor/messages/${appointmentId}`, {
        headers: { dtoken: dToken },
        params
      });
      if (data?.success) {
        const olderDesc = Array.isArray(data.messages) ? data.messages : [];
        const olderAsc = [...olderDesc].reverse();
        setMessages(prev => {
          const seen = new Set();
          const key = (m) => m._id || m.clientMessageId || `${m.timestamp}-${m.message}`;
          const merged = [...olderAsc, ...prev].filter((m) => {
            const k = key(m);
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          return merged;
        });
        setCursor(data.cursor || cursor);
        setHasMore(!!data.hasMore);
        requestAnimationFrame(() => {
          try {
            const now = listRef.current?.scrollHeight || 0;
            if (listRef.current) listRef.current.scrollTop = now - prevHeight;
          } catch (_) {}
        });
      }
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setLoading(false);
    }
  };
    
  const sendMessage = () => {  
    if (!newMessage.trim()) return;  
    //Build a complete message object that looks real, so the UI can render it instantly — even before the backend confirms it.
    const clientMessageId = generateClientMessageId();
    const optimistic = {
      _id: `local-${clientMessageId}`,
      clientMessageId,
      appointmentId,
      senderType: 'doctor',
      message: newMessage,
      timestamp: new Date().toISOString(),
      localStatus: 'sending',
    };

    // Add optimistic message to UI immediately and scroll to bottom
    setMessages(prev => [...prev, optimistic]);
    try {
      requestAnimationFrame(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      });
    } catch (_) {}

    socketRef.current.emit(  //a websocket emit with acknowledgement callback //emit-->sends an event through that socket.
      'send-message',
      { appointmentId, message: newMessage, clientMessageId },
      (ack) => {
        if (ack && ack.ok && ack.message) {
          setMessages(prev => {
            const serverMsg = { ...ack.message, localStatus: 'sent' }; //Copies all the fields from the server’s message.
            return upsertMessage(prev, serverMsg);  //Updates the state:
          });
        } else { //if server responds with error, update the optimistic message to show error status
          setMessages(prev => prev.map(m =>
            m.clientMessageId === clientMessageId ? { ...m, localStatus: 'error' } : m
          ));
        }
      }
    );

    setNewMessage('');  
  };  
  
  const renderStatus = (msg) => {
    if (msg.senderType !== 'doctor') return null;
    // Prefer readAt over localStatus so ✓✓ shows immediately when read
    if (msg.readAt) return <span className="ml-2 text-white">✓✓</span>;
    const status = msg.localStatus || 'sent';
    if (status === 'sending') return <span className="ml-2 text-gray-200">✓</span>;
    if (status === 'error') return <span className="ml-2 text-red-300" title="Failed to send">!</span>;
    return <span className="ml-2 text-white">✓</span>;
  };
    
  return (  
    <div className="border rounded-lg p-4 bg-white shadow-md">  
      <h3 className="font-semibold mb-4 text-blue-900">Chat with {patientName}</h3>  
        
      <div ref={listRef} onScroll={(e) => { if (e.currentTarget.scrollTop <= 10) loadOlderMessages(); }} className="flex flex-col h-96 overflow-y-auto mb-4 space-y-4 bg-gray-50 p-4 rounded-lg">
        {messages.map((msg, idx) => (
          <div
            key={msg._id || msg.clientMessageId || idx}
            className={`flex items-end gap-2 ${
              msg.senderType === 'doctor' ? 'self-end' : 'self-start'
            }`}
          >
            <div
              className={`p-3 rounded-xl max-w-md ${
                msg.senderType === 'doctor'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              <p className="text-sm">{msg.message}</p>
              <span className="text-xs opacity-70 mt-1 block text-right flex items-center justify-end gap-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {renderStatus(msg)}
              </span>
            </div>
          </div>
        ))}
      </div>  
        
      <div className="flex gap-2">  
        <input  
          type="text"  
          value={newMessage}  
          onChange={(e) => setNewMessage(e.target.value)}  
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}  
          placeholder="Type a message..."  
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"  
        />  
        <button   
          onClick={sendMessage}   
          className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition-colors"  
        >  
          Send  
        </button>  
      </div>  
    </div>  
  );  
};  
  
export default ChatBox;