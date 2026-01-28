# Delivery Notes - CLMS System Updates

## 1. Database Changes

### New Models
- **BorrowRequest**: Tracks user requests for borrowing/returning/renewing books.
  - Fields: `userId`, `userName`, `bookId`, `bookTitle`, `type` (borrow/return/renew), `status` (pending/approved/rejected), `reason`.
- **BorrowHistory**: Separate collection for historical data to optimize active record queries.
  - Fields: `userId`, `bookId`, `action`, `borrowDate`, `returnDate`, `isRenewed`.
- **Feedback**: Stores user feedback.
  - Fields: `userId`, `userName`, `email`, `content`, `type`, `status` (open/closed/replied), `adminReply`.

### Updated Models
- **User**:
  - Added `isBlacklisted` (Boolean): For automated penalty system.
  - Added `overdueCount` (Number): Tracks cumulative overdue incidents.
  - Added `blacklistReason` (String).
  - Added `preferences` (Object): Stores user-specific settings (notifications, accessibility).
- **BorrowRecord**:
  - Added Redundant Fields (`bookTitle`, `bookAuthor`, `userName`) for faster read performance without heavy population.
  - Added `renewedAt` and `returnedAt` timestamps.

## 2. Interface Changes (API)

### Library & Inventory
- `POST /api/books/:id/borrow`: Updated to use atomic `$inc` for inventory safety.
- `POST /api/books/request`: **(New)** Submit borrow/return/renew requests.
- `POST /api/library/requests/approve/:id`: **(New)** Admin approval endpoint with atomic inventory updates.
- `GET /api/library/borrowed`: **(New)** Get current user's active borrows.
- `GET /api/library/history`: **(New)** Get current user's borrow history.

### User & Settings
- `GET /api/feedback/my`: **(New)** Get current user's feedback history.
- `POST /api/feedback`: **(New)** Submit user feedback.
- `POST /api/feedback/reply/:id`: **(New)** Admin reply to feedback.
- `PUT /api/users/profile`: Updated to support `preferences` (including accessibility settings).

## 3. Frontend Page Updates

### New Features
- **Accessibility Mode**:
  - Added `AccessibilityContext` for global state.
  - Added Toggle in **Settings Page**.
  - Integrated TTS (Text-to-Speech) in **Book Detail** and **Notification Center**.
- **Flipable Welcome Card**:
  - Implemented in **Home Page** with mobile-responsive CSS.
- **Unified Inventory Display**:
  - Standardized stock display across Search, Home, and Detail pages.

### Modified Pages
- `src/pages/SettingsPage.jsx`: Added Accessibility tab (TTS, Accessibility Mode).
- `src/pages/BookDetail.jsx`: Added "Read Description" TTS button.
- `src/pages/NotificationPage.jsx`: Added TTS support for notifications.
- `src/pages/HomePage.jsx`: Implemented Flip Card animation.
- `src/pages/AdminBorrowPage.jsx`: Updated to use new `BorrowRequest` API.

## 4. Self-Test Steps

### Test 1: Inventory Concurrency
1. Open the application in two different browsers (or Incognito).
2. Log in as two different users.
3. Find a book with **1 copy** remaining.
4. Attempt to click "Borrow" on both browsers simultaneously.
5. **Expected Result**: Only one user succeeds; the other receives an "Out of Stock" or "Inventory Error" message. The stock count becomes 0.

### Test 2: Accessibility (TTS)
1. Go to **Settings > Accessibility**.
2. Enable **Text-to-Speech (TTS)**.
3. Navigate to a **Book Detail** page.
4. Click the **Read** button (Sound Icon) next to the description.
5. **Expected Result**: The browser should read the book description aloud.

### Test 3: Flip Card (Home Page)
1. Navigate to the **Home Page**.
2. Click on the "Welcome" card.
3. **Expected Result**: The card flips to show the "Operation Guide" on the back.
4. Resize browser to mobile width (<768px).
5. Click again.
6. **Expected Result**: The card flips correctly with adjusted height/layout.

### Test 4: Feedback System
1. Go to **Help / Feedback**.
2. Submit a new feedback issue.
3. Log out and log in as **Administrator**.
4. Go to **Admin Dashboard > Feedback Management**.
5. **Expected Result**: The new feedback appears in the list.
6. Reply to the feedback.
7. Log back in as the User.
8. **Expected Result**: The feedback status is updated to "Replied" with the admin's response.
