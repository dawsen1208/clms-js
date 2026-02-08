import { Modal, message } from "antd";

// Detect backend borrow-limit error messages (Chinese variants)
export const isBorrowLimitError = (msg) => {
  if (!msg) return false;
  const s = String(msg).toLowerCase();
  return /借阅上限|30天内借阅上限|本月借阅数量已达上限|达到同时借阅上限|limit reached|borrowing limit|maximum number|exceeded/.test(s);
};

// Show a unified English modal when user exceeds monthly limit
export const showBorrowLimitModal = (t, modalInstance) => {
  try {
    const title = t ? t("popular.limitTitle") : "Borrowing Limit Reached";
    const content = t ? t("popular.limitMsg") : "You have reached the maximum number of borrowed books for the current period. Please return some books before borrowing new ones.";
    const okText = t ? t("common.confirm") : "OK";

    console.log("Showing borrow limit modal");
    
    const show = modalInstance ? modalInstance.error : Modal.error;

    // Slight delay to ensure any previous confirm modal is closed
    setTimeout(() => {
      show({
        title,
        content,
        okText,
        centered: true,
        zIndex: 9999,
        maskClosable: true,
      });
    }, 100);
  } catch (e) {
    console.error("Error showing borrow limit modal:", e);
    // Fallback: ensure user sees something
    try { 
      message.error(t ? t("popular.limitTitle") : "Borrowing Limit Reached");
    } catch (_) {
      console.warn("Message fallback failed", _);
    }
  }
};

// Show a unified success modal on borrow success
export const showBorrowSuccessModal = (t, bookTitle = "") => {
  const defaultTitle = bookTitle ? `"${bookTitle}" Borrowed Successfully` : "Borrowed Successfully";
  const title = t ? (bookTitle ? t("search.borrowSuccessMsg", { title: bookTitle }) : t("popular.successTitle")) : defaultTitle;
  const content = t ? t("popular.successMsg") : "Your borrow request has been completed. Enjoy reading!";
  const okText = t ? t("common.confirm") : "Nice";

  try {
    Modal.success({
      title,
      content,
      okText,
      centered: true,
      zIndex: 9999,
      maskClosable: true,
    });
  } catch (_) {
    message.success(title);
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