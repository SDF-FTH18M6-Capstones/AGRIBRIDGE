
import axios from "axios";
import api from "./api";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "../features/auth/utils/authToken";

export const testApiClient = async () => {
  const previousToken = getAccessToken();
  const testToken = "agribridge-test-jwt-token";

  let unauthorizedEventReceived = false;

  const handleUnauthorized = () => {
    unauthorizedEventReceived = true;
  };

  window.addEventListener(
    "agribridge:unauthorized",
    handleUnauthorized
  );

  try {
    // Test automatic Bearer token attachment.
    setAccessToken(testToken);

    const response = await api.get("/test", {
      adapter: async (config) => ({
        data: { message: "Test request successful" },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      }),
    });

    const authorizationHeader =
      response.config.headers.Authorization;

    console.log("Authorization header:", authorizationHeader);

    if (authorizationHeader !== `Bearer ${testToken}`) {
      throw new Error("JWT Bearer token was not attached.");
    }

    console.log("PASS: JWT attached automatically.");

    // Test unauthorized response handling.
    try {
      await api.get("/protected-test", {
        adapter: async (config) => {
          const error = new axios.AxiosError(
            "Unauthorized",
            "ERR_BAD_REQUEST",
            config,
            null,
            {
              data: { message: "Unauthorized" },
              status: 401,
              statusText: "Unauthorized",
              headers: {},
              config,
            }
          );

          return Promise.reject(error);
        },
      });
    } catch (error) {
      console.log("401 error handled:", error.message);
    }

    if (!unauthorizedEventReceived) {
      throw new Error("Unauthorized event was not dispatched.");
    }

    if (getAccessToken() !== null) {
      throw new Error("Access token was not cleared after 401.");
    }

    console.log("PASS: 401 response clears the token.");
    console.log("PASS: Unauthorized event dispatched.");

    return "All API client tests passed.";
  } finally {
    window.removeEventListener(
      "agribridge:unauthorized",
      handleUnauthorized
    );

    // Restore the previous token, if one existed.
    if (previousToken) {
      setAccessToken(previousToken);
    } else {
      clearAccessToken();
    }
  }
};
