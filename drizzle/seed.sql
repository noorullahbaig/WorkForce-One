PRAGMA foreign_keys = OFF;

DELETE FROM audit_events;
DELETE FROM notifications;
DELETE FROM payslips;
DELETE FROM payroll_results;
DELETE FROM payroll_adjustments;
DELETE FROM payroll_runs;
DELETE FROM contribution_bands;
DELETE FROM payroll_policies;
DELETE FROM leave_balance_adjustments;
DELETE FROM leave_requests;
DELETE FROM leave_balances;
DELETE FROM leave_types;
DELETE FROM holidays;
DELETE FROM attendance_records;
DELETE FROM sessions;
DELETE FROM login_attempts;
DELETE FROM users;
DELETE FROM employees;
DELETE FROM companies;

INSERT INTO companies (id, name, registration_number, timezone, created_at, updated_at)
VALUES ('company-merdeka', 'Merdeka Coffee Sdn. Bhd.', '202001028884', 'Asia/Kuala_Lumpur', '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z');

INSERT INTO employees (id, company_id, employee_code, full_name, email, phone, department, position, employment_type, salary_type, monthly_salary_sen, hourly_rate_sen, start_date, status, statutory_profile, ic_number, epf_number, tax_number, bank_name, bank_account_number, created_at, updated_at) VALUES
('emp-001', 'company-merdeka', 'MC-1001', 'Farah Iskandar', 'farah@merdekacoffee.demo', '+60 12-301 7782', 'Operations', 'Operations Manager', 'full_time', 'monthly', 650000, NULL, '2022-03-14', 'active', 'my_under_60', '920415-10-5238', '21498102', 'SG 291048201', 'Maybank', '514012384910', '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z'),
('emp-002', 'company-merdeka', 'MC-1002', 'Amir Hakim', 'amir@merdekacoffee.demo', '+60 12-883 4192', 'Technology', 'Software Engineer', 'full_time', 'monthly', 850000, NULL, '2023-01-09', 'active', 'my_under_60', '890722-14-6101', '18920419', 'SG 198204810', 'CIMB Bank', '8001928401', '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z'),
('emp-003', 'company-merdeka', 'MC-1003', 'Nur Aisyah', 'aisyah@merdekacoffee.demo', '+60 17-420 3351', 'Retail', 'Senior Barista', 'part_time', 'hourly', NULL, 1800, '2024-07-01', 'active', 'my_under_60', '981105-08-5420', '24109822', 'SG 301948201', 'Public Bank', '4820194829', '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z'),
('emp-004', 'company-merdeka', 'MC-1004', 'Jason Tan', 'jason@merdekacoffee.demo', '+60 16-911 7734', 'Finance', 'Finance Lead', 'full_time', 'monthly', 720000, NULL, '2021-11-15', 'active', 'my_under_60', '880312-07-5119', '17203948', 'SG 172940192', 'Maybank', '114029481920', '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z'),
('emp-005', 'company-merdeka', 'MC-1005', 'Priya Nair', 'priya@merdekacoffee.demo', '+60 19-550 8823', 'Marketing', 'Brand Executive', 'full_time', 'monthly', 550000, NULL, '2023-09-18', 'active', 'my_under_60', '950920-10-6044', '23019481', 'SG 284019284', 'RHB Bank', '2140192840192', '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z'),
('emp-006', 'company-merdeka', 'MC-1006', 'Hafiz Rahman', 'hafiz@merdekacoffee.demo', '+60 11-233 6654', 'Production', 'Coffee Roaster', 'part_time', 'hourly', NULL, 2000, '2025-01-06', 'active', 'my_under_60', '970214-03-5811', '25019482', 'SG 319204819', 'Hong Leong Bank', '04820194820', '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z'),
('emp-007', 'company-merdeka', 'MC-1007', 'Mei Ling Wong', 'meiling@merdekacoffee.demo', '+60 12-442 9067', 'People', 'HR Executive', 'full_time', 'monthly', 620000, NULL, '2022-08-22', 'on_leave', 'my_under_60', '931201-14-5390', '22401928', 'SG 274019284', 'Maybank', '512049281920', '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z'),
('emp-008', 'company-merdeka', 'MC-1008', 'Rajesh Muthu', 'rajesh@merdekacoffee.demo', '+60 14-620 1179', 'Operations', 'Warehouse Coordinator', 'full_time', 'monthly', 450000, NULL, '2024-02-12', 'active', 'my_under_60', '910819-08-5923', '20194829', 'SG 254019281', 'CIMB Bank', '7058201948', '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z'),
('emp-009', 'company-merdeka', 'MC-1009', 'Sarah Lim', 'sarah@merdekacoffee.demo', '+60 18-303 7488', 'Sales', 'Account Executive', 'contract', 'monthly', 480000, NULL, '2025-04-07', 'active', 'my_under_60', '990428-10-5022', '26104928', 'SG 329104829', 'Public Bank', '3194029481', '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z'),
('emp-010', 'company-merdeka', 'MC-1010', 'Alex Kumar', 'alex@merdekacoffee.demo', '+60 13-228 1150', 'Retail', 'Weekend Cashier', 'part_time', 'hourly', NULL, 1600, '2025-06-02', 'active', 'my_under_60', '000512-14-6389', '27401928', 'SG 349104820', 'Maybank', '112049281928', '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z');

