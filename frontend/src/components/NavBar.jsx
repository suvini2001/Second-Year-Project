import { assets } from '../assets/assets_frontend/assets' 
import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useContext } from 'react'
import { AppContext } from '../context/AppContext'

const NavBar = () => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const {token,setToken,userData} = useContext(AppContext);

  const logout=()=>{
    setToken('');
    navigate('/');
  }
  

  return (
    <div className='flex items-center justify-between text-sm py-4 mb-5 border-b border-b-grey-400 relative'>
      {/* Logo */}
      <img 
        onClick={() => navigate('/')} 
        className='w-44 h-auto object-contain cursor-pointer hover:opacity-90 transition-opacity' 
        src={assets.logo} 
        alt="Logo" 
      /> 
      
      {/* Desktop Navigation */}
      <ul className='hidden md:flex items-center gap-6 font-medium'>
        <NavLink to="/" className={({isActive}) => `relative group ${isActive ? 'text-blue-600' : ''}`}>
            <li className='px-6 py-2.5 rounded-lg transition-all duration-300
                         border-2 border-transparent hover:border-blue-600
                         hover:bg-blue-50 hover:shadow-md
                         group-hover:scale-105 transform'> 
              HOME
              <span className='absolute -bottom-1 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300'></span>
            </li>
        </NavLink>

        <NavLink to="/doctors" className={({isActive}) => `relative group ${isActive ? 'text-blue-600' : ''}`}>
            <li className='px-6 py-2.5 rounded-lg transition-all duration-300
                         border-2 border-transparent hover:border-blue-600
                         hover:bg-blue-50 hover:shadow-md
                         group-hover:scale-105 transform'> 
              ALL DOCTORS
              <span className='absolute -bottom-1 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300'></span>
            </li>
        </NavLink>

        <NavLink to="/about" className={({isActive}) => `relative group ${isActive ? 'text-blue-600' : ''}`}>
            <li className='px-6 py-2.5 rounded-lg transition-all duration-300
                         border-2 border-transparent hover:border-blue-600
                         hover:bg-blue-50 hover:shadow-md
                         group-hover:scale-105 transform'> 
              ABOUT
              <span className='absolute -bottom-1 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300'></span>
            </li>
        </NavLink>

        <NavLink to="/contact" className={({isActive}) => `relative group ${isActive ? 'text-blue-600' : ''}`}>
            <li className='px-6 py-2.5 rounded-lg transition-all duration-300
                         border-2 border-transparent hover:border-blue-600
                         hover:bg-blue-50 hover:shadow-md
                         group-hover:scale-105 transform'> 
              CONTACT
              <span className='absolute -bottom-1 left-0 w-full h-0.5 bg-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300'></span>
            </li>
        </NavLink>
        
        {!token && (
          <li className="ml-8">
            <button
              onClick={() => navigate('/login')}
              className='bg-white text-black px-8 py-3 rounded-full font-bold border-2 border-blue-800 shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50
                hover:bg-blue-600 hover:text-white hover:border-transparent hover:shadow-2xl hover:scale-110 hover:animate-pulse
                active:scale-95 active:shadow-lg'
              style={{ transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)' }}
            >
              Create Account
            </button>
          </li>
        )}
      </ul>

      {/* Right Section - Profile & Mobile Menu Button */}
      <div className='flex items-center gap-4'>
        {/* Profile Section */}
        {token && userData && (
          <div className="flex items-center gap-2 cursor-pointer group relative">
            <img className='w-10 h-10 rounded-full' src={userData.image} alt="Profile" />
            <img className='w-3 h-3 text-black font-medium filter brightness-0' src={assets.dropdown_icon} alt="Dropdown" />
            <div className='absolute top-full right-0 pt-2 text-base font-normal text-black-600 z-20 hidden group-hover:block'>
              <div className='bg-white shadow-lg rounded-lg p-4 min-w-[200px]'>
                <p
                  onClick={() => navigate('/My-profile')}
                  className='py-2 px-4 mb-2 rounded-lg border-2 border-transparent bg-gradient-to-r from-blue-200 to-blue-400 text-blue-900 font-semibold shadow-md cursor-pointer transition-all duration-300 hover:border-blue-900 hover:bg-gradient-to-r hover:from-blue-900 hover:to-blue-700 hover:text-white hover:scale-105 hover:shadow-xl'
                >
                  My Profile
                </p>
                <p
                  onClick={() => navigate('/My-appointments')}
                  className='py-2 px-4 mb-2 rounded-lg border-2 border-transparent bg-gradient-to-r from-blue-200 to-blue-400 text-blue-900 font-semibold shadow-md cursor-pointer transition-all duration-300 hover:border-blue-900 hover:bg-gradient-to-r hover:from-blue-900 hover:to-blue-700 hover:text-white hover:scale-105 hover:shadow-xl'
                >
                  My Appointment
                </p>
                <p
                  onClick={logout}
                  className='py-2 px-4 rounded-lg border-2 border-transparent bg-gradient-to-r from-blue-200 to-blue-400 text-blue-900 font-semibold shadow-md cursor-pointer transition-all duration-300 hover:border-blue-900 hover:bg-gradient-to-r hover:from-blue-900 hover:to-blue-700 hover:text-white hover:scale-105 hover:shadow-xl'
                >
                  Logout
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu Button */}
        <img 
          onClick={() => setShowMenu(true)} 
          className='w-6 md:hidden cursor-pointer' 
          src={assets.menu_icon} 
          alt="Menu" 
        />
      </div>

      {/* Mobile Menu - Separate Overlay */}
      <div className={`md:hidden fixed inset-0 z-50 bg-white transition-all duration-300 ${showMenu ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <div className='flex items-center justify-between px-5 py-6 border-b border-gray-200'>
          <img className='w-36' src={assets.logo} alt="Logo" />
          <img 
            className='w-7 cursor-pointer' 
            onClick={() => setShowMenu(false)} 
            src={assets.cross_icon} 
            alt="Close" 
          />
        </div>
        <ul className='flex flex-col items-center gap-6 mt-8 text-lg font-medium px-4'>
          <NavLink 
            onClick={() => setShowMenu(false)} 
            to="/"
            className={({isActive}) => `w-full text-center py-4 rounded-lg transition-all ${isActive ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          > 
            HOME
          </NavLink>
          <NavLink 
            onClick={() => setShowMenu(false)} 
            to="/doctors"
            className={({isActive}) => `w-full text-center py-4 rounded-lg transition-all ${isActive ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            ALL DOCTORS
          </NavLink>
          <NavLink 
            onClick={() => setShowMenu(false)} 
            to="/about"
            className={({isActive}) => `w-full text-center py-4 rounded-lg transition-all ${isActive ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            ABOUT
          </NavLink>
          <NavLink 
            onClick={() => setShowMenu(false)} 
            to="/contact"
            className={({isActive}) => `w-full text-center py-4 rounded-lg transition-all ${isActive ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
          >
            CONTACT
          </NavLink>
        </ul>
      </div>
    </div>
  )
}

export default NavBar