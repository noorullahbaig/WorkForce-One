// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createMemoryRouter, Form, RouterProvider } from "react-router";
import {
  ActionToast,
  navigationFeedbackMessage,
  PendingButton,
  TaskWorkspace,
  WorkspaceHeader,
  WorkspaceToolbar,
} from "./portal-ui";

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

describe("task workspace", () => {
  test("keeps orientation, actions, and commands in named workspace regions", () => {
    render(
      <TaskWorkspace label="Employee directory" bounded>
        <WorkspaceHeader
          eyebrow="People"
          title="Employee directory"
          description="Employment and pay profiles"
          action={<button type="button">Add employee</button>}
        />
        <WorkspaceToolbar label="Employee controls">
          <input aria-label="Search employees" />
        </WorkspaceToolbar>
      </TaskWorkspace>,
    );

    const workspace = screen.getByRole("region", { name: "Employee directory" });
    expect(workspace).toHaveClass("task-workspace", "is-bounded");
    expect(screen.getByRole("heading", { name: "Employee directory" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add employee" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Employee controls" })).toContainElement(
      screen.getByRole("textbox", { name: "Search employees" }),
    );
  });
});

describe("PendingButton", () => {
  test("keeps the page context while the submitted action reports progress locally", async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      {
        path: "/",
        action: async () => new Promise(() => {}),
        element: (
          <>
            <h1>Payroll review</h1>
            <Form method="post">
              <input type="hidden" name="intent" value="finalise-payroll" />
              <PendingButton intent="finalise-payroll" pendingLabel="Finalising payroll…">
                Finalise payroll
              </PendingButton>
            </Form>
          </>
        ),
      },
    ]);
    render(<RouterProvider router={router} />);

    await user.click(screen.getByRole("button", { name: "Finalise payroll" }));
    expect(screen.getByRole("heading", { name: "Payroll review" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Finalising payroll…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Finalising payroll…" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
