import { useState } from "react";
import { Modal, Rate, Input, Button, Typography, message } from "antd";
import { submitReview } from "../api";
import { useLanguage } from "../contexts/LanguageContext";

const { Text } = Typography;

function ReviewModal({ open, onClose, bookId, bookTitle, token, onSubmitted }) {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const charsLeft = 500 - comment.trim().length;

  const handleSubmit = async () => {
    if (rating < 0 || rating > 5) {
      return message.error(t("bookDetail.ratingRangeError"));
    }
    if (comment.trim().length > 500) {
      return message.error(t("bookDetail.reviewLengthError"));
    }
    try {
      setSubmitting(true);
      const res = await submitReview(bookId, rating, comment.trim(), token);
      message.success(t("bookDetail.reviewSubmitted"));
      onSubmitted?.(res?.data);
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      message.error(`${t("bookDetail.submissionFailed")}: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={t("bookDetail.writeReviewTitle", { title: bookTitle || t("common.unknown") })}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          {t("common.cancel")}
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={submitting}
        >
          {t("bookDetail.submitReview")}
        </Button>,
      ]}
      centered
    >
      <div style={{ marginBottom: 12 }}>
        <Text>{t("bookDetail.ratingLabel")}</Text>
        <div>
          <Rate allowHalf={false} value={rating} onChange={setRating} />
          <span style={{ marginLeft: 8 }}>{rating} {t("bookDetail.stars")}</span>
        </div>
      </div>

      <div>
        <Text>{t("bookDetail.reviewLabel")}</Text>
        <Input.TextArea
          rows={5}
          maxLength={500}
          showCount
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("bookDetail.reviewPlaceholder")}
        />
        <div style={{ textAlign: "right", marginTop: 4, color: "#999" }}>
          {t("bookDetail.charsRemaining", { count: charsLeft >= 0 ? charsLeft : 0 })}
        </div>
      </div>
    </Modal>
  );
}

export default ReviewModal;