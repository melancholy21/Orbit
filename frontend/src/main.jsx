import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { store } from './app/store'
import { Provider } from 'react-redux'
import { ThemeProvider } from './components/ThemeProvider'
import './index.css'
import axios from 'axios'

axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const requestUrl = error.config?.url || '';
      // Only force logout/redirect if the 401 error is not from the Spotify API
      if (!requestUrl.includes('api.spotify.com')) {
        localStorage.removeItem('user');
        window.location.href = '/login';
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
