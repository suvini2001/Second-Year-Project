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
import DoctorChatPage from "./pages/Doctor/DoctorChatPage.jsx";
import DoctorMessages from "./pages/Doctor/Messages.jsx";


import { useLocation } from "react-router-dom";

const App = () => {
  const { aToken } = useContext(AdminContext);
  const { dToken } = useContext(DoctorContext);
  const location = useLocation();

  // Determine if the current path is the chat page
  const isChatPage = location.pathname.startsWith('/doctor/chat/');

  // Main content with sidebar
  const MainLayout = (
    <div className="bg-[#F8F8FD]">
      <ToastContainer />
      <Navbar />
      <div className="flex item-start">
        <Sidebar />
        <div className="flex-grow">
          <Routes>
            {/* Admin Routes */}
            <Route path='/' element={<></>} />
            <Route path='/admin-dashboard' element={<DashBoard />} />
            <Route path='/all-appointments' element={<AllApointment />} />
            <Route path='/add-doctor' element={<AddDoctor />} />
            <Route path='/doctors-list' element={<DoctorsList />} />
            {/* Doctor Routes */}
            <Route path='/doctor-dashboard' element={<DoctorDashboard />} />
            <Route path='/doctor-appointments' element={<DoctorApointment />} />
            <Route path='/doctor-profile' element={<DoctorProfile />} />
            <Route path='/Messages' element={<DoctorMessages />} />
          </Routes>
        </div>
      </div>
    </div>
  );

  // Separate layout for the chat page
  const ChatLayout = (
    <div>
      <ToastContainer />
      <Routes>
        <Route path='/doctor/chat/:appointmentId' element={<DoctorChatPage />} />
      </Routes>
    </div>
  );

  // Render based on login status and route
  if (!aToken && !dToken) {
    return (
      <div>
        <Login />
        <ToastContainer />
      </div>
    );
  }

  // If logged in, choose layout based on the page
  return isChatPage ? ChatLayout : MainLayout;
};

export default App;