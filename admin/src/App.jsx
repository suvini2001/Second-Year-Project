import Login from "./pages/login.jsx";
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


const App = () => {

  const {aToken} = useContext(AdminContext);
  return aToken ? (
    <div className="bg-[#F8F8FD]">
        
        <ToastContainer />
        <Navbar />
        <div className=" flex item-start">
          <Sidebar />
          <Routes>
            <Route path='/' element={<></> } />
            <Route path='/admin-dashboard' element={<DashBoard />} />
            <Route path='/all-appointments' element={<AllApointment />} />
            <Route path='/add-doctor' element={<AddDoctor />} />
            <Route path='/doctors-list' element={<DoctorsList />} />
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