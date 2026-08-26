# HRMS Demo — Project Context & Requirements

> **Purpose of this file:** This is the first context layer for a coding agent starting this project from scratch. Read this entire file before making architecture, UI, database, or implementation decisions.
>
> **Reference product:** https://gajikita.scorpiolabs.io
>
> The reference is for product behavior and scope inspiration. Do **not** blindly clone its branding, UI, wording, implementation, or any outdated regulatory assumptions.

---

## 1. Project Goal

Build a polished, functional **HR and payroll system demo for a Malaysian company**.

The demo should show a coherent employee lifecycle from HR records and attendance through leave and payroll, ending with an employee being able to access their payslip.

The product should feel like a real working system rather than a collection of disconnected mock screens.

The stakeholder-approved demo scope is:

1. Admin / Employee login
2. Dashboard
3. Employee management
4. Attendance / clock in & out using fingerprint scanner / QR **(simulation)**
5. Leave management / approvals / leave balances
6. Payroll processing including overtime, allowances, bonuses and deductions
7. EPF / SOCSO / EIS / PCB calculations
8. Part-time / hourly employee payroll
9. Payslip generation / employee payslip access
10. Employee self-service
11. Notifications
12. Payroll reports and PDF / CSV exports

This list is the source of truth for demo scope.

---

## 2. Scope Rule

Build the smallest complete product that demonstrates the approved workflows well.

Do not add major HR modules merely because they are common in HR software.

### Explicitly Out of Scope

Do **not** build:

- ATS
- Recruitment
- Hiring pipeline
- Job postings
- Candidate management
- Interview scheduling
- Claims / expense management
- Shift / roster scheduling
- Performance reviews
- OKRs
- Training / LMS
- Asset management
- Employee surveys
- Benefits administration
- Accounting system integrations
- Real bank payment integrations
- Real government submission integrations
- Native mobile apps
- Multi-country payroll
- Complex enterprise permission builders
- AI chatbot/features unless requested later

If a feature is not required to make an approved workflow work, prefer not to add it.

---

# 3. Product Users

The demo only needs two primary experiences:

## Admin

Admin manages employees, attendance, leave, payroll and reports.

## Employee

Employee accesses their own attendance, leave information, notifications and payslips.

Do not introduce additional role complexity unless required later.

---

# 4. Core Demo Story

The system should support this end-to-end demonstration:

1. Admin logs in.
2. Admin sees the HR dashboard.
3. Admin opens the employee directory.
4. Admin views or edits an employee.
5. Employee attendance is recorded through fingerprint / QR simulation.
6. Attendance records show hours worked and overtime where applicable.
7. Employee submits a leave request.
8. Admin approves or rejects it.
9. Leave balance updates.
10. Admin starts a payroll run.
11. Payroll automatically uses employee salary/hourly information.
12. Relevant overtime is included.
13. Approved unpaid leave affects payroll where applicable.
14. Admin can add allowances, bonuses or other deductions.
15. EPF, SOCSO, EIS and PCB are shown/calculated.
16. Admin reviews the payroll calculation.
17. Payroll is finalised.
18. Payslip is generated.
19. Employee logs in and accesses the payslip.
20. Admin can export payroll information as PDF/CSV.
21. Relevant system events appear as notifications.

Every major screen should contribute to this story.

---

# 5. Authentication

## Required

Provide separate Admin and Employee experiences.

Minimum functionality:

- Login
- Logout
- Session persistence
- Invalid login handling
- Protected pages
- Users cannot access pages/data belonging to the wrong account type

### Demo Accounts

Seed obvious demo credentials, for example:

- Admin account
- Employee account

The actual credentials should be documented in the project's README.

Do not build unnecessary enterprise authentication functionality for the first demo.

---

# 6. Admin Dashboard

The dashboard should provide an immediate overview of the company.

Recommended information:

- Total employees
- Present today
- Absent today
- On leave today
- Pending leave requests
- Current payroll status
- Current / recent payroll total
- Recent activity or notifications

Useful actions may include:

- Add employee
- Review attendance
- Review leave
- Run payroll

Charts are optional. Do not spend disproportionate effort on decorative analytics.

Dashboard numbers must come from application data rather than being permanently hard-coded.

---

# 7. Employee Management

Admin requires an employee directory and employee profile.

## Employee Directory

Display useful information such as:

- Employee name
- Employee ID
- Department
- Position
- Employment type
- Salary type
- Status

Support:

- Search
- Basic filtering
- Add employee
- Edit employee
- View employee

## Employee Profile

