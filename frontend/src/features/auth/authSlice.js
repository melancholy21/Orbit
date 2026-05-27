import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from './authService';

// Get user from localStorage
const user = JSON.parse(localStorage.getItem('user'));

const initialState = {
  user: user ? user : null,
  pendingEmail: null, // Tracks the email waiting for OTP verification
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: '',
};

// Register user (Step 1 — sends OTP, does NOT create a real user)
export const register = createAsyncThunk(
  'auth/register',
  async (user, thunkAPI) => {
    try {
      return await authService.register(user);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Verify email (Step 2 — validates OTP → creates user → returns JWT)
export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (verificationData, thunkAPI) => {
    try {
      return await authService.verifyEmail(verificationData);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Resend verification code
export const resendCode = createAsyncThunk(
  'auth/resendCode',
  async (email, thunkAPI) => {
    try {
      return await authService.resendCode(email);
    } catch (error) {
      const message =
        (error.response &&
          error.response.data &&
          error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Login user
export const login = createAsyncThunk('auth/login', async (user, thunkAPI) => {
  try {
    return await authService.login(user);
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

// Get current user profile
export const getMe = createAsyncThunk('auth/getMe', async (_, thunkAPI) => {
  try {
    const token = thunkAPI.getState().auth.user?.token;
    if (!token) return thunkAPI.rejectWithValue('No token found');
    return await authService.getMe(token);
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    return thunkAPI.rejectWithValue(message);
  }
});

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = '';
    },
    setPendingEmail: (state, action) => {
      state.pendingEmail = action.payload;
    },
    updateFollowing: (state, action) => {
      if (state.user) {
        state.user.following = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    updateProfilePic: (state, action) => {
      if (state.user) {
        state.user.profilePicture = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    updateStatus: (state, action) => {
      if (state.user) {
        state.user.status = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    updateSpotifyToken: (state, action) => {
      if (state.user) {
        state.user.spotifyAccessToken = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // ── Register (Step 1) ──────────────────────────────
      .addCase(register.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        // Do NOT set state.user — the user isn't verified yet
        state.pendingEmail = action.payload.email;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.user = null;
      })
      // ── Verify Email (Step 2) ──────────────────────────
      .addCase(verifyEmail.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload; // Now the user is fully registered
        state.pendingEmail = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // ── Resend Code ────────────────────────────────────
      .addCase(resendCode.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(resendCode.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
      })
      .addCase(resendCode.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      // ── Login ──────────────────────────────────────────
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.user = null;
      })
      // ── Logout ─────────────────────────────────────────
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      })
      // ── Get Me ─────────────────────────────────────────
      .addCase(getMe.fulfilled, (state, action) => {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      })
      .addCase(getMe.rejected, (state, action) => {
        console.error('Failed to sync user profile:', action.payload);
      });
  },
});

export const { reset, setPendingEmail, updateFollowing, updateProfilePic, updateStatus, updateUser, updateSpotifyToken } = authSlice.actions;
export default authSlice.reducer;
