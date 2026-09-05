// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ProductTour, tourStorageKey } from "./product-tour";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function NavigationTargets() {
  return (
    <nav>
      <a data-tour="admin-home" href="/admin">Home</a>
      <a data-tour="admin-people" href="/admin/employees">People</a>
      <a data-tour="admin-attendance" href="/admin/attendance">Time</a>
      <a data-tour="admin-payroll" href="/admin/payroll">Payroll</a>
      <a data-tour="admin-reports" href="/admin/reports">Reports</a>
    </nav>
  );
}

describe("ProductTour", () => {
  test("walks through the administrator navigation and remembers completion", async () => {
    const user = userEvent.setup();
    render(
      <>
        <NavigationTargets />
        <ProductTour role="admin" />
      </>,
    );

    expect(await screen.findByRole("dialog", { name: "Home and action queue" })).toBeVisible();
    expect(screen.getByText("Step 1 of 5")).toBeVisible();
    expect(document.querySelector('[data-tour="admin-home"]')).toHaveClass("product-tour-target");

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("dialog", { name: "People directory" })).toBeVisible();
    expect(document.querySelector('[data-tour="admin-people"]')).toHaveClass("product-tour-target");

    await user.click(screen.getByRole("button", { name: "Skip tour" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(tourStorageKey("admin"))).toBe("complete");
  });

  test("keeps completion separate by role and supports replay", async () => {
    localStorage.setItem(tourStorageKey("admin"), "complete");
    const { rerender } = render(<ProductTour role="admin" replayToken={0} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(<ProductTour role="admin" replayToken={1} />);
    expect(await screen.findByRole("dialog", { name: "Home and action queue" })).toBeVisible();

    cleanup();
    render(<ProductTour role="employee" />);
    expect(await screen.findByRole("dialog", { name: "Your employee home" })).toBeVisible();
  });

  test("supports keyboard navigation and finishes on the last step", async () => {
    const user = userEvent.setup();
    render(
      <>
        <NavigationTargets />
        <ProductTour role="admin" />
      </>,
    );
    await screen.findByRole("dialog");
    for (let step = 1; step < 5; step += 1) {
      await user.click(screen.getByRole("button", { name: "Next" }));
    }
    expect(screen.getByRole("button", { name: "Finish tour" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(tourStorageKey("admin"))).toBe("complete");
  });
});