Keep the profile focused on information required by attendance, leave and payroll.

Recommended fields:

### Personal

- Full name
- Employee ID
- Email
- Phone
- Identification number if needed for demo
- Address if useful

### Employment

- Department
- Position
- Employment type
- Start date
- Employment status

### Payroll

- Monthly salary or hourly rate
- Salary type: Monthly / Hourly
- Bank details if displayed
- EPF information
- SOCSO information
- Tax / PCB information as required by the payroll model

Avoid building a large HR document-management system inside employee profiles.

---

# 8. Attendance

Attendance is a core demo module.

## Attendance Records

Admin should be able to see:

- Employee
- Date
- Clock-in time
- Clock-out time
- Total hours worked
- Attendance status
- Overtime hours when applicable

Possible statuses:

- Present
- Late
- Absent
- On Leave
- Missing Clock Out

## Clock In / Clock Out

The stakeholder specifically mentioned employees clocking in/out using a **fingerprint scanner machine**.

For the demo, external hardware is simulated.

The UI should represent:

- Fingerprint scanner clock-in/out **(simulation)**
- QR clock-in/out **(simulation)**

The simulation must still create real attendance records in the application database.

Example:

1. Choose/sample employee.
2. Trigger simulated fingerprint scan or QR scan.
3. Record current or selected timestamp.
4. Mark as clock-in or clock-out.
5. Store attendance event.
6. Recalculate worked hours.

Do not spend demo effort building actual biometric recognition.

## Overtime

Attendance should be capable of producing overtime information used by payroll.

For the demo, define a simple, understandable overtime rule/configuration and clearly show the resulting hours/value.

The implementation must keep overtime calculation logic isolated enough that it can be replaced with validated business rules later.

---

# 9. Leave Management

## Employee

Employee should be able to:

- View leave balances
- View previous requests
- Submit a leave request
- See request status

Minimum request information:

- Leave type
- Start date
- End date
- Reason
- Optional attachment only if easy to support

## Admin

Admin should be able to:

- View pending requests
- Approve request
- Reject request
- View leave history
- View employee leave balance

## Leave Types

Use a small realistic demo set, such as:

- Annual Leave
- Medical Leave
- Unpaid Leave

Additional types can be added only if they are trivial.

## Integration

On approval:

- Request status changes
- Applicable leave balance changes
- Dashboard data updates
- Employee receives notification

For unpaid leave, the approved leave should be available to payroll so the corresponding deduction can be represented.

---

# 10. Payroll

Payroll is the most important business workflow in the demo.

## Payroll Runs

Admin should be able to:

- Start payroll for a pay period
- See included employees
- Review individual employee calculations
- Apply payroll adjustments
- Review totals
- Finalise payroll
- Access generated payslips
- Export payroll data

Suggested statuses:

- Draft
- Finalised

Do not build an unnecessarily complex payroll state machine.

## Employee Payroll Calculation

For each employee, show a clear calculation containing applicable items.

### Earnings

- Basic salary / hourly wages
- Overtime
- Allowances
- Bonus

### Deductions

- Unpaid leave where applicable
- EPF
- SOCSO
- EIS
- PCB
- Manual/other deduction where needed

### Result

- Gross pay
- Total deductions
- Net pay

The UI must make the calculation understandable rather than showing only a final number.

---

# 11. Monthly Salaried Employees

For a monthly employee:

Base calculation starts from monthly salary.

Example conceptual flow:

`Monthly salary + OT + allowances + bonus - unpaid leave - employee deductions = net pay`

Do not hard-code employee-specific results.

---

# 12. Part-Time / Hourly Employees

This is an explicit stakeholder requirement.

Employee profile must support:

- Salary type = Hourly
- Hourly rate

Payroll should determine wage based on approved/recorded payable hours for the payroll period.

Conceptually:

`Payable hours × hourly rate = base hourly wages`

Then:

`Base hourly wages + applicable OT/allowances/bonus - applicable deductions = net pay`

The demo should contain at least one hourly employee so this feature can actually be shown.

---

# 13. EPF / SOCSO / EIS / PCB

The demo must display support for:

- EPF / KWSP
- SOCSO / PERKESO
- EIS / SIP
- PCB / monthly tax deduction

## Important Engineering Requirement

Do **not** scatter percentages, thresholds, tables or formulas throughout UI components.

Create a dedicated payroll calculation layer/module.

The rules should be:

- Centralised
- Configurable/versionable where practical
- Unit tested
- Easy to replace/update

Malaysian contribution and tax rules can change.

