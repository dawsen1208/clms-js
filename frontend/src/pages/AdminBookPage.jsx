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
  Typography,
  Grid,
  List,
  Tag,
  theme
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  BookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { getBooks, addBook, deleteBook } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import PageShell from "../components/common/PageShell";
import KPIStatCard from "../components/common/KPIStatCard";

const { Text: AntText } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

function AdminBookPage() {
  const { t } = useLanguage();
  const { token } = useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [form] = Form.useForm();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStock, setFilterStock] = useState("All");

  const authToken = sessionStorage.getItem("token") || localStorage.getItem("token");

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
      const res = await addBook(values, authToken);
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
      await deleteBook(id, authToken);
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

  const stats = {
    total: books.length,
    inStock: books.filter(b => b.copies > 0).length,
    outOfStock: books.filter(b => b.copies <= 0).length,
    categories: new Set(books.map(b => b.category)).size
  };

  /** ✅ 表格列 */
  const columns = [
    { title: t("admin.bookId"), dataIndex: "_id", key: "_id", width: 200, ellipsis: true },
    { title: t("admin.title"), dataIndex: "title", key: "title", ellipsis: true },
    { title: t("admin.author"), dataIndex: "author", key: "author", ellipsis: true },
    { 
      title: t("admin.category"), 
      dataIndex: "category", 
      key: "category",
      render: (cat) => <Tag>{cat}</Tag>
    },
    {
      title: t("admin.stock"),
      dataIndex: "copies",
      key: "copies",
      align: "center",
      render: (copies) => (
        <Tag color={copies > 0 ? "success" : "error"}>
          {copies > 0 ? `${copies} ${t("admin.copies")}` : t("admin.outOfStock")}
        </Tag>
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
          <Button danger icon={<DeleteOutlined />} size="small" type="text">
            {t("admin.delete")}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <PageShell
      title={t("admin.bookManage")}
      subtitle={t("admin.bookManageSubtitle") || "Manage library collection and inventory"}
      extra={
        <Button 
          icon={<ReloadOutlined />} 
          onClick={fetchBooks}
          loading={loading}
        >
          {t("admin.refresh")}
        </Button>
      }
    >
      
      {/* 📊 统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <KPIStatCard
            title={t("admin.totalBooks")}
            value={stats.total}
            icon={<BookOutlined />}
            color={token.colorPrimary}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <KPIStatCard
            title={t("admin.inStock")}
            value={stats.inStock}
            icon={<CheckCircleOutlined />}
            color={token.colorSuccess}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <KPIStatCard
            title={t("admin.outOfStock")}
            value={stats.outOfStock}
            icon={<CloseCircleOutlined />}
            color={token.colorError}
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <KPIStatCard
            title={t("admin.category")}
            value={stats.categories}
            icon={<TagsOutlined />}
            color={token.colorWarning}
            loading={loading}
          />
        </Col>
      </Row>

      <Card
        bordered={false}
        style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }}
        bodyStyle={{ padding: "24px" }}
      >
        {/* 🔍 搜索 & 筛选 */}
        <Row gutter={[16, 16]} style={{ marginBottom: "1.5rem" }}>
          <Col xs={24} sm={10} md={8}>
            <Input
              placeholder={t("admin.searchPlaceholder")}
              prefix={<SearchOutlined style={{ color: token.colorTextDescription }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
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

          <Col xs={24} sm={8} md={8} style={{ textAlign: "right" }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddModalOpen(true)}
            >
              {t("admin.addBook")}
            </Button>
          </Col>
        </Row>

        {/* 📋 表格/列表 */}
        {isMobile ? (
          <List
            loading={loading}
            dataSource={filteredBooks}
            pagination={{ pageSize: 6 }}
            renderItem={(item) => (
              <List.Item style={{ padding: 0, marginBottom: 16 }}>
                <Card 
                  hoverable
                  style={{ width: '100%', borderRadius: 12 }}
                  actions={[
                    <Popconfirm
                      title={t("admin.confirmDelete")}
                      onConfirm={() => handleDelete(item._id)}
                      okText={t("common.confirm")}
                      cancelText={t("admin.cancel")}
                    >
                      <Button danger type="text" icon={<DeleteOutlined />}>{t("admin.delete")}</Button>
                    </Popconfirm>
                  ]}
                >
                  <Card.Meta
                    title={<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{fontWeight: 'bold', fontSize: '16px', maxWidth: '70%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{item.title}</span>
                      <Tag color={item.copies > 0 ? "success" : "error"}>{item.copies > 0 ? t("admin.inStock") : t("admin.outOfStock")}</Tag>
                    </div>}
                    description={
                      <div style={{ marginTop: 8 }}>
                        <div style={{marginBottom: 4}}>👤 {t("admin.author")}: {item.author}</div>
                        <div style={{marginBottom: 4}}>🏷️ {t("admin.category")}: {item.category}</div>
                        <div>📦 {t("admin.stock")}: <span style={{color: item.copies > 0 ? token.colorSuccess : token.colorError, fontWeight: 'bold'}}>{item.copies}</span></div>
                      </div>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={filteredBooks}
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `${t("admin.total")} ${total}`,
            }}
          />
        )}
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
              style={{ height: 40 }}
            >
              {t("admin.addBook")}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}

export default AdminBookPage;
