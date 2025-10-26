import React, { useContext, useEffect } from 'react'
import { AdminContext } from '../../contexts/adminContext'
import { AppContext } from '../../contexts/appContext'
import { assets } from '../../assets/assets'

const Dashboard = () => {
  const { aToken, getDashData, cancelAppointment, dashData } = useContext(AdminContext)
  const { slotDateFormat } = useContext(AppContext)

  useEffect(() => {
    if (aToken) getDashData()
  }, [aToken, getDashData])

  if (!dashData) return null

  return (
    <div className="m-5">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 p-4 min-w-52 rounded-2xl border-2 border-blue-900 cursor-pointer hover:scale-105 hover:shadow-2xl transition-all shadow-lg">
          <img className="w-14 drop-shadow-lg" src={assets.doctor_icon} alt="" />
          <div>
            <p className="text-3xl font-semibold bg-gradient-to-r from-blue-200 via-blue-100 to-blue-300 text-transparent bg-clip-text drop-shadow">{dashData.doctors}</p>
            <p className="text-lg font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-300 via-blue-200 to-blue-400 text-transparent bg-clip-text drop-shadow-lg mt-1">Doctors</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 p-4 min-w-52 rounded-2xl border-2 border-blue-900 cursor-pointer hover:scale-105 hover:shadow-2xl transition-all shadow-lg">
          <img className="w-14 drop-shadow-lg" src={assets.appointments_icon} alt="" />
          <div>
            <p className="text-3xl font-semibold bg-gradient-to-r from-blue-200 via-blue-100 to-blue-300 text-transparent bg-clip-text drop-shadow">{dashData.appointments}</p>
            <p className="text-lg font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-300 via-blue-200 to-blue-400 text-transparent bg-clip-text drop-shadow-lg mt-1">Appointments</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 p-4 min-w-52 rounded-2xl border-2 border-blue-900 cursor-pointer hover:scale-105 hover:shadow-2xl transition-all shadow-lg">
          <img className="w-14 drop-shadow-lg" src={assets.patients_icon} alt="" />
          <div>
            <p className="text-3xl font-semibold bg-gradient-to-r from-blue-200 via-blue-100 to-blue-300 text-transparent bg-clip-text drop-shadow">{dashData.patients}</p>
            <p className="text-lg font-bold uppercase tracking-widest bg-gradient-to-r from-cyan-300 via-blue-200 to-blue-400 text-transparent bg-clip-text drop-shadow-lg mt-1">Patients</p>
          </div>
        </div>
      </div>

      <div className="bg-white mt-8 rounded-2xl border-2 border-blue-900 shadow-xl">
        <div className="flex items-center gap-2 px-4 py-4 mt-4 rounded-t-2xl border-b-2 border-blue-800 bg-gradient-to-r from-blue-100 via-blue-50 to-blue-200">
          <img src={assets.list_icon} alt="" className="drop-shadow" />
          <p className="font-semibold text-blue-900 text-lg tracking-wide">Latest Bookings</p>
        </div>

        <div className="pt-4 border-t-0 px-4">
          {Array.isArray(dashData.latestAppointments) && dashData.latestAppointments.map((item, index) => (
            <div key={index} className="flex items-center px-6 py-3 gap-3 rounded-xl mb-2 bg-white hover:bg-blue-50 hover:shadow-2xl transition-all text-blue-900 border border-blue-200">
              <img className="rounded-full w-10 h-10 object-cover border-2 border-blue-700 shadow" src={item?.docData?.image || ''} alt="" />
              <div className="flex-1 text-sm">
                <p className="text-blue-900 font-semibold drop-shadow">{item?.docData?.name || '—'}</p>
                <p className="text-blue-500 font-medium drop-shadow">{slotDateFormat(item?.slotDate)}</p>
              </div>

              <div>
                {item.cancelled
                  ? <p className='text-red-400 text-xs font-semibold drop-shadow'>Cancelled</p>
                  : item.isCompleted
                    ? <p className='text-green-400 text-xs font-semibold drop-shadow'>Completed</p>
                    : <img onClick={() => cancelAppointment(item._id)} className='w-10 cursor-pointer p-1 rounded-full bg-gradient-to-tr from-blue-100 via-blue-200 to-cyan-100 hover:from-blue-200 hover:to-cyan-200 hover:shadow-lg border-2 border-blue-200 hover:border-blue-400 transition shadow relative hover:scale-110 hover:brightness-125' src={assets.cancel_icon} alt='cancel' title='Cancel appointment' />
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard