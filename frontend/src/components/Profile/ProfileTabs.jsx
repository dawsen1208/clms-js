// ✅ client/src/components/Profile/ProfileTabs.jsx
import { Tabs, Table, Tag, Pagination } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { TabPane } = Tabs;

function ProfileTabs({ 
  history, 
  requests, 
  historyColumns, 
  requestColumns, 
  renderStatusTag, 
  currentPage, 
  setCurrentPage, 
  pageSize, 
  stats 
}) {
  
  const paginatedData = history.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <Tabs defaultActiveKey="1" style={{ marginTop: "2rem" }}>
      <TabPane tab="📚 Borrow History" key="1">
        <div style={{ marginTop: "1rem" }}>
          <Table
            columns={historyColumns}
            dataSource={paginatedData}
            rowKey="_id"
            pagination={false}
            size="small"
            style={{ background: "transparent" }}
          />
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <Pagination
              current={currentPage}
              total={history.length}
              pageSize={pageSize}
              onChange={setCurrentPage}
              size="small"
              showSizeChanger={false}
              showQuickJumper={false}
              showTotal={(total) => `Total ${total} records`}
            />
          </div>
        </div>
      </TabPane>
      
      <TabPane tab="📋 My Requests" key="2">
        <div style={{ marginTop: "1rem" }}>
          <Table
            columns={requestColumns}
            dataSource={requests}
            rowKey="_id"
            pagination={false}
            size="small"
            style={{ background: "transparent" }}
          />
        </div>
      </TabPane>
    </Tabs>
  );
}

export default ProfileTabs;