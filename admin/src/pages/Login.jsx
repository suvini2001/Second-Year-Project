import { useContext, useState } from 'react';
import { assets } from '../assets/assets';
import axios from "axios";
import { AdminContext } from '../contexts/adminContext';
import { toast } from 'react-toastify';

const Login = () => {
    const [state, setState] = useState('Admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { setAtoken, backendUrl } = useContext(AdminContext);
    const onSubmitHandler = async (event) => {
        event.preventDefault();

        try {
            if (state === 'Admin') {
                const { data } = await axios.post(backendUrl + "/api/admin/login", { email, password });
                if (data.success) {
                    localStorage.setItem('aToken', data.token);
                    setAtoken(data.token);
                } else {
                    toast.error(data.message);
                }
            }
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                toast.error(err.response.data.message);
            } else {
                toast.error("Login failed. Please try again.");
            }
        }
    }


    return (
        <div className="min-h-screen flex items-center justify-center bg-transparent">
            <form onSubmit={onSubmitHandler} className={`backdrop-blur-xl shadow-2xl rounded-2xl p-10 min-w-[340px] sm:min-w-96 flex flex-col gap-6 border border-blue-800/60
                ${state === 'Admin' ? 'bg-blue-950/90' : 'bg-blue-950/90'}
            `}> 
                <p className="text-3xl font-extrabold text-white mb-2 text-center tracking-wide drop-shadow-lg">
                    <span className={state === 'Admin' ? 'text-blue-400' : 'text-blue-400'}>{state}</span> Login
                </p>
                <div className="flex flex-col gap-1">
                    <label className="text-white font-medium">Email</label>
                    <input onChange={(e)=>setEmail(e.target.value)} value={email}
                        type="email" 
                        required 
                        className={`px-4 py-2 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-200 border shadow-inner
                            bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 border-blue-800 hover:border-cyan-400`}
                        placeholder="Enter your email" 
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-white font-medium">Password</label>
                    <input onChange={(e)=>setPassword(e.target.value)} value={password}
                        type="password" 
                        required 
                        className={`px-4 py-2 rounded-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-200 border shadow-inner
                            bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 border-blue-800 hover:border-cyan-400`}
                        placeholder="Enter your password" 
                    />
                </div>
                <button 
                    type="submit"
                    className={`mt-4 w-full py-2 rounded-lg text-white font-bold text-lg shadow-lg hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2
                        bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-700 hover:from-blue-600 hover:via-cyan-500 hover:to-blue-800`}
                >
                    Login
                </button>
                <div className="flex justify-between mt-2 text-sm">
                    <a href="#" className="text-white hover:underline transition hover:text-cyan-200">Forgot password?</a>
                    <a href="#" className="text-white hover:underline transition hover:text-cyan-200">Sign up</a>
                </div>
                {
                    state === 'Admin' ? (
                        <p className="text-center text-white mt-4">Doctor Login? <span className="text-cyan-400 cursor-pointer hover:underline" onClick={()=>setState('Doctor')}>Click Here</span></p>
                    ) : (
                        <p className="text-center text-white mt-4">Admin Login? <span className="text-blue-400 cursor-pointer hover:underline" onClick={()=>setState('Admin')}>Click Here</span></p>
                    )
                }
            </form>
        </div>
    );
};

export default Login;




