import React from "react";
import { Card, Typography, Button, Form, Input, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useLanguage } from "../contexts/LanguageContext";

const { Title } = Typography;

const AdminSettingsPage = () => {
  const { t } = useLanguage();
  const [form] = Form.useForm();

  const handleSave = (values) => {
    message.success(t("common.success") || "Saved successfully");
    // Implement actual save logic here (e.g., update admin profile or system config)
  };

  return (
    <div className="page-container">
      <Title level={2} className="page-modern-title">
        {t("admin.settings") || "Admin Settings"}
      </Title>
      <Card title={t("admin.profileSettings") || "Profile Settings"} bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            email: "admin@library.com",
            name: "Administrator"
          }}
        >
          <Form.Item label={t("common.name") || "Name"} name="name">
            <Input />
          </Form.Item>
          <Form.Item label={t("common.email") || "Email"} name="email">
            <Input disabled />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              {t("common.save") || "Save Changes"}
            </Button>
          </Form.Item>
        </Form>
      </Card>
      
      <Card title="System Information" bordered={false} style={{ marginTop: 24 }}>
        <p>Version: 1.3.1</p>
        <p>Environment: Production</p>
      </Card>
    </div>
  );
};

export default AdminSettingsPage;
