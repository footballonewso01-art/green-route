export function getDashboardBrowserTitle(pathname: string): string {
  if (pathname === "/admin" || pathname === "/admin/overview") return "Admin Overview";
  if (pathname.startsWith("/admin/users/")) return "Admin User";
  if (pathname.startsWith("/admin/users")) return "Admin Users";
  if (pathname.startsWith("/admin/links")) return "Link Safety";
  if (pathname.startsWith("/admin/promocodes/")) return "Promocode Details";
  if (pathname.startsWith("/admin/promocodes")) return "Promocodes";
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/dashboard/links/create") return "Create link";
  if (pathname.startsWith("/dashboard/links/edit/")) return "Edit link";
  if (pathname.startsWith("/dashboard/links")) return "Links";
  if (pathname.startsWith("/dashboard/analytics")) return "Analytics";
  if (pathname.startsWith("/dashboard/profile")) return "Profiles";
  if (pathname.startsWith("/dashboard/billing")) return "Billing";
  if (pathname.startsWith("/dashboard/pricing")) return "Pricing";
  if (pathname.startsWith("/dashboard/partner")) return "Partner Overview";
  if (pathname.startsWith("/dashboard/settings")) return "Settings";
  if (pathname.startsWith("/dashboard/help")) return "Help Center";
  return "Dashboard";
}
