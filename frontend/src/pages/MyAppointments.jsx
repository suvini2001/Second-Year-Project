import { useContext } from "react";
import { AppContext } from "../context/AppContext";

const MyAppointments = () => {
  const { doctors } = useContext(AppContext);

  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold text-blue-700 mb-8 text-center drop-shadow-lg">
          My Appointments
        </h2>
        <div className="space-y-8">
          {/* Appointment details will go here */}
          {doctors && doctors.length > 0 ? (
            doctors
              .slice(0, 2)
              .map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col md:flex-row items-center bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 bg-opacity-90 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 p-6"
                >
                  <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-32 h-32 rounded-full border-4 border-blue-300 shadow-lg object-cover hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xl font-semibold text-blue-100 mb-1">
                      {item.name}
                    </p>
                    <p className="text-blue-200 mb-2">{item.speciality}</p>
                    <p className="text-blue-100 mb-2">
                      Address:{" "}
                      <span className="font-medium text-white">
                        {item.address.line1}, {item.address.line2}
                      </span>
                    </p>
                    <p className="text-blue-200 mb-4">
                      <span className="font-semibold text-blue-100">
                        Date & Time:
                      </span>{" "}
                      25, July, 2025 | 8:30 PM
                    </p>
                    <div className="flex gap-4">
                      <button className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold rounded-xl shadow-md hover:from-blue-400 hover:to-blue-600 hover:shadow-xl hover:scale-105 transition-all duration-300">
                        Pay Online
                      </button>
                      <button className="px-6 py-2 bg-gradient-to-r from-red-700 to-red-900 text-white font-semibold rounded-xl shadow-md hover:from-red-800 hover:to-red-900 hover:shadow-xl hover:scale-105 transition-all duration-300">
                        Cancel Appointment
                      </button>
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

