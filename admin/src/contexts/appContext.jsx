import { createContext } from "react";

export const AppContext = createContext({});

export const AppContextProvider = (props) => {

  const currency='$'; // You can modify this to use dynamic currency if needed

 // Calculate age from DOB (YYYY-MM-DD or ISO string)
    const calculateAge = (dob) => {
        if (!dob) return "-"
        const today = new Date()
        const birthDate = new Date(dob)
        // if birthDate is invalid, return placeholder
        if (Number.isNaN(birthDate.getTime())) return "-"
        let age = today.getFullYear() - birthDate.getFullYear()
        const m = today.getMonth() - birthDate.getMonth()
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--
        }
        // ensure age is a safe number
        if (Number.isNaN(age)) return "-"
        return age
    }


     const months = [
    "",
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const slotDateFormat = (slotDate) => {
    if (!slotDate || typeof slotDate !== "string" || !slotDate.includes("_")) {
      return "Invalid Date"; // Handle invalid slotDate
    }

    const dateArray = slotDate.split("_");
    const day = dateArray[0];
    const monthIndex = Number(dateArray[1]);
    const year = dateArray[2];

    if (
      !day ||
      !monthIndex ||
      !year ||
      monthIndex < 1 ||
      monthIndex > 12 ||
      isNaN(monthIndex)
    ) {
      return "Invalid Date"; // Handle invalid date components
    }

    return `${day} ${months[monthIndex]} ${year}`;
  };













  const value = {
    calculateAge,slotDateFormat,currency,
  };
  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;