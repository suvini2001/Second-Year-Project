import React, { useState } from "react";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { assets } from '../assets/assets_frontend/assets'
import axios from "axios";
import { toast } from "react-toastify";
const MyProfile = () => {
  const { isEditing, setIsEditing } = useContext(AppContext);
  const [image, setImage] = useState(false);

  const updateUserProfileData = async () => {
    try{
      const formData = new FormData();
      formData.append("name", userData.name);
      formData.append("phone", userData.phone);
      formData.append("address", JSON.stringify(userData.address));
      formData.append("gender", userData.gender);
      formData.append("dob", userData.dob);

      image && formData.append("image", image);
      const {data} = await axios.post(backendUrl + '/api/user/update-profile', formData, {headers:{token}});
      if(data.success){
        toast.success(data.message);
        await loadUserProfileData();
        setIsEditing(false);
        setImage(false);
      }
      else{
        toast.error(data.message);
      }

    }
    catch(error){
      console.log(error);
      toast.error(error.message);
    }
   
  };

  const { userData, setUserData, token, backendUrl, loadUserProfileData } =
    useContext(AppContext);
  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        Loading...
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-white py-10 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Profile Header */}
        <div className="bg-blue-600 p-8 text-white">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
            {isEditing ? (
              <label htmlFor="image">
                <div className="inline-block relative cursor-pointer">
                  <img className="w-32 h-32 rounded opacity-75" src={image ? URL.createObjectURL(image) : userData.image} alt="" />
                  <img className="w-10 absolute bottom-12 right-12 m-2" src={assets.upload_icon} alt="" />
                </div>
                <input onChange={(e) => setImage(e.target.files[0])} type="file" id="image" hidden />
              </label>
            ) : (
              <img
                src={userData.image}
                alt="Profile"
                className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
              />
            )}

            <div className="text-center md:text-left">
              {isEditing ? (
                <input
                  type="text"
                  onChange={(e) =>
                    setUserData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  value={userData.name}
                  className="text-3xl font-bold bg-transparent border-b-2 border-white focus:outline-none focus:border-blue-300 text-center md:text-left"
                />
              ) : (
                <h2 className="text-3xl font-bold">{userData.name}</h2>
              )}
              <p className="text-blue-100 mt-2">
                Manage your account information
              </p>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="p-8 space-y-8">
          {/* Contact Information */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 relative">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-300 to-indigo-300 opacity-10 blur-2xl"></div>
            <h3 className="text-xl font-semibold text-blue-800 mb-4 flex items-center relative z-10">
              <svg
                className="w-6 h-6 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
              CONTACT INFORMATION
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Email:</p>
                <p className="text-gray-800">{userData.email}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Phone:</p>
                {isEditing ? (
                  <input
                    type="text"
                    onChange={(e) =>
                      setUserData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    value={userData.phone}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                ) : (
                  <p className="text-gray-800">{userData.phone}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium text-gray-600">Address:</p>
                {isEditing ? (
                  <input
                    type="text"
                    onChange={(e) =>
                      setUserData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    value={userData.address}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                ) : (
                  <p className="text-gray-800">{userData.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-2xl p-6 shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 relative">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-300 to-blue-300 opacity-10 blur-2xl"></div>
            <h3 className="text-xl font-semibold text-indigo-800 mb-4 flex items-center relative z-10">
              <svg
                className="w-6 h-6 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
              BASIC INFORMATION
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Gender:</p>
                {isEditing ? (
                  <select
                    onChange={(e) =>
                      setUserData((prev) => ({
                        ...prev,
                        gender: e.target.value,
                      }))
                    }
                    value={userData.gender}
                    className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                ) : (
                  <p className="text-gray-800">{userData.gender}</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">
                  Date of Birth:
                </p>
                {isEditing ? (
                  <input
                    type="date"
                    onChange={(e) =>
                      setUserData((prev) => ({ ...prev, dob: e.target.value }))
                    }
                    value={userData.dob}
                    className="w-full px-3 py-2 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                ) : (
                  <p className="text-gray-800">{userData.dob}</p>
                )}
              </div>
            </div>
          </div>

          {/* Edit Button */}
          <div className="text-center">
            {isEditing ? (
              <button
                onClick={updateUserProfileData}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-600 hover:to-indigo-700 hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Save Information
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-600 hover:to-indigo-700 hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;
