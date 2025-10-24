import { createContext, useEffect, useMemo } from 'react';
import { useState } from 'react';
import axios from 'axios';
export const AppContext = createContext();
import {toast} from 'react-toastify';


const AppContextProvider = ({ children }) => {
    const currencySymbol = "$";
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [doctors, setDoctors] = useState([]);

    const value = {
        doctors,
        currencySymbol
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

    useEffect(() => {
        getDoctorsData();
    }, []);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};  



export default AppContextProvider;
