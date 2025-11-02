// Import required React hooks and libraries
import { useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';          // For real-time communication
import { AppContext } from '../context/AppContext';  // Context to access global app variables (like token, backendUrl)
import axios from 'axios';                     // For making HTTP requests

// ChatBox component receives appointmentId and doctorName as props
const ChatBox = ({ appointmentId, doctorName }) => {
  // Get token and backendUrl from global context (AppContext)
  const { token, backendUrl } = useContext(AppContext);

  // messages → stores all chat messages
  // newMessage → stores the text currently typed by the user
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // useRef is used to hold the socket instance (so it doesn't reinitialize every render)
  const socketRef = useRef(null);

  // useEffect runs when the component first loads or when appointmentId changes
  useEffect(() => {
    // 1️⃣ Initialize socket connection to backend
    socketRef.current = io(backendUrl, {
      auth: { token }  // Send JWT token for authentication (handled in backend middleware)
    });

    // 2️⃣ Join a specific chat room related to this appointment
    socketRef.current.emit('join-appointment', appointmentId);

    // 3️⃣ Listen for incoming messages from server
    socketRef.current.on('receive-message', (message) => {
      // Add the new message to the existing list of messages
      setMessages(prev => [...prev, message]);
    });

    // 4️⃣ Load all previously stored messages for this appointment
    loadMessages();

    // 5️⃣ Cleanup function → disconnect socket when component unmounts or appointment changes
    return () => {
      socketRef.current.disconnect();
    };
  }, [appointmentId]); // Re-run effect only if appointmentId changes

  // Function to load old chat messages from the database via backend API
  const loadMessages = async () => {
    try {
      // Send GET request to the server for the appointment’s messages
      const { data } = await axios.get(`${backendUrl}/api/user/messages/${appointmentId}`, {
        headers: { token }  // Include token in headers for backend authentication
      });

      // If request successful, update message list
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error(error);  // Print any error if request fails
    }
  };

  // Function to send a new message to the server
  const sendMessage = () => {
    // Prevent sending empty messages (trim removes spaces)
    if (!newMessage.trim()) return;

    // Emit the message to the backend through Socket.IO
    socketRef.current.emit('send-message', {
      appointmentId,
      message: newMessage
    });

    // Clear the input field after sending
    setNewMessage('');
  };

  // JSX (UI part)
  return (
    <div className="border rounded-lg p-4">
      {/* Chat header showing doctor's name */}
      <h3 className="font-semibold mb-4">Chat with Dr. {doctorName}</h3>

      {/* Message display area */}
      <div className="h-96 overflow-y-auto mb-4 space-y-2">
        {messages.map((msg, idx) => (
          // Each message bubble (style depends on who sent it)
          <div
            key={idx}
            className={`p-2 rounded ${
              msg.senderType === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'
            } max-w-xs`}
          >
            <p className="text-sm">{msg.message}</p>
            {/* Show message time in local time format */}
            <span className="text-xs text-gray-500">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>

      {/* Input box + Send button */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}  // Controlled input
          onChange={(e) => setNewMessage(e.target.value)}  // Update state as user types
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}  // Press Enter to send
          placeholder="Type a message..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          onClick={sendMessage}
          className="bg-primary text-white px-4 py-2 rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
