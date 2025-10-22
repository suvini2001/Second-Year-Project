import { createContext } from "react";

export const DoctorContext = createContext({});

export const DoctorContextProvider = ( props ) => {
  const value = {
    // Define your global state and functions here
  };
  return (
    <DoctorContext.Provider value={value}>
      {props.children}
    </DoctorContext.Provider>
  );
};

export default DoctorContextProvider;