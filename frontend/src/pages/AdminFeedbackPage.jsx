import { useState, useEffect, useCallback } from "react";
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
  Row,
  Col,
  theme
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
import PageShell from "../components/common/PageShell";
import KPIStatCard from "../components/common/KPIStatCard";

const { Text: AntText, Paragraph } = Typography;
const { TextArea } = Input;
const { useToken } = theme;

function AdminFeedbackPage() {
  const { t } = useLanguage();
  const { token } = useToken();
  const [loading, setLoading] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const authToken = sessionStorage.getItem("token") || localStorage.getItem("token");

  const fetchFeedbacks = useCallback(async () => {
    if (!authToken) return;
    try {
      setLoading(true);
      const res = await getAllFeedback(authToken);
      setFeedbacks(res.data || []);
    } catch (err) {
      console.error("Failed to fetch all feedback:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [authToken, t]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

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
      await replyFeedback(currentFeedback._id, replyContent, authToken);
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
      case "bug": return <BugOutlined style={{ color: token.colorError }} />;
      case "suggestion": return <BulbOutlined style={{ color: token.colorWarning }} />;
      default: return <QuestionCircleOutlined style={{ color: token.colorInfo }} />;
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

  const stats = {
    total: feedbacks.length,
    pending: feedbacks.filter(f => f.status === "Unreplied").length,
    replied: feedbacks.filter(f => f.status === "Replied").length
  };

  return (
    <PageShell
      title={t("feedback.adminTitle") || "Feedback Management"}
      subtitle={t("feedback.subtitle") || "View and reply to user feedback and inquiries"}
      extra={
        <Button icon={<SyncOutlined />} onClick={fetchFeedbacks} loading={loading}>
          {t("admin.refresh")}
        </Button>
      }
    >

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <KPIStatCard
            title={t("feedback.tabAll")}
            value={stats.total}
            icon={<MessageOutlined />}
            color={token.colorPrimary}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <KPIStatCard
            title={t("feedback.tabPending")}
            value={stats.pending}
            icon={<SyncOutlined spin={loading} />}
            color={token.colorWarning}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <KPIStatCard
            title={t("feedback.tabReplied")}
            value={stats.replied}
            icon={<CheckCircleOutlined />}
            color={token.colorSuccess}
            loading={loading}
          />
        </Col>
      </Row>

      <Card style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: "all", label: `${t("feedback.tabAll")} (${stats.total})` },
            { key: "pending", label: `${t("feedback.tabPending")} (${stats.pending})` },
            { key: "replied", label: `${t("feedback.tabReplied")} (${stats.replied})` },
          ]}
        />

        <Table
          columns={columns}
          dataSource={filteredFeedbacks}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: t("feedback.noData") }}
          scroll={{ x: 800 }}
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
            <Card size="small" style={{ background: token.colorFillAlter }}>
              <Space align="start">
                {getTypeIcon(currentFeedback.type)}
                <div>
                  <AntText type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(currentFeedback.createdAt).format("YYYY-MM-DD HH:mm")} - {currentFeedback.userName || "Unknown"}
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
    </PageShell>
  );
}

export default AdminFeedbackPage;
