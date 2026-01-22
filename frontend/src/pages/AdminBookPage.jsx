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

function AdminBookPage() {
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
      message.error("Failed to load books");
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
      message.success(res.data.message || "Book added successfully!");
      setAddModalOpen(false);
      form.resetFields();
      fetchBooks();
    } catch (err) {
      console.error("❌ Failed to add book:", err);
      message.error(err.response?.data?.message || "Failed to add book");
    }
  };

  /** ✅ 删除书籍 */
  const handleDelete = async (id) => {
    try {
      await deleteBook(id, token);
      message.success("Book deleted successfully!");
      fetchBooks();
    } catch (err) {
      console.error("❌ Delete failed:", err);
      message.error("Delete failed, please try again later");
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
  const allCategories = ["All", ...new Set(books.map((b) => b.category || "Unknown"))];

  /** ✅ 表格列 */
  const columns = [
    { title: "Book ID", dataIndex: "_id", key: "_id", width: 200 },
    { title: "Title", dataIndex: "title", key: "title" },
    { title: "Author", dataIndex: "author", key: "author" },
    { title: "Category", dataIndex: "category", key: "category" },
    {
      title: "Stock",
      dataIndex: "copies",
      key: "copies",
      align: "center",
      render: (copies) => (
        <span style={{ color: copies > 0 ? "green" : "red" }}>
          {copies > 0 ? `${copies} copies` : "Out of stock"}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "center",
      render: (_, record) => (
        <Popconfirm
          title="Confirm deleting this book?"
          onConfirm={() => handleDelete(record._id)}
          okText="Confirm"
          cancelText="Cancel"
        >
          <Button danger icon={<DeleteOutlined />} size="small">
            Delete
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: "1.5rem" }}>
      <Card
        title="📚 Book Management"
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchBooks}>
            Refresh
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
              placeholder="Search by title or author..."
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
              options={allCategories.map((c) => ({ label: c, value: c }))}
            />
          </Col>

          <Col xs={12} sm={6} md={4}>
            <Select
              value={filterStock}
              onChange={setFilterStock}
              style={{ width: "100%" }}
              options={[
                { label: "All", value: "All" },
                { label: "In stock", value: "In stock" },
                { label: "Out of stock", value: "Out of stock" },
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
              Add Book
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
            showTotal: (t) => `Total ${t} books`,
          }}
        />
      </Card>

      {/* ➕ 添加书籍弹窗 */}
      <Modal
        title="➕ Add New Book"
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
          <Form.Item label="Title" name="title" rules={[{ required: true }]}>
            <Input placeholder="Enter title" />
          </Form.Item>

          <Form.Item label="Author" name="author" rules={[{ required: true }]}>
            <Input placeholder="Enter author" />
          </Form.Item>

          <Form.Item label="Category" name="category" rules={[{ required: true }]}>
            <Input placeholder="e.g., Literature / Technology / History" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} maxLength={200} placeholder="Description (optional)" />
          </Form.Item>

          <Form.Item label="Copies" name="copies" rules={[{ required: true }]}>
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
              Add Book
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AdminBookPage;
