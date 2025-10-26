import { useContext, useEffect } from "react"
import { AdminContext } from "../../contexts/adminContext"


const DoctorsList = () => {
  const { doctors, aToken, getAllDoctors, changeAvailability } = useContext(AdminContext)

  useEffect(() => {
    if (aToken) {
      getAllDoctors()
    }
  }, [aToken])


  return (
  <div className="m-5 max-h-[90vh] overflow-y-scroll bg-blue-50 rounded-xl shadow-2xl p-8">
      <div className="relative mb-8">
        <h1 className="absolute inset-0 text-[6rem] font-extrabold text-blue-200 opacity-20 text-center pointer-events-none select-none -z-10">All Doctors</h1>
        <h2 className="text-3xl font-bold text-blue-700 text-center tracking-wide drop-shadow-lg relative z-10">All Doctors</h2>
      </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {
          doctors.map((item, index) => {
            return (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-xl hover:from-blue-700 hover:to-blue-800 hover:scale-105 transition-all duration-300 p-6 flex flex-col items-center border-2 border-blue-900"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-full border-4 border-blue-900 mb-4 shadow-lg"
                />
                <div className="text-center w-full">
                  <p className="text-lg font-bold text-blue-100 drop-shadow">{item.name}</p>
                  <p className="text-sm text-blue-300 mb-2">{item.specialization}</p>
                  <div className="flex items-center gap-2 mt-2 justify-center">
                    <input onChange={()=>changeAvailability(item._id)}
                      type="checkbox"
                      checked={item.availability}
                      readOnly
                      className="form-checkbox h-4 w-4 text-green-400 border-blue-300 focus:ring-0 cursor-default bg-blue-900"
                    />
                    <span className="text-xs font-semibold text-blue-100">availability</span>
                  </div>
                </div>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

export default DoctorsList



