import {
  Bell,
  CalendarDays,
  Clock3,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Form, Link, NavLink } from "react-router";

import { initials } from "../lib/format";
import type { DemoUser } from "../services/auth.server";

export type NavigationRole = "admin" | "employee";

type NavigationItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  tour: string;
};

const navigationStorageVersion = "v1";

const adminItems: NavigationItem[] = [
  { to: "/admin", icon: LayoutDashboard, label: "Home", tour: "admin-home" },
  { to: "/admin/employees", icon: Users, label: "People", tour: "admin-people" },
  { to: "/admin/attendance", icon: Clock3, label: "Attendance", tour: "admin-attendance" },
  { to: "/admin/leave", icon: CalendarDays, label: "Leave", tour: "admin-leave" },
  { to: "/admin/payroll", icon: WalletCards, label: "Payroll", tour: "admin-payroll" },
  { to: "/admin/reports", icon: FileText, label: "Reports", tour: "admin-reports" },
];

const employeeItems: NavigationItem[] = [
  { to: "/employee", icon: Home, label: "Home", tour: "employee-home" },
  { to: "/employee/attendance", icon: Clock3, label: "Attendance", tour: "employee-attendance" },
  { to: "/employee/leave", icon: CalendarDays, label: "Leave", tour: "employee-leave" },
  { to: "/employee/payslips", icon: WalletCards, label: "Payslips", tour: "employee-payslips" },
  { to: "/employee/profile", icon: UserRound, label: "Profile", tour: "employee-profile" },
];

export function navigationRailStorageKey(role: NavigationRole) {
  return `workforce-one:navigation-rail:${navigationStorageVersion}:${role}`;
}

function storedPreference(role: NavigationRole) {
  if (typeof window === "undefined") return "expanded";
  try {
    return localStorage.getItem(navigationRailStorageKey(role)) === "collapsed"
      ? "collapsed"
      : "expanded";
  } catch {
    return "expanded";
  }
}

function NavigationTooltip({ id, label }: { id: string; label: string }) {
  return <span className="navigation-tooltip" id={id} role="tooltip">{label}</span>;
}

export function AppNavigation({
  admin,
  user,
  unread,
  forceExpanded = false,
  onCollapsedChange,
}: {
  admin: boolean;
  user: DemoUser;
  unread: number;
  forceExpanded?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const role: NavigationRole = admin ? "admin" : "employee";
  const [preference, setPreference] = useState<"expanded" | "collapsed">("expanded");
  const expanded = forceExpanded || preference === "expanded";
  const items = admin ? adminItems : employeeItems;
  const bottomItems = admin ? adminItems.filter((item) => item.label !== "Reports") : employeeItems;
  const notificationHref = admin ? "/admin/notifications" : "/employee/notifications";
  const notificationTour = admin ? undefined : "employee-notifications";

  useEffect(() => {
    setPreference(storedPreference(role));
  }, [role]);

  useEffect(() => {
    onCollapsedChange?.(!expanded);
  }, [expanded, onCollapsedChange]);

  function updatePreference(nextPreference: "expanded" | "collapsed") {
    setPreference(nextPreference);
    try {
      localStorage.setItem(navigationRailStorageKey(role), nextPreference);
    } catch {
      // Keep the in-memory preference when storage is unavailable.
    }
  }

  const railClassName = `sidebar navigation-rail ${expanded ? "is-expanded" : "is-collapsed"}`;
  const railControlLabel = forceExpanded
    ? "Navigation remains expanded during product tour"
    : expanded
      ? "Collapse navigation"
      : "Expand navigation";
  const railToggleTooltipId = "navigation-tooltip-toggle";
  const signOutTooltipId = "navigation-tooltip-sign-out";
  const navigationId = `navigation-rail-${role}`;

  return (
    <>
      <aside className={railClassName} aria-label={`${admin ? "Administrator" : "Employee"} workspace`}>
        <div className="navigation-rail-header">
          <div className="wordmark inverse"><span>W1</span><strong className="navigation-rail-copy">Workforce One</strong></div>
          <button
            type="button"
            className="navigation-rail-toggle"
            aria-describedby={expanded ? undefined : railToggleTooltipId}
            aria-label={railControlLabel}
            aria-controls={navigationId}
            aria-expanded={expanded}
            disabled={forceExpanded}
            onClick={() => updatePreference(expanded ? "collapsed" : "expanded")}
          >
            {expanded ? <PanelLeftClose aria-hidden="true" /> : <PanelLeftOpen aria-hidden="true" />}
            {!expanded && <NavigationTooltip id={railToggleTooltipId} label="Expand navigation" />}
          </button>
        </div>
        <p className="nav-label">Workspace</p>
        <nav id={navigationId} aria-label={admin ? "Administrator navigation" : "Employee navigation"}>
          {items.map(({ to, icon: Icon, label, tour }) => {
            const tooltipId = `navigation-tooltip-${tour}`;
            return (
              <NavLink
                aria-describedby={expanded ? undefined : tooltipId}
                aria-label={label}
                data-tour={tour}
                end={to === (admin ? "/admin" : "/employee")}
                key={to}
                to={to}
              >
                <Icon aria-hidden="true" />
                <span className="navigation-rail-copy">{label}</span>
                {label === "Home" && unread > 0 ? <b>{unread}</b> : null}
                {!expanded && <NavigationTooltip id={tooltipId} label={label} />}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <Link
            aria-describedby={expanded ? undefined : "navigation-tooltip-notifications"}
            aria-label="Notifications"
            data-tour={notificationTour}
            to={notificationHref}
          >
            <Bell aria-hidden="true" />
            <span className="navigation-rail-copy">Notifications</span>
            {unread ? <b>{unread}</b> : null}
            {!expanded && <NavigationTooltip id="navigation-tooltip-notifications" label="Notifications" />}
          </Link>
          <Form method="post" action="/logout">
            <button aria-describedby={expanded ? undefined : signOutTooltipId} aria-label="Sign out" type="submit">
              <LogOut aria-hidden="true" />
              <span className="navigation-rail-copy">Sign out</span>
              {!expanded && <NavigationTooltip id={signOutTooltipId} label="Sign out" />}
            </button>
          </Form>
          <div className="account">
            <div className="avatar">{initials(user.name)}</div>
            <span className="navigation-rail-copy"><strong>{user.name}</strong><small>{admin ? "People administrator" : "Employee"}</small></span>
          </div>
        </div>
      </aside>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {bottomItems.map(({ to, icon: Icon, label, tour }) => (
          <NavLink data-tour={tour} end={to === (admin ? "/admin" : "/employee")} to={to} key={to}>
            <Icon aria-hidden="true" /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
