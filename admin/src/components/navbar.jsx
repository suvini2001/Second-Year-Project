
import { useContext } from "react";
import { assets } from "../assets/assets";
import { AdminContext } from "../contexts/adminContext";
import {useNavigate} from 'react-router-dom';

const Navbar = () => {

  const { aToken,setAtoken } = useContext(AdminContext);
  const navigate = useNavigate();
  const logout=()=>{
    aToken && setAtoken('');
    aToken && localStorage.removeItem('adminToken');
    navigate('/');
  }

  

  return (
    <nav
  className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white shadow-xl px-6 py-4 flex items-center justify-between rounded-b-xl border-b-4 border-black"
      style={{ minHeight: '70px' }}
    >
      <div className="flex items-center gap-4">
        <img
          src={assets.admin_logo}
          alt="Logo"
          className="h-10 w-10 rounded-full shadow-lg border-2 border-black"
        />
  <p className={aToken ? "font-extrabold text-2xl tracking-wide text-white px-4 py-1 rounded-lg bg-gradient-to-r from-blue-900 via-blue-700 to-blue-900 shadow-lg border border-blue-400" : "font-semibold text-lg tracking-wide text-white"}>
          {aToken ? 'Admin' : 'Doctor'}
        </p>
      </div>
      <button
        onClick={logout}
        className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 text-white font-medium px-5 py-2 rounded-lg shadow-md border-2 border-black transition-all duration-300 hover:from-blue-800 hover:via-blue-900 hover:to-black hover:text-white hover:scale-105 active:scale-95 focus:outline-none"
      >
        Logout
      </button>
    </nav>
  );
};

export default Navbar;