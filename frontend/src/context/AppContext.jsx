import { createContext, useEffect, useMemo } from 'react';
import { useState } from 'react';
import axios from 'axios';
export const AppContext = createContext();
import {toast} from 'react-toastify';


const AppContextProvider = ({ children }) => {
    const currencySymbol = "$";
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [doctors, setDoctors] = useState([]);
    // Initialize token from localStorage if present
    const [token, setTokenState] = useState(() => localStorage.getItem('token') || '');
    const [userData, setUserData] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

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

    const value = {
        doctors,getDoctorsData,
        currencySymbol,
        token,
        setToken,
        backendUrl,
        userData,setUserData,
        loadUserProfileData,
        isEditing,
        setIsEditing
    };
    



    useEffect(() => {
        getDoctorsData();
    }, []);


    useEffect(() => {
        if (token) {
            loadUserProfileData();
        } else {
            setUserData(false);
        }
    }, [token]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};  




export default AppContextProvider;
