import Login from "./pages/login.jsx";
import React from 'react';
import { useContext } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AdminContext } from './contexts/adminContext.jsx';

const App = () => {

  const {aToken} = useContext(AdminContext);
  return aToken ? (
    <div>
        
        <ToastContainer />
    </div>
  ) : (
    <div>
        <Login />
        <ToastContainer />
    </div>
  );
};

export default App;