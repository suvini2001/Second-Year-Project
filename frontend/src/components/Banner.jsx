import { assets } from "../assets/assets_frontend/assets"
import { useNavigate } from "react-router-dom";

const Banner = () => {
    const navigate = useNavigate();
  return (
    <div className="bg-gradient-to-r from-blue-50 to-blue-100 flex flex-col md:flex-row items-center justify-between gap-6 px-4 md:px-12 py-8 md:py-12 max-w-6xl mx-auto mt-8 mb-8 rounded-xl shadow-md border border-blue-200/50 relative z-10">
        {/* ---------left side----------------*/}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4 md:w-1/2">
            <div className="space-y-2">
                <p className="text-blue-600 font-semibold text-base md:text-lg bg-blue-100/50 px-3 py-1 rounded-full inline-block mb-1">
                    Book Appointment
                </p>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                    With <span className="text-blue-600">100+ Trusted</span> Doctors
                </h2>
                <p className="text-gray-600 mt-2 text-base max-w-md">
                    Experience healthcare excellence with our network of trusted medical professionals.
                </p>
            </div>
            <button onClick={()=>{navigate("/login");scrollTo(0,0)}} className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 
                           rounded-full font-semibold text-base
                           shadow-md hover:shadow-xl flex items-center gap-3 group
                           border-2 border-blue-400/20 hover:border-blue-400/40
                           before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0
                           before:translate-x-[-150%] hover:before:translate-x-[150%] before:transition-transform before:duration-700
                           hover:scale-105 hover:-translate-y-0.5 transition-all duration-300 ease-out">
                <span className="relative z-10">Create Account</span>
                <svg className="w-5 h-5 transform transition-transform group-hover:translate-x-2 relative z-10 text-white/90" 
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
            </button>
        </div>

        {/* ---------right side----------------*/}
        <div className="md:w-1/2 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-300"></div>
            <img 
                src={assets.appointment_img} 
                alt="Book your appointment" 
                className="relative transform transition-transform duration-300 group-hover:scale-[1.02] rounded-lg w-full max-w-md mx-auto"
            />
        </div>
    </div>
  )
}

export default Banner