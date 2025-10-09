import React, { createContext, useState } from "react";
export const GlobalContextData = createContext<any>(null);
export default function GlobalContext({ children }: any) {
  const [UserData,setUserData] = useState<object | any>(null)
  const [GOOGLE_API_KEY, setGOOGLE_API_KEY] = useState<string>("");
  const [CompanyLogo,setCompanyLogo] = useState<any>(null);
  const [Permission,setPermission] = useState<any []>([]);
  const [SelectLanguage,setSelectLanguage] = useState<string>('')
  return (
    <GlobalContextData.Provider
      value={{
        GOOGLE_API_KEY,setGOOGLE_API_KEY,
        CompanyLogo,setCompanyLogo,
        Permission,setPermission,
        SelectLanguage,setSelectLanguage,
        UserData,setUserData
      }}
    >
      {children}
    </GlobalContextData.Provider>
  );
}
