import { createContext, useEffect, useMemo, useRef } from 'react';
import { useState } from 'react';
import axios from 'axios';
export const AppContext = createContext();
import {toast} from 'react-toastify';
import { io } from 'socket.io-client';


const AppContextProvider = ({ children }) => {
    const currencySymbol = "$";
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [doctors, setDoctors] = useState([]);
    // Initialize token from localStorage if present
    const [token, setTokenState] = useState(() => localStorage.getItem('token') || '');
    const [userData, setUserData] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const socketRef = useRef(null);

    // Custom setToken to sync with localStorage
    const setToken = (newToken) => {
        setTokenState(newToken);
        if (newToken) {
            localStorage.setItem('token', newToken);
        } else {
            localStorage.removeItem('token');
        }
    };

    

    const getDoctorsData = async () => {
        try {
            const {data} = await axios.get(backendUrl + '/api/doctor/list');
            if (data.success) {
                setDoctors(data.doctors);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const loadUserProfileData = async () => {
        try {
            const {data} = await axios.get(backendUrl + '/api/user/get-profile', {headers:{token}});
            if(data.success){
                setUserData(data.userData);
            }
            else{
                toast.error(data.message);
            }

        } catch (error) {
            console.log(error);
            toast.error(error.response?.data?.message || error.message);
        }
    };

    const fetchUnreadCount = async () => {
        if (!token) return;
        try {
            const { data } = await axios.get(backendUrl + '/api/user/unread-messages', { headers: { token } });
            if (data.success) {
                setUnreadCount(data.unreadCount);
            }
        } catch (error) {
            console.log("Failed to fetch unread messages count", error);
        }
    };

    const value = {
        doctors,getDoctorsData,
        currencySymbol,
        token,
        setToken,
        backendUrl,
        userData,setUserData,
        loadUserProfileData,
        isEditing,
        setIsEditing,
        unreadCount,
        fetchUnreadCount
    };
    



    useEffect(() => {
        getDoctorsData();
    }, []);


    useEffect(() => {
        if (token) {
            loadUserProfileData();
            fetchUnreadCount();
            // Setup realtime updates for unread counter
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            socketRef.current = io(backendUrl, { auth: { token } });
            socketRef.current.on('inbox-update', () => {
                fetchUnreadCount();
            });
            const onFocus = () => fetchUnreadCount();
            window.addEventListener('focus', onFocus);

            return () => {
                window.removeEventListener('focus', onFocus);
                if (socketRef.current) {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }
            };
        } else {
            setUserData(false);
            setUnreadCount(0);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        }
    }, [token]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};  




export default AppContextProvider;
