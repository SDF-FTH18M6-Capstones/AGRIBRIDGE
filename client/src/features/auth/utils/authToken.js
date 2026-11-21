
const TOKEN_KEY = "agribridge_auth_token";
const LEGACY_TOKEN_KEY = "agribridge_access_token";

export const setAccessToken = (token) => {
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
};

export const getAccessToken = () => {
  return sessionStorage.getItem(TOKEN_KEY);
};

export const clearAccessToken = () => {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
};
