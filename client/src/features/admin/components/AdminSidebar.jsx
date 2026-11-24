import DashboardSidebar from '../../../components/ui/DashboardSidebar';
const items = [
  { name: "Overview", path: "/admin" },
  { name: "Farmers", path: "/admin/farmers" },
  { name: "Verification", path: "/admin/verification" },
  { name: "Field officers", path: "/admin/field-officers" },
  { name: "Buyers", path: "/admin/buyers" },
  { name: "Products", path: "/admin/products" },
  { name: "Categories", path: "/admin/categories" },
  { name: "Orders", path: "/admin/orders" },
  { name: "Payments", path: "/admin/payments" },
  { name: "Notifications", path: "/admin/notifications" },
  { name: "Exceptions & refunds", path: "/admin/exceptions" },
  { name: "Audit history", path: "/admin/audit" },
  { name: "Reports", path: "/admin/reports" },
  { name: "Settings", path: "/admin/settings" },
];
export default function AdminSidebar() { return <DashboardSidebar items={items} portal="Admin portal" home="/admin" />; }
