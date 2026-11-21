const TOKEN_KEY = "agribridge_auth_token";

export const setAccessToken = (token) => {
  sessionStorage.setItem(TOKEN_KEY, token);
};

export const getAccessToken = () => {
  return sessionStorage.getItem(TOKEN_KEY);
};

export const clearAccessToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
};