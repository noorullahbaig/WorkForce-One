import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Form, Link, useNavigate, useSearchParams } from "react-router";
import {
	calculateLeaveDurationHalfDays,
	calculateProjectedBalance,
	getEarliestLeaveDate,
	getCoverageSummary,
	getLeaveDatePolicyError,
	rangesOverlap,
	type LeaveDayPart,
} from "../../domain/leave";
import { addCalendarDays, todayInTimeZone } from "../../lib/date";
import { date, initials } from "../../lib/format";
import { PendingButton } from "../../components/portal-ui";

export type LeaveRecord = {
  id: string;
  employeeId: string;
  fullName: string;
  department: string;
  leaveTypeId: string;
  typeName: string;
  paid: number;
  startDate: string;
  endDate: string;
  durationHalfDays: number;
  dayPart: string;
  reason: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
};
export type SharedLeaveRecord = Pick<
  LeaveRecord,
  "id" | "employeeId" | "fullName" | "department" | "startDate" | "endDate"
>;
export type LeaveBalanceSummary = {
  employeeId: string;
  leaveTypeId: string;
  name: string;
  paid: number;
  allocatedHalfDays: number;
  adjustmentHalfDays: number;
  approvedHalfDays: number;
  pendingHalfDays: number;
};
export type HolidayRecord = {
  id: string;
  name: string;
  date: string;
  category: "public" | "company";
  region: string;
  observed: number;
  active: number;
};
type CalendarEvent = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  kind: "holiday" | "away" | "own" | "pending";
  meta?: string;
  employeeId?: string;
  confirmedAway?: boolean;
  staffingLabel?: string;
};

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const halfDays = (value: number) =>
  Number.isInteger(value / 2) ? String(value / 2) : (value / 2).toFixed(1);
const validMonth = (value: string | null, today: string) =>
  value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : today.slice(0, 7);
