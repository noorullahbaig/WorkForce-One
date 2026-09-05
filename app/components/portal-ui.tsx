import { FileText } from "lucide-react";
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
