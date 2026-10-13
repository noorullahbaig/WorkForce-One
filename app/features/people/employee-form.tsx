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
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const submittedHere = useRef(false);
  const [dirty, setDirty] = useState(false);
  const actionData = useActionData<{ intent?: string; ok?: string; error?: string; fieldErrors?: Record<string, string> }>();
  const navigation = useNavigation();
  const saveError = actionData?.intent === "save-employee" ? actionData.error : undefined;
  const fieldErrors = saveError ? actionData?.fieldErrors ?? {} : {};

  useEffect(() => {
    if (!open || !saveError || navigation.state !== "idle") return;
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    (firstInvalid ?? errorRef.current)?.focus();
  }, [open, saveError, actionData, navigation.state]);

  function fieldProps(name: string) {
    return {
      id: `employee-field-${name}`,
      "aria-labelledby": `employee-label-${name}`,
      "aria-invalid": fieldErrors[name] ? true as const : undefined,
      "aria-describedby": fieldErrors[name] ? `employee-error-${name}` : undefined,
    };
  }

  function fieldError(name: string) {
    return fieldErrors[name] ? <span className="field-error" id={`employee-error-${name}`}>{fieldErrors[name]}</span> : null;
  }

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

      <Form ref={formRef} method="post" className="employee-add-form review-actions" onChange={() => setDirty(true)}>
        <input type="hidden" name="intent" value="save-employee" />
        {employee && <input type="hidden" name="employeeId" value={employee.id} />}
        {saveError && <p ref={errorRef} role="alert" tabIndex={-1} className="form-error">{saveError}</p>}

        <p className="balance-field-label">Identity</p>
        <div className="form-pair tight">
          <label htmlFor="employee-field-fullName"><span id="employee-label-fullName">Full name</span><input name="fullName" {...fieldProps("fullName")} defaultValue={employee?.fullName} required />{fieldError("fullName")}</label>
          <label htmlFor="employee-field-employeeCode"><span id="employee-label-employeeCode">Employee ID</span><input name="employeeCode" {...fieldProps("employeeCode")} defaultValue={employee?.employeeCode ?? "MC-1011"} required />{fieldError("employeeCode")}</label>
        </div>
        <div className="form-pair tight">
          <label htmlFor="employee-field-email"><span id="employee-label-email">Email</span><input name="email" {...fieldProps("email")} type="email" defaultValue={employee?.email} required />{fieldError("email")}</label>
          <label htmlFor="employee-field-phone"><span id="employee-label-phone">Phone</span><input name="phone" {...fieldProps("phone")} defaultValue={employee?.phone ?? "+60 "} required />{fieldError("phone")}</label>
        </div>

        <p className="balance-field-label">Role</p>
        <div className="form-pair tight">
          <label htmlFor="employee-field-department"><span id="employee-label-department">Department</span><input name="department" {...fieldProps("department")} defaultValue={employee?.department} required />{fieldError("department")}</label>
          <label htmlFor="employee-field-position"><span id="employee-label-position">Position</span><input name="position" {...fieldProps("position")} defaultValue={employee?.position} required />{fieldError("position")}</label>
        </div>

        <p className="balance-field-label">Pay</p>
        <div className="form-pair tight">
          <label htmlFor="employee-field-employmentType"><span id="employee-label-employmentType">Employment</span><select name="employmentType" {...fieldProps("employmentType")} defaultValue={employee?.employmentType ?? "full_time"}>
              <option value="full_time">Full time</option>
              <option value="part_time">Part time</option>
              <option value="contract">Contract</option>
            </select>
          {fieldError("employmentType")}</label>
          <label htmlFor="employee-field-salaryType"><span id="employee-label-salaryType">Pay basis</span><select name="salaryType" {...fieldProps("salaryType")} defaultValue={employee?.salaryType ?? "monthly"}>
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
            </select>
          {fieldError("salaryType")}</label>
        </div>
        <div className="form-pair tight">
          <label htmlFor="employee-field-rateRm"><span id="employee-label-rateRm">Rate (RM)</span><input name="rateRm" {...fieldProps("rateRm")} type="number" min="1" step="0.01" defaultValue={((employee?.monthlySalarySen ?? employee?.hourlyRateSen ?? 450000) / 100).toFixed(2)} required />{fieldError("rateRm")}</label>
          <label htmlFor="employee-field-startDate"><span id="employee-label-startDate">Start date</span><input name="startDate" {...fieldProps("startDate")} type="date" defaultValue={employee?.startDate ?? "2026-08-26"} required />{fieldError("startDate")}</label>
        </div>

        <p className="balance-field-label">Statutory &amp; banking</p>
        <div className="form-pair tight">
          <label htmlFor="employee-field-icNumber"><span id="employee-label-icNumber">MyKad / IC No.</span><input name="icNumber" {...fieldProps("icNumber")} defaultValue={employee?.icNumber ?? ""} placeholder="920315-10-5542" />{fieldError("icNumber")}</label>
          <label htmlFor="employee-field-epfNumber"><span id="employee-label-epfNumber">KWSP / EPF No.</span><input name="epfNumber" {...fieldProps("epfNumber")} defaultValue={employee?.epfNumber ?? ""} placeholder="21498102" />{fieldError("epfNumber")}</label>
        </div>
        <div className="form-pair tight">
          <label htmlFor="employee-field-taxNumber"><span id="employee-label-taxNumber">LHDN Tax No.</span><input name="taxNumber" {...fieldProps("taxNumber")} defaultValue={employee?.taxNumber ?? ""} placeholder="SG 291048201" />{fieldError("taxNumber")}</label>
          <label htmlFor="employee-field-bankName"><span id="employee-label-bankName">Bank name</span><input name="bankName" {...fieldProps("bankName")} defaultValue={employee?.bankName ?? "Maybank"} placeholder="Maybank / CIMB" />{fieldError("bankName")}</label>
        </div>
        <label htmlFor="employee-field-bankAccountNumber"><span id="employee-label-bankAccountNumber">Bank account number</span><input name="bankAccountNumber" {...fieldProps("bankAccountNumber")} defaultValue={employee?.bankAccountNumber ?? ""} placeholder="514012384910" />{fieldError("bankAccountNumber")}</label>

        <PendingButton className="button primary" intent="save-employee" pendingLabel="Saving…">
          {employee ? "Save changes" : "Add employee"}
        </PendingButton>
      </Form>
    </aside>
  );
}