INSERT INTO users (id, company_id, employee_id, name, email, role, password_hash, password_salt, active, created_at, updated_at) VALUES
('user-admin', 'company-merdeka', NULL, 'Noor Azmi', 'admin@workforceone.demo', 'admin', 'e2cd94f453483d4e6bf8452db19cbefaf31032e18793d9cbf4af197954a93f45', 'workforce-one-admin-2026', 1, '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z'),
('user-employee', 'company-merdeka', 'emp-001', 'Farah Iskandar', 'employee@workforceone.demo', 'employee', '830ef1cf8f28442990fb091d0793f46c374e2929165e16cb5275d6b00161279f', 'workforce-one-employee-2026', 1, '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z');

INSERT INTO attendance_records (id, employee_id, work_date, clock_in, clock_out, clock_in_method, clock_out_method, worked_minutes, overtime_minutes, status, created_at, updated_at) VALUES
('att-001', 'emp-001', '2026-08-26', '2026-08-26T01:00:00.000Z', NULL, 'qr', NULL, NULL, NULL, 'missing_clock_out', '2026-08-26T01:00:00.000Z', '2026-08-26T01:00:00.000Z'),
('att-002', 'emp-002', '2026-08-25', '2026-08-25T00:45:00.000Z', '2026-08-25T10:15:00.000Z', 'fingerprint', 'fingerprint', 570, 90, 'present', '2026-08-25T00:45:00.000Z', '2026-08-25T10:15:00.000Z'),
('att-003', 'emp-003', '2026-08-25', '2026-08-25T01:00:00.000Z', '2026-08-25T09:00:00.000Z', 'qr', 'qr', 480, 0, 'present', '2026-08-25T01:00:00.000Z', '2026-08-25T09:00:00.000Z'),
('att-004', 'emp-004', '2026-08-25', '2026-08-25T01:12:00.000Z', '2026-08-25T09:15:00.000Z', 'fingerprint', 'fingerprint', 483, 3, 'late', '2026-08-25T01:12:00.000Z', '2026-08-25T09:15:00.000Z'),
('att-005', 'emp-005', '2026-08-25', '2026-08-25T01:00:00.000Z', '2026-08-25T09:00:00.000Z', 'qr', 'qr', 480, 0, 'present', '2026-08-25T01:00:00.000Z', '2026-08-25T09:00:00.000Z'),
('att-006', 'emp-006', '2026-08-25', '2026-08-25T00:30:00.000Z', '2026-08-25T10:30:00.000Z', 'fingerprint', 'fingerprint', 600, 120, 'present', '2026-08-25T00:30:00.000Z', '2026-08-25T10:30:00.000Z'),
('att-007', 'emp-007', '2026-08-25', NULL, NULL, NULL, NULL, 0, 0, 'on_leave', '2026-08-25T00:00:00.000Z', '2026-08-25T00:00:00.000Z'),
('att-008', 'emp-008', '2026-08-25', '2026-08-25T01:00:00.000Z', '2026-08-25T09:00:00.000Z', 'fingerprint', 'fingerprint', 480, 0, 'present', '2026-08-25T01:00:00.000Z', '2026-08-25T09:00:00.000Z'),
('att-009', 'emp-009', '2026-08-25', '2026-08-25T01:05:00.000Z', '2026-08-25T09:15:00.000Z', 'qr', 'qr', 490, 10, 'late', '2026-08-25T01:05:00.000Z', '2026-08-25T09:15:00.000Z'),
('att-010', 'emp-010', '2026-08-25', '2026-08-25T02:00:00.000Z', NULL, 'qr', NULL, NULL, NULL, 'missing_clock_out', '2026-08-25T02:00:00.000Z', '2026-08-25T02:00:00.000Z');

INSERT INTO leave_types (id, company_id, code, name, paid, default_days) VALUES
('leave-annual', 'company-merdeka', 'AL', 'Annual leave', 1, 14),
('leave-medical', 'company-merdeka', 'MC', 'Medical leave', 1, 14),
('leave-unpaid', 'company-merdeka', 'UL', 'Unpaid leave', 0, 0);