function daysInMonth(month: string) {
  const current = new Date(`${month}-01T00:00:00Z`);
  current.setUTCMonth(current.getUTCMonth() + 1, 0);
  return current.getUTCDate();
}
function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const current = new Date(`${value}T00:00:00Z`);
  return current.toISOString().slice(0, 10) === value;
}
function selectedDateForMonth(month: string, selectedDate: string | null, today: string) {
  if (!selectedDate || !isCalendarDate(selectedDate)) {
    return month === today.slice(0, 7) ? today : `${month}-01`;
  }
  if (selectedDate.startsWith(month)) return selectedDate;
  const day = Math.min(Number(selectedDate.slice(8)), daysInMonth(month));
  return `${month}-${String(day).padStart(2, "0")}`;
}
function shiftMonth(month: string, delta: number) {
  const current = new Date(`${month}-01T00:00:00Z`);
  current.setUTCMonth(current.getUTCMonth() + delta);
  return current.toISOString().slice(0, 7);
}
function shiftDate(day: string, delta: number) {
  return addCalendarDays(day, delta);
}
function monthDays(month: string) {
  const first = new Date(`${month}-01T00:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setUTCDate(start.getUTCDate() + index);
    return current.toISOString().slice(0, 10);
  });
}

function confirmedPeopleForDate(
  day: string,
  events: CalendarEvent[],
  holidayDates: Set<string>,
) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  if (weekday === 0 || weekday === 6 || holidayDates.has(day)) return [];

  return Array.from(
    new Map(
      events
        .filter(
          (event) =>
            event.confirmedAway &&
            event.employeeId &&
            rangesOverlap(day, day, event.startDate, event.endDate),
        )
        .map((event) => [event.employeeId, event]),
    ).values(),
  ).sort((a, b) => {
    if (a.staffingLabel === "You") return -1;
    if (b.staffingLabel === "You") return 1;
    return (a.staffingLabel ?? a.label).localeCompare(
      b.staffingLabel ?? b.label,
    );
  });
}

function CalendarToolbar({
  month,
  basePath,
  today,
  requestOpen = false,
  admin = false,
  actions,
}: {
  month: string;
  basePath: string;
  today: string;
  requestOpen?: boolean;
  admin?: boolean;
  actions?: ReactNode;
}) {
  const [params] = useSearchParams();
  const makeHref = (nextMonth: string, view?: string) => {
    const next = new URLSearchParams(params);
    next.set("month", nextMonth);
    next.set("date", selectedDateForMonth(nextMonth, params.get("date"), today));
    if (view) next.set("view", view);
    else next.delete("view");
    if (requestOpen) next.set("request", "new");
    else if (params.get("request") === "new") next.delete("request");
    next.delete("notice");
    return `${basePath}?${next.toString()}`;
  };
  const todayParams = new URLSearchParams(params);
  todayParams.set("month", today.slice(0, 7));
  todayParams.set("date", today);
  if (requestOpen) todayParams.set("request", "new");
  else if (params.get("request") === "new") todayParams.delete("request");
  todayParams.delete("notice");
  return (
    <div className="leave-toolbar">
      <div className="month-control">
        <Link
          className="calendar-nav"
          aria-label="Previous month"
          to={makeHref(shiftMonth(month, -1))}
          preventScrollReset
        >
          <ChevronLeft />
        </Link>
        <h2>{date(`${month}-01`, { month: "long", year: "numeric" })}</h2>
        <Link
          className="calendar-nav"
          aria-label="Next month"
          to={makeHref(shiftMonth(month, 1))}
          preventScrollReset
        >
          <ChevronRight />
        </Link>
        <Link
          className="button secondary compact-button"
          to={`${basePath}?${todayParams.toString()}`}
          preventScrollReset
        >
          Today
        </Link>
      </div>
      <div className="calendar-toolbar-actions">
        <div className="calendar-view-switch" aria-label="Calendar view">
          <Link
            className={
              !params.get("view") || params.get("view") === "calendar"
                ? "active"
                : ""
            }
            to={makeHref(month)}
            preventScrollReset
          >
            Calendar
          </Link>
          <Link
            className={params.get("view") === "agenda" ? "active" : ""}
            to={makeHref(month, "agenda")}
            preventScrollReset
          >
            Agenda
          </Link>
          <span className="privacy-note">
            <Users />
            {admin ? "Admin detail" : "Names and dates only"}
          </span>
        </div>
        {actions}
      </div>
    </div>
  );
}

function SharedCalendar({
  month,
  events,
  holidayDates,
  basePath,
  selectedDate,
  today,
}: {
  month: string;
  events: CalendarEvent[];
  holidayDates: string[];
  basePath: string;
  selectedDate: string;
  today: string;
}) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const mounted = useRef(false);
  const label = `${date(`${month}-01`, { month: "long", year: "numeric" })} shared leave calendar`;
  const days = monthDays(month);
  const holidayDateSet = new Set(holidayDates);
  useEffect(() => {
    if (mounted.current) {
      document.querySelector<HTMLElement>(`[data-calendar-date="${selectedDate}"]`)?.focus();
    }
    mounted.current = true;
  }, [selectedDate]);
  const moveSelection = (day: string, key: string) => {
    const delta =
      key === "ArrowLeft"
        ? -1
        : key === "ArrowRight"
          ? 1
          : key === "ArrowUp"
            ? -7
            : key === "ArrowDown"
              ? 7
              : 0;
    if (!delta) return;
    const nextDay = shiftDate(day, delta);
    const next = new URLSearchParams(params);
    next.set("month", nextDay.slice(0, 7));
    next.set("date", nextDay);
    next.delete("notice");
    navigate(`${basePath}?${next.toString()}`, { preventScrollReset: true });
  };
  return (
    <div className="leave-calendar" role="grid" aria-label={label}>
      <div className="calendar-row" role="row">
        {DAY_NAMES.map((name) => (
          <div className="calendar-weekday" role="columnheader" key={name}>
            {name}
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }, (_, week) => (
        <div className="calendar-row" role="row" key={week}>
          {days.slice(week * 7, week * 7 + 7).map((day) => {
            const dayEvents = events.filter((event) =>
              rangesOverlap(day, day, event.startDate, event.endDate),
            );
            const confirmedPeople = confirmedPeopleForDate(
              day,
              dayEvents,
              holidayDateSet,
            );
            const calendarEvents = dayEvents.filter(
              (event) => !event.confirmedAway || event.kind === "own",
            );
            const isToday = day === today;
            const isSelected = day === selectedDate;
            const dayLabel = date(day, {
              weekday: "long",
              day: "numeric",
              month: "long",
            });
            const next = new URLSearchParams(params);
            next.set("month", day.slice(0, 7));
            next.set("date", day);
            next.delete("notice");
            return (
              <div
                className={`calendar-day${day.slice(0, 7) !== month ? " outside" : ""}${isToday ? " today" : ""}${isSelected ? " selected" : ""}`}
                role="gridcell"
                aria-selected={isSelected}
                aria-label={dayLabel}
                key={day}
              >
                <Link
                  className="calendar-date"
                  to={`${basePath}?${next.toString()}`}
                  data-calendar-date={day}
                  aria-label={`${dayLabel}, ${confirmedPeople.length} ${confirmedPeople.length === 1 ? "person" : "people"} away`}
                  aria-current={isToday ? "date" : undefined}
                  tabIndex={isSelected ? 0 : -1}
                  preventScrollReset
                  onKeyDown={(event) => {
                    if (event.key.startsWith("Arrow")) event.preventDefault();
                    moveSelection(day, event.key);
                  }}
                >
                  {Number(day.slice(8))}
                </Link>
                {confirmedPeople.length ? (
                  <div className="confirmed-away" aria-hidden="true">
                    <strong>{confirmedPeople.length} away</strong>
                    <span className="confirmed-away-people">
                      {confirmedPeople.slice(0, 2).map((event) => {
                        const label = event.staffingLabel ?? event.label;
                        return (
                          <span
                            className="confirmed-away-person"
                            title={label}
                            key={event.employeeId}
                          >
                            <i>{initials(label)}</i>
                            <b>{label}</b>
                          </span>
                        );
                      })}
                      {confirmedPeople.length > 2 ? (
                        <small>+{confirmedPeople.length - 2}</small>
                      ) : null}
                    </span>
                  </div>
                ) : null}
                <div className="calendar-events">
                  {calendarEvents.slice(0, 3).map((event) => (
                    <span
                      className={`calendar-event ${event.kind}`}
                      title={event.meta ?? event.label}
                      aria-label={event.meta ? `${event.label}, ${event.meta}` : event.label}
                      key={`${day}-${event.id}`}
                    >
                      <i>
                        {event.kind === "holiday" ? "H" : initials(event.label)}
                      </i>
                      <b>{event.label}</b>
                    </span>
                  ))}
                  {calendarEvents.length > 3 ? (
                    <small>+{calendarEvents.length - 3} more</small>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function Agenda({ events, month }: { events: CalendarEvent[]; month: string }) {
  const sorted = [...events]
    .filter((event) => event.startDate.startsWith(month))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return (
    <section className="leave-agenda" aria-label="Leave agenda">
      {sorted.length ? (
        sorted.map((event) => (
          <article key={event.id}>
            <time dateTime={event.startDate}>
              {date(event.startDate, { day: "numeric", month: "short" })}
            </time>
            <span className={`event-dot ${event.kind}`} />
            <div>
              <strong>{event.label}</strong>
              <small>
                {event.meta ??
                  (event.startDate === event.endDate
                    ? "One day"
                    : `${date(event.startDate)} to ${date(event.endDate)}`)}
              </small>
            </div>
          </article>
        ))
      ) : (
        <div className="leave-empty">
          <CalendarDays />
          <strong>No events this month</strong>
          <span>Approved leave and holidays will appear here.</span>
        </div>
      )}
    </section>
  );
}
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status ${status}`}>
      <i />
      {status}
    </span>
  );
}

