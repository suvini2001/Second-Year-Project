import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DoctorContext } from "../../contexts/doctorContext";
import { AppContext } from "../../contexts/appContext";
import { FiList, FiXCircle, FiCheckCircle, FiMessageSquare } from "react-icons/fi";
import ChatBox from "../../components/ChatBox";


const DoctorAppointments = () => {

  const [openChatId, setOpenChatId] = useState(null);
  const navigate = useNavigate();
  const {
    dToken,
    appointments,
    getAppointments,
    cancelAppointment: cancelAppointmentCtx,
    completeAppointment: completeAppointmentCtx,
  } = useContext(DoctorContext);
  const { calculateAge, slotDateFormat, currency } = useContext(AppContext);

  const cancelAppointment = async (id) => {
    if (typeof cancelAppointmentCtx === "function") {
      try {
        await cancelAppointmentCtx(id);
        if (typeof getAppointments === "function") getAppointments();
      } catch (err) {
        console.error("cancelAppointment failed", err);
      }
    } else {
      console.warn(
        "cancelAppointment function is not provided by DoctorContext"
      );
    }
  };

  const completeAppointment = async (id) => {
    if (typeof completeAppointmentCtx === "function") {
      try {
        await completeAppointmentCtx(id);
        if (typeof getAppointments === "function") getAppointments();
      } catch (err) {
        console.error("completeAppointment failed", err);
      }
    } else {
      console.warn(
        "completeAppointment function is not provided by DoctorContext"
      );
    }
  };

  useEffect(() => {
    if (dToken) {
      getAppointments();
    }
  }, [dToken, getAppointments]);

  return (
    <div className="w-full max-w-6xl m-5 space-y-4">
      <div className="rounded-2xl p-[2px] bg-gradient-to-tr from-blue-900 via-blue-800 to-blue-700 shadow-2xl">
        <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 rounded-2xl overflow-hidden ring-1 ring-blue-900/60 text-sm">
          {/* Title bar */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-blue-800/60 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700">
            <div className="flex items-center gap-2">
              <FiList className="text-cyan-400" size={22} />
              <p className="font-semibold text-cyan-200 text-lg drop-shadow">
                All Appointments
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-cyan-900/60 text-cyan-200 ring-1 ring-cyan-400/40 font-bold">
              {(appointments || []).length}
            </span>
          </div>

          {/* Column header */}
          <div className="hidden sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] grid-flow-col py-3 px-6 border-b border-blue-800/60 text-cyan-300 sticky top-0 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 z-10">
            <p>#</p>
            <p>Patient</p>
            <p>Payment</p>
            <p>Age</p>
            <p>Date &amp; Time</p>
            <p>Fees</p>
            <p>Action</p>
          </div>

          {/* Rows */}
          <div className="max-h-[75vh] min-h-[50vh] overflow-y-auto">
            {(appointments || []).map((item, index) => (
              <div
                key={item?._id || index}
                className="flex flex-wrap justify-between max-sm:gap-5 max-sm:text-base sm:grid sm:grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] items-center text-cyan-100 py-3 px-6 border-b border-blue-800/40 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 hover:from-blue-900 hover:via-blue-800 hover:to-cyan-900 hover:scale-[1.01] hover:shadow-xl transition-all duration-200"
              >
                <p className="font-bold text-cyan-300">{index + 1}</p>

                <div className="flex items-center gap-2">
                  <img
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-cyan-400/40 shadow-md"
                    src={item?.userData?.image || ""}
                    alt="Patient avatar"
                  />
                  <p className="text-cyan-100 font-semibold">
                    {item?.userData?.name || "—"}
                  </p>
                  {/* Chat button: only show for paid, not cancelled, not completed */}
                  {item.payment && !item.cancelled && !item.isCompleted && (
                    <button
                      onClick={() =>
                        navigate(`/doctor/chat/${item._id}`, { state: { patientName: item.userData.name } })
                      }
                      className="w-8 h-8 flex items-center justify-center bg-purple-100 text-[#0a174e] rounded hover:bg-purple-200 transition-colors ml-1 shadow focus:outline-none focus:ring-2 focus:ring-purple-400"
                      title="Chat with Patient"
                    >
                      <FiMessageSquare size={18} color="#0a174e" />
                    </button>
                  )}
                </div>

                <div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ring-1 font-bold ${
                      item?.payment
                        ? "bg-green-900/60 text-green-300 ring-green-400/40"
                        : "bg-yellow-900/60 text-yellow-300 ring-yellow-400/40"
                    }`}
                  >
                    {item?.payment ? "Online" : "Cash"}
                  </span>
                </div>

                <p className="text-cyan-200">
                  {calculateAge(item?.userData?.dob)}
                </p>
                <p className="text-cyan-200">
                  {slotDateFormat(item?.slotDate)}, {item?.slotTime}
                </p>
                <p className="text-cyan-100 font-bold">
                  {currency(item?.amount)}
                </p>

                {item.cancelled ? (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-900/60 text-red-300 ring-1 ring-red-400/40">
                    Cancelled
                  </span>
                ) : item.isCompleted ? (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-900/60 text-green-300 ring-1 ring-green-400/40">
                    Completed
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => cancelAppointment(item._id)}
                      title="Cancel appointment"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-red-900/60 text-red-300 hover:bg-red-700 hover:text-white ring-1 ring-red-400/40 shadow transition-all duration-150 hover:scale-110"
                    >
                      <FiXCircle size={18} />
                    </button>
                    <button
                      onClick={() => completeAppointment(item._id)}
                      title="Mark completed"
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-900/60 text-green-300 hover:bg-green-700 hover:text-white ring-1 ring-green-400/40 shadow transition-all duration-150 hover:scale-110"
                    >
                      <FiCheckCircle size={18} />
                    </button>
                  </div>
                )}

                {/* Add after Complete/Cancel buttons */}

                {/* Render ChatBox below appointment card */}
                {openChatId === item._id && (
                  <div className="mt-4">
                    <ChatBox
                      appointmentId={item._id}
                      patientName={item.userData.name}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorAppointments;
