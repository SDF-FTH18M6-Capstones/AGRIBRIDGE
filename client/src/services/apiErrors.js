
export const handleApiError = (error) => {
  if (error.response) {
    const status = error.response.status;
    const responseData = error.response.data;

    const responseError = responseData?.error;

    const details = responseError?.fields || responseError?.details;
    const validation = details && typeof details === "object" ? Object.values(details).flat().filter(value => typeof value === "string").join(" ") : "";
    const message =
      validation ||
      responseError?.message ||
      responseData?.message ||
      (typeof responseError === "string" ? responseError : null) ||
      (status === 401
        ? "Unauthorized. Please log in again."
        : status === 403
          ? "You do not have permission to perform this action."
          : "Something went wrong. Please try again.");

    return {
      message,
      status,
      data: responseData,
    };
  }

  if (error.request) {
    return {
      message: "Unable to connect to the server. Please try again.",
      status: null,
      data: null,
    };
  }

  return {
    message: error.message || "An unexpected error occurred.",
    status: null,
    data: null,
  };
};
