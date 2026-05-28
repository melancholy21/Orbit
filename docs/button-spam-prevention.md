# Button Spam & Duplicate Request Prevention

This document explains the mechanisms implemented in Orbit to prevent user click spamming, race conditions, and duplicate backend requests.

## 1. Enhanced Custom Button Component
Located in: [button.tsx](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/frontend/src/components/ui/button.tsx)

### Features Added
- **`isLoading` (Boolean)**: Automatically disables the button and displays a spinning `Loader2` icon next to the text.
- **`throttleMs` (Number, default 800ms)**: Throttles click handlers. If the user clicks the button, subsequent clicks within the specified window are ignored, stopping double-submissions (e.g., in forms, modals).

---

## 2. Custom Hook: `useAsyncAction`
Located in: [useAsyncAction.js](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/frontend/src/hooks/useAsyncAction.js)

`useAsyncAction` is a custom React hook that wraps any asynchronous task (e.g., API requests) to manage its loading states cleanly.

### Features
- Guarantees that only **one instance** of the async function runs at a time.
- If a second call is made while the first is pending, it is immediately ignored.
- Exposes `[execute, isLoading, error]`.
- Used on submission forms like **Comment Submit**, **Reply Submit**, **Login**, and **Register** to automatically disable the submit button and show spinners via the `isLoading` prop.

---

## 3. Optimistic UI Updates (Likes & Reposts)
Located in: [PostCard.jsx](file:///c:/Users/ANGELO/OneDrive/Desktop/Orbit/frontend/src/components/PostCard.jsx)

For highly interactive and frequent events like **Liking** and **Reposting** a post, waiting for a spinner makes the app feel sluggish. Instead of using `useAsyncAction` to block user input, we use **Optimistic UI Updates**.

### Mechanism
1. **Immediate Transition**: As soon as the user clicks the Heart (Like) or Repost button, the UI updates instantly (the heart turns red, count increments/decrements).
2. **Background Dispatch**: The app dispatches the backend API request in the background.
3. **Automatic Rollback**: If the server fails to process the request (e.g., timeout, connection failure), the UI catches the error, rolls back the counts/colors to the previous state, and alerts the user via a `toast.error` message.

### Spam-Click Guard (Ref Throttling)
Because Optimistic UI updates the state immediately without blocking the button, a user spam-clicking the button could create state race conditions (since React state updates are asynchronous and batched).
- We resolved this by keeping track of the click timestamps using `lastLikeClickRef` and `lastShareClickRef`.
- Clicks occurring within **400ms** of each other are ignored.
- This ensures only one optimistic update and background request can be active per 400ms window, rendering the actions completely robust against spamming.
