import { describe, expect, it } from "vitest";

import { calculateAttendance } from "./attendance";

describe("calculateAttendance", () => {
	it("calculates worked and overtime minutes from a complete record", () => {
		const result = calculateAttendance({
			clockIn: "2026-08-25T00:30:00.000Z",
			clockOut: "2026-08-25T10:00:00.000Z",
			normalDayMinutes: 480,
		});

		expect(result).toEqual({ workedMinutes: 570, overtimeMinutes: 90 });
	});

	it("returns incomplete state when clock out is missing", () => {
		const result = calculateAttendance({
			clockIn: "2026-08-25T01:00:00.000Z",
			clockOut: null,
			normalDayMinutes: 480,
		});

		expect(result).toEqual({ workedMinutes: null, overtimeMinutes: null });
	});

	it("rejects a clock out before clock in", () => {
		expect(() =>
			calculateAttendance({
				clockIn: "2026-08-25T09:00:00.000Z",
				clockOut: "2026-08-25T08:00:00.000Z",
				normalDayMinutes: 480,
			}),
		).toThrow("Clock out must be after clock in");
	});
});

it('allocates daily overtime across chronological split sessions', async()=>{
 const {allocateDailyAttendance}=await import('./attendance');
 const rows=allocateDailyAttendance([{id:'b',employeeId:'e',workDate:'2027-02-01',clockIn:'2027-02-01T06:00:00Z',workedMinutes:300,overtimeMinutes:0},{id:'a',employeeId:'e',workDate:'2027-02-01',clockIn:'2027-02-01T00:00:00Z',workedMinutes:300,overtimeMinutes:0}]);
 expect(rows.map(r=>[r.id,r.overtimeMinutes])).toEqual([['b',120],['a',0]]);
});
it('uses inclusive24h active window and Malaysia greeting',async()=>{
 const {isActiveShift,greetingInMalaysia}=await import('./attendance');
 const r={clockIn:'2027-02-01T01:00:00Z',clockOut:null};
 expect(isActiveShift(r,'2027-02-02T01:00:00Z')).toBe(true);expect(isActiveShift(r,'2027-02-02T01:00:01Z')).toBe(false);
 expect(greetingInMalaysia('2027-01-01T03:59:00Z')).toBe('Good morning');expect(greetingInMalaysia('2027-01-01T04:00:00Z')).toBe('Good afternoon');expect(greetingInMalaysia('2027-01-01T10:00:00Z')).toBe('Good evening');
});
it('orders daily allocation by instant rather than ISO spelling',async()=>{
 const {allocateDailyAttendance}=await import('./attendance');
 const rows=allocateDailyAttendance([{id:'a',employeeId:'e',workDate:'2027-02-01',clockIn:'2027-02-01T09:00:00+08:00',workedMinutes:300,overtimeMinutes:0},{id:'b',employeeId:'e',workDate:'2027-02-01',clockIn:'2027-02-01T06:00:00.000Z',workedMinutes:300,overtimeMinutes:0}]);
 expect(rows.map(r=>[r.id,r.overtimeMinutes])).toEqual([['a',0],['b',120]]);
});
it('uses SQL binary ID order when clock instants tie',async()=>{
 const {allocateDailyAttendance}=await import('./attendance');
 const rows=allocateDailyAttendance([{id:'a',employeeId:'e',workDate:'2027-02-01',clockIn:'2027-02-01T01:00:00Z',workedMinutes:300,overtimeMinutes:0},{id:'A',employeeId:'e',workDate:'2027-02-01',clockIn:'2027-02-01T01:00:00.000Z',workedMinutes:300,overtimeMinutes:0}]);
 expect(rows.map(r=>[r.id,r.overtimeMinutes])).toEqual([['a',120],['A',0]]);
});
it('selects the latest active legacy session consistently with the clock-out query',async()=>{
 const {selectActiveShift}=await import('./attendance');
 const rows=[{id:'a',clockIn:'2027-02-01T01:00:00Z',clockOut:null},{id:'b',clockIn:'2027-02-01T02:00:00Z',clockOut:null}];
 expect(selectActiveShift(rows,'2027-02-01T03:00:00Z')?.id).toBe('b');
 expect(selectActiveShift([{...rows[0],id:'Z'},{...rows[0],id:'a'}],'2027-02-01T03:00:00Z')?.id).toBe('a');
});
