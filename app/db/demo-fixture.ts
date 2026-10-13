// Canonical business baseline. Keep aligned with drizzle/seed.sql; parity is tested.
// Authentication, users, sessions, and login attempts are intentionally excluded.
export const DEMO_COMPANY_ID = "company-merdeka";
export const demoBusinessFixture: Record<string, Record<string, string | number | null>[]> = {
  "companies": [
    {
      "id": "company-merdeka",
      "name": "Merdeka Coffee Sdn. Bhd.",
      "registration_number": "202001028884",
      "timezone": "Asia/Kuala_Lumpur",
      "created_at": "2026-08-01T00:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z",
      "leave_backdate_days": 3
    }
  ],
  "employees": [
    {
      "id": "emp-001",
      "company_id": "company-merdeka",
      "employee_code": "MC-1001",
      "full_name": "Farah Iskandar",
      "email": "farah@merdekacoffee.demo",
      "phone": "+60 12-301 7782",
      "department": "Operations",
      "position": "Operations Manager",
      "employment_type": "full_time",
      "salary_type": "monthly",
      "monthly_salary_sen": 650000,
      "hourly_rate_sen": null,
      "start_date": "2022-03-14",
      "status": "active",
      "statutory_profile": "my_under_60",
      "created_at": "2026-08-01T00:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z",
      "ic_number": "920415-10-5238",
      "epf_number": "21498102",
      "tax_number": "SG 291048201",
      "bank_name": "Maybank",
      "bank_account_number": "514012384910"
    },
    {
      "id": "emp-002",
      "company_id": "company-merdeka",
      "employee_code": "MC-1002",
      "full_name": "Amir Hakim",
      "email": "amir@merdekacoffee.demo",
      "phone": "+60 12-883 4192",
      "department": "Technology",
      "position": "Software Engineer",
      "employment_type": "full_time",
      "salary_type": "monthly",
      "monthly_salary_sen": 850000,
      "hourly_rate_sen": null,
      "start_date": "2023-01-09",
      "status": "active",
      "statutory_profile": "my_under_60",
      "created_at": "2026-08-01T00:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z",
      "ic_number": "890722-14-6101",
      "epf_number": "18920419",
      "tax_number": "SG 198204810",
      "bank_name": "CIMB Bank",
      "bank_account_number": "8001928401"
    },
    {
      "id": "emp-003",
      "company_id": "company-merdeka",
      "employee_code": "MC-1003",
      "full_name": "Nur Aisyah",
      "email": "aisyah@merdekacoffee.demo",
      "phone": "+60 17-420 3351",
      "department": "Retail",
      "position": "Senior Barista",
      "employment_type": "part_time",
      "salary_type": "hourly",
      "monthly_salary_sen": null,
      "hourly_rate_sen": 1800,
      "start_date": "2024-07-01",
      "status": "active",
      "statutory_profile": "my_under_60",
      "created_at": "2026-08-01T00:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z",
      "ic_number": "981105-08-5420",
      "epf_number": "24109822",
      "tax_number": "SG 301948201",
      "bank_name": "Public Bank",
      "bank_account_number": "4820194829"
    },
    {
      "id": "emp-004",
      "company_id": "company-merdeka",
      "employee_code": "MC-1004",
      "full_name": "Jason Tan",
      "email": "jason@merdekacoffee.demo",
      "phone": "+60 16-911 7734",
      "department": "Finance",
      "position": "Finance Lead",
      "employment_type": "full_time",
      "salary_type": "monthly",
      "monthly_salary_sen": 720000,
      "hourly_rate_sen": null,
      "start_date": "2021-11-15",
      "status": "active",
      "statutory_profile": "my_under_60",
      "created_at": "2026-08-01T00:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z",
      "ic_number": "880312-07-5119",
      "epf_number": "17203948",
      "tax_number": "SG 172940192",
      "bank_name": "Maybank",
      "bank_account_number": "114029481920"
    },
    {
      "id": "emp-005",
      "company_id": "company-merdeka",
      "employee_code": "MC-1005",
      "full_name": "Priya Nair",
      "email": "priya@merdekacoffee.demo",
      "phone": "+60 19-550 8823",
      "department": "Marketing",
      "position": "Brand Executive",
      "employment_type": "full_time",
      "salary_type": "monthly",
      "monthly_salary_sen": 550000,
      "hourly_rate_sen": null,
      "start_date": "2023-09-18",
      "status": "active",
      "statutory_profile": "my_under_60",
      "created_at": "2026-08-01T00:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z",
      "ic_number": "950920-10-6044",
      "epf_number": "23019481",
      "tax_number": "SG 284019284",
      "bank_name": "RHB Bank",
      "bank_account_number": "2140192840192"
    },
    {
      "id": "emp-006",
      "company_id": "company-merdeka",
      "employee_code": "MC-1006",
      "full_name": "Hafiz Rahman",
      "email": "hafiz@merdekacoffee.demo",
      "phone": "+60 11-233 6654",
      "department": "Production",
      "position": "Coffee Roaster",
      "employment_type": "part_time",
      "salary_type": "hourly",
      "monthly_salary_sen": null,
      "hourly_rate_sen": 2000,
      "start_date": "2025-01-06",
      "status": "active",
      "statutory_profile": "my_under_60",
      "created_at": "2026-08-01T00:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z",
      "ic_number": "970214-03-5811",
      "epf_number": "25019482",
      "tax_number": "SG 319204819",
      "bank_name": "Hong Leong Bank",
      "bank_account_number": "04820194820"
    },
    {
      "id": "emp-007",
      "company_id": "company-merdeka",
      "employee_code": "MC-1007",
      "full_name": "Mei Ling Wong",
      "email": "meiling@merdekacoffee.demo",
      "phone": "+60 12-442 9067",
      "department": "People",
      "position": "HR Executive",
      "employment_type": "full_time",
      "salary_type": "monthly",
      "monthly_salary_sen": 620000,
      "hourly_rate_sen": null,
      "start_date": "2022-08-22",
      "status": "on_leave",
      "statutory_profile": "my_under_60",
      "created_at": "2026-08-01T00:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z",
      "ic_number": "931201-14-5390",
      "epf_number": "22401928",
      "tax_number": "SG 274019284",
      "bank_name": "Maybank",
      "bank_account_number": "512049281920"
    },
    {
      "id": "emp-008",
      "company_id": "company-merdeka",
      "employee_code": "MC-1008",
      "full_name": "Rajesh Muthu",
      "email": "rajesh@merdekacoffee.demo",
      "phone": "+60 14-620 1179",
      "department": "Operations",
      "position": "Warehouse Coordinator",
      "employment_type": "full_time",
      "salary_type": "monthly",
      "monthly_salary_sen": 450000,
      "hourly_rate_sen": null,
      "start_date": "2024-02-12",
      "status": "active",
      "statutory_profile": "my_under_60",
      "created_at": "2026-08-01T00:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z",
      "ic_number": "910819-08-5923",
      "epf_number": "20194829",
      "tax_number": "SG 254019281",
      "bank_name": "CIMB Bank",
      "bank_account_number": "7058201948"
    },
    {
      "id": "emp-009",
      "company_id": "company-merdeka",
      "employee_code": "MC-1009",
      "full_name": "Sarah Lim",
      "email": "sarah@merdekacoffee.demo",
      "phone": "+60 18-303 7488",
      "department": "Sales",
      "position": "Account Executive",
      "employment_type": "contract",
      "salary_type": "monthly",
      "monthly_salary_sen": 480000,
      "hourly_rate_sen": null,
      "start_date": "2025-04-07",
      "status": "active",
      "statutory_profile": "my_under_60",
      "created_at": "2026-08-01T00:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z",
      "ic_number": "990428-10-5022",
      "epf_number": "26104928",
      "tax_number": "SG 329104829",
      "bank_name": "Public Bank",
      "bank_account_number": "3194029481"
    },
    {
      "id": "emp-010",
      "company_id": "company-merdeka",
      "employee_code": "MC-1010",
      "full_name": "Alex Kumar",
      "email": "alex@merdekacoffee.demo",
      "phone": "+60 13-228 1150",
      "department": "Retail",
      "position": "Weekend Cashier",
      "employment_type": "part_time",
      "salary_type": "hourly",
      "monthly_salary_sen": null,
      "hourly_rate_sen": 1600,
      "start_date": "2025-06-02",
      "status": "active",
      "statutory_profile": "my_under_60",
      "created_at": "2026-08-01T00:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z",
      "ic_number": "000512-14-6389",
      "epf_number": "27401928",
      "tax_number": "SG 349104820",
      "bank_name": "Maybank",
      "bank_account_number": "112049281928"
    }
  ],
  "attendance_records": [
    {
      "id": "att-001",
      "employee_id": "emp-001",
      "work_date": "2026-08-26",
      "clock_in": "2026-08-26T01:00:00.000Z",
      "clock_out": null,
      "clock_in_method": "qr",
      "clock_out_method": null,
      "worked_minutes": null,
      "overtime_minutes": null,
      "status": "missing_clock_out",
      "created_at": "2026-08-26T01:00:00.000Z",
      "updated_at": "2026-08-26T01:00:00.000Z"
    },
    {
      "id": "att-002",
      "employee_id": "emp-002",
      "work_date": "2026-08-25",
      "clock_in": "2026-08-25T00:45:00.000Z",
      "clock_out": "2026-08-25T10:15:00.000Z",
      "clock_in_method": "fingerprint",
      "clock_out_method": "fingerprint",
      "worked_minutes": 570,
      "overtime_minutes": 90,
      "status": "present",
      "created_at": "2026-08-25T00:45:00.000Z",
      "updated_at": "2026-08-25T10:15:00.000Z"
    },
    {
      "id": "att-003",
      "employee_id": "emp-003",
      "work_date": "2026-08-25",
      "clock_in": "2026-08-25T01:00:00.000Z",
      "clock_out": "2026-08-25T09:00:00.000Z",
      "clock_in_method": "qr",
      "clock_out_method": "qr",
      "worked_minutes": 480,
      "overtime_minutes": 0,
      "status": "present",
      "created_at": "2026-08-25T01:00:00.000Z",
      "updated_at": "2026-08-25T09:00:00.000Z"
    },
    {
      "id": "att-004",
      "employee_id": "emp-004",
      "work_date": "2026-08-25",
      "clock_in": "2026-08-25T01:12:00.000Z",
      "clock_out": "2026-08-25T09:15:00.000Z",
      "clock_in_method": "fingerprint",
      "clock_out_method": "fingerprint",
      "worked_minutes": 483,
      "overtime_minutes": 3,
      "status": "late",
      "created_at": "2026-08-25T01:12:00.000Z",
      "updated_at": "2026-08-25T09:15:00.000Z"
    },
    {
      "id": "att-005",
      "employee_id": "emp-005",
      "work_date": "2026-08-25",
      "clock_in": "2026-08-25T01:00:00.000Z",
      "clock_out": "2026-08-25T09:00:00.000Z",
      "clock_in_method": "qr",
      "clock_out_method": "qr",
      "worked_minutes": 480,
      "overtime_minutes": 0,
      "status": "present",
      "created_at": "2026-08-25T01:00:00.000Z",
      "updated_at": "2026-08-25T09:00:00.000Z"
    },
    {
      "id": "att-006",
      "employee_id": "emp-006",
      "work_date": "2026-08-25",
      "clock_in": "2026-08-25T00:30:00.000Z",
      "clock_out": "2026-08-25T10:30:00.000Z",
      "clock_in_method": "fingerprint",
      "clock_out_method": "fingerprint",
      "worked_minutes": 600,
      "overtime_minutes": 120,
      "status": "present",
      "created_at": "2026-08-25T00:30:00.000Z",
      "updated_at": "2026-08-25T10:30:00.000Z"
    },
    {
      "id": "att-007",
      "employee_id": "emp-007",
      "work_date": "2026-08-25",
      "clock_in": null,
      "clock_out": null,
      "clock_in_method": null,
      "clock_out_method": null,
      "worked_minutes": 0,
      "overtime_minutes": 0,
      "status": "on_leave",
      "created_at": "2026-08-25T00:00:00.000Z",
      "updated_at": "2026-08-25T00:00:00.000Z"
    },
    {
      "id": "att-008",
      "employee_id": "emp-008",
      "work_date": "2026-08-25",
      "clock_in": "2026-08-25T01:00:00.000Z",
      "clock_out": "2026-08-25T09:00:00.000Z",
      "clock_in_method": "fingerprint",
      "clock_out_method": "fingerprint",
      "worked_minutes": 480,
      "overtime_minutes": 0,
      "status": "present",
      "created_at": "2026-08-25T01:00:00.000Z",
      "updated_at": "2026-08-25T09:00:00.000Z"
    },
    {
      "id": "att-009",
      "employee_id": "emp-009",
      "work_date": "2026-08-25",
      "clock_in": "2026-08-25T01:05:00.000Z",
      "clock_out": "2026-08-25T09:15:00.000Z",
      "clock_in_method": "qr",
      "clock_out_method": "qr",
      "worked_minutes": 490,
      "overtime_minutes": 10,
      "status": "late",
      "created_at": "2026-08-25T01:05:00.000Z",
      "updated_at": "2026-08-25T09:15:00.000Z"
    },
    {
      "id": "att-010",
      "employee_id": "emp-010",
      "work_date": "2026-08-25",
      "clock_in": "2026-08-25T02:00:00.000Z",
      "clock_out": null,
      "clock_in_method": "qr",
      "clock_out_method": null,
      "worked_minutes": null,
      "overtime_minutes": null,
      "status": "missing_clock_out",
      "created_at": "2026-08-25T02:00:00.000Z",
      "updated_at": "2026-08-25T02:00:00.000Z"
    }
  ],
  "leave_types": [
    {
      "id": "leave-annual",
      "company_id": "company-merdeka",
      "code": "AL",
      "name": "Annual leave",
      "paid": 1,
      "default_days": 14
    },
    {
      "id": "leave-medical",
      "company_id": "company-merdeka",
      "code": "MC",
      "name": "Medical leave",
      "paid": 1,
      "default_days": 14
    },
    {
      "id": "leave-unpaid",
      "company_id": "company-merdeka",
      "code": "UL",
      "name": "Unpaid leave",
      "paid": 0,
      "default_days": 0
    }
  ],
  "leave_balances": [
    {
      "employee_id": "emp-001",
      "leave_type_id": "leave-annual",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-002",
      "leave_type_id": "leave-annual",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-003",
      "leave_type_id": "leave-annual",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-004",
      "leave_type_id": "leave-annual",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-005",
      "leave_type_id": "leave-annual",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-006",
      "leave_type_id": "leave-annual",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-007",
      "leave_type_id": "leave-annual",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-008",
      "leave_type_id": "leave-annual",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-009",
      "leave_type_id": "leave-annual",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-010",
      "leave_type_id": "leave-annual",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-001",
      "leave_type_id": "leave-medical",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-002",
      "leave_type_id": "leave-medical",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-003",
      "leave_type_id": "leave-medical",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-004",
      "leave_type_id": "leave-medical",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-005",
      "leave_type_id": "leave-medical",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-006",
      "leave_type_id": "leave-medical",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-007",
      "leave_type_id": "leave-medical",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-008",
      "leave_type_id": "leave-medical",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-009",
      "leave_type_id": "leave-medical",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-010",
      "leave_type_id": "leave-medical",
      "allocated_half_days": 28
    },
    {
      "employee_id": "emp-001",
      "leave_type_id": "leave-unpaid",
      "allocated_half_days": 0
    },
    {
      "employee_id": "emp-002",
      "leave_type_id": "leave-unpaid",
      "allocated_half_days": 0
    },
    {
      "employee_id": "emp-003",
      "leave_type_id": "leave-unpaid",
      "allocated_half_days": 0
    },
    {
      "employee_id": "emp-004",
      "leave_type_id": "leave-unpaid",
      "allocated_half_days": 0
    },
    {
      "employee_id": "emp-005",
      "leave_type_id": "leave-unpaid",
      "allocated_half_days": 0
    },
    {
      "employee_id": "emp-006",
      "leave_type_id": "leave-unpaid",
      "allocated_half_days": 0
    },
    {
      "employee_id": "emp-007",
      "leave_type_id": "leave-unpaid",
      "allocated_half_days": 0
    },
    {
      "employee_id": "emp-008",
      "leave_type_id": "leave-unpaid",
      "allocated_half_days": 0
    },
    {
      "employee_id": "emp-009",
      "leave_type_id": "leave-unpaid",
      "allocated_half_days": 0
    },
    {
      "employee_id": "emp-010",
      "leave_type_id": "leave-unpaid",
      "allocated_half_days": 0
    }
  ],
  "leave_requests": [
    {
      "id": "lr-001",
      "employee_id": "emp-009",
      "leave_type_id": "leave-annual",
      "start_date": "2026-08-28",
      "end_date": "2026-08-28",
      "duration_half_days": 2,
      "reason": "Family appointment",
      "status": "pending",
      "reviewed_by": null,
      "reviewed_at": null,
      "created_at": "2026-08-25T07:30:00.000Z",
      "updated_at": "2026-08-25T07:30:00.000Z",
      "day_part": "full",
      "review_note": null,
      "cancelled_by": null,
      "cancelled_at": null
    },
    {
      "id": "lr-002",
      "employee_id": "emp-007",
      "leave_type_id": "leave-annual",
      "start_date": "2026-08-25",
      "end_date": "2026-08-26",
      "duration_half_days": 4,
      "reason": "Family holiday",
      "status": "approved",
      "reviewed_by": "user-admin",
      "reviewed_at": "2026-08-22T03:20:00.000Z",
      "created_at": "2026-08-21T02:00:00.000Z",
      "updated_at": "2026-08-22T03:20:00.000Z",
      "day_part": "full",
      "review_note": null,
      "cancelled_by": null,
      "cancelled_at": null
    },
    {
      "id": "lr-003",
      "employee_id": "emp-008",
      "leave_type_id": "leave-unpaid",
      "start_date": "2026-08-18",
      "end_date": "2026-08-18",
      "duration_half_days": 2,
      "reason": "Personal matter",
      "status": "approved",
      "reviewed_by": "user-admin",
      "reviewed_at": "2026-08-16T04:15:00.000Z",
      "created_at": "2026-08-15T09:00:00.000Z",
      "updated_at": "2026-08-16T04:15:00.000Z",
      "day_part": "full",
      "review_note": null,
      "cancelled_by": null,
      "cancelled_at": null
    }
  ],
  "holidays": [
    {
      "id": "holiday-2026-new-year",
      "company_id": "company-merdeka",
      "name": "New Year’s Day",
      "date": "2026-01-01",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-thaipusam",
      "company_id": "company-merdeka",
      "name": "Thaipusam",
      "date": "2026-02-01",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-thaipusam-observed",
      "company_id": "company-merdeka",
      "name": "Thaipusam (observed)",
      "date": "2026-02-02",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 1,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-cny-1",
      "company_id": "company-merdeka",
      "name": "Chinese New Year",
      "date": "2026-02-17",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-cny-2",
      "company_id": "company-merdeka",
      "name": "Chinese New Year, second day",
      "date": "2026-02-18",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-nuzul",
      "company_id": "company-merdeka",
      "name": "Nuzul Al-Quran",
      "date": "2026-03-07",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-raya-1",
      "company_id": "company-merdeka",
      "name": "Hari Raya Aidilfitri",
      "date": "2026-03-21",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-raya-2",
      "company_id": "company-merdeka",
      "name": "Hari Raya Aidilfitri, second day",
      "date": "2026-03-22",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-raya-observed",
      "company_id": "company-merdeka",
      "name": "Hari Raya Aidilfitri (observed)",
      "date": "2026-03-23",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 1,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-labour",
      "company_id": "company-merdeka",
      "name": "Labour Day",
      "date": "2026-05-01",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-qurban",
      "company_id": "company-merdeka",
      "name": "Hari Raya Haji",
      "date": "2026-05-27",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-wesak",
      "company_id": "company-merdeka",
      "name": "Wesak Day",
      "date": "2026-05-31",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-agong",
      "company_id": "company-merdeka",
      "name": "Birthday of the Yang di-Pertuan Agong",
      "date": "2026-06-01",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-wesak-observed",
      "company_id": "company-merdeka",
      "name": "Wesak Day (observed)",
      "date": "2026-06-02",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 1,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-muharram",
      "company_id": "company-merdeka",
      "name": "Awal Muharram",
      "date": "2026-06-17",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-heritage",
      "company_id": "company-merdeka",
      "name": "George Town World Heritage City Day",
      "date": "2026-07-07",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-governor",
      "company_id": "company-merdeka",
      "name": "Birthday of the Governor of Penang",
      "date": "2026-07-11",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-maulidur",
      "company_id": "company-merdeka",
      "name": "Maulidur Rasul",
      "date": "2026-08-25",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-national",
      "company_id": "company-merdeka",
      "name": "National Day",
      "date": "2026-08-31",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-malaysia",
      "company_id": "company-merdeka",
      "name": "Malaysia Day",
      "date": "2026-09-16",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-deepavali",
      "company_id": "company-merdeka",
      "name": "Deepavali",
      "date": "2026-11-08",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-deepavali-observed",
      "company_id": "company-merdeka",
      "name": "Deepavali (observed)",
      "date": "2026-11-09",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 1,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "holiday-2026-christmas",
      "company_id": "company-merdeka",
      "name": "Christmas Day",
      "date": "2026-12-25",
      "category": "public",
      "region": "MY-PENANG",
      "observed": 0,
      "source_url": "https://www.kabinet.gov.my/hari-kelepasan-am/",
      "active": 1,
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "payroll_policies": [
    {
      "id": "policy-my-2026",
      "company_id": "company-merdeka",
      "name": "Malaysia Standard — 2026",
      "effective_from": "2026-01-01",
      "verification_date": "2026-08-26",
      "source_urls_json": "[\"https://www.kwsp.gov.my/en/employer/responsibilities/mandatory-contribution\",\"https://perkeso.gov.my/en/our-services/employer-employee/contributions\",\"https://www.hasil.gov.my/majikan/pembayaran-pcb/\"]",
      "normal_day_minutes": 480,
      "overtime_multiplier_basis_points": 15000,
      "locked": 1,
      "active": 1,
      "created_at": "2026-08-01T00:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z"
    }
  ],
  "contribution_bands": [
    {
      "id": "band-epf-example",
      "policy_id": "policy-my-2026",
      "scheme": "epf",
      "min_wage_sen": 670001,
      "max_wage_sen": 680000,
      "employee_sen": 74800,
      "employer_sen": 81600
    },
    {
      "id": "band-socso-ceiling",
      "policy_id": "policy-my-2026",
      "scheme": "socso",
      "min_wage_sen": 590001,
      "max_wage_sen": null,
      "employee_sen": 2975,
      "employer_sen": 10415
    },
    {
      "id": "band-eis-ceiling",
      "policy_id": "policy-my-2026",
      "scheme": "eis",
      "min_wage_sen": 590001,
      "max_wage_sen": null,
      "employee_sen": 1190,
      "employer_sen": 1190
    }
  ],
  "payroll_runs": [
    {
      "id": "payroll-2026-07",
      "company_id": "company-merdeka",
      "policy_id": "policy-my-2026",
      "period": "2026-07",
      "period_start": "2026-07-01",
      "period_end": "2026-07-31",
      "pay_date": "2026-07-31",
      "status": "finalised",
      "gross_total_sen": 670000,
      "deduction_total_sen": 92865,
      "net_total_sen": 577135,
      "employer_contribution_total_sen": 92005,
      "idempotency_key": "seed-july-final",
      "finalised_at": "2026-07-28T08:00:00.000Z",
      "created_at": "2026-07-25T02:00:00.000Z",
      "updated_at": "2026-07-28T08:00:00.000Z"
    },
    {
      "id": "payroll-2026-08",
      "company_id": "company-merdeka",
      "policy_id": "policy-my-2026",
      "period": "2026-08",
      "period_start": "2026-08-01",
      "period_end": "2026-08-31",
      "pay_date": "2026-08-31",
      "status": "draft",
      "gross_total_sen": 0,
      "deduction_total_sen": 0,
      "net_total_sen": 0,
      "employer_contribution_total_sen": 0,
      "idempotency_key": null,
      "finalised_at": null,
      "created_at": "2026-08-24T01:00:00.000Z",
      "updated_at": "2026-08-26T00:00:00.000Z"
    }
  ],
  "payroll_adjustments": [
    {
      "id": "adj-001",
      "payroll_run_id": "payroll-2026-08",
      "employee_id": "emp-002",
      "type": "allowance",
      "description": "On-call allowance",
      "amount_sen": 30000,
      "reason": "August support rotation",
      "created_at": "2026-08-25T04:00:00.000Z"
    },
    {
      "id": "adj-002",
      "payroll_run_id": "payroll-2026-08",
      "employee_id": "emp-002",
      "type": "bonus",
      "description": "Project completion bonus",
      "amount_sen": 50000,
      "reason": "Portal launch",
      "created_at": "2026-08-25T04:05:00.000Z"
    },
    {
      "id": "adj-003",
      "payroll_run_id": "payroll-2026-08",
      "employee_id": "emp-001",
      "type": "pcb",
      "description": "Verified LHDN e-PCB",
      "amount_sen": 15000,
      "reason": "Verified 2026-08-25",
      "created_at": "2026-08-25T04:10:00.000Z"
    },
    {
      "id": "adj-004",
      "payroll_run_id": "payroll-2026-08",
      "employee_id": "emp-010",
      "type": "deduction",
      "description": "Uniform replacement",
      "amount_sen": 3500,
      "reason": "Employee acknowledged",
      "created_at": "2026-08-25T04:15:00.000Z"
    }
  ],
  "payroll_results": [
    {
      "id": "result-2026-07-001",
      "payroll_run_id": "payroll-2026-07",
      "employee_id": "emp-001",
      "input_snapshot_json": "{\"salaryType\":\"monthly\",\"monthlySalarySen\":650000,\"period\":\"2026-07\"}",
      "breakdown_json": "{\"basePaySen\":650000,\"allowanceSen\":20000,\"overtimePaySen\":0,\"grossPaySen\":670000,\"epfEmployeeSen\":73700,\"socsoEmployeeSen\":2975,\"eisEmployeeSen\":1190,\"pcbSen\":15000,\"totalDeductionsSen\":92865,\"netPaySen\":577135,\"epfEmployerSen\":80400,\"socsoEmployerSen\":10415,\"eisEmployerSen\":1190}",
      "gross_pay_sen": 670000,
      "total_deductions_sen": 92865,
      "net_pay_sen": 577135,
      "employer_contributions_sen": 92005,
      "created_at": "2026-07-28T08:00:00.000Z"
    }
  ],
  "payslips": [
    {
      "id": "payslip-2026-07-001",
      "payroll_result_id": "result-2026-07-001",
      "payroll_run_id": "payroll-2026-07",
      "employee_id": "emp-001",
      "created_at": "2026-07-28T08:00:00.000Z"
    }
  ],
  "notifications": [
    {
      "id": "note-001",
      "user_id": "user-admin",
      "title": "Leave request needs review",
      "body": "Sarah Lim requested one day of annual leave.",
      "href": "/admin/leave",
      "read_at": null,
      "created_at": "2026-08-25T07:30:00.000Z"
    },
    {
      "id": "note-002",
      "user_id": "user-admin",
      "title": "Missing clock-out",
      "body": "Alex Kumar has an incomplete attendance record.",
      "href": "/admin/attendance",
      "read_at": null,
      "created_at": "2026-08-25T10:00:00.000Z"
    },
    {
      "id": "note-003",
      "user_id": "user-employee",
      "title": "July payslip is ready",
      "body": "Your July 2026 payslip is available to view.",
      "href": "/employee/payslips/payslip-2026-07-001",
      "read_at": null,
      "created_at": "2026-07-28T08:00:00.000Z"
    },
    {
      "id": "note-004",
      "user_id": "user-employee",
      "title": "Clock-in recorded",
      "body": "QR clock-in recorded at 9:00 AM.",
      "href": "/employee/attendance",
      "read_at": "2026-08-26T01:05:00.000Z",
      "created_at": "2026-08-26T01:00:00.000Z"
    }
  ],
  "audit_events": [
    {
      "id": "audit-001",
      "company_id": "company-merdeka",
      "actor_user_id": "user-admin",
      "action": "payroll.finalised",
      "entity_type": "payroll_run",
      "entity_id": "payroll-2026-07",
      "metadata_json": "{\"period\":\"2026-07\",\"policyId\":\"policy-my-2026\"}",
      "created_at": "2026-07-28T08:00:00.000Z"
    },
    {
      "id": "audit-002",
      "company_id": "company-merdeka",
      "actor_user_id": "user-admin",
      "action": "leave.approved",
      "entity_type": "leave_request",
      "entity_id": "lr-003",
      "metadata_json": "{\"days\":1,\"type\":\"unpaid\"}",
      "created_at": "2026-08-16T04:15:00.000Z"
    }
  ]
};
