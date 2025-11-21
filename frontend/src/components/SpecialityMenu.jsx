import { Link } from "react-router-dom"
import { specialityData } from "../assets/assets_frontend/assets"

const SpecialityMenu = () => {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-gray-800 max-w-7xl mx-auto px-4" id="speciality">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Find by Speciality</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Choose from a wide range of medical specialities to find the right doctor for your needs.
            </p>
        </div>
        <div className="flex justify-center gap-4 w-full flex-wrap">
                {specialityData.map((item,index)=>(
                   <Link onClick={() => window.scrollTo(0, 0)} key={index} to={`/doctors/${item.speciality}`}  className="flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 w-40">
                    <img src={item.image} alt="" className="w-16 h-16 object-contain" />
                    <p className="text-center text-sm">{item.speciality}</p>
                   </Link>
                ))}
            </div>
    </div>
  )
}

export default SpecialityMenu