import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

type NavigationState = "idle" | "loading" | "submitting";

const actionMessages: Record<string, string> = {
  "add-adjustment": "Adding payroll adjustment…",
  "adjust-leave-balance": "Updating leave balance…",
  "apply-leave": "Submitting leave request…",
  "cancel-approved-leave": "Cancelling leave…",
  "clone-policy": "Creating payroll policy…",
  "delete-adjustment": "Removing payroll adjustment…",
  "employee-clock": "Recording attendance…",
  "finalise-payroll": "Finalising payroll…",
  "read-all-notifications": "Updating notifications…",
  "read-notification": "Updating notification…",
  "request-attendance-correction": "Submitting correction request…",
  "review-attendance-correction": "Saving correction decision…",
  "review-leave": "Saving leave decision…",
  "save-employee": "Saving employee record…",
  "save-holiday": "Saving holiday…",
  "simulate-attendance": "Recording attendance…",
  "toggle-employee-status": "Updating employee status…",
  "update-leave-policy": "Saving leave policy…",
  "update-self-profile": "Saving profile…",
  "withdraw-leave": "Withdrawing leave request…",
};

const destinationLabels: [string, string][] = [
  ["/attendance", "attendance"],
  ["/employees", "people"],
  ["/leave", "leave"],
  ["/payroll", "payroll"],
  ["/payslips", "payslips"],
  ["/reports", "reports"],
  ["/notifications", "notifications"],
  ["/profile", "profile"],
];

export function navigationFeedbackMessage(
  state: NavigationState,
  intent = "",
  destination = "",
) {
  if (state === "submitting") return actionMessages[intent] ?? "Saving changes…";
  const match = destinationLabels.find(([path]) => destination.includes(path));
  return match ? `Opening ${match[1]}…` : "Loading workspace…";
}

export function NavigationFeedback({
  state,
  intent,
  destination,
}: {
  state: Exclude<NavigationState, "idle">;
  intent?: string;
  destination?: string;
}) {
  return (
    <div className="navigation-feedback" role="status" aria-live="polite">
      <LoaderCircle aria-hidden="true" />
      <span>{navigationFeedbackMessage(state, intent, destination)}</span>
    </div>
  );
}

export function ActionToast({
  result,
}: {
  result: { ok: string } | { error: string };
}) {
  const [visible, setVisible] = useState(true);
  const isError = "error" in result;
  const message = isError ? result.error : result.ok;

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), 6000);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;
  return (
    <div
      className={`toast ${isError ? "danger" : "success"}`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      {isError ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
      <span>{message}</span>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => setVisible(false)}
      >
        <X aria-hidden="true" />
      </button>
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span className={`status ${value.replaceAll("_", "-")}`}>
      <i />
      {value.replaceAll("_", " ")}
    </span>
  );
}
export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty">
      <FileText />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
