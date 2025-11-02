import React, { useContext, useEffect } from 'react'
import { DoctorContext } from '../../contexts/doctorContext'
import { AppContext } from '../../contexts/appContext'
import { FiDollarSign, FiCalendar, FiUsers, FiList, FiXCircle, FiCheckCircle } from 'react-icons/fi'

const DoctorDashboard = () => {
  // Destructuring state and functions from contexts
  const { dToken, dashData, getDashData, cancelAppointment, completeAppointment, profileData, getProfileData } = useContext(DoctorContext)
  const { currency, slotDateFormat } = useContext(AppContext)

  // Fetch dashboard data when component mounts or dToken changes
  useEffect(() => {
    if (dToken) {
      getDashData();
      if (!profileData) {
        getProfileData();
      }
    }
    // Only depend on dToken, getDashData, getProfileData
    // Do NOT depend on profileData to avoid infinite loop
  }, [dToken, getDashData, getProfileData]);

  return (
    dashData && (
      <div className="m-5 space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {/* Earnings */}
          <div className="group rounded-2xl p-[2px] bg-gradient-to-tr from-blue-900 via-blue-800 to-blue-700 shadow-2xl hover:shadow-blue-900/60 transition-all duration-300">
            <div className="flex items-center gap-4 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 rounded-2xl p-4 ring-1 ring-blue-900/60 group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-700 via-blue-800 to-blue-900 flex items-center justify-center ring-2 ring-cyan-400/40 shadow-md">
                <FiDollarSign className="text-cyan-300 group-hover:text-cyan-400 transition" size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-100 drop-shadow-lg">{currency(dashData.earnings)}</p>
                <p className="text-cyan-400 text-sm transition-colors group-hover:text-cyan-200">Earnings</p>
              </div>
            </div>
          </div>
          {/* Appointments */}
          <div className="group rounded-2xl p-[2px] bg-gradient-to-tr from-blue-900 via-blue-800 to-blue-700 shadow-2xl hover:shadow-blue-900/60 transition-all duration-300">
            <div className="flex items-center gap-4 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 rounded-2xl p-4 ring-1 ring-blue-900/60 group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-700 via-blue-800 to-blue-900 flex items-center justify-center ring-2 ring-cyan-400/40 shadow-md">
                <FiCalendar className="text-cyan-300 group-hover:text-cyan-400 transition" size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-100 drop-shadow-lg">{dashData.appointments}</p>
                <p className="text-cyan-400 text-sm transition-colors group-hover:text-cyan-200">Appointments</p>
              </div>
            </div>
          </div>
          {/* Patients */}
          <div className="group rounded-2xl p-[2px] bg-gradient-to-tr from-blue-900 via-blue-800 to-blue-700 shadow-2xl hover:shadow-blue-900/60 transition-all duration-300">
            <div className="flex items-center gap-4 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 rounded-2xl p-4 ring-1 ring-blue-900/60 group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-700 via-blue-800 to-blue-900 flex items-center justify-center ring-2 ring-cyan-400/40 shadow-md">
                <FiUsers className="text-cyan-300 group-hover:text-cyan-400 transition" size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-cyan-100 drop-shadow-lg">{dashData.patients}</p>
                <p className="text-cyan-400 text-sm transition-colors group-hover:text-cyan-200">Total Patients</p>
              </div>
            </div>
          </div>
        </div>

        {/* Latest Bookings + Right-side image */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Latest Bookings (left, spans 2 cols) */}
          <div className="lg:col-span-2 rounded-2xl p-[2px] bg-gradient-to-tr from-blue-900 via-blue-800 to-blue-700 shadow-2xl">
            <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 rounded-2xl overflow-hidden ring-1 ring-blue-900/60">
              <div className="flex items-center justify-between px-4 py-4 border-b border-blue-800/60 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700">
                <div className="flex items-center gap-2">
                  <FiList className="text-cyan-400" size={20} />
                  <p className="font-semibold text-cyan-200">Latest Bookings</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-cyan-900/60 text-cyan-200 ring-1 ring-cyan-400/40 font-bold">{dashData.latestAppointments?.length || 0}</span>
              </div>

              <div className="pt-2 pb-1 px-0 max-h-[32rem] overflow-auto">
                {Array.isArray(dashData.latestAppointments) && dashData.latestAppointments.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center px-6 py-3 gap-3 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 hover:from-blue-900 hover:via-blue-800 hover:to-cyan-900 hover:scale-[1.01] hover:shadow-xl transition-all duration-200 rounded-xl">
                    <img className="rounded-full w-10 h-10 object-cover ring-2 ring-cyan-400/40 shadow-md" src={item?.userData?.image || ''} alt='' />
                    <div className="flex-1 text-sm">
                      <p className="text-cyan-100 font-medium">{item?.userData?.name || '—'}</p>
                      <p className="text-cyan-300">{slotDateFormat(item?.slotDate)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.cancelled ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-900/60 text-red-300 ring-1 ring-red-400/40">Cancelled</span>
                      ) : item.isCompleted ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-900/60 text-green-300 ring-1 ring-green-400/40">Completed</span>
                      ) : (
                        <div className="flex items-center gap-2">
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
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right-side profile image */}
          <div className="hidden lg:block">
            <div className="rounded-2xl p-[2px] bg-gradient-to-tr from-blue-900 via-blue-800 to-blue-700 shadow-2xl h-full">
              <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 rounded-2xl overflow-hidden ring-1 ring-blue-900/60 h-full">
                <img src={profileData?.image || ''} alt='Doctor profile' className='w-full h-full object-cover object-top' />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  )
}

export default DoctorDashboard;