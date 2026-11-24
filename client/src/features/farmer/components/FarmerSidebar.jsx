import DashboardSidebar from '../../../components/ui/DashboardSidebar';
const items = [
  { name: "Overview", path: "/farmer", end: true },
  { name: "My profiles", path: "/profile" },
  { name: "My products", path: "/farmer/products" },
  { name: "Add product", path: "/farmer/products/new" },
  { name: "Resolution requests", path: "/farmer/issues" },
  { name: "Orders", path: "/farmer/orders" },
  { name: "Payments", path: "/farmer/payments" },
  { name: "Reviews", path: "/farmer/reviews" },
  { name: "Notifications", path: "/farmer/notifications" },
  { name: "Settings", path: "/farmer/settings" },
  { name: "Marketplace", path: "/marketplace" },
];
export default function FarmerSidebar() { return <DashboardSidebar items={items} portal="Farmer portal" home="/farmer" />; }
