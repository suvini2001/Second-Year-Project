import React, { useState, useContext } from 'react';
import { assets } from '../../assets/assets';
import { AdminContext } from '../../contexts/adminContext';
import { toast } from 'react-toastify';
import axios from 'axios';

const AddDoctor = () => {
    const [docImg, setDocImg] = useState(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [specialization, setSpecialization] = useState('General Physician');
    const [experience, setExperience] = useState('1 Year');
    const [fees, setFees] = useState('');
    const [about, setAbout] = useState('');
    const [degree, setDegree] = useState('');
    const [address1, setAddress1] = useState('');
    const [address2, setAddress2] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [date, setDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const context = useContext(AdminContext);
    const backendUrl = (context && typeof context.backendUrl === 'string' && context.backendUrl.startsWith('http')) ? context.backendUrl : 'http://localhost:5000';
    const aToken = context ? context.aToken : '';

    const resetForm = () => {
        setDocImg(null);
        setName('');
        setEmail('');
        setExperience('1 Year');
        setFees('');
        setAbout('');
        setSpecialization('General Physician');
        setAddress1('');
        setAddress2('');
        setPassword('');
        setDegree('');
        setPhone('');
        setDate('');
        
        // Reset file input
        const fileInput = document.getElementById('doc-img');
        if (fileInput) fileInput.value = '';
    };

    const onSubmitHandler = async (event) => {
        event.preventDefault();
        
        if (isSubmitting) return;
        
        // Enhanced validation
        if (!name || !email || !specialization || !experience || fees === '' || !about || !degree || !address1 || !address2 || !password || !docImg || !phone || !date) {
            toast.error('All fields are required');
            return;
        }

        // Validate fees is a positive number
        if (Number(fees) <= 0) {
            toast.error('Fees must be a positive number');
            return;
        }

        console.log('backendUrl:', backendUrl);
        if (!backendUrl || typeof backendUrl !== 'string' || !backendUrl.startsWith('http')) {
            toast.error('Backend URL is not defined or invalid');
            return;
        }

        if (!aToken) {
            toast.error('Authentication token is missing');
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('image', docImg);
            formData.append('name', name);
            formData.append('specialization', specialization);
            formData.append('experience', experience);
            formData.append('email', email);
            formData.append('phone', phone);
            formData.append('address', JSON.stringify({ line1: address1, line2: address2 }));
            formData.append('password', password);
            formData.append('degree', degree);
            formData.append('about', about);
            formData.append('fees', Number(fees));
            formData.append('date', date);

            // Debug: Log form data
            console.log('FormData contents:');
            for (let [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }

            const { data } = await axios.post(
                `${backendUrl}/api/admin/add-doctor`,
                formData, 
                {
                    headers: {
                        'aToken': aToken,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            console.log('API Response:', data);

            if (data.success) {
                toast.success(data.message || 'Doctor added successfully!');
                resetForm();
            } else {
                toast.error(data.message || 'Failed to add doctor');
            }

        } catch (error) {
            console.error('Error adding doctor:', error);
            
            // Enhanced error handling
            if (error.response) {
                // Server responded with error status
                const errorMessage = error.response.data?.message || error.response.data?.error || 'Server error occurred';
                toast.error(errorMessage);
                console.error('Server error details:', error.response.data);
            } else if (error.request) {
                // Request was made but no response received
                toast.error('No response from server. Please check your connection.');
            } else {
                // Something else happened
                toast.error(error.message || 'An unexpected error occurred');
            }
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={onSubmitHandler} className="m-5 w-full">
            <p className="mb-3 text-4xl font-extrabold text-blue-900 text-center drop-shadow-lg">Add Doctor</p>
            <div className="bg-blue-50 px-10 py-10 border-2 border-blue-300 rounded-2xl w-full max-h-[80vh] overflow-y-scroll shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                    <div className="flex flex-col items-center">
                        <label htmlFor="doc-img" className="cursor-pointer">
                            <div className="w-16 h-16 bg-blue-200 border-2 border-blue-300 rounded-lg flex items-center justify-center shadow-lg hover:border-blue-400 transition-all duration-200">
                                <img 
                                    src={docImg ? URL.createObjectURL(docImg) : assets.upload_area} 
                                    alt="" 
                                    className="w-8 h-8 object-contain opacity-70" 
                                />
                            </div>
                        </label>
                        <input 
                            onChange={(e) => setDocImg(e.target.files[0])} 
                            type="file" 
                            id='doc-img' 
                            hidden 
                            accept="image/*"
                        />
                        <p className="mt-2 text-blue-600 text-xs font-semibold text-center">Upload Doctor's Image</p>
                    </div>
                </div>

                {/* Rest of your form JSX remains the same */}
                <div className="flex flex-col lg:flex-row items-start gap-10 text-blue-700">
                    <div className="w-full lg:flex-1 flex flex-col gap-4">
                        <div className="flex-1 flex-col gap-1">
                            <p className="text-blue-600 font-semibold mb-1">Doctor's Name</p>
                            <input onChange={(e) => setName(e.target.value)} value={name} className="border-2 border-blue-300 rounded-lg px-3 py-2 bg-blue-100 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all duration-200" type="text" placeholder='Name' required />
                        </div>

                        <div className="flex-1 flex-col gap-1">
                            <p className="text-blue-600 font-semibold mb-1">Doctor's Email</p>
                            <input onChange={(e) => setEmail(e.target.value)} value={email} className="border-2 border-blue-300 rounded-lg px-3 py-2 bg-blue-100 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all duration-200" type="email" placeholder='Email' required />
                        </div>

                        <div className="flex-1 flex-col gap-1">
                            <p className="text-blue-600 font-semibold mb-1">Doctor's Password</p>
                            <input onChange={(e) => setPassword(e.target.value)} value={password} className="border-2 border-blue-300 rounded-lg px-3 py-2 bg-blue-100 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all duration-200" type="password" placeholder='Password' required />
                        </div>

                        <div className="flex-1 flex-col gap-1">
                            <p className="text-blue-600 font-semibold mb-1">Doctor's Experience</p>
                            <select onChange={(e) => setExperience(e.target.value)} value={experience} className="border-2 border-blue-300 rounded-lg px-3 py-2 bg-blue-100 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all duration-200" name="" id="">
                                <option value="1 Year"> 1 Year </option>
                                <option value="2 Year"> 2 Year </option>
                                <option value="3 Year"> 3 Year </option>
                                <option value="4 Year"> 4 Year </option>
                                <option value="5 Year"> 5 Year </option>
                                <option value="6 Year"> 6 Year </option>
                                <option value="7 Year"> 7 Year </option>
                                <option value="8 Year"> 8 Year </option>
                                <option value="9 Year"> 9 Year </option>
                                <option value="10+ Year"> 10+ Year </option>
                            </select>
                        </div>

                        <div className="flex-1 flex-col gap-1">
                            <p className="text-blue-600 font-semibold mb-1">Fees</p>
                            <input onChange={(e) => setFees(e.target.value)} value={fees} className="border-2 border-blue-300 rounded-lg px-3 py-2 bg-blue-100 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all duration-200" type="number" placeholder='fees' required min="0" />
                        </div>
                    </div>

                    <div className="w-full lg:flex-1 flex flex-col gap-4">
                        <div className="flex-1 flex-col gap-1">
                            <p className="text-blue-600 font-semibold mb-1">Specialization</p>
                            <select onChange={(e) => setSpecialization(e.target.value)} value={specialization} className="border-2 border-blue-300 rounded-lg px-3 py-2 bg-blue-100 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all duration-200" name="" id="">
                                <option value="General Physician">General Physician</option>
                                <option value="Gynecologist">Gynecologist</option>
                                <option value="Dermotologist">Dermotologist</option>
                                <option value="Pediatrician">Pediatrician</option>
                                <option value="Neurologist">Neurologist</option>
                                <option value="Gastroenterologist">Gastroenterologist</option>
                            </select>
                        </div>

                        <div className="flex-1 flex-col gap-1">
                            <p className="text-blue-600 font-semibold mb-1">Education</p>
                            <input onChange={(e) => setDegree(e.target.value)} value={degree} className="border-2 border-blue-300 rounded-lg px-3 py-2 bg-blue-100 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all duration-200" type="text" placeholder='Education' required />
                        </div>

                        <div className="flex-1 flex-col gap-1">
                            <p className="text-blue-600 font-semibold mb-1">Address</p>
                            <input onChange={(e) => setAddress1(e.target.value)} value={address1} className="border-2 border-blue-300 rounded-lg px-3 py-2 bg-blue-100 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all duration-200 mb-2" type="text" placeholder='Address 1' required />
                        </div>

                        <div className="flex-1 flex-col gap-1">
                            <input onChange={(e) => setAddress2(e.target.value)} value={address2} className="border-2 border-blue-300 rounded-lg px-3 py-2 bg-blue-100 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all duration-200" type="text" placeholder='Address 2' required />
                        </div>

                        <div>
                            <p className="mt-4 mb-2 text-blue-600 font-semibold">About Doctor</p>
                            <textarea onChange={(e) => setAbout(e.target.value)} value={about} className="w-full px-4 pt-2 border-2 border-blue-300 rounded-lg bg-blue-100 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all duration-200 resize-none" rows={5} required placeholder='Write about doctor'/>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-4 mt-6">
                    <div className="flex-1 flex-col gap-1">
                        <p className="text-blue-600 font-semibold mb-1">Phone</p>
                        <input onChange={(e) => setPhone(e.target.value)} value={phone} className="border-2 border-blue-300 rounded-lg px-3 py-2 bg-blue-100 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all duration-200" type="text" placeholder='Phone' required />
                    </div>
                    <div className="flex-1 flex-col gap-1">
                        <p className="text-blue-600 font-semibold mb-1">Date</p>
                        <input onChange={(e) => setDate(e.target.value)} value={date} className="border-2 border-blue-300 rounded-lg px-3 py-2 bg-blue-100 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-blue-400 transition-all duration-200" type="date" placeholder='Date' required />
                    </div>
                </div>

                <div className="flex justify-center mt-6">
                    <button 
                        type='submit' 
                        disabled={isSubmitting}
                        className={`w-48 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 text-white font-bold py-3 rounded-lg shadow-lg border-2 border-blue-500 transition-all duration-300 hover:from-blue-500 hover:to-blue-700 hover:scale-105 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isSubmitting ? 'Adding...' : 'Add Doctor'}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default AddDoctor;