Before treating the application as production-ready, every calculation must be validated against the latest official Malaysian rules and tables.

For demo development, documented fixture values or a clearly defined calculation implementation may be used, but do not falsely describe unverified calculations as production-compliant.

---

# 14. Payroll Adjustments

Admin should be able to include:

- Overtime
- Allowance
- Bonus
- Other deduction

Keep this simple.

An adjustment should at minimum contain:

- Type
- Description
- Amount
- Employee
- Payroll period

Attendance-derived OT should appear automatically where implemented rather than requiring duplicate manual entry.

---

# 15. Payroll Finalisation

Before finalising, show a review summary.

Recommended:

- Employee count
- Gross payroll
- Total deductions
- Net payroll

Finalisation should:

1. Lock/freeze the demo payroll result.
2. Generate employee payslip records.
3. Make payslips visible through employee self-service.
4. Trigger a notification.

A sophisticated payroll reopening/reversal workflow is not required for the first demo.

---

# 16. Payslips

Payslips must be genuinely generated from payroll data.

Display:

## Company

- Company name
- Optional logo

## Employee

- Name
- Employee ID
- Position / department if useful

## Pay Period

- Payroll month / period
- Pay date

## Earnings

- Salary / hourly wages
- Overtime
- Allowances
- Bonus

## Deductions

- EPF
- SOCSO
- EIS
- PCB
- Unpaid leave / other deductions where applicable

## Totals

- Gross pay
- Total deductions
- Net pay

Required functionality:

- Admin can view payslip
- Employee can view their own payslip
- PDF export/download
- Employee cannot access another employee's payslip

---

# 17. Employee Self-Service

The Employee experience should stay simple.

Recommended employee navigation:

- Home
- Attendance
- Leave
- Payslips
- Notifications
- Profile

## Employee Home

Show useful information such as:

- Today's attendance state
- Leave balance
- Latest payslip
- Recent notifications

## Attendance

Employee can view their own attendance history.

The simulated attendance mechanism may also be exposed here if that makes the demo flow clearer.

## Leave

Employee can:

- View balance
- Apply
- Track status

## Payslips

Employee can:

- See previous payslips
- Open payslip
- Download PDF

Employee access must be restricted to the logged-in employee's records.

---

# 18. Notifications

Keep notifications lightweight and event-driven.

Examples:

- Leave request submitted
- Leave approved
- Leave rejected
- Payroll finalised
- New payslip available
- Attendance issue/missing clock-out if implemented

Minimum functionality:

- Notification list
- Read/unread state
- Relevant timestamp
- Link to relevant screen where useful

External email, SMS or WhatsApp notifications are not required.

---

# 19. Reports and Exports

Do not create a full business-intelligence platform.

The demo needs useful payroll-oriented reporting and exports.

## Recommended Reports

### Payroll Summary

For a selected payroll period:

- Employee count
- Gross payroll
- Total deductions
- Net payroll
- Employer/employee contribution totals where available

### Employee Payroll Detail

Per-employee breakdown for a selected period.

### Attendance Summary

Useful if inexpensive to implement:

- Days present
- Hours worked
- Overtime hours

## Exports

Required demo capability:

- Payroll CSV
- Payroll report PDF or printable report
- Payslip PDF

Generated exports should use real application data.

---

# 20. Cross-Module Integration

This is critical.

Do not build modules as isolated CRUD demos.

Expected relationships:

```text
Employee
   |
   +--> Attendance ---------> Hours / Overtime
   |
   +--> Leave --------------> Leave Balance / Unpaid Leave
   |
   +--> Payroll Profile ----> Salary / Hourly Rate
                                |
Attendance + Leave + Payroll Profile + Adjustments
                                |
                                v
                            Payroll Run
                                |
                                v
                             Payslip
                                |
                                v
                     Employee Self-Service
```

Examples that should actually work:

### Attendance → Payroll

Worked hours support hourly payroll.

Overtime can appear in payroll.

### Leave → Payroll

Approved unpaid leave can affect payroll.

### Payroll → Payslip

Finalised payroll produces payslips.

### Payroll → Employee Portal

Generated payslip becomes visible to the correct employee.

### Actions → Notifications

Relevant employee/admin actions generate notifications.

This integration is more important than building additional modules.

---

# 21. Core Data Model

Exact schema is an implementation decision, but the domain model should cover at least:

- User
- Company
- Employee
- AttendanceRecord
- LeaveType
- LeaveBalance
- LeaveRequest
- PayrollRun
- EmployeePayrollResult
- PayrollAdjustment
- Payslip
- Notification