export function EmployeeLeaveWorkspace({
  employeeId,
  ownRecords,
  sharedRecords,
  balances,
  holidays,
  today,
  backdateDays = 3,
}: {
  employeeId: string;
  ownRecords: LeaveRecord[];
  sharedRecords: SharedLeaveRecord[];
  balances: LeaveBalanceSummary[];
  holidays: HolidayRecord[];
  today?: string;
  backdateDays?: number;
}) {
  const [params] = useSearchParams();
  const resolvedToday = today ?? todayInTimeZone(new Date(), "Asia/Kuala_Lumpur");
  const month = validMonth(params.get("month"), resolvedToday);
  const selectedDate = selectedDateForMonth(
    month,
    params.get("date"),
    resolvedToday,
  );
  const requestOpen = params.get("request") === "new";
  const agenda = params.get("view") === "agenda";
  const events: CalendarEvent[] = [
    ...holidays
      .filter((h) => h.active)
      .map((h) => ({
        id: h.id,
        label: h.name,
        startDate: h.date,
        endDate: h.date,
        kind: "holiday" as const,
        meta: h.observed ? "Observed public holiday" : "Public holiday",
      })),
    ...sharedRecords
      .filter((r) => r.employeeId !== employeeId)
      .map((r) => ({
        id: r.id,
        label: r.fullName,
        startDate: r.startDate,
        endDate: r.endDate,
        kind: "away" as const,
        meta: `${r.department} · away`,
        employeeId: r.employeeId,
        confirmedAway: true,
        staffingLabel: r.fullName,
      })),
    ...ownRecords
      .filter((r) => r.status === "approved" || r.status === "pending")
      .map((r) => ({
        id: r.id,
        label: "Your leave",
        startDate: r.startDate,
        endDate: r.endDate,
        kind: r.status === "pending" ? ("pending" as const) : ("own" as const),
        meta: `${r.typeName} · ${r.status}`,
        employeeId: r.employeeId,
        confirmedAway: r.status === "approved",
        staffingLabel: "You",
      })),
  ];
  const selectedEvents = events.filter((event) =>
    rangesOverlap(selectedDate, selectedDate, event.startDate, event.endDate),
  );
  return (
    <>
      <header className="leave-page-header">
        <div>
          <p className="eyebrow">Self-service / Leave</p>
          <h1>Plan time away</h1>
          <p>
            Check company availability, understand your balance, and request
            leave in context.
          </p>
        </div>
        <Link
          className="button primary"
          to={`/employee/leave?month=${month}&date=${selectedDate}&request=new`}
        >
          <Plus />
          Request leave
        </Link>
      </header>
      <section
        className="leave-balance-rail"
        aria-label="Leave balances"
        tabIndex={0}
      >
        {balances.map((balance) => {
          const summary = calculateProjectedBalance(balance);
          return (
            <article key={balance.leaveTypeId}>
              <span>{balance.name}</span>
              <strong>
                {balance.paid
                  ? `${halfDays(summary.availableHalfDays)} days`
                  : "No limit"}
              </strong>
              <small>
                {balance.pendingHalfDays
                  ? `${halfDays(summary.projectedHalfDays)} days projected`
                  : `${halfDays(balance.approvedHalfDays)} used · ${halfDays(balance.allocatedHalfDays)} entitled`}
              </small>
            </article>
          );
        })}
      </section>
      {params.get("notice") === "leave-submitted" ? (
        <div className="alert success" role="status">
          <Check />
          <span>Leave request sent for approval.</span>
        </div>
      ) : null}
      <section className="leave-workspace">
        <div className="calendar-canvas surface">
          <CalendarToolbar
            month={month}
            basePath="/employee/leave"
            today={resolvedToday}
            requestOpen={requestOpen}
          />
          {agenda ? (
            <Agenda events={events} month={month} />
          ) : (
            <SharedCalendar
              month={month}
              events={events}
              holidayDates={holidays.filter((h) => h.active).map((h) => h.date)}
              basePath="/employee/leave"
              selectedDate={selectedDate}
              today={resolvedToday}
            />
          )}
        </div>
        <aside
          className={`leave-inspector surface${requestOpen ? " open" : ""}`}
          aria-label={requestOpen ? "Request leave" : "Selected date details"}
        >
          {requestOpen ? (
            <RequestPanel
              balances={balances}
              selectedDate={selectedDate}
              holidays={holidays}
              today={resolvedToday}
              backdateDays={backdateDays}
            />
          ) : (
            <DayPanel selectedDate={selectedDate} events={selectedEvents} />
          )}
        </aside>
      </section>
      <section className="request-history">
        <div className="section-head">
          <div>
            <p className="eyebrow">Your activity</p>
            <h2>Request history</h2>
          </div>
          <span>{ownRecords.length} total</span>
        </div>
        {ownRecords.length ? (
          ownRecords.map((record) => (
            <article key={record.id}>
              <div className="request-date">
                <b>{Number(record.startDate.slice(8))}</b>
                <small>{date(record.startDate, { month: "short" })}</small>
              </div>
              <div>
                <strong>{record.typeName}</strong>
                <small>
                  {halfDays(record.durationHalfDays)} day
                  {record.durationHalfDays === 2 ? "" : "s"} · {record.reason}
                </small>
              </div>
              <StatusBadge status={record.status} />
              {record.status === "pending" ? (
                <Form method="post">
                  <input type="hidden" name="intent" value="withdraw-leave" />
                  <input type="hidden" name="id" value={record.id} />
                  <button
                    className="button ghost"
                    aria-label={`Withdraw ${record.typeName} request`}
                  >
                    <X />
                    Withdraw
                  </button>
                </Form>
              ) : null}
            </article>
          ))
        ) : (
          <div className="leave-empty">
            <CalendarDays />
            <strong>No requests yet</strong>
            <span>Select a date in the calendar to plan your first leave.</span>
          </div>
        )}
      </section>
    </>
  );
}

