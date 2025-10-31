import Login from "./pages/Login.jsx";
import { useContext } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from "./components/navbar.jsx";
import Sidebar from "./components/sidebar.jsx";
import { Routes,Route } from "react-router-dom"; 

import { AdminContext } from './contexts/adminContext.jsx';
import DashBoard from "./pages/Admin/DashBoard.jsx";
import AllApointment from "./pages/Admin/AllApointment.jsx";
import AddDoctor from "./pages/Admin/AddDoctor.jsx";
import DoctorsList from "./pages/Admin/DoctorsList.jsx";
import { DoctorContext } from "./contexts/doctorContext.jsx";
import DoctorDashboard from "./pages/Doctor/DoctorDashboard.jsx";
import DoctorApointment from "./pages/Doctor/DoctorApointment.jsx";
import DoctorProfile from "./pages/Doctor/DoctorProfile.jsx";


const App = () => {

  const {aToken} = useContext(AdminContext);
  const {dToken} = useContext(DoctorContext);
  return aToken || dToken ? (
    <div className="bg-[#F8F8FD]">
        
        <ToastContainer />
        <Navbar />
        <div className=" flex item-start">
          <Sidebar />
          <Routes>
            {/* Admin Routes */}
            <Route path='/' element={<></> } />
            <Route path='/admin-dashboard' element={<DashBoard />} />
            <Route path='/all-appointments' element={<AllApointment />} />
            <Route path='/add-doctor' element={<AddDoctor />} />
            <Route path='/doctors-list' element={<DoctorsList />} />
            {/* Doctor Routes */}
            <Route path='/doctor-dashboard' element={<DoctorDashboard />} />
            <Route path='/doctor-appointments' element={<DoctorApointment />} />
            <Route path='/doctor-profile' element={<DoctorProfile />} />
          </Routes>

        </div>
    </div>

  ) : (
    <div>
        <Login />
        <ToastContainer />
    </div>
  );
};

export default App;