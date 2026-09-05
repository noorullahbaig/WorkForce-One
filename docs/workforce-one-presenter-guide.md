# Workforce One presenter guide

This guide shows the complete employee attendance-correction workflow and the administrator controls around attendance, payroll, notifications, and audit history.

## Prepare the presentation

Open Workforce One in two separate browser sessions so both roles remain signed in:

1. Use the normal browser window for the administrator.
2. Use a private window or a second browser for the employee.
3. On the sign-in page, choose the relevant role card and select **Enter workspace**.
4. Complete or skip the product tour. You can replay it from the profile menu under **Take product tour**.

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@workforceone.demo` | `AdminDemo#2026` |
| Employee | `employee@workforceone.demo` | `EmployeeDemo#2026` |

You do not need to reset the application. During rehearsals, reject the correction so the attendance record remains unchanged. Approve it when you want to show the full applied workflow. A new correction can be requested after any request has been decided.

## Recommended presentation flow

### 1. Establish the two roles

Start in the employee session. Explain that employees see only their own attendance, leave, payslips, notifications, and profile.

Switch to the administrator session. Explain that administrators see company-scoped operational work: people, attendance, leave, payroll, and reports. The **Needs your attention** queue provides direct links to work requiring a decision.

### 2. Show the incorrect attendance record

In the employee session:

1. Select **Attendance** in the navigation.
2. Find **Wed, 26 Aug** in Activity history.
3. Point out the 9:00 AM clock-in, missing clock-out, incomplete worked time, and **missing clock out** status.
4. Select **Request correction**.

Talking point: the employee starts from the record that needs attention, so the system already knows the employee, work date, and original values.

### 3. Preview and submit the correction

In the correction form:

1. Confirm the original clock-in and missing clock-out.
2. Leave proposed clock-in at `26 Aug 2026, 9:00 AM`.
3. Enter proposed clock-out as `26 Aug 2026, 6:30 PM` in Malaysia time.
4. Enter a reason such as `Forgot to clock out after closing the counter`.
5. Point out the preview: **9h 30m worked · 1h 30m overtime**.
6. Select **Submit correction request**.

Talking point: submission creates a pending request. It does not immediately change attendance or payroll inputs.

The Activity history row now shows **Correction pending admin review**, and the employee cannot create a duplicate pending request for that record.

### 4. Show the administrator attention queue

Switch to the administrator session and refresh **Home**.

1. Under **Needs your attention**, select **Review attendance corrections**.
2. Show the Pending, Approved, and Rejected status tabs.
3. Open Farah Iskandar’s request.

The review shows:

- employee and attendance date;
- original and proposed clock-in/out values;
- employee reason;
- resulting worked and overtime time;
- pay basis and affected payroll period;
- whether the payroll period is draft or finalised.

Talking point: the administrator sees the effect before deciding, while the original request values remain available for audit history.

### 5. Demonstrate the payroll blocker

From the review, select the linked **2026-08 payroll**.

Show that:

- the pending attendance correction blocks finalisation;
- unresolved missing clock-outs are shown separately;
- Farah’s attendance input has not yet changed;
- **Finalise payroll** remains unavailable while blockers exist.

In **Employee pay review**, demonstrate search, pay-basis filtering, attendance-input filtering, and ten-row page navigation. The row count appears only in the pagination footer because the task is reviewing pay inputs, not counting records.

### 6. Approve or reject

Return to **Time → Corrections** and reopen the request.

For a rehearsal, enter a rejection reason and select **Reject correction**. Attendance remains unchanged, and the employee sees the reason.

For the complete workflow, select **Approve correction**. The system then:

1. validates that the attendance record still matches the submitted original values;
2. updates the attendance record;
3. recalculates worked and overtime minutes with the existing attendance rules;
4. records the administrator decision and audit event;
5. sends the employee a notification;
6. removes the pending-correction payroll blocker.

### 7. Confirm the employee result

Switch to the employee session and refresh.

1. Open **Notifications** and show **Attendance correction approved** or **Attendance correction rejected**.
2. Open **Attendance**.
3. For approval, confirm the record now shows 9:00 AM–6:30 PM, **9h 30m worked**, **1h 30m overtime**, and approved request history.
4. For rejection, confirm the attendance times remain unchanged and the rejection reason appears in request history.

### 8. Confirm payroll recalculation

In the administrator session, return to **Payroll → August 2026**.

After approval, Farah’s attendance input shows **570 min** and **90 OT min**, and the pending-correction blocker is gone. Any unrelated attendance exception remains visible and continues to block finalisation.

Talking point: approval updates the live attendance inputs for a draft payroll period. If the payroll period were already finalised, the review would warn the administrator and leave existing payroll results and payslips unchanged.

Do not finalise payroll simply to demonstrate corrections. Finalisation is intentionally consequential and should be shown only when the remaining attendance exceptions have been resolved.

## Administrator navigation

| Area | Purpose |
| --- | --- |
| Home | Company status and direct action queue |
| People | Employee directory, employment, statutory, and banking information |
| Time | Daily attendance, exceptions, attendance capture, and correction review |
| Leave | Leave calendar, approval queue, balances, holidays, and policy settings |
| Payroll | Payroll periods, employee pay review, adjustments, blockers, and finalisation |
| Reports | Finalised payroll PDF, detailed CSV, and bank payout CSV |
| Notifications | Links back to submitted requests and other operational events |

## Employee navigation

| Area | Purpose |
| --- | --- |
| Home | Today’s attendance, leave balance, latest pay, and recent updates |
| Attendance | Clock-in/out, attendance history, and correction requests |
| Leave | Balance, team availability, request submission, and request history |
| Payslips | Finalised pay records and downloadable PDF payslips |
| Notifications | Attendance, leave, and payroll decisions |
| Profile | Personal, employment, statutory, and banking details available to the employee |

## Closing discussion points

- Employee and administrator access is role- and company-scoped on the server.
- Attendance stays unchanged until approval.
- Duplicate pending requests and repeated administrator decisions are prevented.
- Approval, rejection, notifications, and audit records are committed together.
- Attendance corrections affect draft payroll inputs but never rewrite finalised payroll records or payslips.
- All attendance dates and inputs use the company’s Malaysia timezone behavior.
