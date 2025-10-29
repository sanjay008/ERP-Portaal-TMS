import { useTranslation } from "react-i18next";

export const useErrorHandle = () => {
  const { t } = useTranslation();

  const ErrorHandle = (error: any) => {
    try {
      let errorType = t("UnknownError");
      let userMessage = t("Something went wrong. Please try again.");

      const status = error?.response?.status ?? null;
      const errorMessage = error?.message ?? "";

      switch (status) {
        case 400:
          errorType = t("BadRequest");
          userMessage = t("Invalid request. Please try again.");
          break;

        case 401:
          errorType = t("Unauthorized");
          userMessage = t("Your session has expired. Please log in again.");
          break;

        case 403:
          errorType = t("Forbidden");
          userMessage = t("You don’t have permission to perform this action.");
          break;

        case 404:
          errorType = t("NotFound");
          userMessage = t("The requested resource could not be found.");
          break;

        case 412:
          errorType = t("PreconditionFailed");
          userMessage = t("Some required data is missing or invalid.");
          break;

        case 422:
          errorType = t("ValidationError");
          userMessage = t("Some fields are incorrect. Please check and try again.");
          break;

        case 500:
          errorType = t("ServerError");
          userMessage = t("Server is facing issues. Please try later.");
          break;

        case 503:
          errorType = t("ServiceUnavailable");
          userMessage = t("Service is temporarily unavailable. Try again later.");
          break;

        default:
          if (errorMessage.includes("Network")) {
            errorType = t("NetworkError");
            userMessage = t("Please check your internet connection.");
          }
          break;
      }

      return {
        type: errorType,
        message: userMessage,
        originalError: error?.response?.data || null,
      };
    } catch (e) {
      return {
        type: t("UnknownError"),
        message: t("Something went wrong. Please try again."),
        originalError: null,
      };
    }
  };

  return { ErrorHandle };
};
