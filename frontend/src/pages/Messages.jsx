import React, { useContext, useEffect, useRef, useState } from 'react';  //standard React hooks for managing component state, lifecycle, and accessing context.
import { AppContext } from '../context/AppContext';  //a context object that likely provides global values like the logged-in user’s token and backend URL
import axios from 'axios';  //for making HTTP API requests to the backend.
import { useNavigate } from 'react-router-dom';   //for programmatic navigation between routes.
import { io } from 'socket.io-client'; // for realtime inbox updates


// AppContext	A global storage for app-wide data
// useContext(AppContext)	Accesses that shared data in any component


//this helper function converts a timestamp into a human-readable "time ago" format.
const timeAgo = (ts) => {  //takes a timestamp as input
	if (!ts) return '';
	const now = Date.now();  //Gets the current time in milliseconds since January 1, 1970 (Unix epoch).
	

    //Converts ts into a Date object and gets its time in milliseconds.
    //Subtracts it from now to find the difference between the current time and the given time.
    //Math.max(0, …) ensures that if the timestamp is in the future (which would make the difference negative), it’s treated as 0 instead
    const diff = Math.max(0, now - new Date(ts).getTime());  
	const s = Math.floor(diff / 1000);  // Converts milliseconds to seconds and rounds down to the nearest whole second.
	if (s < 60) return `${s}s ago`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	const d = Math.floor(h / 24);
	return `${d}d ago`;
};

const Messages = () => {
	const { token, backendUrl } = useContext(AppContext); // token and backendUrl are fetched from context (so the component knows the user’s authentication token and backend API base URL).
	const [inbox, setInbox] = useState([]); //stores the list of conversation objects fetched from the backend.
	const [loading, setLoading] = useState(true); //tracks whether data is still being fetched.
	const [error, setError] = useState(''); //stores any error message to display to the user.
	const navigate = useNavigate(); 

	// Realtime inbox: initial fetch + socket "inbox-update" + on-focus refresh
	useEffect(() => {
		let mounted = true; // prevent state updates after unmount
		let firstLoad = true; // only show the big loader on the first fetch
		const socketRef = { current: null };

		const fetchInbox = async () => {
			if (!token) {
				if (mounted) {
					setInbox([]);
					setLoading(false);
				}
				return;
			}
			try {
				if (mounted && firstLoad) setLoading(true);
				const { data } = await axios.get(`${backendUrl}/api/user/inbox`, {
					headers: { token },
				});
				if (!mounted) return;
				if (data.success) {
					setInbox(data.inbox || []);
					setError('');
				} else {
					setError(data.message || 'Failed to load inbox');
				}
			} catch (e) {
				if (mounted) setError(e.response?.data?.message || e.message || 'Failed to load inbox');
			} finally {
				if (mounted) setLoading(false);
				firstLoad = false;
			}
		};

        
		// initial fetch
		fetchInbox();

		// open socket to receive realtime inbox updates
		if (token) {
			socketRef.current = io(backendUrl, { auth: { token } });
			socketRef.current.on('inbox-update', () => {
				fetchInbox();
			});
		}

		// refresh when window regains focus
		const onFocus = () => fetchInbox();
		window.addEventListener('focus', onFocus);

		return () => {
			mounted = false;
			if (socketRef.current) {
				socketRef.current.disconnect();
			}
			window.removeEventListener('focus', onFocus);
		};
	}, [token, backendUrl]);

    //calls when user clicks on a conversation item
	const openChat = (item) => {
		navigate(`/user-chat/${item.appointmentId}`, { state: { doctorName: item.doctor?.name || 'Doctor' } });  //navigates to the chat page for the selected appointment, passing the doctor's name in the navigation state.
	};

	return (
		<div className="min-h-[70vh] py-6">
			<h1 className="text-2xl font-bold text-blue-900 mb-4">Messages</h1>

            {/* If loading is true: Displays “Loading inbox…” in blue. */}
			{loading && (
				<div className="text-blue-700">Loading inbox…</div>
			)}

			{!loading && error && (
				<div className="text-red-600">{error}</div>
			)}

            {/* Not loading,No error,And the inbox is empty (inbox.length === 0),then show a friendly “No conversations yet.” message */}
			{!loading && !error && inbox.length === 0 && (
				<div className="text-blue-800">No conversations yet.</div>
			)}

            {/* inbox message list */}
			<div className="space-y-3">
				{inbox.map((item) => (     //loops through each conversation (each item) in your inbox array.
					<button
						key={item.appointmentId}
						onClick={() => openChat(item)}  
						className="w-full flex items-center gap-4 p-4 bg-white rounded-xl shadow hover:shadow-lg border border-blue-100 hover:border-blue-300 transition text-left"
					>
						<img
							src={item.doctor?.image || null}
							alt="Doctor"
							className="w-12 h-12 rounded-full object-cover bg-blue-100"
						/>
						<div className="flex-1 min-w-0">
							<div className="flex items-center justify-between gap-2">
								<p className="font-semibold text-blue-900 truncate">
									{item.doctor?.name || 'Doctor'}
								</p>
								<span className="text-xs text-blue-500 shrink-0">
									{timeAgo(item.lastMessage?.timestamp || item.meta?.date)}
								</span>
							</div>
                            {/* message preview section */}
							<p className="text-sm text-blue-700/80 truncate">
								{item.lastMessage?.message || 'No messages yet'}
							</p>
						</div>
                        {/* unread message count badge */}
						{item.unreadCount > 0 && (
							<span className="ml-2 inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold bg-blue-600 text-white">
								{item.unreadCount}
							</span>
						)}
					</button>
				))}
			</div>
		</div>
	);
};

export default Messages;
