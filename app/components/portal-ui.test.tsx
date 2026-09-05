// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ActionToast, navigationFeedbackMessage } from "./portal-ui";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("navigation feedback", () => {
  test("uses task-specific messages for writes", () => {
    expect(navigationFeedbackMessage("submitting", "finalise-payroll")).toBe(
      "Finalising payroll…",
    );
    expect(
      navigationFeedbackMessage("submitting", "review-attendance-correction"),
    ).toBe("Saving correction decision…");
  });

  test("names the destination for route changes", () => {
    expect(
      navigationFeedbackMessage("loading", "", "/admin/attendance/corrections"),
    ).toBe("Opening attendance…");
    expect(navigationFeedbackMessage("loading", "", "/employee/payslips")).toBe(
      "Opening payslips…",
    );
  });
});

describe("ActionToast", () => {
  test("announces success and can be dismissed", async () => {
    const user = userEvent.setup();
    render(<ActionToast result={{ ok: "Changes saved." }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Changes saved.");
    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("announces errors assertively", () => {
    render(<ActionToast result={{ error: "Review the required fields." }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Review the required fields.",
    );
  });
});
