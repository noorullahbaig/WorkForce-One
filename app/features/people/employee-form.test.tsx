// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, test, vi } from "vitest";
import { EmployeeForm, type EmployeeFormRecord } from "./employee-form";

const employee: EmployeeFormRecord = {
  id: "emp-001",
  employeeCode: "MC-1001",
  fullName: "Farah Iskandar",
  email: "farah@example.com",
  phone: "+60123456789",
  department: "Operations",
  position: "Barista",
  employmentType: "full_time",
  salaryType: "monthly",
  monthlySalarySen: 320000,
  hourlyRateSen: null,
  startDate: "2026-01-01",
  status: "active",
  icNumber: null,
  epfNumber: null,
  taxNumber: null,
  bankName: "Maybank",
  bankAccountNumber: null,
};

function renderForm(props: Partial<React.ComponentProps<typeof EmployeeForm>> = {}, actionData?: Record<string, unknown>) {
  const router = createMemoryRouter([
    {
      path: "/",
      action: () => actionData ?? {},
      element: (
        <EmployeeForm
          open
          onClose={vi.fn()}
          {...props}
        />
      ),
    },
  ]);
  return { ...render(<RouterProvider router={router} />), router };
}

afterEach(cleanup);

describe("EmployeeForm", () => {
  test("renders a focused add form with the existing save intent", () => {
    renderForm();

    expect(screen.getByRole("heading", { name: "Add an employee" })).toHaveFocus();
    expect(screen.getByDisplayValue("MC-1011")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add employee" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("save-employee")).toHaveValue("save-employee");
  });

  test("renders edit values and closes through the inspector control", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderForm({ employee, onClose });

    expect(screen.getByRole("heading", { name: "Farah Iskandar" })).toHaveFocus();
    expect(screen.getByDisplayValue("Farah Iskandar")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close employee form" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});


test("shows one save error summary and accessible field errors, focuses the first invalid field", async () => {
 const {router} = renderForm({employee}, {intent:"save-employee",error:"Review the highlighted employee fields.",fieldErrors:{email:"Enter a valid email address.",bankAccountNumber:"Enter 6–34 digits."}});
 const data = new FormData(); data.set("intent","save-employee");
 await act(async () => { await router.navigate("/", {formMethod:"post",formData:data}); });
 expect(screen.getAllByRole("alert")).toHaveLength(1);
 expect(screen.getByRole("alert")).toHaveTextContent("Review the highlighted employee fields.");
 const email = screen.getByRole("textbox",{name:"Email"});
 expect(email).toHaveAttribute("aria-invalid","true");
 expect(email).toHaveAccessibleDescription("Enter a valid email address.");
 expect(email).toHaveFocus();
 expect(email).toHaveValue("farah@example.com");
 expect(screen.getByRole("textbox",{name:"Bank account number"})).toHaveAccessibleDescription("Enter 6–34 digits.");
 expect(screen.getByRole("textbox",{name:"Full name"})).not.toHaveAttribute("aria-invalid");
});

test("ignores errors from unrelated intents", async () => {
 const {router} = renderForm({employee}, {intent:"update-self-profile",error:"Other error",fieldErrors:{email:"Other field error"}});
 const data = new FormData(); data.set("intent","update-self-profile");
 await act(async () => { await router.navigate("/",{formMethod:"post",formData:data}); });
 expect(screen.queryByRole("alert")).not.toBeInTheDocument();
 expect(screen.getByRole("textbox",{name:"Email"})).not.toHaveAttribute("aria-invalid");
});

test("focuses the save summary when the server returns a general error", async () => {
 const {router} = renderForm({employee}, {intent:"save-employee",error:"Employee not found in your company."});
 const data = new FormData(); data.set("intent","save-employee");
 await act(async () => { await router.navigate("/",{formMethod:"post",formData:data}); });
 expect(screen.getAllByRole("alert")).toHaveLength(1);
 expect(screen.getByRole("alert")).toHaveFocus();
});