INSERT INTO leave_balances (employee_id, leave_type_id, allocated_half_days)
SELECT id, 'leave-annual', 28 FROM employees;
INSERT INTO leave_balances (employee_id, leave_type_id, allocated_half_days)
SELECT id, 'leave-medical', 28 FROM employees;
INSERT INTO leave_balances (employee_id, leave_type_id, allocated_half_days)
SELECT id, 'leave-unpaid', 0 FROM employees;

INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, duration_half_days, day_part, reason, status, reviewed_by, reviewed_at, created_at, updated_at) VALUES
('lr-001', 'emp-009', 'leave-annual', '2026-08-28', '2026-08-28', 2, 'full', 'Family appointment', 'pending', NULL, NULL, '2026-08-25T07:30:00.000Z', '2026-08-25T07:30:00.000Z'),
('lr-002', 'emp-007', 'leave-annual', '2026-08-25', '2026-08-26', 4, 'full', 'Family holiday', 'approved', 'user-admin', '2026-08-22T03:20:00.000Z', '2026-08-21T02:00:00.000Z', '2026-08-22T03:20:00.000Z'),
('lr-003', 'emp-008', 'leave-unpaid', '2026-08-18', '2026-08-18', 2, 'full', 'Personal matter', 'approved', 'user-admin', '2026-08-16T04:15:00.000Z', '2026-08-15T09:00:00.000Z', '2026-08-16T04:15:00.000Z');

