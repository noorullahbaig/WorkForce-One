// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { AppNavigation, navigationRailStorageKey } from "./app-navigation";

const adminUser = {
  id: "user-admin",
  companyId: "company-merdeka",
  employeeId: null,
  name: "Aisha Rahman",
  email: "aisha@example.com",
  role: "admin" as const,
};

function renderNavigation(
  props: Partial<React.ComponentProps<typeof AppNavigation>> = {},
) {
  const router = createMemoryRouter([
    {
      path: "*",
      element: <AppNavigation admin user={adminUser} unread={2} {...props} />,
    },
  ], { initialEntries: ["/admin"] });
  return render(
    <RouterProvider router={router} />,
  );
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("AppNavigation", () => {
  test("exposes the desktop navigation state through its controlling button", async () => {
    const user = userEvent.setup();
    renderNavigation();

    const control = screen.getByRole("button", { name: "Collapse navigation" });
    const navigation = screen.getByRole("navigation", { name: "Administrator navigation" });
    expect(control).toHaveAttribute("aria-expanded", "true");
    expect(control).toHaveAttribute("aria-controls", navigation.id);

    await user.click(control);
    expect(screen.getByRole("button", { name: "Expand navigation" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("persists a collapsed desktop rail independently for each role", async () => {
    const user = userEvent.setup();
    const { unmount } = renderNavigation();

    expect(screen.getByRole("complementary")).toHaveClass("is-expanded");
    await user.click(screen.getByRole("button", { name: "Collapse navigation" }));
    expect(screen.getByRole("complementary")).toHaveClass("is-collapsed");
    expect(localStorage.getItem(navigationRailStorageKey("admin"))).toBe("collapsed");

    unmount();
    renderNavigation({ admin: false, user: { ...adminUser, role: "employee", employeeId: "employee-1" } });
    expect(screen.getByRole("complementary")).toHaveClass("is-expanded");
  });

  test("temporarily force-expands a saved collapsed rail without changing its preference", () => {
    localStorage.setItem(navigationRailStorageKey("admin"), "collapsed");
    renderNavigation({ forceExpanded: true });

    expect(screen.getByRole("complementary")).toHaveClass("is-expanded");
    expect(localStorage.getItem(navigationRailStorageKey("admin"))).toBe("collapsed");
  });

  test("keeps collapsed navigation links named and connected to their visible tooltips", async () => {
    const user = userEvent.setup();
    renderNavigation();

    await user.click(screen.getByRole("button", { name: "Collapse navigation" }));
    const desktopRail = screen.getByRole("complementary");
    const home = within(desktopRail).getByRole("link", { name: "Home" });
    expect(home).toHaveAttribute("data-tour", "admin-home");
    expect(home).toHaveAttribute("aria-describedby", "navigation-tooltip-admin-home");
    expect(screen.getByRole("tooltip", { name: "Home" })).toHaveAttribute(
      "id",
      "navigation-tooltip-admin-home",
    );
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
  });
});
