import { Modal } from "antd";

// Detect backend borrow-limit error messages (Chinese variants)
export const isBorrowLimitError = (msg) => {
  if (!msg) return false;
  const s = String(msg);
  return /借阅上限|30天内借阅上限|本月借阅数量已达上限/.test(s);
};

// Show a unified English modal when user exceeds monthly limit
export const showBorrowLimitModal = () => {
  try {
    Modal.error({
      title: "Borrowing Limit Reached",
      content: "You have reached the maximum number of borrowed books for the current period. Please return some books before borrowing new ones.",
      okText: "OK",
      centered: true,
      zIndex: 9999,
      maskClosable: true,
    });
  } catch (e) {
    // Fallback: ensure user sees something
    try { console.warn("Modal.error failed, fallback to message:", e); } catch {}
    // Lazy import to avoid circular
    import("antd").then(({ message }) => {
      message.error("Borrowing Limit Reached");
    }).catch(() => {});
  }
};

// Show a unified success modal on borrow success
export const showBorrowSuccessModal = (bookTitle = "") => {
  const title = bookTitle ? `"${bookTitle}" Borrowed Successfully` : "Borrowed Successfully";
  try {
    Modal.success({
      title,
      content: "Your borrow request has been completed. Enjoy reading!",
      okText: "Nice",
      centered: true,
      zIndex: 9999,
      maskClosable: true,
    });
  } catch (_) {
    import("antd").then(({ message }) => {
      message.success(title);
    }).catch(() => {});
  }
};

// Extract a meaningful error message from axios error
export const extractErrorMessage = (err) => {
  try {
    return (
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      ""
    );
  } catch (_) {
    return "";
  }
};