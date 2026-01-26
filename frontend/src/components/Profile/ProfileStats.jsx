// ✅ client/src/components/Profile/ProfileStats.jsx
import { Card, Statistic } from "antd";
import { useLanguage } from "../../contexts/LanguageContext";

function ProfileStats({ stats }) {
  const { t } = useLanguage();
  return (
    <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "2rem" }}>
      <Card style={{ borderRadius: 16, background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", border: "none", boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)" }}>
        <Statistic 
          title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("profile.historyStats")}</span>} 
          value={stats.totalHistory} 
          valueStyle={{ color: "white", fontWeight: "bold", fontSize: "24px" }}
        />
      </Card>
      <Card style={{ borderRadius: 16, background: "linear-gradient(135deg, #10b981, #059669)", border: "none", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)" }}>
        <Statistic 
          title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("profile.returnedStats")}</span>} 
          value={stats.returned} 
          valueStyle={{ color: "white", fontWeight: "bold", fontSize: "24px" }}
        />
      </Card>
      <Card style={{ borderRadius: 16, background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", border: "none", boxShadow: "0 4px 15px rgba(139, 92, 246, 0.3)" }}>
        <Statistic 
          title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("profile.renewedStats")}</span>} 
          value={stats.renewed} 
          valueStyle={{ color: "white", fontWeight: "bold", fontSize: "24px" }}
        />
      </Card>
      <Card style={{ borderRadius: 16, background: "linear-gradient(135deg, #f59e0b, #d97706)", border: "none", boxShadow: "0 4px 15px rgba(245, 158, 11, 0.3)" }}>
        <Statistic 
          title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("profile.pendingRequestsStats")}</span>} 
          value={stats.pending} 
          valueStyle={{ color: "white", fontWeight: "bold", fontSize: "24px" }}
        />
      </Card>
    </div>
  );
}

export default ProfileStats;