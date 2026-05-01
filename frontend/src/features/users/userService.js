import axios from 'axios';

const API_URL = '/api/users/';
const POSTS_API_URL = '/api/posts/';

// Get user profile by ID
const getUserProfile = async (userId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(API_URL + userId, config);
  return response.data;
};

// Get posts by user ID
const getUserPosts = async (userId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(POSTS_API_URL + 'user/' + userId, config);
  return response.data;
};

// Update profile picture
const updateProfilePicture = async (profilePicture, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.put(API_URL + 'me/profile-picture', { profilePicture }, config);
  return response.data;
};

// Get friends with status
const getFriendsWithStatus = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(API_URL + 'friends/status', config);
  return response.data;
};

// Update status
const updateStatus = async (statusData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.put(API_URL + 'status', statusData, config);
  return response.data;
};

// Nudge user
const nudgeUser = async (userId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(API_URL + userId + '/nudge', {}, config);
  return response.data;
};

// Get notifications
const getNotifications = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.get(API_URL + 'me/notifications', config);
  return response.data;
};

const userService = {
  getUserProfile,
  getUserPosts,
  updateProfilePicture,
  getFriendsWithStatus,
  updateStatus,
  nudgeUser,
  getNotifications,
};

export default userService;

