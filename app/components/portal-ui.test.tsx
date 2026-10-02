// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createMemoryRouter, Form, RouterProvider, useLocation } from "react-router";
import {
  ActionToast,
  SubmissionNotice,
  hasInlineErrorOwner,
  navigationFeedbackMessage,
  PendingButton,
  ScrollableRegion,
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

  test("expires success after four seconds and repeats identical results", () => {
    vi.useFakeTimers();
    const {rerender} = render(<ActionToast result={{ok: "Saved", submissionId: "one"}} />);
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(<ActionToast result={{ok: "Saved", submissionId: "two"}} />);
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
  });
  test("a new success expires after keyboard dismissal of the previous result", () => {
    vi.useFakeTimers();
    const {rerender} = render(<ActionToast result={{ok:"Saved", submissionId:"one"}} />);
    const close = screen.getByRole("button", {name:"Dismiss notification"});
    fireEvent.focus(close);
    fireEvent.click(close);
    rerender(<ActionToast result={{ok:"Saved", submissionId:"two"}} />);
    expect(screen.getByRole("status")).toBeVisible();
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("pauses success while hovered and keeps errors until dismissed", () => {
    vi.useFakeTimers();
    const {rerender} = render(<ActionToast result={{ok: "Saved"}} />);
    fireEvent.mouseEnter(screen.getByRole("status"));
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByRole("status")).toBeVisible();
    fireEvent.mouseLeave(screen.getByRole("status"));
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    rerender(<ActionToast result={{error: "Check dates"}} />);
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByRole("alert")).toHaveTextContent("Check dates");
  });

  test("announces errors assertively", () => {
    render(<ActionToast result={{ error: "Review the required fields." }} />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Review the required fields.",
    );
  });
});

test("routes errors only to the active form that submitted them", () => {
  expect(hasInlineErrorOwner("apply-leave", "/employee/leave", "?request=new")).toBe(true);
  expect(hasInlineErrorOwner("apply-leave", "/employee/leave", "")).toBe(false);
  expect(hasInlineErrorOwner("request-attendance-correction", "/employee/attendance", "?correct=one")).toBe(true);
  expect(hasInlineErrorOwner("employee-clock", "/employee/attendance", "?correct=one")).toBe(false);
  expect(hasInlineErrorOwner("review-attendance-correction", "/admin/attendance/corrections", "?request=one")).toBe(true);
});

describe("submission notices", () => {
  test("consumes redirect notices and retains calendar context", async () => {
    function Page() { const location=useLocation(); return <><SubmissionNotice/><span>{location.search}</span></>; }
    const router=createMemoryRouter([{path:"*",element:<Page/>}],{initialEntries:["/employee/leave?month=2026-08&date=2026-08-25&view=calendar&notice=leave-submitted&noticeId=one"]});
    render(<RouterProvider router={router}/>);
    expect(await screen.findByRole("status")).toHaveTextContent("Leave request sent for approval.");
    expect(screen.getByRole("status")).toHaveClass("toast");
    expect(screen.getByRole("status")).not.toHaveClass("alert");
    expect(screen.getByRole("status")).toHaveTextContent("Leave request sent for approval.");
    expect(router.state.location.search).toBe("?month=2026-08&date=2026-08-25&view=calendar");
    await act(()=>router.navigate("/employee/payslips"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("task workspace", () => {
  test("keeps orientation, actions, and commands in named workspace regions", () => {
    render(
      <TaskWorkspace label="Employee directory" scrollMode="list">
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
    expect(workspace).toHaveClass("task-workspace", "scroll-list");
    expect(screen.getByRole("heading", { name: "Employee directory" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add employee" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Employee controls" })).toContainElement(
      screen.getByRole("textbox", { name: "Search employees" }),
    );
  });

  test("gives long content one named keyboard-scrollable owner", () => {
    render(
      <ScrollableRegion label="Employee results">
        <p>Last employee</p>
      </ScrollableRegion>,
    );

    const region = screen.getByRole("region", { name: "Employee results" });
    expect(region).toHaveClass("scrollable-region");
    expect(region).toHaveAttribute("tabindex", "0");
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
