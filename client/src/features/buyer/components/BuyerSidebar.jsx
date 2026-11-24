import DashboardSidebar from '../../../components/ui/DashboardSidebar';
const items = [
  { name: "Overview", path: "/buyer", end: true },
  { name: "Browse products", path: "/buyer/browse" },
  { name: "Saved products", path: "/buyer/saved" },
  { name: "Cart", path: "/buyer/cart" },
  { name: "My orders", path: "/buyer/orders" },
  { name: "Resolution requests", path: "/buyer/issues" },
  { name: "Payments", path: "/buyer/payments" },
  { name: "Reviews", path: "/buyer/reviews" },
  { name: "Notifications", path: "/buyer/notifications" },
  { name: "My profiles", path: "/profile" },
  { name: "Marketplace", path: "/marketplace" },
];
export default function BuyerSidebar() { return <DashboardSidebar items={items} portal="Buyer portal" home="/buyer" />; }