Additional supporting tables/entities are acceptable when they improve data integrity.

## Important Relationships

- User belongs to Admin or Employee experience.
- Employee is associated with a user where employee login exists.
- Attendance belongs to Employee.
- Leave balance belongs to Employee + Leave Type.
- Leave request belongs to Employee.
- Payroll result belongs to Employee + Payroll Run.
- Payslip belongs to an Employee Payroll Result.
- Notification belongs to User.

Use relational integrity rather than duplicating the same values throughout unrelated records.

---

# 22. Demo Seed Data

The application should ship with realistic seed/demo data.

Use one fictional Malaysian company.

Example:

**Merdeka Coffee Sdn. Bhd.**

Use approximately 8–12 employees.

The dataset should intentionally demonstrate different scenarios:

- Monthly salaried employee
- Hourly / part-time employee
- Employee with overtime
- Employee currently on leave
- Pending leave request
- Approved leave request
- Unpaid leave
- Late attendance
- Missing clock-out if supported
- Previous finalised payroll
- Current draft payroll
- Existing payslip
- Unread notifications

Avoid random meaningless data. Seed records should support the demo story.

---

# 23. UI / UX Direction

The product should look credible enough to present to a stakeholder.

Aim for:

- Modern SaaS dashboard
- Clean layout
- Simple typography
- Consistent spacing
- Clear status badges
- Readable tables
- Useful empty states
- Clear forms
- Responsive employee experience

Avoid:

- Excessive gradients
- Decorative landing-page styling inside the application
- Huge cards everywhere
- Fake charts with no relationship to data
- Excessive animations
- Dense enterprise configuration screens
- Copying GajiKita's visual identity

Admin should be desktop-first.

Employee self-service should be comfortable on mobile as well.

---

# 24. Application Behavior Requirements

## Loading

Show proper loading states for asynchronous operations.

## Empty States

Every important list should have a useful empty state.

## Errors

Show useful errors for:

- Invalid login
- Invalid form fields
- Failed actions
- Missing payroll information
- Incomplete attendance where relevant
- Export failure

## Confirmation

Require confirmation for important actions such as:

- Rejecting leave
- Finalising payroll

## Currency

Display monetary values consistently as Malaysian Ringgit:

`RM 3,250.00`

## Dates

Use one consistent human-readable date format throughout the UI.

---

# 25. Security Expectations for the Demo

Even though this is a demo, do not implement obviously unsafe access patterns.

Required:

- Server-side authorisation for protected data/actions
- Employee cannot access another employee's private records/payslips
- Admin-only operations are protected
- Passwords are never stored in plain text
- Sensitive secrets are kept outside source code
- Inputs are validated
- File/export routes do not allow arbitrary data access

Avoid building elaborate enterprise security features not required by the demo.

---

# 26. Architecture Principles

The coding agent may choose the appropriate concrete stack based on the repository/environment, but must follow these principles:

### Modular Business Logic

Keep payroll calculation logic separate from UI components and route handlers.

Keep attendance calculation logic separate from presentation.

Keep leave balance logic separate from presentation.

### Single Source of Truth

Do not independently calculate the same payroll values in the dashboard, payroll page and payslip.

Calculate/store through the payroll domain and consume the same result.

### Test Important Business Logic

At minimum, automated tests should cover:

- Monthly salary payroll calculation
- Hourly payroll calculation
- Payroll adjustment handling
- Leave balance changes
- Unpaid leave effect where implemented
- Attendance duration/overtime calculation
- Payroll finalisation behavior
- Payslip access control

### Prefer Simplicity

This is a demo, not an enterprise HR suite.

Use clean boundaries that allow future expansion, but do not prematurely build plugin systems, generic workflow engines or unnecessary abstractions.

---

# 27. Demo vs Production Boundary

The following are acceptable simulations for the demo:

- Fingerprint scanner
- QR attendance device
- Bank payment
- Government submission
- External notification delivery

However, simulated functionality should be obvious in code and easy to replace later.

Do not create fake UI-only attendance records. The **scanner/QR interaction is simulated; the resulting attendance record is real application data**.

---

# 28. Suggested Main Routes / Screens

Exact routing syntax depends on the chosen framework.

## Public

- Login

## Admin

- Dashboard
- Employees
- Employee Detail
- Attendance
- Leave
- Payroll Runs
- Payroll Run Detail
- Payslip View
- Reports
- Notifications

## Employee

