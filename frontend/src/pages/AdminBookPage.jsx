// ✅ client/src/pages/AdminBookPage.jsx
import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  message,
  Popconfirm,
  Row,
  Col,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { getBooks, addBook, deleteBook } from "../api"; // ✅ 使用统一 api.js
import { useLanguage } from "../contexts/LanguageContext";

function AdminBookPage() {
  const { t } = useLanguage();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form] = Form.useForm();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStock, setFilterStock] = useState("All");

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  /** ✅ 获取书籍列表 */
  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await getBooks();
      setBooks(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch books:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  /** ✅ 添加书籍 */
  const handleAddBook = async (values) => {
    try {
      const res = await addBook(values, token);
      message.success(res.data.message || t("admin.bookAdded"));
      setAddModalOpen(false);
      form.resetFields();
      fetchBooks();
    } catch (err) {
      console.error("❌ Failed to add book:", err);
      message.error(err.response?.data?.message || t("admin.addBookFailed"));
    }
  };

  /** ✅ 删除书籍 */
  const handleDelete = async (id) => {
    try {
      await deleteBook(id, token);
      message.success(t("admin.bookDeleted"));
      fetchBooks();
    } catch (err) {
      console.error("❌ Delete failed:", err);
      message.error(t("admin.deleteFailed"));
    }
  };

  /** ✅ 筛选逻辑 */
  const filteredBooks = books.filter((book) => {
    const matchSearch =
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory =
      filterCategory === "All" || book.category === filterCategory;
    const matchStock =
      filterStock === "All" ||
      (filterStock === "In stock" && book.copies > 0) ||
      (filterStock === "Out of stock" && book.copies <= 0);
    return matchSearch && matchCategory && matchStock;
  });

  /** ✅ 动态分类选项 */
  const allCategories = ["All", ...new Set(books.map((b) => b.category || t("common.unknown")))];

  /** ✅ 表格列 */
  const columns = [
    { title: t("admin.bookId"), dataIndex: "_id", key: "_id", width: 200 },
    { title: t("admin.title"), dataIndex: "title", key: "title" },
    { title: t("admin.author"), dataIndex: "author", key: "author" },
    { title: t("admin.category"), dataIndex: "category", key: "category" },
    {
      title: t("admin.stock"),
      dataIndex: "copies",
      key: "copies",
      align: "center",
      render: (copies) => (
        <span style={{ color: copies > 0 ? "green" : "red" }}>
          {copies > 0 ? `${copies} ${t("admin.copies")}` : t("admin.outOfStock")}
        </span>
      ),
    },
    {
      title: t("admin.actions"),
      key: "actions",
      align: "center",
      render: (_, record) => (
        <Popconfirm
          title={t("admin.confirmDelete")}
          onConfirm={() => handleDelete(record._id)}
          okText={t("common.confirm")}
          cancelText={t("admin.cancel")}
        >
          <Button danger icon={<DeleteOutlined />} size="small">
            {t("admin.delete")}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: "1.5rem" }}>
      <Card
        title={<Title level={2} className="page-modern-title" style={{ margin: 0 }}>{t("admin.bookManage")}</Title>}
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchBooks}>
            {t("admin.refresh")}
          </Button>
        }
        style={{
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        {/* 🔍 搜索 & 筛选 */}
        <Row gutter={[16, 16]} style={{ marginBottom: "1.5rem" }}>
          <Col xs={24} sm={10} md={8}>
            <Input
              placeholder={t("admin.searchPlaceholder")}
              prefix={<SearchOutlined />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Select
              value={filterCategory}
              onChange={setFilterCategory}
              style={{ width: "100%" }}
              options={allCategories.map((c) => ({ label: c === "All" ? t("search.filter") : c, value: c }))}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Select
              value={filterStock}
              onChange={setFilterStock}
              style={{ width: "100%" }}
              options={[
                { label: t("search.filter"), value: "All" },
                { label: t("admin.inStock"), value: "In stock" },
                { label: t("admin.outOfStock"), value: "Out of stock" },
              ]}
            />
          </Col>

          <Col xs={24} sm={8} md={6} style={{ textAlign: "right" }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddModalOpen(true)}
              style={{
                background: "linear-gradient(90deg,#667eea,#764ba2)",
                borderRadius: "8px",
                fontWeight: "bold",
              }}
            >
              {t("admin.addBook")}
            </Button>
          </Col>
        </Row>

        {/* 📋 表格 */}
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={filteredBooks}
          loading={loading}
          bordered
          scroll={{ x: 'max-content' }}
          pagination={{
            pageSize: 6,
            showSizeChanger: false,
            showTotal: (total) => `${t("admin.total")} ${total}`,
          }}
        />
      </Card>

      {/* ➕ 添加书籍弹窗 */}
      <Modal
        title={`➕ ${t("admin.addBook")}`}
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        footer={null}
        destroyOnClose
        centered
      >
        <Form
          layout="vertical"
          form={form}
          onFinish={handleAddBook}
          style={{ marginTop: "1rem" }}
        >
          <Form.Item label={t("admin.title")} name="title" rules={[{ required: true }]}>
            <Input placeholder={t("admin.enterTitle")} />
          </Form.Item>

          <Form.Item label={t("admin.author")} name="author" rules={[{ required: true }]}>
            <Input placeholder={t("admin.enterAuthor")} />
          </Form.Item>

          <Form.Item label={t("admin.category")} name="category" rules={[{ required: true }]}>
            <Input placeholder={t("admin.enterCategory")} />
          </Form.Item>

          <Form.Item label={t("admin.description")} name="description">
            <Input.TextArea rows={3} maxLength={200} placeholder={t("admin.descriptionPlaceholder")} />
          </Form.Item>

          <Form.Item label={t("admin.copies")} name="copies" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              icon={<PlusOutlined />}
              style={{
                height: 40,
                borderRadius: "8px",
                background: "linear-gradient(90deg,#667eea,#764ba2)",
                fontWeight: "bold",
              }}
            >
              {t("admin.addBook")}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AdminBookPage;
