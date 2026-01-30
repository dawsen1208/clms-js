import { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Input,
  Select,
  Button,
  List,
  Tag,
  message,
  Tabs,
  Empty,
  Spin,
  Space,
  Avatar,
  Modal
} from "antd";
import {
  MessageOutlined,
  BugOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  UserOutlined,
  RobotOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useLanguage } from "../contexts/LanguageContext";
import { submitFeedback, getMyFeedback } from "../api";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

function FeedbackPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeTab, setActiveTab] = useState("submit");
  
  // Form state
  const [type, setType] = useState("suggestion");
  const [content, setContent] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchFeedbacks = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getMyFeedback(token);
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error("Failed to fetch feedback:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchFeedbacks();
    }
  }, [activeTab]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      message.warning(t("feedback.placeholder"));
      return;
    }
    if (!token) {
      message.error(t("common.loginFirst"));
      return;
    }

    try {
      setSubmitting(true);
      await submitFeedback(content, type, token);
      message.success(t("feedback.submitSuccess"));
      setContent("");
      setType("suggestion");
      // Switch to history tab to see the new feedback
      setActiveTab("history");
    } catch (err) {
      console.error("Submit feedback failed:", err);
      message.error(t("feedback.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "bug": return <BugOutlined style={{ color: "#ff4d4f" }} />;
      case "suggestion": return <BulbOutlined style={{ color: "#faad14" }} />;
      default: return <QuestionCircleOutlined style={{ color: "#1890ff" }} />;
    }
  };

  const getTypeText = (type) => {
    switch (type) {
      case "bug": return t("feedback.bug");
      case "suggestion": return t("feedback.suggestion");
      default: return t("feedback.other");
    }
  };

  const renderSubmitForm = () => (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 0" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div>
          <Text strong style={{ display: "block", marginBottom: 8 }}>
            {t("feedback.type")}
          </Text>
          <Select
            value={type}
            onChange={setType}
            style={{ width: "100%" }}
            size="large"
          >
            <Option value="bug">
              <Space>
                <BugOutlined style={{ color: "#ff4d4f" }} />
                {t("feedback.bug")}
              </Space>
            </Option>
            <Option value="suggestion">
              <Space>
                <BulbOutlined style={{ color: "#faad14" }} />
                {t("feedback.suggestion")}
              </Space>
            </Option>
            <Option value="other">
              <Space>
                <QuestionCircleOutlined style={{ color: "#1890ff" }} />
                {t("feedback.other")}
              </Space>
            </Option>
          </Select>
        </div>

        <div>
          <Text strong style={{ display: "block", marginBottom: 8 }}>
            {t("feedback.content")}
          </Text>
          <TextArea
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("feedback.placeholder")}
            maxLength={1000}
            showCount
            style={{ borderRadius: 8 }}
          />
        </div>

        <Button
          type="primary"
          size="large"
          block
          onClick={handleSubmit}
          loading={submitting}
          icon={<MessageOutlined />}
          style={{ height: 48, borderRadius: 8, marginTop: 12 }}
        >
          {t("feedback.submit")}
        </Button>
      </Space>
    </div>
  );

  const renderHistory = () => (
    <div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin size="large" />
        </div>
      ) : feedbacks.length === 0 ? (
        <Empty description={t("feedback.noFeedback")} />
      ) : (
        <List
          dataSource={feedbacks}
          renderItem={(item) => (
            <Card
              hoverable
              onClick={() => {
                setSelectedFeedback(item);
                setDetailModalOpen(true);
              }}
              style={{ marginBottom: 16, borderRadius: 12, border: "1px solid #f0f0f0", cursor: "pointer" }}
              bodyStyle={{ padding: 20 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <Space>
                  {getTypeIcon(item.type)}
                  <Text strong>{getTypeText(item.type)}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm")}
                  </Text>
                </Space>
                <Tag color={item.status === "Replied" ? "green" : "orange"} icon={item.status === "Replied" ? <CheckCircleOutlined /> : <SyncOutlined spin />}>
                  {item.status === "Replied" ? t("feedback.closed") : t("feedback.open")}
                </Tag>
              </div>

              <Paragraph style={{ marginBottom: 16, fontSize: 15 }}>
                {item.content}
              </Paragraph>

              {item.reply && (
                <div style={{ background: "#f6ffed", padding: 16, borderRadius: 8, border: "1px solid #b7eb8f" }}>
                  <Space align="start">
                    <Avatar icon={<RobotOutlined />} style={{ backgroundColor: "#52c41a" }} size="small" />
                    <div>
                      <Text strong style={{ color: "#389e0d" }}>{t("feedback.adminReply")}:</Text>
                      <Paragraph style={{ margin: "4px 0 0 0", color: "#389e0d" }}>
                        {item.reply}
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(item.updatedAt).format("YYYY-MM-DD HH:mm")}
                      </Text>
                    </div>
                  </Space>
                </div>
              )}
            </Card>
          )}
        />
      )}
    </div>
  );

  return (
    <div className="feedback-page" style={{ padding: "1.5rem", maxWidth: 1000, margin: "0 auto" }}>
      <Card
        bordered={false}
        style={{ borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>{t("feedback.title")}</Title>
          <Text type="secondary">{t("feedback.description")}</Text>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          centered
          size="large"
          items={[
            {
              key: "submit",
              label: (
                <span>
                  <MessageOutlined />
                  {t("feedback.submit")}
                </span>
              ),
              children: renderSubmitForm(),
            },
            {
              key: "history",
              label: (
                <span>
                  <UserOutlined />
                  {t("feedback.myFeedback")}
                </span>
              ),
              children: renderHistory(),
            },
          ]}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <MessageOutlined />
            {t("feedback.detailTitle") || "Feedback Details"}
          </Space>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            {t("common.close") || "Close"}
          </Button>
        ]}
      >
        {selectedFeedback && (
          <div style={{ paddingTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <Space>
                {getTypeIcon(selectedFeedback.type)}
                <Text strong>{getTypeText(selectedFeedback.type)}</Text>
              </Space>
              <Tag color={selectedFeedback.status === "Replied" ? "green" : "orange"} icon={selectedFeedback.status === "Replied" ? <CheckCircleOutlined /> : <SyncOutlined spin />}>
                {selectedFeedback.status === "Replied" ? t("feedback.closed") : t("feedback.open")}
              </Tag>
            </div>

            <div style={{ marginBottom: 24 }}>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>{t("feedback.date")}: {dayjs(selectedFeedback.createdAt).format("YYYY-MM-DD HH:mm")}</Text>
              <Text strong style={{ display: "block", marginBottom: 8 }}>{t("feedback.content")}:</Text>
              <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 8 }}>
                <Paragraph style={{ marginBottom: 0 }}>{selectedFeedback.content}</Paragraph>
              </div>
            </div>

            {selectedFeedback.reply && (
              <div style={{ background: "#f6ffed", padding: 16, borderRadius: 8, border: "1px solid #b7eb8f" }}>
                <Space align="start" style={{ width: '100%' }}>
                  <Avatar icon={<RobotOutlined />} style={{ backgroundColor: "#52c41a" }} />
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ color: "#389e0d", display: "block" }}>{t("feedback.adminReply")}:</Text>
                    <Paragraph style={{ margin: "8px 0", color: "#389e0d" }}>
                      {selectedFeedback.reply}
                    </Paragraph>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(selectedFeedback.updatedAt).format("YYYY-MM-DD HH:mm")}
                    </Text>
                  </div>
                </Space>
              </div>
            )}
            
            {!selectedFeedback.reply && (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("feedback.noReplyYet") || "No reply yet"} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default FeedbackPage;
