import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";

import { PendingButton } from "../../components/portal-ui";

export type EmployeeFormRecord = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  employmentType: string;
  salaryType: "monthly" | "hourly";
  monthlySalarySen: number | null;
  hourlyRateSen: number | null;
  startDate: string;
  status: string;
  icNumber: string | null;
  epfNumber: string | null;
  taxNumber: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
};

export type EmployeeFormProps = {
  employee?: EmployeeFormRecord;
  open: boolean;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>;
};

export function EmployeeForm({
  employee,
  open,
  onClose,
  returnFocusRef,
}: EmployeeFormProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const submittedHere = useRef(false);
  const [dirty, setDirty] = useState(false);
  const actionData = useActionData<{ ok?: string; error?: string }>();
  const navigation = useNavigation();

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (navigation.state === "submitting" && navigation.formData?.get("intent") === "save-employee") {
      submittedHere.current = true;
      return;
    }
    if (navigation.state === "idle" && submittedHere.current && actionData?.ok?.startsWith("Employee ")) {
      submittedHere.current = false;
      setDirty(false);
      onClose();
      window.requestAnimationFrame(() => returnFocusRef?.current?.focus());
    }
  }, [actionData, navigation.formData, navigation.state, onClose, returnFocusRef]);

  useEffect(() => {
    if (!open || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, open]);

  if (!open) return null;

  function close() {
    if (dirty && !window.confirm("Discard unsaved employee changes?")) return;
    setDirty(false);
    onClose();
    window.requestAnimationFrame(() => returnFocusRef?.current?.focus());
  }

  return (
    <aside
      className="employee-form-inspector surface"
      aria-labelledby="employee-form-title"
      data-testid="employee-form-inspector"
    >
      <div className="inspector-heading">
        <div className="inspector-heading-text">
          <p className="eyebrow">{employee ? "Edit employee" : "New employee"}</p>
          <h2 id="employee-form-title" ref={headingRef} tabIndex={-1}>
            {employee ? employee.fullName : "Add an employee"}
          </h2>
        </div>
        <button className="inspector-close" type="button" aria-label="Close employee form" onClick={close}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <Form method="post" className="employee-add-form review-actions" onChange={() => setDirty(true)}>
        <input type="hidden" name="intent" value="save-employee" />
        {employee && <input type="hidden" name="employeeId" value={employee.id} />}

        <p className="balance-field-label">Identity</p>
        <div className="form-pair tight">
          <label>Full name<input name="fullName" defaultValue={employee?.fullName} required /></label>
          <label>Employee ID<input name="employeeCode" defaultValue={employee?.employeeCode ?? "MC-1011"} required /></label>
        </div>
        <div className="form-pair tight">
          <label>Email<input name="email" type="email" defaultValue={employee?.email} required /></label>
          <label>Phone<input name="phone" defaultValue={employee?.phone ?? "+60 "} required /></label>
        </div>

        <p className="balance-field-label">Role</p>
        <div className="form-pair tight">
          <label>Department<input name="department" defaultValue={employee?.department} required /></label>
          <label>Position<input name="position" defaultValue={employee?.position} required /></label>
        </div>

        <p className="balance-field-label">Pay</p>
        <div className="form-pair tight">
          <label>Employment
            <select name="employmentType" defaultValue={employee?.employmentType ?? "full_time"}>
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
            </select>
          </label>
          <label>Pay basis
            <select name="salaryType" defaultValue={employee?.salaryType ?? "monthly"}>
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
            </select>
          </label>
        </div>
        <div className="form-pair tight">
          <label>Rate (RM)<input name="rateRm" type="number" min="1" step="0.01" defaultValue={((employee?.monthlySalarySen ?? employee?.hourlyRateSen ?? 450000) / 100).toFixed(2)} required /></label>
          <label>Start date<input name="startDate" type="date" defaultValue={employee?.startDate ?? "2026-08-26"} required /></label>
        </div>

        <p className="balance-field-label">Statutory &amp; banking</p>
        <div className="form-pair tight">
          <label>MyKad / IC No.<input name="icNumber" defaultValue={employee?.icNumber ?? ""} placeholder="920315-10-5542" /></label>
          <label>KWSP / EPF No.<input name="epfNumber" defaultValue={employee?.epfNumber ?? ""} placeholder="21498102" /></label>
        </div>
        <div className="form-pair tight">
          <label>LHDN Tax No.<input name="taxNumber" defaultValue={employee?.taxNumber ?? ""} placeholder="SG 291048201" /></label>
          <label>Bank name<input name="bankName" defaultValue={employee?.bankName ?? "Maybank"} placeholder="Maybank / CIMB" /></label>
        </div>
        <label>Bank account number<input name="bankAccountNumber" defaultValue={employee?.bankAccountNumber ?? ""} placeholder="514012384910" /></label>

        <PendingButton className="button primary" intent="save-employee" pendingLabel="Saving…">
          {employee ? "Save changes" : "Add employee"}
        </PendingButton>
      </Form>
    </aside>
  );
}
