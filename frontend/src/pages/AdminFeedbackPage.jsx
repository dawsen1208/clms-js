import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Input,
  Space,
  Typography,
  message,
  Tabs,
  Tooltip,
  Statistic,
  Grid,
  Row,
  Col
} from "antd";
import {
  CheckCircleOutlined,
  SyncOutlined,
  MessageOutlined,
  BugOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  EditOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useLanguage } from "../contexts/LanguageContext";
import { getAllFeedback, replyFeedback } from "../api";

const { Title, Text: AntText, Paragraph } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

function AdminFeedbackPage() {
  const { t } = useLanguage();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [loading, setLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchFeedbacks = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await getAllFeedback(token);
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error("Failed to fetch all feedback:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const handleReplyClick = (record) => {
    setCurrentFeedback(record);
    setReplyContent(record.adminReply || "");
    setReplyModalVisible(true);
  };

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) {
      message.warning(t("feedback.placeholder"));
      return;
    }

    try {
      setSubmitting(true);
      await replyFeedback(currentFeedback._id, replyContent, token);
      message.success(t("feedback.replySuccess"));
      setReplyModalVisible(false);
      fetchFeedbacks(); // Refresh list
    } catch (err) {
      console.error("Reply feedback failed:", err);
      message.error(t("feedback.replyFailed"));
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

  const columns = [
    {
      title: t("feedback.type"),
      dataIndex: "type",
      key: "type",
      width: 120,
      render: (type) => (
        <Space>
          {getTypeIcon(type)}
          {getTypeText(type)}
        </Space>
      ),
    },
    {
      title: t("feedback.content"),
      dataIndex: "content",
      key: "content",
      ellipsis: {
        showTitle: false,
      },
      render: (content) => (
        <Tooltip placement="topLeft" title={content}>
          {content}
        </Tooltip>
      ),
    },
    {
      title: t("admin.userLabel"),
      dataIndex: "userName",
      key: "userName",
      width: 150,
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <AntText strong>{text || "Unknown"}</AntText>
          <AntText type="secondary" style={{ fontSize: 12 }}>{record.email}</AntText>
        </Space>
      )
    },
    {
      title: t("feedback.status"),
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => (
        <Tag color={status === "Replied" ? "green" : "orange"} icon={status === "Replied" ? <CheckCircleOutlined /> : <SyncOutlined spin />}>
          {status === "Replied" ? t("feedback.closed") : t("feedback.open")}
        </Tag>
      ),
    },
    {
      title: t("feedback.date"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (date) => dayjs(date).format("YYYY-MM-DD HH:mm"),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      defaultSortOrder: 'descend',
    },
    {
      title: t("feedback.action"),
      key: "action",
      width: 100,
      render: (_, record) => (
        <Button
          type={record.status === "Unreplied" ? "primary" : "default"}
          icon={<EditOutlined />}
          size="small"
          onClick={() => handleReplyClick(record)}
        >
          {record.status === "Unreplied" ? t("feedback.reply") : t("feedback.edit")}
        </Button>
      ),
    },
  ];

  const filteredFeedbacks = feedbacks.filter(f => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return f.status === "Unreplied";
    if (activeTab === "replied") return f.status === "Replied";
    return true;
  });

  return (
    <div className="admin-feedback-page" style={{ padding: "1.5rem" }}>
      <Card
        title={
          <div className="page-header">
            <Title level={2} className="page-modern-title" style={{ margin: 0 }}>
              {t("feedback.title") || "Feedback Management"}
            </Title>
            <AntText type="secondary" style={{ display: "block", marginTop: 8 }}>
              {t("feedback.subtitle") || "View and reply to user feedback and inquiries"}
            </AntText>
            
            {/* 📊 Statistic Cards */}
            <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 8 }}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card style={{
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  border: "none",
                  boxShadow: "0 8px 25px rgba(59, 130, 246, 0.3)",
                  color: "white"
                }}>
                  <Statistic 
                    title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("feedback.tabAll")}</span>} 
                    value={feedbacks.length} 
                    prefix={<MessageOutlined style={{ color: "white" }} />} 
                    valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card style={{
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "none",
                  boxShadow: "0 8px 25px rgba(245, 158, 11, 0.3)",
                  color: "white"
                }}>
                  <Statistic 
                    title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("feedback.tabPending")}</span>} 
                    value={feedbacks.filter(f => f.status === "Unreplied").length} 
                    prefix={<SyncOutlined spin style={{ color: "white" }} />} 
                    valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card style={{
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  boxShadow: "0 8px 25px rgba(16, 185, 129, 0.3)",
                  color: "white"
                }}>
                  <Statistic 
                    title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("feedback.tabReplied")}</span>} 
                    value={feedbacks.filter(f => f.status === "Replied").length} 
                    prefix={<CheckCircleOutlined style={{ color: "white" }} />} 
                    valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        }
        style={{ borderRadius: 16 }}
        bodyStyle={{ padding: "1.5rem" }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: "all", label: `${t("feedback.tabAll")} (${feedbacks.length})` },
            { key: "pending", label: `${t("feedback.tabPending")} (${feedbacks.filter(f => f.status === "Unreplied").length})` },
            { key: "replied", label: `${t("feedback.tabReplied")} (${feedbacks.filter(f => f.status === "Replied").length})` },
          ]}
        />

        <Table
          columns={columns}
          dataSource={filteredFeedbacks}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: t("feedback.noData") }}
        />
      </Card>

      <Modal
        title={
          <Space>
            <MessageOutlined />
            {t("feedback.replyModalTitle")}
          </Space>
        }
        open={replyModalVisible}
        onCancel={() => setReplyModalVisible(false)}
        onOk={handleReplySubmit}
        confirmLoading={submitting}
        okText={t("feedback.sendReply")}
        cancelText={t("common.cancel")}
      >
        {currentFeedback && (
          <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Card size="small" style={{ background: "#f5f5f5" }}>
              <Space align="start">
                {getTypeIcon(currentFeedback.type)}
                <div>
                  <AntText type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(currentFeedback.createdAt).format("YYYY-MM-DD HH:mm")} - {currentFeedback.user?.name}
                  </AntText>
                  <Paragraph style={{ margin: "4px 0 0 0" }}>
                    {currentFeedback.content}
                  </Paragraph>
                </div>
              </Space>
            </Card>

            <div>
              <AntText strong style={{ display: "block", marginBottom: 8 }}>{t("feedback.yourReply")}:</AntText>
              <TextArea
                rows={6}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={t("feedback.replyPlaceholder")}
              />
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}

export default AdminFeedbackPage;
