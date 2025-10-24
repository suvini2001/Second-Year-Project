import axios from "axios";
import { createContext, useState } from "react";
import { toast } from "react-toastify";

export const AdminContext = createContext();


const AdminContextProvider = (props) => {

  const [aToken, setAtoken] = useState(localStorage.getItem('aToken')?localStorage.getItem('aToken'):'');
  const [doctors,setDoctors]=useState([]);
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

  const value = {

    aToken,setAtoken,backendUrl,getAllDoctors,doctors,changeAvailability,

    // Define your global state and functions here
  };
  return (
    <AdminContext.Provider value={value}>
      {props.children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;