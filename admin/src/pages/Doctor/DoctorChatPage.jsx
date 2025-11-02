import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ChatBox from "../../components/ChatBox";
import { FiArrowLeft } from "react-icons/fi";

// DoctorChatPage: A dedicated chat page for doctors to chat with a patient for a specific appointment
// Styling is done using Tailwind CSS utility classes for a modern look

const DoctorChatPage = () => {
  // Get appointmentId from the URL
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // If you pass patientName as state when navigating, you can get it like this:
  const patientName = location.state?.patientName || "Patient";

  // Optionally, you could fetch patient name/details here if needed

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      {/* Header Bar */}
      <div className="flex items-center gap-4 px-6 py-4 bg-blue-950/80 shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-blue-800 hover:bg-blue-700 text-cyan-200 hover:text-white transition-colors"
          title="Back"
        >
          <FiArrowLeft size={22} />
        </button>
        <h2 className="text-2xl font-bold text-cyan-100 drop-shadow">Chat with {patientName}</h2>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 border border-blue-200">
          {/* ChatBox expects appointmentId and patientName (optional) */}
          <ChatBox appointmentId={appointmentId} patientName={patientName} />
        </div>
      </div>
    </div>
  );
};

export default DoctorChatPage;