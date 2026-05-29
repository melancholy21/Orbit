import axios from 'axios';

const API_URL = '/api/auth/';

// Register user (Step 1 — sends OTP, does NOT log in)
const register = async (userData) => {
  const response = await axios.post(API_URL + 'register', userData);
  // Do NOT save to localStorage — user is not verified yet
  return response.data;
};

// Verify email (Step 2 — validates OTP, creates user, returns JWT)
const verifyEmail = async (verificationData) => {
  const response = await axios.post(API_URL + 'verify-email', verificationData);

  if (response.data) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }

  return response.data;
};

// Resend verification code
const resendCode = async (email) => {
  const response = await axios.post(API_URL + 'resend-code', { email });
  return response.data;
};

// Login user
const login = async (userData) => {
  const response = await axios.post(API_URL + 'login', userData);

  if (response.data) {
    localStorage.setItem('user', JSON.stringify(response.data));
  }

  return response.data;
};

// Logout user
const logout = async () => {
  try {
    await axios.post(API_URL + 'logout');
  } catch (err) {}
  localStorage.removeItem('user');
};

// Get current user profile
const getMe = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  const response = await axios.get(API_URL + 'me?cb=' + Date.now(), config);
  return response.data;
};

const authService = {
  register,
  verifyEmail,
  resendCode,
  login,
  logout,
  getMe,
};

export default authService;
