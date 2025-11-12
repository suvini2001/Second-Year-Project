import { useContext, useEffect, useState, useRef, useCallback } from 'react';  
import { io } from 'socket.io-client';  
import { DoctorContext } from '../contexts/doctorContext';  
import axios from 'axios';  
  
const ChatBox = ({ appointmentId, patientName }) => {  
  const { dToken, backendUrl } = useContext(DoctorContext);  
  const [messages, setMessages] = useState([]);  
  const [newMessage, setNewMessage] = useState('');  
  const socketRef = useRef(null);  
  
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
      auth: { token: dToken }  
    });  
      
    // Join appointment room  
    socketRef.current.emit('join-appointment', appointmentId);  
      
    // Listen for messages  
    socketRef.current.on('receive-message', (message) => {  
      setMessages(prev => upsertMessage(prev, message));  
    });  
      
    // Load existing messages  
    loadMessages();  
      
    return () => {  
      socketRef.current.disconnect();  
    };  
  }, [appointmentId, dToken]);  
    
  const loadMessages = async () => {  
    try {  
      const { data } = await axios.get(`${backendUrl}/api/doctor/messages/${appointmentId}`, {  
        headers: { dToken }  
      });  
      if (data.success) {  
        setMessages(data.messages);  
      }  
    } catch (error) {  
      console.error(error);  
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

    // Add optimistic message to UI immediately
    setMessages(prev => [...prev, optimistic]);

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
    const status = msg.localStatus || (msg.readAt ? 'read' : 'sent');
    if (status === 'sending') return <span className="ml-2 text-gray-200">✓</span>;
    if (status === 'error') return <span className="ml-2 text-red-300" title="Failed to send">!</span>;
    if (status === 'read') return <span className="ml-2 text-white">✓✓</span>;
    return <span className="ml-2 text-white">✓</span>;
  };
    
  return (  
    <div className="border rounded-lg p-4 bg-white shadow-md">  
      <h3 className="font-semibold mb-4 text-blue-900">Chat with {patientName}</h3>  
        
      <div className="flex flex-col h-96 overflow-y-auto mb-4 space-y-4 bg-gray-50 p-4 rounded-lg">
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