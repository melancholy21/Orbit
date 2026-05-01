import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import postService from './postService';

const initialState = {
  posts: [],
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

// Get posts
export const getPosts = createAsyncThunk('posts/getAll', async (_, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.user.token;
    return await postService.getPosts(token);
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// Create post
export const createPost = createAsyncThunk('posts/create', async (postData, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.user.token;
    return await postService.createPost(postData, token);
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// Toggle like
export const toggleLike = createAsyncThunk('posts/like', async (postId, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.user.token;
    return await postService.toggleLike(postId, token);
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

// Add comment
export const addComment = createAsyncThunk('posts/comment', async (commentData, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.user.token;
    return await postService.addComment(commentData.postId, { content: commentData.content }, token);
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const deletePost = createAsyncThunk('posts/delete', async (postId, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.user.token;
    return await postService.deletePost(postId, token);
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const addReply = createAsyncThunk('posts/addReply', async (replyData, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.user.token;
    return await postService.addReply(replyData.commentId, { content: replyData.content }, token);
  } catch (error) {
    const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const postSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    reset: (state) => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(getPosts.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getPosts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.posts = action.payload;
      })
      .addCase(getPosts.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(createPost.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.posts.unshift(action.payload);
      })
      .addCase(createPost.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        const post = state.posts.find((p) => p._id === action.payload.id);
        if (post) {
          post.likes = action.payload.likes;
        }
      })
      .addCase(addComment.fulfilled, (state, action) => {
        const post = state.posts.find((p) => p._id === action.payload.id);
        if (post) {
          post.comments.push(action.payload.comment);
        }
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter((post) => post._id !== action.payload.id);
      })
      .addCase(addReply.fulfilled, (state, action) => {
        const updatedComment = action.payload;
        // Find the post that owns this comment
        state.posts = state.posts.map(post => {
          if (post._id === updatedComment.post) {
            return {
              ...post,
              comments: post.comments.map(c => c._id === updatedComment._id ? updatedComment : c)
            };
          }
          return post;
        });
      });
  },
});

export const { reset } = postSlice.actions;
export default postSlice.reducer;
