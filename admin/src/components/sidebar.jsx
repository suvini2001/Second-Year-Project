import { useContext } from "react";
import { AdminContext } from "../contexts/adminContext";
import { assets } from "../assets/assets";
import { NavLink } from "react-router-dom";
import { DoctorContext } from "../contexts/doctorContext";


const sidebar = () => {
  const { aToken } = useContext(AdminContext);
  const { dToken } = useContext(DoctorContext);

  return (
    <div className="min-h-screen w-64 bg-blue-100 shadow-lg flex flex-col py-8 px-4">
      {aToken && (
        <ul className="space-y-4">
          <NavLink
            to={"/admin-dashboard"}
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-blue-900 shadow-md transition-all duration-200 bg-blue-200 hover:bg-blue-300 hover:shadow-xl hover:scale-105 cursor-pointer"
            style={{ textDecoration: "none" }}
          >
            <img src={assets.home_icon} alt="" className="w-6 h-6" />
            <p className="text-blue-900 font-semibold">DashBoard</p>
          </NavLink>
          <NavLink
            to={"/all-appointments"}
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-blue-300 shadow-md transition-all duration-200 bg-blue-200 hover:bg-blue-300 hover:shadow-xl hover:scale-105 cursor-pointer"
            style={{ textDecoration: "none" }}
          >
            <img src={assets.appointment_icon} alt="" className="w-6 h-6" />
            <p className="text-blue-900 font-semibold">Appointment</p>
          </NavLink>
          <NavLink
            to={"/add-doctor"}
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-blue-300 shadow-md transition-all duration-200 bg-blue-200 hover:bg-blue-300 hover:shadow-xl hover:scale-105 cursor-pointer"
            style={{ textDecoration: "none" }}
          >
            <img src={assets.add_icon} alt="" className="w-6 h-6" />
            <p className="text-blue-900 font-semibold">Add Doctor</p>
          </NavLink>
          <NavLink
            to={"/doctors-list"}
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-blue-300 shadow-md transition-all duration-200 bg-blue-200 hover:bg-blue-300 hover:shadow-xl hover:scale-105 cursor-pointer"
            style={{ textDecoration: "none" }}
          >
            <img src={assets.people_icon} alt="" className="w-6 h-6" />
            <p className="text-blue-900 font-semibold">Doctors List</p>
          </NavLink>
        </ul>
      )}


      {dToken && (
        <ul className="space-y-4">
          <NavLink
            to={"/doctor-dashboard"}
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-blue-900 shadow-md transition-all duration-200 bg-blue-200 hover:bg-blue-300 hover:shadow-xl hover:scale-105 cursor-pointer"
            style={{ textDecoration: "none" }}
          >
            <img src={assets.home_icon} alt="" className="w-6 h-6" />
            <p className="text-blue-900 font-semibold">DashBoard</p>
          </NavLink>
          <NavLink
            to={"/doctor-appointments"}
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-blue-300 shadow-md transition-all duration-200 bg-blue-200 hover:bg-blue-300 hover:shadow-xl hover:scale-105 cursor-pointer"
            style={{ textDecoration: "none" }}
          >
            <img src={assets.appointment_icon} alt="" className="w-6 h-6" />
            <p className="text-blue-900 font-semibold">Appointment</p>
          </NavLink>
          
          <NavLink
            to={"/doctor-profile"}
            className="flex items-center gap-3 p-3 rounded-lg border-2 border-blue-300 shadow-md transition-all duration-200 bg-blue-200 hover:bg-blue-300 hover:shadow-xl hover:scale-105 cursor-pointer"
            style={{ textDecoration: "none" }}
          >
            <img src={assets.people_icon} alt="" className="w-6 h-6" />
            <p className="text-blue-900 font-semibold">Profile</p>
          </NavLink>
        </ul>
      )}
    </div>
  );
};

export default sidebar;
