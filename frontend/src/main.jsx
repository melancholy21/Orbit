import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { store } from './app/store'
import { Provider } from 'react-redux'
import { ThemeProvider } from './components/ThemeProvider'
import './index.css'
import axios from 'axios'

axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';
axios.defaults.withCredentials = true;

// Prevent sending credentials/cookies to third-party APIs like Spotify (causes CORS preflight issues)
axios.interceptors.request.use(
  (config) => {
    if (config.url && config.url.includes('api.spotify.com')) {
      config.withCredentials = false;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      // Only force logout/redirect if the 401 error is not from Spotify or auth endpoints
      if (
        !requestUrl.includes('api.spotify.com') &&
        !requestUrl.includes('/api/auth/login') &&
        !requestUrl.includes('/api/auth/register') &&
        !requestUrl.includes('/api/auth/verify-email') &&
        !requestUrl.includes('/api/auth/resend-code')
      ) {
        const currentUser = JSON.parse(localStorage.getItem('user'));
        const requestToken = error.config?.headers?.Authorization?.split(' ')[1];

        // Only clear session and redirect if the failed request was using the current session's token
        if (!requestToken || (currentUser && currentUser.token === requestToken)) {
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>,
)
