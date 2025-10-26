import { useContext, useState, useCallback } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useEffect } from "react";
import { Link } from "react-router-dom"; // Add this import

const MyAppointments = () => {
  const { backendUrl, token,getDoctorsData } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const months = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const slotDateFormat = (slotDate) => {
    if (!slotDate || typeof slotDate !== "string" || !slotDate.includes("_")) {
      return "Invalid Date"; // Handle invalid slotDate
    }

    const dateArray = slotDate.split("_");
    const day = dateArray[0];
    const monthIndex = Number(dateArray[1]);
    const year = dateArray[2];

    if (
      !day ||
      !monthIndex ||
      !year ||
      monthIndex < 1 ||
      monthIndex > 12 ||
      isNaN(monthIndex)
    ) {
      return "Invalid Date"; // Handle invalid date components
    }

    return `${day} ${months[monthIndex]} ${year}`;
  };

  // getting the user appointments to display from the backend
  const getUserAppointments = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/user/appointments", {
        headers: { token },
      });
      if (data.success) {
        // Sort appointments by date (latest first)
        const sortedAppointments = data.appointments.sort((a, b) => {
          // Convert slotDate from "DD_MM_YYYY" format to comparable date
          const dateA = new Date(a.slotDate.split("_").reverse().join("-"));
          const dateB = new Date(b.slotDate.split("_").reverse().join("-"));

          // If dates are equal, compare by time
          if (dateA.getTime() === dateB.getTime()) {
            // Convert time to 24-hour format for comparison
            const timeA =
              a.slotTime.includes("pm") && !a.slotTime.includes("12:")
                ? parseInt(a.slotTime) + 12
                : parseInt(a.slotTime);
            const timeB =
              b.slotTime.includes("pm") && !b.slotTime.includes("12:")
                ? parseInt(b.slotTime) + 12
                : parseInt(b.slotTime);
            return timeB - timeA;
          }

          return dateB - dateA; // Latest date first
        });
        setAppointments(sortedAppointments);
        console.log(sortedAppointments);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    if (token) {
      getUserAppointments();
    }
  }, [token, getUserAppointments]);

  const cancelAppointment = async (appointmentId) => {
    try {
      console.log(appointmentId);
      const { data } = await axios.post(
        backendUrl + "/api/user/cancel-appointment",
        { appointmentId },
        { headers: { token } }
      );
      if (data.success) {
        toast.success(data.message);
        getUserAppointments();
        getDoctorsData();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold text-blue-700 mb-8 text-center drop-shadow-lg">
          My Appointments
        </h2>
        <div className="space-y-8">
          {/* Appointment details will go here */}
          {appointments && appointments.length > 0 ? (
            appointments.map((item, index) => (
              <div
                key={index}
                className="flex flex-col md:flex-row items-center bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 bg-opacity-90 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6"
              >
                <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                  <img
                    src={item.docData.image}
                    alt={item.docData.name}
                    className="w-32 h-32 rounded-full border-4 border-blue-300 shadow-lg object-cover hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xl font-semibold text-blue-100 mb-1">
                    {item.docData.name}
                  </p>
                  <p className="text-blue-200 mb-2">
                    {item.docData.speciality}
                  </p>
                  <p className="text-blue-100 mb-2">
                    Date & Time:
                    <span className="font-medium text-white">
                      {slotDateFormat(item.slotDate)} | {item.slotTime}
                    </span>
                  </p>
                  <div className="flex gap-4">
                    {!item.cancelled && !item.payment && (
                      <Link
                        to={`/mock-payment/${item._id}`}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold rounded-xl shadow-md hover:from-blue-400 hover:to-blue-600 hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center"
                      >
                        Pay Online
                      </Link>
                    )}
                    {item.payment && (
                      <button className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-700 text-white font-semibold rounded-xl shadow-md cursor-not-allowed opacity-70">
                        Paid
                      </button>
                    )}
                    {item.cancelled && (
                      <button className="px-6 py-2 bg-gradient-to-r from-gray-400 to-gray-600 text-white font-semibold rounded-xl shadow-md cursor-not-allowed opacity-70">
                        Appointment Cancelled
                      </button>
                    )}
                    {!item.cancelled && (
                      <button
                        onClick={() => cancelAppointment(item._id)}
                        className="px-6 py-2 bg-gradient-to-r from-red-700 to-red-900 text-white font-semibold rounded-xl shadow-md hover:from-red-800 hover:to-red-900 hover:shadow-xl hover:scale-105 transition-all duration-300"
                      >
                        Cancel Appointment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">No appointments found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyAppointments;
