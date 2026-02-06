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
  Modal,
  theme,
  Grid
} from "antd";
import {
  MessageOutlined,
  BugOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  UserOutlined,
  RobotOutlined,
  RightOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useLanguage } from "../contexts/LanguageContext";
import { submitFeedback, getMyFeedback } from "../api";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { useToken } = theme;
const { useBreakpoint } = Grid;

function FeedbackPage() {
  const { t } = useLanguage();
  const { token } = useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeTab, setActiveTab] = useState("submit");
  
  // Form state
  const [type, setType] = useState("suggestion");
  const [content, setContent] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const authToken = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchFeedbacks = async () => {
    if (!authToken) return;
    try {
      setLoading(true);
      const res = await getMyFeedback(authToken);
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
    if (!authToken) {
      message.error(t("common.loginFirst"));
      return;
    }

    try {
      setSubmitting(true);
      await submitFeedback(content, type, authToken);
      message.success(t("feedback.submitSuccess"));
      setContent("");
      setType("suggestion");
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
      case "bug": return <BugOutlined style={{ color: token.colorError }} />;
      case "suggestion": return <BulbOutlined style={{ color: token.colorWarning }} />;
      default: return <QuestionCircleOutlined style={{ color: token.colorPrimary }} />;
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
    <div style={{ maxWidth: 600, margin: "0 auto", padding: isMobile ? "0" : "20px 0" }}>
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
                <BugOutlined style={{ color: token.colorError }} />
                {t("feedback.bug")}
              </Space>
            </Option>
            <Option value="suggestion">
              <Space>
                <BulbOutlined style={{ color: token.colorWarning }} />
                {t("feedback.suggestion")}
              </Space>
            </Option>
            <Option value="other">
              <Space>
                <QuestionCircleOutlined style={{ color: token.colorPrimary }} />
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
        <Empty description={t("feedback.noFeedback")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={feedbacks}
          renderItem={(item) => (
            <div 
              onClick={() => {
                setSelectedFeedback(item);
                setDetailModalOpen(true);
              }}
              style={{ 
                padding: '16px 0',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              className="feedback-item"
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Space>
                  {getTypeIcon(item.type)}
                  <Text strong>{getTypeText(item.type)}</Text>
                  {item.status === "Replied" ? (
                    <Tag color="success" style={{ margin: 0 }}>{t("feedback.closed")}</Tag>
                  ) : (
                    <Tag color="processing" style={{ margin: 0 }}>{t("feedback.open")}</Tag>
                  )}
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(item.createdAt).format("YYYY-MM-DD")}
                </Text>
              </div>

              <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8, color: token.colorTextSecondary, fontSize: 14 }}>
                {item.content}
              </Paragraph>

              {item.adminReply && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: token.colorSuccess }}>
                   <RobotOutlined />
                   <span>{t("feedback.adminReply")}: {item.adminReply.substring(0, 30)}...</span>
                </div>
              )}
            </div>
          )}
        />
      )}
    </div>
  );

  return (
    <div className="feedback-page" style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? 16 : 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ marginBottom: 8 }}>{t("feedback.title")}</Title>
        <Text type="secondary">{t("feedback.description")}</Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="large"
        items={[
          {
            key: "submit",
            label: t("feedback.submit"),
            children: renderSubmitForm(),
          },
          {
            key: "history",
            label: t("feedback.myFeedback"),
            children: renderHistory(),
          },
        ]}
      />

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
              <Tag color={selectedFeedback.status === "Replied" ? "success" : "processing"} icon={selectedFeedback.status === "Replied" ? <CheckCircleOutlined /> : <SyncOutlined spin />}>
                {selectedFeedback.status === "Replied" ? t("feedback.closed") : t("feedback.open")}
              </Tag>
            </div>

            <div style={{ marginBottom: 24 }}>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>{t("feedback.date")}: {dayjs(selectedFeedback.createdAt).format("YYYY-MM-DD HH:mm")}</Text>
              <Text strong style={{ display: "block", marginBottom: 8 }}>{t("feedback.content")}:</Text>
              <div style={{ background: token.colorFillAlter, padding: 12, borderRadius: 8 }}>
                <Paragraph style={{ marginBottom: 0 }}>{selectedFeedback.content}</Paragraph>
              </div>
            </div>

            {selectedFeedback.adminReply && (
              <div style={{ background: token.colorSuccessBg, padding: 16, borderRadius: 8, border: `1px solid ${token.colorSuccessBorder}` }}>
                <Space align="start" style={{ width: '100%' }}>
                  <Avatar icon={<RobotOutlined />} style={{ backgroundColor: token.colorSuccess }} />
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ color: token.colorSuccessText, display: "block" }}>{t("feedback.adminReply")}:</Text>
                    <Paragraph style={{ margin: "8px 0", color: token.colorSuccessText }}>
                      {selectedFeedback.adminReply}
                    </Paragraph>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(selectedFeedback.updatedAt).format("YYYY-MM-DD HH:mm")}
                    </Text>
                  </div>
                </Space>
              </div>
            )}
            
            {!selectedFeedback.adminReply && (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t("feedback.noReplyYet") || "No reply yet"} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default FeedbackPage;
