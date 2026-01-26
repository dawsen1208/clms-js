// ✅ client/src/components/Profile/ProfileInfo.jsx
import { Card, Typography, Button, Input, Space } from "antd";
import { SaveOutlined, EditOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

const { Title, Text } = Typography;

function ProfileInfo({ userLS, email, setEmail, emailEditing, setEmailEditing, handleSaveEmail }) {
  const [tempEmail, setTempEmail] = useState(email);
  const { t } = useLanguage();

  const handleEditEmail = () => {
    setTempEmail(email);
    setEmailEditing(true);
  };

  const handleCancelEdit = () => {
    setEmailEditing(false);
    setTempEmail(email);
  };

  return (
    <Card 
      title={t("profile.accountInfo")}
      style={{ 
        borderRadius: 16,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(5px)"
      }}
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0" }}>
          <Text strong style={{ color: "#374151" }}>{t("profile.userIdLabel")}</Text>
          <Text style={{ color: "#6b7280", fontFamily: "monospace" }}>{userLS.userId || userLS._id}</Text>
        </div>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0" }}>
          <Text strong style={{ color: "#374151" }}>{t("profile.roleLabel")}</Text>
          <Text style={{ color: "#6b7280" }}>{userLS.role || "Reader"}</Text>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0" }}>
          <Text strong style={{ color: "#374151" }}>{t("profile.emailLabel")}</Text>
          {emailEditing ? (
            <Space>
              <Input
                value={tempEmail}
                onChange={(e) => setTempEmail(e.target.value)}
                placeholder={t("profile.emailPlaceholder")}
                size="small"
                style={{ width: 200 }}
              />
              <Button 
                type="primary" 
                size="small" 
                icon={<SaveOutlined />}
                onClick={() => {
                  setEmail(tempEmail);
                  handleSaveEmail();
                }}
                style={{ 
                  borderRadius: 8,
                  background: "linear-gradient(90deg, #10b981, #059669)",
                  border: "none"
                }}
              >
                {t("common.save")}
              </Button>
              <Button size="small" onClick={handleCancelEdit} style={{ borderRadius: 8 }}>
                {t("common.cancel")}
              </Button>
            </Space>
          ) : (
            <Space>
              <Text style={{ color: "#6b7280" }}>{email || t("profile.notSet")}</Text>
              <Button 
                type="link" 
                icon={<EditOutlined />}
                onClick={handleEditEmail}
                size="small"
                style={{ color: "#3b82f6" }}
              >
                {t("common.edit")}
              </Button>
            </Space>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0" }}>
          <Text strong style={{ color: "#374151" }}>{t("profile.nameLabel")}</Text>
          <Text style={{ color: "#6b7280" }}>{userLS.name || t("profile.unnamedUser")}</Text>
        </div>
      </div>
    </Card>
  );
}

export default ProfileInfo;