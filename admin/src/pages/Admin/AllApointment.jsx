import React, { useContext, useEffect } from "react";
import { AdminContext } from "../../contexts/adminContext";
import { AppContext } from "../../contexts/appContext";
import { assets } from "../../assets/assets";

const AllAppointments = () => {
  const { aToken, appointments, getAllAppointments, cancelAppointment } =
    useContext(AdminContext);
  const { calculateAge, slotDateFormat, currency } = useContext(AppContext);

  useEffect(() => {
    if (aToken) {
      getAllAppointments();
    }
  }, [aToken, getAllAppointments]);

  return (
    <div className="w-full max-w-6xl m-5">
      <p className="mb-3 text-3xl font-normal bg-gradient-to-r from-blue-800 via-blue-900 to-blue-700 text-transparent bg-clip-text drop-shadow-2xl tracking-wide text-center border-b-4 border-blue-700 pb-2 rounded-t-2xl shadow-lg">
        All Appointments
      </p>

      <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-50 border-2 border-blue-300 rounded-2xl shadow-xl text-sm max-h-[80vh] min-h-[60vh] overflow-y-scroll">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] grid-flow-col py-3 px-6 border-b-2 border-blue-200 text-blue-700 font-semibold bg-gradient-to-r from-blue-100 via-blue-200 to-cyan-100 rounded-t-2xl">
          <p>#</p>
          <p>Patient</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Doctor</p>
          <p>Fees</p>
          <p>Actions</p>
        </div>

        {/* Rows */}
        {(appointments || []).map((item, index) => (
          <div
            className="relative flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_3fr_1fr_3fr_3fr_1fr_1fr] items-center text-blue-900 py-3 px-6 border-b border-blue-100 rounded-xl mx-2 my-1 shadow-sm transition-colors duration-200 group overflow-hidden hover:shadow-2xl hover:border-blue-400 hover:scale-[1.01]"
            key={index}
          >
            {/* Shiny shimmer overlay */}
            <span className="pointer-events-none absolute top-0 left-[-75%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 group-hover:opacity-80 group-hover:animate-shine z-10 rounded-xl" />
            <p className="max-sm:hidden z-20 text-lg font-medium bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-transparent bg-clip-text drop-shadow-md">
              {index + 1}
            </p>

            <div className="flex items-center gap-2 z-20">
              <img
                className="w-8 h-8 rounded-full object-cover border-2 border-blue-200 group-hover:border-blue-400 transition shadow"
                src={item.userData?.image || ""}
                alt=""
              />
              <p className="font-semibold text-base bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-transparent bg-clip-text drop-shadow">
                {item.userData?.name}
              </p>
            </div>

            <p className="max-sm:hidden z-20 text-base font-light bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-transparent bg-clip-text drop-shadow">
              {calculateAge(item.userData?.dob)}
            </p>

            <p className="z-20 text-base font-medium bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-transparent bg-clip-text drop-shadow">
              {slotDateFormat(item.slotDate)}, {item.slotTime}
            </p>

            <div className="flex items-center gap-2 z-20">
              <img
                className="w-8 h-8 rounded-full object-cover bg-blue-100 border-2 border-blue-200 group-hover:border-blue-400 transition shadow"
                src={item.docData?.image || ""}
                alt=""
              />
              <p className="font-semibold text-base bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-transparent bg-clip-text drop-shadow">
                {item.docData?.name}
              </p>
            </div>

            <p className="font-bold z-20 text-base bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-transparent bg-clip-text drop-shadow">
              {currency(item.amount)}
            </p>
            {item.cancelled ? (
              <p className="text-red-400 text-xs font-semibold z-20 drop-shadow">
                Cancelled
              </p>
            ) : item.isCompleted ? (
              <p className="text-green-400 text-xs font-semibold z-20 drop-shadow">
                Completed
              </p>
            ) : item.isCompleted ? (
              <p className="text-green-400 text-xs font-semibold z-20 drop-shadow">
                Completed
              </p>
            ) : (
              <img
                onClick={() => {
                  console.log("Cancelling appointment with ID:", item._id);
                  cancelAppointment(item._id);
                }}
                className="w-10 cursor-pointer p-1 rounded-full bg-gradient-to-tr from-blue-100 via-blue-200 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 hover:shadow-lg border-2 border-blue-200 hover:border-blue-400 transition shadow z-20 relative hover:scale-110 hover:brightness-125"
                src={assets.cancel_icon}
                alt="cancel"
                title="Cancel appointment"
              />
            )}
          </div>
        ))}
      </div>
      {/* Tailwind custom animation for shine */}
      <style>{`
        @keyframes shine {
          0% { left: -75%; }
          100% { left: 125%; }
        }
        .animate-shine {
          animation: shine 1s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default AllAppointments;