function DayPanel({
  selectedDate,
  events,
}: {
  selectedDate: string;
  events: CalendarEvent[];
}) {
  return (
    <>
      <div className="inspector-heading">
        <p className="eyebrow">Selected date</p>
        <h2>
          {date(selectedDate, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </h2>
      </div>
      {events.length ? (
        <div className="selected-event-list">
          {events.map((event) => (
            <article key={event.id}>
              <span className={`event-dot ${event.kind}`} />
              <div>
                <strong>{event.label}</strong>
                <small>{event.meta}</small>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="leave-empty compact">
          <Users />
          <strong>Everyone is available</strong>
          <span>No approved leave or holiday on this date.</span>
        </div>
      )}
      <Link
        className="button primary wide"
        to={`/employee/leave?month=${selectedDate.slice(0, 7)}&date=${selectedDate}&request=new`}
      >
        Request this date
      </Link>
    </>
  );
}
function RequestPanel({
  balances,
  selectedDate,
  holidays,
  today,
  backdateDays,
}: {
  balances: LeaveBalanceSummary[];
  selectedDate: string;
  holidays: HolidayRecord[];
  today: string;
  backdateDays: number;
}) {
  const [leaveTypeId, setLeaveTypeId] = useState("leave-annual");
  const [startDate, setStartDate] = useState(selectedDate);
  const [endDate, setEndDate] = useState(selectedDate);
  const [dayPart, setDayPart] = useState<LeaveDayPart>("full");
  const requestHeadingRef = useRef<HTMLHeadingElement>(null);
  const earliestDate = getEarliestLeaveDate(today, backdateDays);
  const policyError = getLeaveDatePolicyError(
    startDate,
    today,
    backdateDays,
  );
  useEffect(() => {
    setStartDate(selectedDate);
    setEndDate(selectedDate);
  }, [selectedDate]);
  useEffect(() => {
    requestHeadingRef.current?.focus();
  }, []);
  const balance = balances.find((item) => item.leaveTypeId === leaveTypeId);
  const projected = balance
    ? calculateProjectedBalance(balance).projectedHalfDays
    : null;
  let preview: { durationHalfDays: number; excludedDates: string[] } | null =
    null;
  let previewError = policyError ?? "";
  if (!policyError) {
    try {
      preview = calculateLeaveDurationHalfDays({
        startDate,
        endDate,
        dayPart,
        holidayDates: holidays.filter((h) => h.active).map((h) => h.date),
      });
    } catch (error) {
      previewError =
        error instanceof Error ? error.message : "Choose valid dates.";
    }
  }
  return (
    <Form method="post" className="leave-request-form">
      <div className="inspector-heading">
        <p className="eyebrow">New request</p>
        <h2 ref={requestHeadingRef} tabIndex={-1}>Request leave</h2>
        <p>Weekends and Penang holidays are excluded automatically.</p>
      </div>
      <input type="hidden" name="intent" value="apply-leave" />
      <label>
        Leave type
        <select
          name="leaveTypeId"
          value={leaveTypeId}
          onChange={(event) => setLeaveTypeId(event.currentTarget.value)}
          required
        >
          <option value="leave-annual">Annual leave</option>
          <option value="leave-medical">Medical leave</option>
          <option value="leave-unpaid">Unpaid leave</option>
        </select>
      </label>
      <div className="form-pair">
        <label>
          From
          <input
            type="date"
            name="startDate"
            value={startDate}
            min={earliestDate}
            onChange={(event) => setStartDate(event.currentTarget.value)}
            required
          />
        </label>
        <label>
          To
          <input
            type="date"
            name="endDate"
            value={endDate}
            min={startDate > earliestDate ? startDate : earliestDate}
            onChange={(event) => setEndDate(event.currentTarget.value)}
            required
          />
        </label>
      </div>
      <label>
        Duration
        <select
          aria-label="Duration"
          name="dayPart"
          value={dayPart}
          onChange={(event) =>
            setDayPart(event.currentTarget.value as LeaveDayPart)
          }
        >
          <option value="full">Full day</option>
          <option value="morning">Morning half</option>
          <option value="afternoon">Afternoon half</option>
        </select>
      </label>
      <label>
        Reason
        <textarea name="reason" placeholder="Add a brief reason" required />
      </label>
      <div className="request-impact" aria-live="polite">
        {preview ? (
          <>
            <span>
              {halfDays(preview.durationHalfDays)} working day
              {preview.durationHalfDays === 2 ? "" : "s"}
            </span>
            <strong>
              {projected === null || !balance?.paid
                ? "No balance limit"
                : `${halfDays(projected - preview.durationHalfDays)} days after this request`}
            </strong>
            <small>
              {preview.excludedDates.length} non-working day
              {preview.excludedDates.length === 1 ? "" : "s"} excluded
            </small>
          </>
        ) : (
          <>
            <span>Check your dates</span>
            <strong>{previewError}</strong>
            <small>Half days are available for a single working day.</small>
          </>
        )}
      </div>
      <PendingButton
        className="button primary wide"
        intent="apply-leave"
        pendingLabel="Submitting request…"
        disabled={!preview}
      >
        Submit leave request
      </PendingButton>
      <Link
        className="button ghost wide"
        to={`/employee/leave?month=${selectedDate.slice(0, 7)}&date=${selectedDate}`}
      >
        Cancel
      </Link>
    </Form>
  );
}

export function AdminLeaveWorkspace({
  records,
  employees,
  holidays,
  balances,
  today,
  backdateDays = 3,
}: {
  records: LeaveRecord[];
  employees: Array<{ id: string; fullName: string; department: string }>;
  holidays: HolidayRecord[];
  balances: LeaveBalanceSummary[];
  today?: string;
  backdateDays?: number;
}) {
  const [params] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const filtersButtonRef = useRef<HTMLButtonElement>(null);
  const manageButtonRef = useRef<HTMLButtonElement>(null);
  const resolvedToday = today ?? todayInTimeZone(new Date(), "Asia/Kuala_Lumpur");
  const month = validMonth(params.get("month"), resolvedToday);
  const selectedDate = selectedDateForMonth(
    month,
    params.get("date"),
    resolvedToday,
  );
  const selectedId = params.get("request");
  const departmentFilter = params.get("department") ?? "all";
  const employeeFilter = params.get("employee") ?? "all";
  const eventFilter = params.get("event") ?? "all";
  const statusFilter = params.get("status") ?? "all";
  const mobilePanel =
    params.get("panel") === "requests" ? "requests" : "calendar";
  const agenda = params.get("view") === "agenda";
  const selected =
    records.find((r) => r.id === selectedId) ??
    records.find((r) => r.status === "pending");
  const filtered = records.filter(
    (r) =>
      (departmentFilter === "all" || r.department === departmentFilter) &&
      (employeeFilter === "all" || r.employeeId === employeeFilter) &&
      (statusFilter === "all" || r.status === statusFilter),
  );
  const events: CalendarEvent[] = [
    ...holidays
      .filter(
        (h) =>
          h.active && (eventFilter === "all" || eventFilter === h.category),
      )
      .map((h) => ({
        id: h.id,
        label: h.name,
        startDate: h.date,
        endDate: h.date,
        kind: "holiday" as const,
        meta: h.observed ? "Observed public holiday" : "Public holiday",
      })),
    ...filtered
      .filter(
        (r) =>
          (eventFilter === "all" || eventFilter === "absence") &&
          (r.status === "approved" || r.status === "pending"),
      )
      .map((r) => ({
        id: r.id,
        label: r.fullName,
        startDate: r.startDate,
        endDate: r.endDate,
        kind: r.status === "pending" ? ("pending" as const) : ("away" as const),
        meta: `${r.typeName} · ${r.status}`,
        employeeId: r.employeeId,
        confirmedAway: r.status === "approved",
        staffingLabel: r.fullName,
      })),
  ];
  const pending = records
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const approvedThisMonth = records.filter(
    (record) =>
      record.status === "approved" && record.startDate.startsWith(month),
  ).length;
  const holidaysThisMonth = holidays.filter(
    (holiday) => holiday.active && holiday.date.startsWith(month),
  ).length;
  const filterValues = {
    department: departmentFilter,
    employee: employeeFilter,
    event: eventFilter,
    status: statusFilter,
  };
  const activeFilters = Object.entries(filterValues).filter(
    ([, value]) => value !== "all",
  );
  const filterLabel = (name: string, value: string) => {
    if (name === "employee") {
      return employees.find((employee) => employee.id === value)?.fullName ?? value;
    }
    if (name === "event") {
      return {
        absence: "Absences",
        public: "Public holidays",
        company: "Company holidays",
      }[value] ?? value;
    }
    if (name === "status") {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value;
  };
  const hrefWithoutFilters = (only?: string) => {
    const next = new URLSearchParams(params);
    const names = only
      ? [only]
      : ["department", "employee", "event", "status"];
    names.forEach((name) => next.delete(name));
    next.delete("notice");
    return `/admin/leave?${next.toString()}`;
  };
  const closeFilters = () => {
    setFiltersOpen(false);
    filtersButtonRef.current?.focus();
  };
  const closeSettings = () => {
    setSettingsOpen(false);
    manageButtonRef.current?.focus();
  };
  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeFilters();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);
  return (
    <>
      <header className="leave-page-header admin-leave-header">
        <div>
          <p className="eyebrow">People / Leave</p>
          <h1>Leave calendar</h1>
        </div>
        <div className="page-actions">
          <DropdownMenu.Root open={manageOpen} onOpenChange={setManageOpen}>
            <div className="manage-leave">
              <DropdownMenu.Trigger asChild>
                <button ref={manageButtonRef} className="button secondary" type="button">
                  Manage leave
                  <ChevronDown />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content className="manage-leave-menu" align="end" sideOffset={7}>
                  <DropdownMenu.Item asChild>
                    <Link to="/admin/leave/balances">
                      <SlidersHorizontal />
                      Adjust balances
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link to="/admin/leave/holidays">
                      <CalendarDays />
                      Manage holidays
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="manage-leave-settings"
                    onSelect={() => setSettingsOpen(true)}
                  >
                    Leave settings
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </div>
          </DropdownMenu.Root>
        </div>
      </header>
      <nav className="admin-mobile-tabs" aria-label="Admin leave workspace">
        <Link
          className={mobilePanel === "calendar" ? "active" : ""}
          to={`/admin/leave?month=${month}&panel=calendar`}
        >
          Calendar
        </Link>
        <Link
          className={mobilePanel === "requests" ? "active" : ""}
          to={`/admin/leave?month=${month}&panel=requests`}
        >
          Requests
        </Link>
      </nav>
      <section className={`admin-leave-workspace mobile-${mobilePanel}`}>
        <div className="calendar-canvas surface">
          <div className="calendar-command-area" role="region" aria-label="Calendar commands">
            <CalendarToolbar
              month={month}
              basePath="/admin/leave"
              today={resolvedToday}
              admin
              actions={
                <button
                  ref={filtersButtonRef}
                  className="filter-toggle"
                  type="button"
                  aria-label="Filters"
                  aria-expanded={filtersOpen}
                  aria-controls="leave-filter-panel"
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  <SlidersHorizontal />
                  Filters
                  {activeFilters.length ? <b>{activeFilters.length}</b> : null}
                </button>
              }
            />
            <div className="calendar-command-meta">
              <div className="leave-command-stats" aria-label="Leave counts">
                <span><b>{pending.length}</b> awaiting review</span>
                <span><b>{approvedThisMonth}</b> approved this month</span>
                <span>
                  <b>{holidaysThisMonth}</b> Penang holiday{holidaysThisMonth === 1 ? "" : "s"}
                </span>
              </div>
              <span className="legend">
                <i className="approved" />
                Approved <i className="pending" />
                Pending <i className="holiday" />
                Holiday
              </span>
            </div>
            {activeFilters.length ? (
              <div className="active-filter-chips" aria-label="Active filters">
                {activeFilters.map(([name, value]) => (
                  <Link
                    key={name}
                    to={hrefWithoutFilters(name)}
                    aria-label={`Remove ${name} filter`}
                    preventScrollReset
                  >
                    <span>{filterLabel(name, value)}</span>
                    <X />
                  </Link>
                ))}
              </div>
            ) : null}
            {filtersOpen ? (
              <Form method="get" id="leave-filter-panel" className="leave-filters">
                <input type="hidden" name="month" value={month} />
                {["date", "view", "panel", "request"].map((name) =>
                  params.get(name) ? (
                    <input key={name} type="hidden" name={name} value={params.get(name) ?? ""} />
                  ) : null,
                )}
                <label>
                  Department
                  <select
                    name="department"
                    value={departmentFilter}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  >
                    <option value="all">All departments</option>
                    {[...new Set(employees.map((e) => e.department))]
                      .sort()
                      .map((department) => (
                        <option value={department} key={department}>
                          {department}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Employee
                  <select
                    name="employee"
                    value={employeeFilter}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  >
                    <option value="all">All employees</option>
                    {employees
                      .filter(
                        (employee) =>
                          departmentFilter === "all" ||
                          employee.department === departmentFilter,
                      )
                      .map((employee) => (
                        <option value={employee.id} key={employee.id}>
                          {employee.fullName}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Events
                  <select
                    name="event"
                    value={eventFilter}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  >
                    <option value="all">All events</option>
                    <option value="absence">Absences</option>
                    <option value="public">Public holidays</option>
                    <option value="company">Company holidays</option>
                  </select>
                </label>
                <label>
                  Status
                  <select
                    name="status"
                    value={statusFilter}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  >
                    <option value="all">All statuses</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                  </select>
                </label>
                <Link className="reset-filters" to={hrefWithoutFilters()} preventScrollReset>
                  Reset filters
                </Link>
              </Form>
            ) : null}
          </div>
          {agenda ? (
            <Agenda events={events} month={month} />
          ) : (
            <SharedCalendar
              month={month}
              events={events}
              holidayDates={holidays.filter((h) => h.active).map((h) => h.date)}
              basePath="/admin/leave"
              selectedDate={selectedDate}
              today={resolvedToday}
            />
          )}
        </div>
        <aside className="approval-rail surface">
          <div className="approval-queue-head">
            <div>
              <p className="eyebrow">Action queue</p>
              <h2>Approval queue</h2>
            </div>
            <span className="count">{pending.length}</span>
          </div>
          <div className="approval-queue">
            {pending.length ? (
              pending.map((record) => (
                <Link
                  className={record.id === selected?.id ? "active" : ""}
                  to={`/admin/leave?month=${month}&request=${record.id}`}
                  key={record.id}
                >
                  <i>{initials(record.fullName)}</i>
                  <span>
                    <strong>{record.fullName}</strong>
                    <small>
                      {record.typeName} · {halfDays(record.durationHalfDays)}{" "}
                      day{record.durationHalfDays === 2 ? "" : "s"}
                    </small>
                  </span>
                  <ChevronRight />
                </Link>
              ))
            ) : (
              <div className="leave-empty compact">
                <Check />
                <strong>All caught up</strong>
                <span>No leave requests need a decision.</span>
              </div>
            )}
          </div>
          {selected ? (
            <ReviewInspector
              record={selected}
              records={records}
              employees={employees}
              balances={balances}
            />
          ) : null}
        </aside>
      </section>
      <Dialog.Root
        open={settingsOpen}
        onOpenChange={(open) => {
          if (open) setSettingsOpen(true);
          else closeSettings();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="leave-settings-overlay" />
          <Dialog.Content
            className="leave-settings-sheet"
            aria-describedby="leave-settings-description"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              manageButtonRef.current?.focus();
            }}
          >
            <div className="leave-settings-heading">
              <div>
                <p className="eyebrow">Company policy</p>
                <Dialog.Title>Leave settings</Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="sheet-close" type="button" aria-label="Close leave settings">
                  <X />
                </button>
              </Dialog.Close>
            </div>
            <h3>Backdated leave requests</h3>
            <Dialog.Description id="leave-settings-description">
              Employees can request leave from today back through this many
              calendar days. The rule is enforced in the browser and on submit.
            </Dialog.Description>
            <Form method="post" className="leave-settings-form" aria-label="Backdated leave policy">
              <input type="hidden" name="intent" value="update-leave-policy" />
              <label>
                Allowed days
                <input
                  type="number"
                  name="leaveBackdateDays"
                  min="0"
                  max="365"
                  step="1"
                  defaultValue={backdateDays}
                  required
                />
              </label>
              <PendingButton intent="update-leave-policy" pendingLabel="Saving policy…" type="submit">
                Save policy
              </PendingButton>
            </Form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function ReviewInspector({
  record,
  records,
  employees,
  balances,
}: {
  record: LeaveRecord;
  records: LeaveRecord[];
  employees: Array<{ id: string; fullName: string; department: string }>;
  balances: LeaveBalanceSummary[];
}) {
  const headcount = employees.filter(
    (e) => e.department === record.department,
  ).length;
  const coverage = getCoverageSummary({
    department: record.department,
    departmentHeadcount: headcount,
    startDate: record.startDate,
    endDate: record.endDate,
    requests: records.filter((item) => item.id !== record.id),
  });
  const balance = balances.find(
    (item) =>
      item.employeeId === record.employeeId &&
      item.leaveTypeId === record.leaveTypeId,
  );
  const projected = balance
    ? calculateProjectedBalance(balance).projectedHalfDays
    : null;
  return (
    <section
      className="review-inspector"
      aria-label={`Review ${record.fullName} request`}
    >
      <div className="review-person">
        <i>{initials(record.fullName)}</i>
        <div>
          <strong>{record.fullName}</strong>
          <small>
            {record.department} · submitted {date(record.createdAt)}
          </small>
        </div>
        <StatusBadge status={record.status} />
      </div>
      <dl className="review-details">
        <div>
          <dt>Dates</dt>
          <dd>
            {date(record.startDate)}
            {record.startDate !== record.endDate
              ? ` to ${date(record.endDate)}`
              : ""}
          </dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>
            {halfDays(record.durationHalfDays)} day
            {record.durationHalfDays === 2 ? "" : "s"}
          </dd>
        </div>
        <div>
          <dt>Type</dt>
          <dd>{record.typeName}</dd>
        </div>
        <div>
          <dt>Balance after</dt>
          <dd>
            {projected === null || !record.paid
              ? "Not limited"
              : `${halfDays(projected)} days`}
          </dd>
        </div>
      </dl>
      <div className="request-reason">
        <span>Employee note</span>
        <p>“{record.reason}”</p>
      </div>
      <div
        className={`coverage-context${coverage.awayCount ? " caution" : ""}`}
      >
        <Users />
        <div>
          <strong>
            {coverage.awayCount} of {coverage.departmentHeadcount}{" "}
            {record.department} employees already away
          </strong>
          <p>
            {coverage.awayCount
              ? coverage.overlapping
                  .map((item) => `${item.fullName} (${item.status})`)
                  .join(", ")
              : "No approved or pending overlap in this department."}
          </p>
          <small>Coverage is advisory and does not block approval.</small>
        </div>
      </div>
      {record.status === "pending" ? (
        <Form method="post" className="review-actions">
          <input type="hidden" name="intent" value="review-leave" />
          <input type="hidden" name="id" value={record.id} />
          <label>
            Decision note
            <textarea name="reviewNote" placeholder="Required when rejecting" />
          </label>
          <div>
            <button
              className="button secondary"
              name="decision"
              value="rejected"
            >
              <X />
              Reject request
            </button>
            <button className="button primary" name="decision" value="approved">
              <Check />
              Approve request
            </button>
          </div>
        </Form>
      ) : record.status === "approved" ? (
        <Form method="post" className="review-actions">
          <input type="hidden" name="intent" value="cancel-approved-leave" />
          <input type="hidden" name="id" value={record.id} />
          <label>
            Cancellation reason
            <textarea name="reviewNote" required />
          </label>
          <button className="button secondary wide">
            <X />
            Cancel approved leave
          </button>
        </Form>
      ) : record.reviewNote ? (
        <div className="decision-note">
          <span>Decision note</span>
          <p>{record.reviewNote}</p>
        </div>
      ) : null}
    </section>
  );
}

export function HolidayAdmin({ holidays, today }: { holidays: HolidayRecord[]; today?: string }) {
  const resolvedToday = today ?? todayInTimeZone(new Date(), "Asia/Kuala_Lumpur");
  return (
    <>
      <header className="leave-page-header">
        <div>
          <p className="eyebrow">Leave / Settings</p>
          <h1>Holiday calendar</h1>
          <p>
            Penang public holidays and company closure days used in leave
            calculations.
          </p>
        </div>
        <Link className="button secondary" to="/admin/leave">
          <ChevronLeft />
          Back to calendar
        </Link>
      </header>
      <div className="holiday-admin-grid">
        <Form method="post" className="surface leave-settings-form">
          <h2>Add company holiday</h2>
          <input type="hidden" name="intent" value="save-holiday" />
          <label>
            Holiday name
            <input name="name" required />
          </label>
          <label>
            Date
            <input type="date" name="date" min={addCalendarDays(resolvedToday, 1)} required />
          </label>
          <PendingButton intent="save-holiday" pendingLabel="Adding holiday…">Add holiday</PendingButton>
        </Form>
        <section className="surface holiday-list">
          <div className="section-head">
            <h2>2026 calendar</h2>
            <span>Penang</span>
          </div>
          {holidays
            .filter((h) => h.active)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((h) => (
              <article key={h.id}>
                <time>{date(h.date, { day: "numeric", month: "short" })}</time>
                <div>
                  <strong>{h.name}</strong>
                  <small>
                    {h.category === "public"
                      ? "Penang public holiday"
                      : "Company holiday"}
                    {h.observed ? " · observed" : ""}
                  </small>
                </div>
                {h.category === "company" && h.date > resolvedToday ? (
                  <Form method="post">
                    <input
                      type="hidden"
                      name="intent"
                      value="archive-holiday"
                    />
                    <input type="hidden" name="id" value={h.id} />
                    <button
                      className="button ghost"
                      aria-label={`Archive ${h.name}`}
                    >
                      <X />
                      Archive
                    </button>
                  </Form>
                ) : (
                  <span className="source-badge">Official</span>
                )}
              </article>
            ))}
        </section>
      </div>
    </>
  );
}
export function BalanceAdmin({
  balances,
  employees,
}: {
  balances: LeaveBalanceSummary[];
  employees: Array<{ id: string; fullName: string; department: string }>;
}) {
  return (
    <>
      <header className="leave-page-header">
        <div>
          <p className="eyebrow">Leave / Settings</p>
          <h1>Balance adjustments</h1>
          <p>
            Apply traceable corrections without changing leave policy defaults.
          </p>
        </div>
        <Link className="button secondary" to="/admin/leave">
          <ChevronLeft />
          Back to calendar
        </Link>
      </header>
      <Form method="post" className="surface balance-adjust-form">
        <input type="hidden" name="intent" value="adjust-leave-balance" />
        <label>
          Employee
          <select name="employeeId" required>
            {employees.map((e) => (
              <option value={e.id} key={e.id}>
                {e.fullName} · {e.department}
              </option>
            ))}
          </select>
        </label>
        <label>
          Leave type
          <select name="leaveTypeId">
            <option value="leave-annual">Annual leave</option>
            <option value="leave-medical">Medical leave</option>
          </select>
        </label>
        <label>
          Adjustment
          <select name="deltaHalfDays">
            <option value="2">Add 1 day</option>
            <option value="1">Add half day</option>
            <option value="-1">Remove half day</option>
            <option value="-2">Remove 1 day</option>
          </select>
        </label>
        <label>
          Reason
          <input name="reason" required placeholder="Explain this correction" />
        </label>
        <PendingButton intent="adjust-leave-balance" pendingLabel="Saving adjustment…">Save adjustment</PendingButton>
      </Form>
      <section className="surface balance-table">
        <div className="balance-row head">
          <span>Employee</span>
          <span>Leave type</span>
          <span>Available</span>
          <span>Pending</span>
          <span>Projected</span>
        </div>
        {balances
          .filter((b) => b.paid)
          .map((b) => {
            const employee = employees.find((item) => item.id === b.employeeId);
            const summary = calculateProjectedBalance(b);
            return (
              <div
                className="balance-row"
                key={`${b.employeeId}-${b.leaveTypeId}`}
              >
                <span>
                  <strong>{employee?.fullName}</strong>
                  <small>{employee?.department}</small>
                </span>
                <span>{b.name}</span>
                <span>{halfDays(summary.availableHalfDays)} days</span>
                <span>{halfDays(b.pendingHalfDays)} days</span>
                <span>
                  <strong>{halfDays(summary.projectedHalfDays)} days</strong>
                </span>
              </div>
            );
          })}
      </section>
    </>
  );
}
export type { LeaveDayPart };
