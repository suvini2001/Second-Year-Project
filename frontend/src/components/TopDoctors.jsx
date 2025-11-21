import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

const TopDoctors = () => {
    const navigate = useNavigate();
    const { doctors } = useContext(AppContext);

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 text-center mx-auto">Top Doctors to Book</h1>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">Simply browse through our list of top doctors and book your appointment online in minutes.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {doctors.slice(0,10).map((item,index) => (
                <div
                    onClick={() => {navigate(`/appointment/${item._id}`);scrollTo(0,0)}}
                    onKeyDown={(e) => { if (e.key === 'Enter') { navigate(`/appointment/${item._id}`); scrollTo(0,0); } }}
                    role="button"
                    tabIndex={0}
                    key={index}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group cursor-pointer"
                >
                    <div className="relative">
                        <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full h-40 sm:h-48 object-cover" 
                            loading="lazy"
                            width="300"
                            height="192"
                        />
                    </div>
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <p className="text-sm font-medium text-green-600">Available</p>
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                            {item.name}
                        </h3>
                        <p className="text-blue-600 font-medium mb-2">{item.speciality}</p>
                        <div>
                            <p className="text-sm text-gray-600 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Mon - Fri, 9:00 AM - 5:00 PM
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        <div className="text-center mt-12">
            <button onClick={()=>{navigate('/doctors'); scrollTo(0,0)}} className="group bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-full font-bold
                           hover:from-blue-700 hover:to-blue-900 transform hover:scale-105
                           transition-all duration-300 shadow-lg hover:shadow-xl
                           border border-blue-400/20 flex items-center gap-3 mx-auto">
                See All Doctors
                <svg className="w-5 h-5 transform transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
            </button >
        </div>
    </div>
  )
}

export default TopDoctors