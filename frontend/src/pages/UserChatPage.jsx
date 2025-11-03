import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ChatBox from "../components/ChatBox";
import { FiArrowLeft } from "react-icons/fi";

// UserChatPage: A dedicated chat page for users to chat with a doctor for a specific appointment
// Styling is done using Tailwind CSS utility classes for a modern look

const UserChatPage = () => {
  // Get appointmentId from the URL
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // If you pass doctorName as state when navigating, you can get it like this:
  const doctorName = location.state?.doctorName || "Doctor";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300">
      {/* Header Bar */}
      <div className="flex items-center gap-4 px-6 py-4 bg-blue-200/80 shadow-lg">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-blue-300 hover:bg-blue-400 text-blue-800 hover:text-blue-900 transition-colors"
          title="Back"
        >
          <FiArrowLeft size={22} />
        </button>
        <h2 className="text-2xl font-bold text-blue-900 drop-shadow">Chat with Dr. {doctorName}</h2>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 border border-blue-200">
          {/* ChatBox expects appointmentId and doctorName (optional) */}
          <ChatBox appointmentId={appointmentId} doctorName={doctorName} />
        </div>
      </div>
    </div>
  );
};

export default UserChatPage;
