import { useContext, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";


const Doctors = () => {
  const { speciality } = useParams();
  const { doctors } = useContext(AppContext);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [activeSpecialty, setActiveSpecialty] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (doctors && doctors.length > 0) {
      if (speciality) {
        setFilteredDoctors(doctors.filter((doc) => doc.speciality.toLowerCase() === speciality.toLowerCase()));
      } else {
        setFilteredDoctors(doctors);
      }
    } else {
      setFilteredDoctors([]);
    }
  }, [doctors, speciality]);

  return (
    <div>

    
    <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col items-center">
      
      <div className="flex flex-col md:flex-row gap-8">
        <button className={`py-1 px-3 border rounded text-sm transition all sm:hidden ${showFilters? "bg-primary text-white":""}`} onClick={() => setShowFilters((prev) => !prev)}> Filters</button>
        {/* Sidebar Specialties */}
        <aside className={`w-full md:w-64 mb-8 md:mb-0 ${showFilters ? 'block' : 'hidden'} ${showFilters? "flex":"hidden sm:flex"} `}>
          <div className={`bg-white rounded-2xl border border-blue-200 shadow p-4`}>
            <h2 className="text-lg font-bold text-blue-950 mb-4 text-center md:text-left">Browse All Doctors</h2>
            <ul className="space-y-2">
              {[
                { label: 'General Physicians', value: 'general physician' },
                { label: 'Gynecologists', value: 'gynecologist' },
                { label: 'Pediatricians', value: 'pediatricians' },
                { label: 'Dermatologists', value: 'dermatologist' },
                { label: 'Gastroenterologists', value: 'gastroenterologist' },
                { label: 'Neurologists', value: 'neurologist' },
              ].map((cat) => (
                <li key={cat.value}>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-lg border border-blue-100 bg-blue-50 text-blue-900 shadow-sm transition-all cursor-pointer
                      hover:bg-gradient-to-r hover:from-blue-100 hover:to-blue-300 hover:text-blue-950 hover:border-blue-400
                      focus:outline-none focus:ring-2 focus:ring-blue-400
                      ${activeSpecialty === cat.value ? 'ring-2 ring-blue-400 bg-gradient-to-r from-blue-100 to-blue-300 text-blue-950 border-blue-400 scale-[1.03]' : ''}`}
                    onClick={() => {
                      if (activeSpecialty === cat.value) {
                        setFilteredDoctors(doctors);
                        setActiveSpecialty(null);
                      } else {
                        setFilteredDoctors(doctors.filter((doc) => doc.speciality.toLowerCase() === cat.value));
                        setActiveSpecialty(cat.value);
                      }
                    }}
                  >
                    {cat.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        {/* Doctors Grid */}
        <main className="flex-1">
          {filteredDoctors.length === 0 ? (
            <p className="text-center text-gray-500 py-16 text-lg">No doctors found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredDoctors.map((item, index) => (
                <div
                  onClick={() => navigate(`/appointment/${item._id}`)}
                  key={index}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group cursor-pointer border border-blue-100 hover:border-blue-300"
                >
                  <div className="relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      width="300"
                      height="192"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="text-xs font-medium text-green-600">Available</span>
                    </div>
                    <h3 className="font-bold text-xl text-blue-900 mb-1 group-hover:text-blue-700 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-blue-600 font-medium mb-2">{item.speciality}</p>
                    <div className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Mon - Fri, 9:00 AM - 5:00 PM
                    </div>
                    <div className="flex flex-col gap-1">
                      
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>

    </div>
  )
}

export default Doctors  