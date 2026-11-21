export const handleApiError = (error) => {
  if (error.response) {
    const status = error.response.status;

    const responseMessage = error.response.data?.message;
    const responseError = error.response.data?.error;

    let message =
      typeof responseMessage === "string"
        ? responseMessage
        : typeof responseError === "string"
          ? responseError
          : responseError?.message;

    if (status === 401) {
      message = message || "Unauthorized. Please log in again.";
    } else if (status === 403) {
      message =
        message ||
        "You do not have permission to perform this action.";
    } else {
      message =
        message || "Something went wrong. Please try again.";
    }

    return {
      message,
      status,
      data: error.response.data,
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
    message:
      error.message || "An unexpected error occurred.",
    status: null,
    data: null,
  };
};