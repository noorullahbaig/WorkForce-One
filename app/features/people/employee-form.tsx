import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Form } from "react-router";

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

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function close() {
    onClose();
    window.requestAnimationFrame(() => returnFocusRef?.current?.focus());
  }

  return (
    <aside
      className="employee-form-inspector surface"
      aria-labelledby="employee-form-title"
      data-testid="employee-form-inspector"
    >
      <div className="employee-form-heading">
        <div>
          <p className="eyebrow">People · Employee record</p>
          <h2 id="employee-form-title" ref={headingRef} tabIndex={-1}>
            {employee ? "Edit employee profile" : "Add an employee"}
          </h2>
          <p>
            {employee
              ? "Keep employment, pay and statutory details up to date."
              : "Add employment, pay and statutory details to the directory."}
          </p>
        </div>
        <button className="employee-form-close" type="button" aria-label="Close employee form" onClick={close}>
          <X aria-hidden="true" />
        </button>
      </div>
      <Form method="post" className="form-stack">
        <input type="hidden" name="intent" value="save-employee" />
        {employee && <input type="hidden" name="employeeId" value={employee.id} />}
        <div className="form-pair">
          <label>Full name<input name="fullName" defaultValue={employee?.fullName} required /></label>
          <label>Employee ID<input name="employeeCode" defaultValue={employee?.employeeCode ?? "MC-1011"} required /></label>
        </div>
        <div className="form-pair">
          <label>Email<input name="email" type="email" defaultValue={employee?.email} required /></label>
          <label>Phone<input name="phone" defaultValue={employee?.phone ?? "+60 "} required /></label>
        </div>
        <div className="form-pair">
          <label>Department<input name="department" defaultValue={employee?.department} required /></label>
          <label>Position<input name="position" defaultValue={employee?.position} required /></label>
        </div>
        <div className="form-pair">
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
        <div className="form-pair">
          <label>Rate (RM)<input name="rateRm" type="number" min="1" step="0.01" defaultValue={((employee?.monthlySalarySen ?? employee?.hourlyRateSen ?? 450000) / 100).toFixed(2)} required /></label>
          <label>Start date<input name="startDate" type="date" defaultValue={employee?.startDate ?? "2026-08-26"} required /></label>
        </div>
        <div className="form-pair">
          <label>MyKad / IC No.<input name="icNumber" defaultValue={employee?.icNumber ?? ""} placeholder="920315-10-5542" /></label>
          <label>KWSP / EPF Member No.<input name="epfNumber" defaultValue={employee?.epfNumber ?? ""} placeholder="21498102" /></label>
        </div>
        <div className="form-pair">
          <label>LHDN Tax No.<input name="taxNumber" defaultValue={employee?.taxNumber ?? ""} placeholder="SG 291048201" /></label>
          <label>Bank Name<input name="bankName" defaultValue={employee?.bankName ?? "Maybank"} placeholder="Maybank / CIMB / Public Bank" /></label>
        </div>
        <label>Bank Account Number<input name="bankAccountNumber" defaultValue={employee?.bankAccountNumber ?? ""} placeholder="514012384910" /></label>
        <PendingButton className="button primary" intent="save-employee" pendingLabel="Saving employee…">
          {employee ? "Save changes" : "Add employee"}
        </PendingButton>
      </Form>
    </aside>
  );
}