INSERT INTO holidays (id, company_id, name, date, category, region, observed, source_url, active, created_at, updated_at) VALUES
('holiday-2026-new-year', 'company-merdeka', 'New Year’s Day', '2026-01-01', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-thaipusam', 'company-merdeka', 'Thaipusam', '2026-02-01', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-thaipusam-observed', 'company-merdeka', 'Thaipusam (observed)', '2026-02-02', 'public', 'MY-PENANG', 1, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-cny-1', 'company-merdeka', 'Chinese New Year', '2026-02-17', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-cny-2', 'company-merdeka', 'Chinese New Year, second day', '2026-02-18', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-nuzul', 'company-merdeka', 'Nuzul Al-Quran', '2026-03-07', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-raya-1', 'company-merdeka', 'Hari Raya Aidilfitri', '2026-03-21', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-raya-2', 'company-merdeka', 'Hari Raya Aidilfitri, second day', '2026-03-22', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-raya-observed', 'company-merdeka', 'Hari Raya Aidilfitri (observed)', '2026-03-23', 'public', 'MY-PENANG', 1, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-labour', 'company-merdeka', 'Labour Day', '2026-05-01', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-qurban', 'company-merdeka', 'Hari Raya Haji', '2026-05-27', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-wesak', 'company-merdeka', 'Wesak Day', '2026-05-31', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-agong', 'company-merdeka', 'Birthday of the Yang di-Pertuan Agong', '2026-06-01', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-wesak-observed', 'company-merdeka', 'Wesak Day (observed)', '2026-06-02', 'public', 'MY-PENANG', 1, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-muharram', 'company-merdeka', 'Awal Muharram', '2026-06-17', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-heritage', 'company-merdeka', 'George Town World Heritage City Day', '2026-07-07', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-governor', 'company-merdeka', 'Birthday of the Governor of Penang', '2026-07-11', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-maulidur', 'company-merdeka', 'Maulidur Rasul', '2026-08-25', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-national', 'company-merdeka', 'National Day', '2026-08-31', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-malaysia', 'company-merdeka', 'Malaysia Day', '2026-09-16', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-deepavali', 'company-merdeka', 'Deepavali', '2026-11-08', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-deepavali-observed', 'company-merdeka', 'Deepavali (observed)', '2026-11-09', 'public', 'MY-PENANG', 1, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('holiday-2026-christmas', 'company-merdeka', 'Christmas Day', '2026-12-25', 'public', 'MY-PENANG', 0, 'https://www.kabinet.gov.my/hari-kelepasan-am/', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

INSERT INTO payroll_policies (id, company_id, name, effective_from, verification_date, source_urls_json, normal_day_minutes, overtime_multiplier_basis_points, locked, active, created_at, updated_at)
VALUES ('policy-my-2026', 'company-merdeka', 'Malaysia Standard — 2026', '2026-01-01', '2026-08-26', '["https://www.kwsp.gov.my/en/employer/responsibilities/mandatory-contribution","https://perkeso.gov.my/en/our-services/employer-employee/contributions","https://www.hasil.gov.my/majikan/pembayaran-pcb/"]', 480, 15000, 1, 1, '2026-08-01T00:00:00.000Z', '2026-08-26T00:00:00.000Z');

INSERT INTO contribution_bands (id, policy_id, scheme, min_wage_sen, max_wage_sen, employee_sen, employer_sen) VALUES
('band-epf-example', 'policy-my-2026', 'epf', 670001, 680000, 74800, 81600),
('band-socso-ceiling', 'policy-my-2026', 'socso', 590001, NULL, 2975, 10415),
('band-eis-ceiling', 'policy-my-2026', 'eis', 590001, NULL, 1190, 1190);

INSERT INTO payroll_runs (id, company_id, policy_id, period, period_start, period_end, pay_date, status, gross_total_sen, deduction_total_sen, net_total_sen, employer_contribution_total_sen, idempotency_key, finalised_at, created_at, updated_at) VALUES
('payroll-2026-07', 'company-merdeka', 'policy-my-2026', '2026-07', '2026-07-01', '2026-07-31', '2026-07-31', 'finalised', 670000, 92865, 577135, 92005, 'seed-july-final', '2026-07-28T08:00:00.000Z', '2026-07-25T02:00:00.000Z', '2026-07-28T08:00:00.000Z'),
('payroll-2026-08', 'company-merdeka', 'policy-my-2026', '2026-08', '2026-08-01', '2026-08-31', '2026-08-31', 'draft', 0, 0, 0, 0, NULL, NULL, '2026-08-24T01:00:00.000Z', '2026-08-26T00:00:00.000Z');

INSERT INTO payroll_adjustments (id, payroll_run_id, employee_id, type, description, amount_sen, reason, created_at) VALUES
('adj-001', 'payroll-2026-08', 'emp-002', 'allowance', 'On-call allowance', 30000, 'August support rotation', '2026-08-25T04:00:00.000Z'),
('adj-002', 'payroll-2026-08', 'emp-002', 'bonus', 'Project completion bonus', 50000, 'Portal launch', '2026-08-25T04:05:00.000Z'),
('adj-003', 'payroll-2026-08', 'emp-001', 'pcb', 'Verified LHDN e-PCB', 15000, 'Verified 2026-08-25', '2026-08-25T04:10:00.000Z'),
('adj-004', 'payroll-2026-08', 'emp-010', 'deduction', 'Uniform replacement', 3500, 'Employee acknowledged', '2026-08-25T04:15:00.000Z');

INSERT INTO payroll_results (id, payroll_run_id, employee_id, input_snapshot_json, breakdown_json, gross_pay_sen, total_deductions_sen, net_pay_sen, employer_contributions_sen, created_at)
VALUES ('result-2026-07-001', 'payroll-2026-07', 'emp-001', '{"salaryType":"monthly","monthlySalarySen":650000,"period":"2026-07"}', '{"basePaySen":650000,"allowanceSen":20000,"overtimePaySen":0,"grossPaySen":670000,"epfEmployeeSen":73700,"socsoEmployeeSen":2975,"eisEmployeeSen":1190,"pcbSen":15000,"totalDeductionsSen":92865,"netPaySen":577135,"epfEmployerSen":80400,"socsoEmployerSen":10415,"eisEmployerSen":1190}', 670000, 92865, 577135, 92005, '2026-07-28T08:00:00.000Z');

INSERT INTO payslips (id, payroll_result_id, payroll_run_id, employee_id, created_at)
VALUES ('payslip-2026-07-001', 'result-2026-07-001', 'payroll-2026-07', 'emp-001', '2026-07-28T08:00:00.000Z');

INSERT INTO notifications (id, user_id, title, body, href, read_at, created_at) VALUES
('note-001', 'user-admin', 'Leave request needs review', 'Sarah Lim requested one day of annual leave.', '/admin/leave', NULL, '2026-08-25T07:30:00.000Z'),
('note-002', 'user-admin', 'Missing clock-out', 'Alex Kumar has an incomplete attendance record.', '/admin/attendance', NULL, '2026-08-25T10:00:00.000Z'),
('note-003', 'user-employee', 'July payslip is ready', 'Your July 2026 payslip is available to view.', '/employee/payslips/payslip-2026-07-001', NULL, '2026-07-28T08:00:00.000Z'),
('note-004', 'user-employee', 'Clock-in recorded', 'QR clock-in recorded at 9:00 AM.', '/employee/attendance', '2026-08-26T01:05:00.000Z', '2026-08-26T01:00:00.000Z');

INSERT INTO audit_events (id, company_id, actor_user_id, action, entity_type, entity_id, metadata_json, created_at) VALUES
('audit-001', 'company-merdeka', 'user-admin', 'payroll.finalised', 'payroll_run', 'payroll-2026-07', '{"period":"2026-07","policyId":"policy-my-2026"}', '2026-07-28T08:00:00.000Z'),
('audit-002', 'company-merdeka', 'user-admin', 'leave.approved', 'leave_request', 'lr-003', '{"days":1,"type":"unpaid"}', '2026-08-16T04:15:00.000Z');

PRAGMA foreign_keys = ON;
