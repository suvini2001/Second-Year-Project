import { createContext } from "react";

export const AppContext = createContext({});

export const AppContextProvider = (props) => {
  const value = {
    // Define your global state and functions here
  };
  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;