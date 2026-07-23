
import axios from "axios";
import apiConstants from "../api/apiConstants";
import { getData } from "../utils/storeData";
import { getChauffeurCoordsForApi } from "./chauffeurLocationCache";

const ApiService = async (endpoint, options = {}) => {
  try {
    // Retrieve token if needed
    const verify_token = await getData("USERDATA");
    // console.log(verify_token, 'data------------');

    let customData = options.customData;

    if (endpoint === apiConstants.status_update && customData) {
      const userData = verify_token?.data ?? verify_token;
      const coords = getChauffeurCoordsForApi(userData?.user?.role);
      if (coords) {
        customData = { ...customData, ...coords };
      }
    }

    let requestData;
    if (options.includeToken || customData) {
      requestData = new FormData();

      // Add token if requested
      if (options.includeToken) {
        requestData.append("token", verify_token.data.user.verify_token);
      }

      // Add custom data if any
      Object.keys(customData || {}).forEach((key) => {
        requestData.append(key, customData[key]);
      });
    }

console.log("requestData", requestData, endpoint);

    const response = await axios({
      method: options.method || "POST", // Default to POST
      url: endpoint,
      data: requestData || undefined, // Only attach data if it exists
      headers: {
        "Content-Type": requestData
          ? "multipart/form-data"
          : "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error("ApiService Error:", error, endpoint);
    throw error;
  }
};

export default ApiService;
