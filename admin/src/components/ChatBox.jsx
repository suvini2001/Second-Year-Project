import { useContext, useEffect, useState, useRef } from 'react';  
import { io } from 'socket.io-client';  
import { DoctorContext } from '../contexts/doctorContext';  
import axios from 'axios';  
  
const ChatBox = ({ appointmentId, patientName }) => {  
  const { dToken, backendUrl } = useContext(DoctorContext);  
  const [messages, setMessages] = useState([]);  
  const [newMessage, setNewMessage] = useState('');  
  const socketRef = useRef(null);  
    
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
      setMessages(prev => [...prev, message]);  
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
      
    socketRef.current.emit('send-message', {  
      appointmentId,  
      message: newMessage  
    });  
      
    setNewMessage('');  
  };  
    
  return (  
    <div className="border rounded-lg p-4 bg-white shadow-md">  
      <h3 className="font-semibold mb-4 text-blue-900">Chat with {patientName}</h3>  
        
      <div className="flex flex-col h-96 overflow-y-auto mb-4 space-y-4 bg-gray-50 p-4 rounded-lg">
        {messages.map((msg, idx) => (
          <div
            key={idx}
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
              <span className="text-xs opacity-70 mt-1 block text-right">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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