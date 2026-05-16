
import axios from "axios";
import { getData } from "../utils/storeData";
import apiConstants from "../api/apiConstants";

const ApiService = async (endpoint, options = {}) => {
  try {
    // Retrieve token if needed
    const verify_token = await getData("USERDATA");
    // console.log(verify_token, 'data------------');

    let requestData;
    if (options.includeToken || options.customData) {
      requestData = new FormData();

      // Add token if requested
      if (options.includeToken) {
        requestData.append("token", verify_token.data.user.verify_token);
      }

      // Add custom data if any
      Object.keys(options.customData || {}).forEach((key) => {
        requestData.append(key, options.customData[key]);
      });
    }

    console.log("=========api service =====", requestData, endpoint);

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
