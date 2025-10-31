import { createContext, useState, useCallback } from "react";
import axios from "axios";
import {toast} from 'react-toastify' ;


export const DoctorContext = createContext({});

export const DoctorContextProvider = ( props ) => {

  const backendUrl = import.meta.env.VITE_BACKEND_URL ;

  const [dToken, setDToken] =  useState(localStorage.getItem('dToken') ? localStorage.getItem('dToken') : '') ;
  const [appointments,setAppointments]=useState([])

  const getAppointments = useCallback(async () => {
    try {
      const {data} =await axios.get(`${backendUrl}/api/doctor/appointments`,{
        headers:{ dToken}
      })
      if (data.success) {
        setAppointments(data.appointments)
        console.log("Doctor Appointments:", data.appointments);
      }
      else{
        toast.error(data.message) ;
      }
    } catch (error) {
        console.log(error) ;
        toast.error("Something went wrong while fetching appointments") ;
    }
  }, [backendUrl, dToken]);

  const completeAppointment = async (appointmentId) => {
    try {
      const {data} = await axios.post(`${backendUrl}/api/doctor/complete-appointment`,{ appointmentId },{ headers:{ dToken } })
      if (data.success) {
        toast.success(data.message);
        getAppointments();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong while completing appointment");
    }
  }



  const cancelAppointment = async (appointmentId) => {
    try {
  const {data} = await axios.post(`${backendUrl}/api/doctor/cancel-appointment`,{ appointmentId },{ headers:{ dToken } })
      if (data.success) {
        toast.success(data.message);
        getAppointments();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong while cancelling appointment");
    }
  }

  const value = {
    dToken,
    setDToken,
    backendUrl,
    appointments,
    getAppointments,
    setAppointments,
    completeAppointment,
    cancelAppointment
  };
  return (
    <DoctorContext.Provider value={value}>
      {props.children}
    </DoctorContext.Provider>
  );
};

export default DoctorContextProvider;