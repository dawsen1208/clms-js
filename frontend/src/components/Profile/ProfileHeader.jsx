// ✅ client/src/components/Profile/ProfileHeader.jsx
import { Avatar, Typography, Button, Upload } from "antd";
import { UserOutlined, UploadOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";

const { Title, Text } = Typography;

function ProfileHeader({ userLS, avatarUrl, name, onAvatarUpload, avatarUploading }) {
  const { t } = useLanguage();
  // Ensure we don't display mixed content if passed down prop is still raw
  // But usually parent component passes processed URL.
  // We trust avatarUrl is already processed by parent.
  
  return (
    <div className="profile-header-card">
      <Avatar
        size={120}
        icon={<UserOutlined />}
        src={avatarUrl || undefined}
        style={{
          background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
          marginBottom: "1rem",
          boxShadow: "0 8px 25px rgba(59, 130, 246, 0.3)",
          border: "3px solid white"
        }}
      />
      <Title level={2} style={{ margin: 0, color: "#1e293b", fontSize: "24px", fontWeight: 600 }}>
        {name || t("profile.unnamedUser")}
      </Title>
      <Text type="secondary" style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
        {userLS.role || "Reader"}
      </Text>

      <Upload
        showUploadList={false}
        customRequest={onAvatarUpload}
        accept="image/*"
      >
        <Button
          type="primary"
          size="middle"
          icon={<UploadOutlined />}
          loading={avatarUploading}
          style={{ 
            marginTop: "1rem",
            borderRadius: 12,
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
            border: "none",
            boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
            transition: "all 0.3s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(59, 130, 246, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(59, 130, 246, 0.3)";
          }}
        >
          {t("profile.changeAvatar")}
        </Button>
      </Upload>
    </div>
  );
}

export default ProfileHeader;