- Employee Home
- My Attendance
- My Leave
- My Payslips
- Payslip View
- Notifications
- My Profile

Do not add navigation entries for out-of-scope modules.

---

# 29. MVP Acceptance Criteria

The demo is not complete until all of the following are true:

## Authentication

- [ ] Admin can log in.
- [ ] Employee can log in.
- [ ] Admin and employee see different appropriate interfaces.
- [ ] Protected routes reject unauthorised access.

## Employees

- [ ] Admin can view employee directory.
- [ ] Admin can search employees.
- [ ] Admin can add an employee.
- [ ] Admin can edit an employee.
- [ ] Employee record supports monthly or hourly salary type.

## Attendance

- [ ] Fingerprint clock-in/out can be simulated.
- [ ] QR clock-in/out can be simulated.
- [ ] Simulation creates real attendance records.
- [ ] Clock-in and clock-out produce worked hours.
- [ ] Admin can view employee attendance.
- [ ] Employee can view their own attendance.
- [ ] Overtime can be represented/calculated.

## Leave

- [ ] Employee can see leave balance.
- [ ] Employee can submit leave.
- [ ] Admin can approve leave.
- [ ] Admin can reject leave.
- [ ] Employee can see approval status.
- [ ] Approval updates applicable balance.
- [ ] Unpaid leave can be made available to payroll.

## Payroll

- [ ] Admin can create a payroll run.
- [ ] Monthly employees calculate from monthly salary.
- [ ] Hourly employees calculate from payable hours × hourly rate.
- [ ] Overtime can feed into payroll.
- [ ] Allowances can be added.
- [ ] Bonuses can be added.
- [ ] Other deductions can be added.
- [ ] EPF is represented/calculated.
- [ ] SOCSO is represented/calculated.
- [ ] EIS is represented/calculated.
- [ ] PCB is represented/calculated.
- [ ] Gross pay is shown.
- [ ] Total deductions are shown.
- [ ] Net pay is shown.
- [ ] Admin can review before finalising.
- [ ] Payroll can be finalised.

## Payslips

- [ ] Finalising payroll creates payslips.
- [ ] Admin can view payslips.
- [ ] Employee can view their own payslips.
- [ ] Employee cannot view another employee's payslip.
- [ ] Payslip can be exported as PDF.

## Self-Service

- [ ] Employee can see their own profile.
- [ ] Employee can see attendance.
- [ ] Employee can manage/view leave.
- [ ] Employee can see payslips.
- [ ] Employee can see notifications.

## Notifications

- [ ] Important leave/payroll events generate notifications.
- [ ] Read/unread state works.

## Reports / Exports

- [ ] Admin can view a payroll summary.
- [ ] Admin can export payroll CSV.
- [ ] Admin can generate/export payroll report/PDF.
- [ ] Exports contain real application data.

---

# 30. Definition of a Good Demo

A successful demo should make it possible to show this scenario without changing databases manually or pretending actions occurred:

> An employee clocks in/out through the simulated fingerprint/QR flow, has attendance recorded, submits leave, gets the leave approved, appears correctly in payroll as either a monthly or hourly employee, receives overtime/allowance/bonus/deductions as appropriate, has EPF/SOCSO/EIS/PCB represented, payroll is finalised, a payslip is generated, and the employee logs in and sees that payslip and notification.

If that scenario works smoothly, the core demo has achieved its purpose.

---

# 31. Instructions to the Coding Agent

Before writing implementation code:

1. Read this document fully.
2. Inspect the repository and current environment.
3. Treat the approved feature list as a hard scope boundary.
4. Propose a concise technical architecture and implementation sequence.
5. Define the data model before building disconnected UI pages.
6. Build vertical workflows where possible rather than creating every screen first.
7. Prioritise the end-to-end demo path.
8. Keep payroll, attendance and leave business logic testable and separated from the UI.
9. Seed realistic demo data.
10. Do not claim Malaysian payroll calculations are production-compliant unless they have been validated against current official rules.
11. Do not add out-of-scope HR modules without explicit stakeholder approval.
12. Keep a running implementation checklist against the acceptance criteria in this file.

Recommended implementation order:

1. Foundation, database and authentication
2. Employee management
3. Attendance + fingerprint/QR simulation
4. Leave
5. Payroll calculation domain
6. Payroll UI and finalisation
7. Payslips + PDF
8. Employee self-service
9. Notifications
10. Reports + CSV/PDF exports
11. Dashboard integration
12. End-to-end demo polish and testing

The preferred development strategy is to complete one working vertical slice at a time and keep the application usable throughout development.
