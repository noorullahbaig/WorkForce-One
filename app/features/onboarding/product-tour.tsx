import { ArrowLeft, ArrowRight, Check, Compass } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ProductTourRole = "admin" | "employee";

type TourStep = {
  target: string;
  title: string;
  body: string;
};

const steps: Record<ProductTourRole, TourStep[]> = {
  admin: [
    {
      target: "admin-home",
      title: "Home and action queue",
      body: "Start here to see attendance exceptions, pending requests, leave decisions, and payroll work that needs attention.",
    },
    {
      target: "admin-people",
      title: "People directory",
      body: "Open employee records, employment details, pay basis, statutory information, and banking details.",
    },
    {
      target: "admin-attendance",
      title: "Attendance and corrections",
      body: "Review daily attendance, incomplete clock-outs, and correction requests submitted by employees.",
    },
    {
      target: "admin-payroll",
      title: "Payroll review",
      body: "Validate employee inputs, resolve blockers, add adjustments, and finalise a payroll period.",
    },
    {
      target: "admin-reports",
      title: "Reports and exports",
      body: "Download finalised payroll reports and the files used for payroll operations.",
    },
  ],
  employee: [
    {
      target: "employee-home",
      title: "Your employee home",
      body: "See today’s attendance, leave balance, latest pay, and recent updates in one place.",
    },
    {
      target: "employee-attendance",
      title: "Attendance",
      body: "Clock in or out, review your history, and request a correction when a record is incomplete or incorrect.",
    },
    {
      target: "employee-leave",
      title: "Leave",
      body: "Check your balance, review team availability, and submit or track leave requests.",
    },
    {
      target: "employee-payslips",
      title: "Payslips",
      body: "Open finalised payslips, review earnings and deductions, and download a PDF copy.",
    },
    {
      target: "employee-notifications",
      title: "Notifications and profile",
      body: "Follow request decisions and payroll updates here. Open your profile from the account menu in the top-right corner.",
    },
  ],
};

export function tourStorageKey(role: ProductTourRole) {
  return `workforce-one:product-tour:v1:${role}`;
}

export function ProductTour({
  role,
  replayToken = 0,
  onOpenChange,
}: {
  role: ProductTourRole;
  replayToken?: number;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const primaryAction = useRef<HTMLButtonElement>(null);
  const roleSteps = steps[role];
  const step = roleSteps[stepIndex];

  useEffect(() => {
    setStepIndex(0);
    setOpen(localStorage.getItem(tourStorageKey(role)) !== "complete");
  }, [role]);

  useEffect(() => {
    if (replayToken > 0) {
      setStepIndex(0);
      setOpen(true);
    }
  }, [replayToken]);

  useEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);

  useEffect(() => {
    document
      .querySelectorAll(".product-tour-target")
      .forEach((element) => element.classList.remove("product-tour-target"));
    if (!open) return;
    const candidates = Array.from(
      document.querySelectorAll(`[data-tour="${step.target}"]`),
    );
    const target =
      candidates.find((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      }) ?? candidates[0];
    target?.classList.add("product-tour-target");
    primaryAction.current?.focus();
    return () => target?.classList.remove("product-tour-target");
  }, [open, step.target]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") complete();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function complete() {
    localStorage.setItem(tourStorageKey(role), "complete");
    setOpen(false);
  }

  if (!open) return null;
  const isLast = stepIndex === roleSteps.length - 1;

  return (
    <div className="product-tour-layer">
      <div
        className="product-tour-card"
        role="dialog"
        aria-modal="false"
        aria-labelledby="product-tour-title"
        aria-describedby="product-tour-description"
      >
        <div className="product-tour-progress">
          <span>
            <Compass size={15} aria-hidden="true" /> Product tour
          </span>
          <span>Step {stepIndex + 1} of {roleSteps.length}</span>
        </div>
        <h2 id="product-tour-title">{step.title}</h2>
        <p id="product-tour-description">{step.body}</p>
        <div className="product-tour-dots" aria-hidden="true">
          {roleSteps.map((item, index) => (
            <i className={index === stepIndex ? "active" : ""} key={item.target} />
          ))}
        </div>
        <div className="product-tour-actions">
          <button type="button" className="tour-skip" onClick={complete}>
            Skip tour
          </button>
          <div>
            {stepIndex > 0 && (
              <button
                type="button"
                className="button secondary"
                onClick={() => setStepIndex((value) => value - 1)}
              >
                <ArrowLeft size={15} /> Back
              </button>
            )}
            <button
              ref={primaryAction}
              type="button"
              className="button primary"
              aria-label={isLast ? "Finish tour" : "Next"}
              onClick={() =>
                isLast ? complete() : setStepIndex((value) => value + 1)
              }
            >
              {isLast ? (
                <>
                  Finish <Check size={15} />
                </>
              ) : (
                <>
                  Next <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
