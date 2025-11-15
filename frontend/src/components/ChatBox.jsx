// Import required React hooks and libraries
import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { FiPaperclip, FiImage, FiFile } from 'react-icons/fi';
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
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null); // for documents
  const imageInputRef = useRef(null); // for images

  // useRef is used to hold the socket instance (so it doesn't reinitialize every render)
  const socketRef = useRef(null);
  const listRef = useRef(null);

  // Small helpers to generate IDs and merge messages safely

  const generateClientMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;  
 // Date.now() -- Returns the number of milliseconds since January 1, 1970 . Ensures each ID includes the moment it was created — helping keep it unique
 //  Math.random() --Returns a random decimal between 0 (inclusive) and 1 (exclusive).
 //  Math.random().toString(36) -- Converts the random decimal to a base-36 string (using digits 0-9 and letters a-z)
 //  .slice(2) -- Removes the "0." at the start of the string, leaving just the random characters.
 //putting it together--> Template literal combines timestamp and random part with a hyphen
 //a reasonably unique client-generated message ID.

const upsertMessage = useCallback((list, incoming) => { // the parameters are the current list of messages and an incoming message object
    
    // Prefer matching by clientMessageId first (for optimistic -> server reconcile), then by _id
    const byClientId = typeof incoming?.clientMessageId === 'string'  //Confirms the clientMessageId is indeed a string. , ?. prevents errors if incoming is null or undefined.
      ? list.findIndex(m => m.clientMessageId && m.clientMessageId === incoming.clientMessageId) // if yes use  findIndex()
      : -1; // if not found return -1   

      // similar logic for /database/server-assigned _id
      // so even if the client ID wasn't found, we can still match by the server ID
    const byId = typeof incoming?._id === 'string'
      ? list.findIndex(m => m._id && m._id === incoming._id)
      : -1;

      //choose which index to use for updating
    const idx = byClientId !== -1 ? byClientId : byId;



    if (idx !== -1) {
      // If found, merge the incoming message with the existing one
      //existing message (list[idx]
      // incoming message (incoming)
      const merged = { ...list[idx], ...incoming };
      const next = [...list];
      next[idx] = merged; //Replaces the old message at that index with the merged one.
      return next;  //Returns the updated message list
    }
    return [...list, incoming];
  }, []);

  // useEffect runs when the component first loads or when appointmentId changes
  useEffect(() => {
    // 1️⃣ Initialize socket connection to backend
    socketRef.current = io(backendUrl, {
      path: '/socket.io/',
      auth: { token },  // Send JWT token for authentication (handled in backend middleware)
      transports: ['websocket']
    });

    // 2️⃣ Join a specific chat room related to this appointment
    socketRef.current.emit('join-appointment', appointmentId);

    // 3️⃣ Listen for incoming messages from server
    socketRef.current.on('receive-message', (message) => {
      // Merge with any optimistic entry by clientMessageId to avoid duplicates
      setMessages(prev => upsertMessage(prev, message));
      // If we just received an incoming message (from doctor) while chat is open, mark it read immediately
      try {
        if (message?.senderType && message.senderType !== 'user') {
          socketRef.current.emit('messages-read', { appointmentId });
        }
      } catch (_) {}

      // Auto-scroll only for new live messages if we're near the bottom
      try {
        const el = listRef.current;
        if (el) {
          const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          // Always scroll for our own outgoing messages
          if (message?.senderType === 'user' || nearBottom) {
            el.scrollTop = el.scrollHeight;
          }
        }
      } catch (_) {}
    });

    // Listen for read receipts to flip ticks on outgoing (user) messages
    socketRef.current.on('messages-read', (evt) => {
      try {
        if (!evt || evt.appointmentId !== appointmentId) return;
        // If the other side (doctor) read messages, mark our outgoing as read
        if (evt.by !== 'user') {
          setMessages(prev => prev.map(m =>
            m.senderType === 'user' && !m.readAt
              ? { ...m, readAt: evt.readAt, localStatus: 'read' }
              : m
          ));
        }
      } catch (_) {}
    });

    // 4️⃣ Load recent messages (paginated)
    loadInitialMessages();

    // Tell server the chat is focused/visible so it can mark reads immediately
    socketRef.current.emit('messages-read', { appointmentId });

    //his ensures that if the user switches to another tab and comes back, unread messages are marked read immediately.
    const onFocus = () => {
      try { socketRef.current?.emit('messages-read', { appointmentId }); } catch (_) {}
    };
    window.addEventListener('focus', onFocus);  //Then we attach this function to the focus event of the window, so it triggers automatically when the user returns to the tab.



    // 5️⃣ Cleanup function → disconnect socket when component unmounts or appointment changes
    return () => {
      socketRef.current.disconnect();
      window.removeEventListener('focus', onFocus);
    };
  }, [appointmentId]); // Re-run effect only if appointmentId changes

  // Initial fetch: recent N messages (ASC in UI)
  const loadInitialMessages = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get(`${backendUrl}/api/user/messages/${appointmentId}`, {
        headers: { token },
        params: { limit: 50 }
      });
      if (data?.success) {  //desc is the array of messages from newest to oldest (server might return descending order).
        const desc = Array.isArray(data.messages) ? data.messages : [];
        const asc = [...desc].reverse();
        setMessages(asc);
        setCursor(data.cursor || null); //keeps track of pagination cursor for loading older messages.
        setHasMore(!!data.hasMore); //true/false if more messages exist.


        // Scroll to bottom on initial load
        requestAnimationFrame(() => {
          try {
            const el = listRef.current;
            if (el) el.scrollTop = el.scrollHeight;
          } catch (_) {}
        });
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };



// Load latest messages on component mount.
// Emit messages-read when chat is focused or tab is active.
// Infinite scroll for older messages.
// Deduplication to prevent repeated messages.
// Scroll management to keep view stable.
// Cleanup on unmount to prevent leaks.  

  // Load older messages when scrolled to top
  const loadOlderMessages = async () => {
    if (!hasMore || loading) return;
    try {

      //Saves the current scroll height before loading older messages.
      setLoading(true);
      const el = listRef.current;
      const prevHeight = el ? el.scrollHeight : 0;

      const params = { limit: 50 };
      if (cursor?.before) params.before = cursor.before; //cursor → tells the server to return messages older than a certain ID or timestamp.
      else if (cursor?.id) params.before = cursor.id;

      // Fetch older messages from the server
      const { data } = await axios.get(`${backendUrl}/api/user/messages/${appointmentId}`, {
        headers: { token },
        params
      });
      if (data?.success) {
        const olderDesc = Array.isArray(data.messages) ? data.messages : [];
        const olderAsc = [...olderDesc].reverse();
        // Prepend older messages, dedup by _id/clientMessageId
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
        // Maintain scroll position (avoid jump)
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



  // Function to send a new message to the server (with optimistic UI + ack)
  const sendMessage = () => {
    // Prevent sending empty messages (trim removes spaces)
    if (!newMessage.trim()) return;

    const clientMessageId = generateClientMessageId();
    const optimistic = {
      _id: `local-${clientMessageId}`,
      clientMessageId,
      appointmentId,
      senderType: 'user',
      message: newMessage,
      timestamp: new Date().toISOString(),
      localStatus: 'sending',
    };

    // Optimistically add to UI immediately
    setMessages(prev => [...prev, optimistic]);

    // Emit with ack so server can confirm and give us the real message
    socketRef.current.emit(
      'send-message',
      { appointmentId, message: newMessage, clientMessageId },
      (ack) => {
        if (ack && ack.ok && ack.message) {
          // Replace optimistic entry with server message, mark as sent
          setMessages(prev => {
            const serverMsg = { ...ack.message, localStatus: 'sent' };
            return upsertMessage(prev, serverMsg);
          });
        } else {
          // Mark the optimistic item as error
          setMessages(prev => prev.map(m =>
            m.clientMessageId === clientMessageId ? { ...m, localStatus: 'error' } : m
          ));
        }
      }
    );

    // Clear the input field after sending
    setNewMessage('');
  };

  // File picker helpers
  const openFilePicker = (kind = 'file') => {
    if (kind === 'image') return imageInputRef.current?.click();
    return fileInputRef.current?.click();
  };
  const onFileChange = async (e) => {
    const file = e.target.files?.[0]; // first selected file
    if (!file) return;
    const IMAGE_MIMES = new Set(['image/jpeg','image/png','image/webp']);
    const FILE_MIMES = new Set([
      'application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]);
    const isImage = IMAGE_MIMES.has(file.type);
    const isDoc = FILE_MIMES.has(file.type);
    const type = isImage ? 'image' : (isDoc ? 'file' : null);
    if (!type) {
      alert('Unsupported file type');
      return;
    }
    const maxBytes = isImage ? 5*1024*1024 : 20*1024*1024;
    if (file.size > maxBytes) {
      alert(`File too large (max ${isImage ? '5MB' : '20MB'})`);
      return;
    }
    try {
      setUploading(true); // Disable further uploads until done
      const fd = new FormData(); 
      fd.append('file', file);  //Create a FormData object and append the chosen file under the file key
      const { data } = await axios.post(`${backendUrl}/api/user/upload/chat-file`, fd, { headers: { token } });
      if (!data.success) throw new Error(data.message || 'Upload failed');
      const meta = data.file;
      const clientMessageId = generateClientMessageId();
      const optimistic = {  //optimistic message object to show immediately in the chat while the server-side send-message completes.
        _id: `local-${clientMessageId}`,
        clientMessageId,
        appointmentId,
        senderType: 'user',
        message: '',
        type: meta.type,
        url: meta.url,
        mimeType: meta.mimeType,
        size: meta.size,
        filename: meta.filename,
        thumbnailUrl: meta.thumbnailUrl,
        timestamp: new Date().toISOString(),
        localStatus: 'sending'
      };
      setMessages(prev => [...prev, optimistic]);
      socketRef.current.emit('send-message', {  //Add the optimistic message to the local messages array (so the user sees the file immediately).
        appointmentId,
        clientMessageId,
        type: meta.type,
        url: meta.url,
        mimeType: meta.mimeType,
        size: meta.size,
        filename: meta.filename,
        thumbnailUrl: meta.thumbnailUrl,
        message: ''
      }, (ack) => {
        if (ack && ack.ok && ack.message) {
          setMessages(prev => {
            const serverMsg = { ...ack.message, localStatus: 'sent' };
            return upsertMessage(prev, serverMsg);
          });
        } else {
          setMessages(prev => prev.map(m => m.clientMessageId === clientMessageId ? { ...m, localStatus: 'error' } : m));
        }
      });
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Status indicator for current user's messages
  const renderStatus = (msg) => {
    if (msg.senderType !== 'user') return null; // Only show on outgoing messages
    // Prioritize readAt so ✓✓ appears instantly when available
    if (msg.readAt) return <span className="ml-2 text-blue-600">✓✓</span>;
    const status = msg.localStatus || 'sent';
    if (status === 'sending') return <span className="ml-2 text-gray-400">✓</span>;
    if (status === 'error') return <span className="ml-2 text-red-500" title="Failed to send">!</span>;
    return <span className="ml-2 text-gray-700">✓</span>; // sent
  };

  // JSX (UI part)
  const onScroll = (e) => {
    const el = e.currentTarget;
    if (el.scrollTop <= 10) {
      loadOlderMessages();
    }
  };

  return (
    <div className="border rounded-lg p-4">
      {/* Chat header showing doctor's name */}
      <h3 className="font-semibold mb-4">Chat with Dr. {doctorName}</h3>

      {/* Message display area */}
      <div ref={listRef} onScroll={onScroll} className="h-96 overflow-y-auto mb-4 space-y-2">
        {messages.map((msg, idx) => {
          const base = `p-2 rounded max-w-xs ${msg.senderType === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'}`;
          const time = new Date(msg.timestamp).toLocaleTimeString();
          if (msg.type === 'image') {
            return (
              <div key={msg._id || msg.clientMessageId || idx} className={base}>
                <a href={msg.url} target="_blank" rel="noreferrer">
                  <img src={msg.thumbnailUrl || msg.url} alt={msg.filename || 'image'} className="rounded mb-2 max-h-60 object-cover" />
                </a>
                {msg.message ? <p className="text-sm mb-1">{msg.message}</p> : null}
                <span className="text-xs text-gray-500 flex items-center justify-end">{time}{renderStatus(msg)}</span>
              </div>
            );
          }
          if (msg.type === 'file') {
            const kb = msg.size ? Math.ceil(msg.size/1024) : null;
            return (
              <div key={msg._id || msg.clientMessageId || idx} className={base}>
                <p className="text-sm font-medium break-all">{msg.filename || 'File'}</p>
                {kb ? <p className="text-xs text-gray-600">{kb} KB</p> : null}
                <a href={msg.url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm mt-1 inline-block">Download</a>
                {msg.message ? <p className="text-sm mt-1">{msg.message}</p> : null}
                <span className="text-xs text-gray-500 flex items-center justify-end mt-1">{time}{renderStatus(msg)}</span>
              </div>
            );
          }
          return (
            <div key={msg._id || msg.clientMessageId || idx} className={base}>
              <p className="text-sm break-words">{msg.message}</p>
              <span className="text-xs text-gray-500 flex items-center justify-end">{time}{renderStatus(msg)}</span>
            </div>
          );
        })}
      </div>

      {/* Input box + Send button */}
      <div className="flex gap-2 items-center">
        {/* Hidden inputs for image and file */}
        <input
          type="file"
          ref={imageInputRef}
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
          disabled={uploading}
        />
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={onFileChange}
          disabled={uploading}
        />

        {/* Attach button with hover menu */}
        <div className={`relative group ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded="false"
            className="border rounded p-2 bg-gray-50 hover:bg-gray-100"
            title={uploading ? 'Uploading…' : 'Attach'}
          >
            <FiPaperclip className="w-5 h-5 text-gray-700" />
          </button>
          {/* Hover menu */}
          <div className="absolute bottom-full mb-2 left-0 z-20 hidden group-hover:block group-focus-within:block">
            <div className="min-w-[140px] rounded-md shadow-lg border border-gray-200 bg-white py-1">
              <button
                type="button"
                onClick={() => openFilePicker('image')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-gray-700"
              >
                <FiImage className="w-4 h-4" /> Image
              </button>
              <button
                type="button"
                onClick={() => openFilePicker('file')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-gray-700"
              >
                <FiFile className="w-4 h-4" /> File
              </button>
            </div>
          </div>
        </div>
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
      {uploading && (
        <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Uploading file...
        </div>
      )}
    </div>
  );
};

export default ChatBox;
