import React, { useState, useEffect, useCallback } from "react";
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
  theme
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
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export const FeedbackLeftPanel = () => {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const tokenAuth = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchFeedbacks = useCallback(async () => {
    if (!tokenAuth) return;
    try {
      setLoading(true);
      const res = await getMyFeedback(tokenAuth);
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error("Failed to fetch feedback overview:", err);
    } finally {
      setLoading(false);
    }
  }, [tokenAuth]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const total = feedbacks.length;
  const openCount = feedbacks.filter(f => f.status !== "Replied").length;
  const repliedCount = feedbacks.filter(f => f.status === "Replied").length;

  return (
    <div className="bw-scroll">
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ fontFamily: "'Literata', serif", marginBottom: 8 }}>
          {t("feedback.overviewTitle") || "Feedback Snapshot"}
        </Title>
        <Text type="secondary">
          {t("feedback.overviewDesc") || "Track your submissions and replies from the library."}
        </Text>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        <Card 
          size="small" 
          style={{ borderRadius: 12, borderColor: token.colorBorderSecondary }}
          title={<span><MessageOutlined /> {t("feedback.total") || "Total feedback"}</span>}
        >
          <Title level={3} style={{ margin: 0 }}>{total}</Title>
        </Card>
        <Card 
          size="small" 
          style={{ borderRadius: 12, borderColor: token.colorWarning }}
          title={<span><SyncOutlined /> {t("feedback.open") || "Open"}</span>}
        >
          <Title level={4} style={{ margin: 0, color: token.colorWarning }}>{openCount}</Title>
        </Card>
        <Card 
          size="small" 
          style={{ borderRadius: 12, borderColor: token.colorSuccess }}
          title={<span><CheckCircleOutlined /> {t("feedback.closed") || "Closed"}</span>}
        >
          <Title level={4} style={{ margin: 0, color: token.colorSuccess }}>{repliedCount}</Title>
        </Card>
      </div>
      {loading && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <Spin size="small" />
        </div>
      )}
    </div>
  );
};

function FeedbackPage() {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [activeTab, setActiveTab] = useState("submit");
  
  // Form state
  const [type, setType] = useState("suggestion");
  const [content, setContent] = useState("");
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const tokenAuth = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchFeedbacks = useCallback(async () => {
    if (!tokenAuth) return;
    try {
      setLoading(true);
      const res = await getMyFeedback(tokenAuth);
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error("Failed to fetch feedback:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [tokenAuth, t]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchFeedbacks();
    }
  }, [activeTab, fetchFeedbacks]);

  const handleSubmit = async () => {
    if (!content.trim()) {
      message.warning(t("feedback.placeholder"));
      return;
    }
    if (!tokenAuth) {
      message.error(t("common.loginFirst"));
      return;
    }

    try {
      setSubmitting(true);
      await submitFeedback(content, type, tokenAuth);
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
          grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 2, xl: 2, xxl: 3 }}
          dataSource={feedbacks}
          renderItem={(item) => (
            <List.Item>
                <Card
                hoverable
                onClick={() => {
                    setSelectedFeedback(item);
                    setDetailModalOpen(true);
                }}
                style={{ borderRadius: 12, border: "1px solid #f0f0f0", cursor: "pointer", height: '100%' }}
                bodyStyle={{ padding: 20 }}
                >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <Space>
                    {getTypeIcon(item.type)}
                    <Text strong>{getTypeText(item.type)}</Text>
                    </Space>
                    <Tag color={item.status === "Replied" ? "green" : "orange"} icon={item.status === "Replied" ? <CheckCircleOutlined /> : <SyncOutlined spin />}>
                    {item.status === "Replied" ? t("feedback.closed") : t("feedback.open")}
                    </Tag>
                </div>

                <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 16, fontSize: 15, color: token.colorTextSecondary }}>
                    {item.content}
                </Paragraph>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                     <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm")}
                    </Text>
                    {item.adminReply && <Tag color="success">{t("feedback.adminReply")}</Tag>}
                </div>
                </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );

  return (
    <PageContainer>
      <PageHeader
        title={t("feedback.title")}
        subtitle={t("feedback.description")}
        icon={<MessageOutlined />}
      />

      <Card
        bordered={false}
        style={{ borderRadius: 16, boxShadow: token.boxShadowTertiary }}
      >
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
              <div style={{ background: token.colorFillAlter, padding: 12, borderRadius: 8 }}>
                <Paragraph style={{ marginBottom: 0 }}>{selectedFeedback.content}</Paragraph>
              </div>
            </div>

            {selectedFeedback.adminReply && (
              <div style={{ background: "#f6ffed", padding: 16, borderRadius: 8, border: "1px solid #b7eb8f" }}>
                <Space align="start" style={{ width: '100%' }}>
                  <Avatar icon={<RobotOutlined />} style={{ backgroundColor: "#52c41a" }} />
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ color: "#389e0d", display: "block" }}>{t("feedback.adminReply")}:</Text>
                    <Paragraph style={{ margin: "8px 0", color: "#389e0d" }}>
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
    </PageContainer>
  );
}

export default FeedbackPage;
