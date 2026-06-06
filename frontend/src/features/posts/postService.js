import axios from 'axios';

const API_URL = '/api/posts/';

// Get all posts
const getPosts = async (token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };
  const response = await axios.get(API_URL, config);
  return response.data;
};

// Create new post
const createPost = async (postData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(API_URL, postData, config);
  return response.data;
};

// Toggle like
const toggleLike = async (postId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.put(API_URL + postId + '/like', {}, config);
  return { id: postId, likes: response.data };
};

// Add comment
const addComment = async (postId, commentData, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const response = await axios.post(API_URL + postId + '/comments', commentData, config);
  return { id: postId, comment: response.data };
};

// Delete post
const deletePost = async (postId, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };
  const response = await axios.delete(API_URL + postId, config);
  return response.data;
};

// Edit post
const editPost = async (postId, postData, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };
  const response = await axios.put(API_URL + postId, postData, config);
  return response.data;
};

// Add reply to comment
const addReply = async (commentId, replyData, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };
  const response = await axios.post(API_URL + 'comments/' + commentId + '/reply', replyData, config);
  return response.data;
};

// Share post
const sharePost = async (postId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const response = await axios.post(API_URL + postId + '/share', {}, config);
  return { id: postId, shares: response.data };
};

// Edit comment
const editComment = async (commentId, commentData, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };
  const response = await axios.put(API_URL + 'comments/' + commentId, commentData, config);
  return response.data;
};

// Delete comment
const deleteComment = async (commentId, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };
  const response = await axios.delete(API_URL + 'comments/' + commentId, config);
  return response.data;
};

// Edit reply
const editReply = async (commentId, replyId, replyData, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };
  const response = await axios.put(`${API_URL}comments/${commentId}/replies/${replyId}`, replyData, config);
  return response.data;
};

// Delete reply
const deleteReply = async (commentId, replyId, token) => {
  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };
  const response = await axios.delete(`${API_URL}comments/${commentId}/replies/${replyId}`, config);
  return response.data;
};

const postService = {
  getPosts,
  createPost,
  toggleLike,
  addComment,
  deletePost,
  editPost,
  addReply,
  sharePost,
  editComment,
  deleteComment,
  editReply,
  deleteReply
};

export default postService;
