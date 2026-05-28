# Local Developer Setup Guide

This guide explains how to configure, install, and run Orbit on your local machine for development.

---

## 1. Prerequisites
Ensure you have the following installed and configured:
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **MongoDB** (either a local installation or a free cluster on MongoDB Atlas)
- **Spotify Developer Account** (required for the real-time syncing features and Spotify integrations)
- **Cloudinary Account** (free tier required for handling profile picture and post image uploads)

---

## 2. Directory Structure
The project is divided into two primary subdirectories:
- `/backend`: Express API server and Socket.io socket server.
- `/frontend`: React client bundle created using Vite.

---

## 3. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `/backend` folder and populate it with the following configuration keys:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_signing_key
   NODE_ENV=development

   # Cloudinary Keys (For image uploads)
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret

   # Spotify Keys
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:5000/api/spotify/callback

   # Frontend URL (For CORS rules)
   FRONTEND_URL=http://localhost:5173

   # SMTP Email Settings (Gmail)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your_gmail_username@gmail.com
   SMTP_PASS=your_google_app_password
   SMTP_FROM=your_gmail_username@gmail.com
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server will start on port `5000` by default.*

---

## 4. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `/frontend` folder:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
4. Start the Vite client dev server:
   ```bash
   npm run dev
   ```
   *The client will start on port `5173` (e.g., `http://localhost:5173`).*

---

## 5. Spotify Developer Setup

To test Spotify synchronization features locally:
1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Create a new App.
3. In the settings, add your Redirect URI:
   - For local development: `http://localhost:5000/api/spotify/callback`
4. Copy the Client ID and Client Secret into your backend `.env` file.
5. In the User Management settings of your Spotify app, add the email addresses of any Spotify accounts you plan to use for testing.
