import axios from "axios";
import { createContext, useState } from "react";
import { toast } from "react-toastify";



export const AdminContext = createContext();


const AdminContextProvider = (props) => {

  const [aToken, setAtoken] = useState(localStorage.getItem('aToken')?localStorage.getItem('aToken'):'');
  const [doctors,setDoctors]=useState([]);
  const [appointments,setAppointments]=useState([]);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const getAllDoctors = async () => {
    try {
      const {data} =await axios.post(backendUrl+'/api/admin/all-doctors',{},{headers:{'aToken':aToken}});
      if (data.success) {
        setDoctors(data.data);
        console.log(data.data)
      }
      else{
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };


  const changeAvailability = async (docId) => {
    try {
      const {data} =await axios.post(backendUrl+'/api/admin/change-availability',{docId},{headers:{aToken}});

      if (data.success) {
        toast.success(data.message);
        getAllDoctors();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };


  const getAllAppointments = async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/admin/appointments', { headers: { aToken } })
      if (data.success) {
        setAppointments(data.appointments)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const cancelAppointment = async (appointmentId) => {
    try {
        const { data } = await axios.post(
            backendUrl + '/api/admin/cancel-appointment',
            { appointmentId },
            { headers: { aToken } }
        );

        console.log('Backend response for cancelAppointment:', data);

        if (data.success) {
            toast.success(data.message);
            await getAllAppointments(); // Ensure appointments are refreshed after cancellation
        } else {
            toast.error(data.message);
        }
    } catch (error) {
        console.error('Error in cancelAppointment:', error);
        toast.error(error.message);
    }
};


  const value = {

    aToken,setAtoken,backendUrl,getAllDoctors,doctors,changeAvailability,appointments,getAllAppointments,cancelAppointment

    // Define your global state and functions here
  };
  return (
    <AdminContext.Provider value={value}>
      {props.children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;