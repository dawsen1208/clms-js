import { useState } from "react";
import { Modal, Rate, Input, Button, Typography, message } from "antd";
import { submitReview } from "../api";

const { Text } = Typography;

function ReviewModal({ open, onClose, bookId, bookTitle, token, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const charsLeft = 500 - comment.trim().length;

  const handleSubmit = async () => {
    if (rating < 0 || rating > 5) {
      return message.error("Rating must be between 0 and 5 stars");
    }
    if (comment.trim().length > 500) {
      return message.error("Review must be at most 500 characters");
    }
    try {
      setSubmitting(true);
      const res = await submitReview(bookId, rating, comment.trim(), token);
      message.success("Review submitted successfully");
      onSubmitted?.(res?.data);
      onClose?.();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message;
      message.error(`Submission failed: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`📝 Write a Review for "${bookTitle || "this book"}"`}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          loading={submitting}
        >
          Submit Review
        </Button>,
      ]}
      centered
    >
      <div style={{ marginBottom: 12 }}>
        <Text>Rating (0-5):</Text>
        <div>
          <Rate allowHalf={false} value={rating} onChange={setRating} />
          <span style={{ marginLeft: 8 }}>{rating} stars</span>
        </div>
      </div>

      <div>
        <Text>Review (max 500 chars):</Text>
        <Input.TextArea
          rows={5}
          maxLength={500}
          showCount
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write your reading thoughts or suggestions..."
        />
        <div style={{ textAlign: "right", marginTop: 4, color: "#999" }}>
          Remaining {charsLeft >= 0 ? charsLeft : 0} chars
        </div>
      </div>
    </Modal>
  );
}

export default ReviewModal;