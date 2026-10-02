import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useNavigation } from "react-router";

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

export function hasInlineErrorOwner(intent: string, path: string, search: string) {
  const params = new URLSearchParams(search);
  return (intent === "apply-leave" && path === "/employee/leave" && params.get("request") === "new") ||
    (intent === "request-attendance-correction" && path === "/employee/attendance" && params.has("correct")) ||
    (intent === "review-attendance-correction" && path === "/admin/attendance/corrections" && params.has("request"));
}

export type ActionFeedback = ({ ok: string } | { error: string }) & {
  intent?: string;
  submissionId?: string;
  feedbackPath?: string;
};

export function ActionToast({ result }: { result: ActionFeedback }) {
  const [visible, setVisible] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remaining = useRef(4000);
  const isError = "error" in result;
  const message = isError ? result.error : result.ok;
  useEffect(() => {
    remaining.current = 4000;
    setVisible(true);
  }, [result]);
  useEffect(() => {
    if (!visible || isError || hovered || focused) return;
    const started = Date.now();
    const timeout = window.setTimeout(() => setVisible(false), remaining.current);
    return () => {
      window.clearTimeout(timeout);
      remaining.current = Math.max(0, remaining.current - (Date.now() - started));
    };
  }, [result, visible, isError, hovered, focused]);
  if (!visible) return null;
  return <div className={`toast ${isError ? "danger" : "success"}`}
    role={isError ? "alert" : "status"}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    {isError ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
    <span>{message}</span>
    <button type="button" aria-label="Dismiss notification" onClick={() => { setVisible(false); setHovered(false); setFocused(false); }}><X aria-hidden="true" /></button>
  </div>;
}

/** Redirect confirmations are consumed once, outside the working surface. */
export function SubmissionNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const [flash, setFlash] = useState<{ result: ActionFeedback; path: string; search: string } | null>(null);
  const consumed = useRef(new Set<string>());
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.pathname === "/employee/leave" && params.get("notice") === "leave-submitted") {
      const id = params.get("noticeId") ?? location.key;
      params.delete("notice");
      params.delete("noticeId");
      const search = params.size ? `?${params.toString()}` : "";
      if (!consumed.current.has(id)) {
        consumed.current.add(id);
        setFlash({result:{ok:"Leave request sent for approval.", submissionId:id, intent:"apply-leave"}, path:location.pathname, search});
      }
      void navigate({pathname:location.pathname, search}, {replace:true, preventScrollReset:true});
    } else {
      setFlash(current => current && (current.path !== location.pathname || current.search !== location.search) ? null : current);
    }
  }, [location.pathname, location.search, location.key, navigate]);
  return flash ? <ActionToast result={flash.result} /> : null;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && (typeof eyebrow === "string" ? <p className="eyebrow">{eyebrow}</p> : eyebrow)}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  );
}

export function TaskWorkspace({
  label,
  scrollMode = "page",
  children,
  className = "",
}: {
  label: string;
  scrollMode?: "page" | "list" | "split";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`task-workspace scroll-${scrollMode} ${className}`.trim()}
      role="region"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function ScrollableRegion({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`scrollable-region${className ? ` ${className}` : ""}`}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="workspace-header">
      <div>
        {eyebrow ? (typeof eyebrow === "string" ? <p className="eyebrow">{eyebrow}</p> : eyebrow) : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="workspace-actions">{action}</div> : null}
    </header>
  );
}

export function WorkspaceToolbar({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`workspace-toolbar${className ? ` ${className}` : ""}`}
      role="toolbar"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function PendingButton({
  intent,
  pendingLabel,
  children,
  disabled,
  className = "button primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  intent: string;
  pendingLabel: string;
}) {
  const navigation = useNavigation();
  const pending =
    navigation.state === "submitting" &&
    String(navigation.formData?.get("intent") ?? "") === intent;
  return (
    <button
      {...props}
      className={className}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <LoaderCircle className="button-spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : children}
    </button>
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
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}
