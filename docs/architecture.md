# Orbit System Architecture & Documentation

This document provides a comprehensive description of the Orbit application architecture, detailing both the backend and frontend components.

---

## 1. System Overview
Orbit is a real-time social networking platform featuring post sharing, instant messaging, Spotify integrations, and "Hangs" (cooperative tools for friends like bills, polls, and bucket lists).

- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io, Nodemailer, Cloudinary (for file uploads).
- **Frontend**: Vite, React, Redux Toolkit, Tailwind CSS, Shadcn UI components, Socket.io-client.

---

## 2. Backend Architecture

### Entry Point: [server.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/server.js)
- Establishes HTTP and Socket.io servers.
- Connects to MongoDB via Mongoose.
- Applies standard security headers (`helmet`), response compression (`compression`), CORS, and request parsing middleware.
- Implements strict rate-limiting policies (`express-rate-limit`) on authentication and OTP request endpoints.

### Database Models & Schema
Located in: `backend/models/`
- **[User.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/models/User.js)**: Stores user credentials, profile settings, list of friends, sent/received friend requests, and Spotify authorization tokens.
- **[PendingUser.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/models/PendingUser.js)**: Temporary storage for sign-up users validating their email via OTP.
- **[Post.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/models/Post.js)**: Represents a user post, storing content, image uploads, visibility rules (public vs. friends), likes, and shares.
- **[Comment.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/models/Comment.js)**: Stores text comments and replies linked to posts.
- **[Message.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/models/Message.js)** / **[Conversation.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/models/Conversation.js)**: Coordinates private 1-on-1 chats.
- **[LobbyMessage.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/models/LobbyMessage.js)** / **[Room.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/models/Room.js)**: Manages lobby room chatrooms and virtual user rooms.
- **Hangs Co-op Models**:
  - **[Bill.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/models/Bill.js)**: Shared expenses ledger among friends.
  - **[Poll.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/models/Poll.js)**: Custom social voting questions.
  - **[BucketItem.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/models/BucketItem.js)**: Group bucket list items.
  - **[DTR.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/models/DTR.js)**: Defines relationship tracking between users.

### API Routes & Controllers
Located in: `backend/routes/` and `backend/controllers/`
- `/api/auth`: Signup, login, email OTP verification, password resets.
- `/api/posts`: Creating, editing, deleting, liking, sharing, commenting on posts.
- `/api/users`: Profile updates, searching, friend request management.
- `/api/rooms` & `/api/lobby`: Handles chatroom setups and shared listening sessions.
- `/api/hangs`: Expense calculations, voting polls, and shared goals.
- `/api/spotify`: Spotify login authentication callback and player actions.
- `/api/upload`: Handles profile photo and post image uploads using Cloudinary.

### Real-Time Communications: [socket.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/backend/socket.js)
Coordinates real-time notifications, private messages, user room joins, online/offline presence tracking, and synchronized Spotify music playback statuses inside user rooms.

---

## 3. Frontend Architecture

### Routing and Entry Points
- **[main.jsx](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/frontend/src/main.jsx)**: Mounts the React app, establishes global Axios defaults (like JWT headers), and configures base error/authorization interceptors.
- **[App.jsx](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/frontend/src/App.jsx)**: Sets up navigation routes using React Router DOM, with lazy-loaded pages for optimized bundle splitting.
- **[Layout.jsx](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/frontend/src/components/Layout.jsx)**: Renders the core application structure, responsive navigation tabs, and handles light/dark/orbit theme layouts.

### State Management
Managed using Redux Toolkit in: `frontend/src/features/`
- **`authSlice`**: Tracks authenticated user profile, registration statuses, and login keys.
- **`postSlice`**: Manages the feed, creating posts, deleting posts, liking, sharing, commenting, and nested replies.
- **`hangsSlice`**: State management for voting polls, shared bucket lists, and expense split trackers.
- **`userSlice`**: Controls search directories, user profiles, and friend request handling.

### Custom React Hooks
Located in: `frontend/src/hooks/`
- **[useSocket.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/frontend/src/hooks/useSocket.js)**: Manages global connection, room bindings, and event emission with the Socket.io backend.
- **[useAsyncAction.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/frontend/src/hooks/useAsyncAction.js)**: Throttles API submission requests (e.g., forms, comments) to prevent double/spam clicks.
