import { useContext, useState, useEffect } from "react";
import { useParams} from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets_frontend/assets";
import RelatedDoctord from "../components/RelatedDoctord";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { FaUserMd, FaGraduationCap, FaBriefcaseMedical, FaInfoCircle, FaDollarSign } from 'react-icons/fa'

const Appointment = () => {
  const { docId } = useParams();
  const { doctors, currencySymbol, backendUrl, token, getDoctorsData } =
    useContext(AppContext);
  const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const navigate = useNavigate();

  const [doctorInfo, setDoctorInfo] = useState(null);
  const [doctorsSlots, setDoctorsSlots] = useState([]);
  const [slotIndex, setSlotIndex] = useState(0);
  const [slotTime, setSlotTime] = useState("");

  useEffect(() => {
    if (doctors && docId) {
      const docInfo = doctors.find((doc) => doc._id === docId);
      setDoctorInfo(docInfo);
    }
  }, [doctors, docId]);

  const getAvailableSlots = () => {
    if (!doctorInfo) return; // Prevent error if doctorInfo is null
    const slots = [];
    let today = new Date();
    for (let i = 0; i < 7; i++) {
      let currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      let endtime = new Date(currentDate);
      endtime.setHours(21, 0, 0, 0);
      if (i === 0) {
        currentDate.setHours(
          currentDate.getHours() > 10 ? currentDate.getHours() + 1 : 10
        );
        currentDate.setMinutes(currentDate.getMinutes() > 30 ? 30 : 0);
      } else {
        currentDate.setHours(10);
        currentDate.setMinutes(0);
      }
      let timeSlots = [];
      while (currentDate <= endtime) {
        let formattedTime = currentDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        let day = currentDate.getDate();
        let month = currentDate.getMonth() + 1;
        let year = currentDate.getFullYear();

        const slotDate = `${day}_${month}_${year}`;
        const slotTime = formattedTime;

         const bookedArr = doctorInfo.slots_booked[slotDate];
         const isSlotBooked = Array.isArray(bookedArr) && bookedArr.includes(slotTime);
         if (!isSlotBooked) {
           timeSlots.push({
             date: new Date(currentDate),
             time: formattedTime,
           });
         }
        currentDate.setMinutes(currentDate.getMinutes() + 30);
      }
      slots.push({
        day: daysOfWeek[(today.getDay() + i) % 7],
        date: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + i
        ),
        slots: timeSlots,
      });
    }
    setDoctorsSlots(slots);
  };

  // BOOK APPOINTMENT HANDLER

  const bookAppointment = async () => {
    if (!token) {
      toast.warn("Login to book appointment");
      return navigate("/login");
    }

    try {
      // Validate selection
      if (slotIndex === -1 || !slotTime || !doctorsSlots[slotIndex]) {
        toast.warn("Please select a date and time slot");
        return;
      }

      // Find the selected slot object for the chosen day and time
      const daySlot = doctorsSlots[slotIndex];
      const selectedSlot = daySlot.slots.find((s) => s.time === slotTime);
      if (!selectedSlot || !selectedSlot.date) {
        toast.error("Selected time slot not available");
        return;
      }

      const date = selectedSlot.date; // Date object
      let day = date.getDate();
      let month = date.getMonth() + 1; // months are 0-based
      let year = date.getFullYear();

      const slotDate = `${day}_${month}_${year}`;

      const { data } = await axios.post(
        backendUrl + "/api/user/book-appointment",
        { docId, slotDate, slotTime },
        { headers: { token } }
      );
      if (data.success) {
        toast.success(data.message);
        getDoctorsData();
        navigate("/my-appointments");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };



  // Removed undefined fetchDoctorsInfo useEffect

  useEffect(() => {
    getAvailableSlots();
  }, [doctorInfo]);

  useEffect(() => {
    console.log(doctorsSlots);
  }, [doctorsSlots]);

  if (!doctorInfo) {
    return (
      <div className="text-center text-gray-500 py-16 text-lg">
        Doctor not found.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-3xl shadow-2xl p-10 flex flex-col md:flex-row gap-10 items-center animate-fade-in">
        {/* Doctor Image */}
        <div className="flex-shrink-0">
          <img
            src={doctorInfo.image}
            alt={doctorInfo.name}
            className="w-44 h-44 rounded-3xl object-cover border-4 border-blue-200 shadow-lg transition-transform duration-300 hover:scale-105"
          />
        </div>
        {/* Doctor Details */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-900 via-blue-700 to-blue-500 bg-clip-text text-transparent drop-shadow">
              {doctorInfo.name}
            </h2>
            <img
              src={assets.verified_icon}
              alt="verified"
              className="w-7 h-7"
            />
          </div>
          <div className="flex flex-wrap gap-3 mb-3">
            <span className="bg-blue-100 text-blue-900 px-4 py-2 rounded-full text-base border border-blue-200 shadow-sm font-medium">
              {doctorInfo.degree}
            </span>
            <span className="bg-blue-100 text-blue-900 px-4 py-2 rounded-full text-base border border-blue-200 shadow-sm font-medium">
              {doctorInfo.speciality}
            </span>
          </div>
          <p className="text-blue-700 text-lg mb-3 font-semibold">
            {doctorInfo.experience} of experience
          </p>
          {/* About Section */}
          <div className="mt-8 bg-gradient-to-r from-blue-100 to-blue-50 rounded-xl p-5 border border-blue-100 shadow">
            <div className="flex items-center gap-2 mb-2">
              <img src={assets.info_icon} alt="info" className="w-5 h-5" />
              <span className="text-blue-900 font-semibold text-lg">About</span>
            </div>
            <p className="text-gray-700 text-base leading-relaxed ">
              {doctorInfo.about}
            </p>
          </div>
          <p>
            Appointment fee:{" "}
            <span>
              {currencySymbol}
              {doctorInfo.fees}
            </span>
          </p>
          <div className="mt-8 flex justify-center"></div>
        </div>
      </div>

      {/* Booking Section */}
      <div className="sm:ml-72 sm:pl-4 mt-4 font-medium text-grey-800">
        <p>Booking slots</p>
        <div className=" flex gap-3 item-center w-full overflow-x-scroll mt-4">
          {doctorsSlots.length > 0 ? (
            doctorsSlots.map((daySlot, index) => (
              <button
                key={index}
                className={`flex flex-col items-center justify-center w-14 h-14 min-w-[3.5rem] min-h-[3.5rem] max-w-[3.5rem] max-h-[3.5rem] rounded-full transition-all duration-200 focus:outline-none select-none relative
              text-xs md:text-sm
              ${
                index === slotIndex
                  ? "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white shadow-xl font-bold ring-2 ring-blue-300"
                  : "bg-white border border-blue-400 text-blue-700 hover:bg-blue-50 hover:shadow-lg hover:border-blue-400"
              }
            `}
                style={{
                  boxShadow:
                    index === slotIndex
                      ? "0 4px 16px 0 rgba(59,130,246,0.15)"
                      : undefined,
                }}
                onClick={() => {
                  if (index === slotIndex) {
                    setSlotIndex(-1);
                    setSlotTime("");
                  } else {
                    setSlotIndex(index);
                    setSlotTime("");
                  }
                }}
              >
                <span className="text-[10px] tracking-widest leading-none drop-shadow-sm">
                  {daySlot.day}
                </span>
                <span className="text-base font-semibold leading-none mt-0.5 drop-shadow">
                  {daySlot.date.getDate()}
                </span>
                {/* Shine effect */}
                {index === slotIndex && (
                  <span
                    className="absolute left-0 top-0 w-full h-full rounded-full pointer-events-none animate-shimmer bg-gradient-to-r from-white/40 via-white/10 to-transparent opacity-60"
                    style={{ filter: "blur(1px)" }}
                  ></span>
                )}
              </button>
            ))
          ) : (
            <p className="text-gray-500">No slots available.</p>
          )}
        </div>
        {/* Time slots for selected day */}
        {doctorsSlots[slotIndex] && (
          <>
            <div className="flex gap-4 mt-6 overflow-x-auto scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent py-2">
              {doctorsSlots[slotIndex].slots.map((slot, idx) => (
                <span
                  key={idx}
                  className={`px-5 py-2 rounded-full text-base font-medium shadow-sm cursor-pointer whitespace-nowrap transition-all duration-150 border 
                    ${
                      slotTime === slot.time
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white border-gray-200 text-gray-700 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-400"
                    }`}
                  onClick={() => {
                    if (slotTime === slot.time) {
                      setSlotTime("");
                    } else {
                      setSlotTime(slot.time);
                    }
                  }}
                >
                  {slot.time}
                </span>
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <button
                onClick={bookAppointment}
                className={`px-8 py-3 rounded-full font-bold text-lg shadow-lg transition-all duration-200 focus:outline-none 
                  ${
                    slotIndex !== -1 && slotTime
                      ? "bg-gradient-to-r from-blue-600 to-blue-400 text-white hover:from-blue-700 hover:to-blue-500"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                disabled={slotIndex === -1 || !slotTime}
              >
                Book Appointment
              </button>
            </div>
          </>
        )}
      </div>

      {/* Listing Related Doctors */}
      <RelatedDoctord docId={docId} speciality={doctorInfo.speciality} />
    </div>
  );
};

export default Appointment;
