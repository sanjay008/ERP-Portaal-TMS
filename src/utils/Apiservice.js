
import axios from "axios";
import apiConstants from "../api/apiConstants";
import { getData } from "../utils/storeData";
import { getChauffeurCoordsForApi } from "./chauffeurLocationCache";

const ApiService = async (endpoint, options = {}) => {
  try {
    const verify_token = await getData("USERDATA");

    let customData = options.customData;

    const isLiveLocationEndpoint =
      endpoint === apiConstants.update_driver_live_location;
    if (customData && !isLiveLocationEndpoint) {
      const userData = verify_token?.data ?? verify_token;
      const coords = getChauffeurCoordsForApi(userData?.user?.role);
      if (coords) {
        customData = {
          ...coords,
          ...customData,
        };
      }
    }

    let requestData;
    if (options.includeToken || customData) {
      requestData = new FormData();

      // Add token if requested
      if (options.includeToken) {
        requestData.append("token", verify_token.data.user.verify_token);
      }

      Object.keys(customData || {}).forEach((key) => {
        const value = customData[key];

        if (
          key === "is_damage" &&
          Array.isArray(value) &&
          value.length > 0 &&
          typeof value[0] === "object" &&
          value[0] !== null
        ) {
          value.forEach((row, index) => {
            if (row?.item_id != null) {
              requestData.append(
                `is_damage[${index}][item_id]`,
                String(row.item_id),
              );
            }
            if (row?.damage_id != null) {
              requestData.append(
                `is_damage[${index}][damage_id]`,
                String(row.damage_id),
              );
            }
          });
          return;
        }

        requestData.append(key, value);
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
