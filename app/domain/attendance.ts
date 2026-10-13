export const NORMAL_DAY_MINUTES = 480;

export type AttendanceCalculation = {
	workedMinutes: number | null;
	overtimeMinutes: number | null;
};

export function calculateAttendance(input: {
	clockIn: string;
	clockOut: string | null;
	normalDayMinutes: number;
}): AttendanceCalculation {
	if (!input.clockOut) {
		return { workedMinutes: null, overtimeMinutes: null };
	}

	const clockIn = Date.parse(input.clockIn);
	const clockOut = Date.parse(input.clockOut);
	if (!Number.isFinite(clockIn) || !Number.isFinite(clockOut)) {
		throw new Error("Attendance timestamps must be valid ISO dates");
	}
	if (clockOut <= clockIn) {
		throw new Error("Clock out must be after clock in");
	}

	const workedMinutes = Math.round((clockOut - clockIn) / 60_000);
	return {
		workedMinutes,
		overtimeMinutes: Math.max(0, workedMinutes - input.normalDayMinutes),
	};
}

export const ACTIVE_SHIFT_MILLISECONDS = 24 * 60 * 60 * 1000;
export function isActiveShift(record: {clockIn: string|null; clockOut: string|null}, now: string): boolean {
 if(!record.clockIn || record.clockOut) return false;
 const elapsed=Date.parse(now)-Date.parse(record.clockIn);
 return Number.isFinite(elapsed) && elapsed>=0 && elapsed<=ACTIVE_SHIFT_MILLISECONDS;
}
export function greetingInMalaysia(now: string): string {
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',hour:'2-digit',hourCycle:'h23'}).format(new Date(now)));
 return hour<12?'Good morning':hour<18?'Good afternoon':'Good evening';
}
type DailySession = {id?:string;employeeId:string;workDate:string;clockIn?:string|null;workedMinutes:number|null;overtimeMinutes:number|null};
export function allocateDailyAttendance<T extends DailySession>(records:T[],normalDayMinutes=NORMAL_DAY_MINUTES):T[] {
 const totals=new Map<string,number>();const allocated=new Map<T,number|null>();
 for(const r of [...records].sort((a,b)=>(Date.parse(a.clockIn??'')-Date.parse(b.clockIn??''))||((a.id??'')<(b.id??'')?-1:(a.id??'')>(b.id??'')?1:0))){
  if(r.workedMinutes===null){allocated.set(r,null);continue;}
  const key=`${r.employeeId}|${r.workDate}`;const prior=totals.get(key)??0;const minutes=r.workedMinutes;
  allocated.set(r,Math.max(0,prior+minutes-normalDayMinutes)-Math.max(0,prior-normalDayMinutes));totals.set(key,prior+minutes);
 }
 return records.map(r=>({...r,overtimeMinutes:allocated.get(r)??null}));
}
export function attendanceConflicts(records: (DailySession & {clockOut:string|null})[]):string[] {
 const warnings:string[]=[];const byEmployee=new Map<string,typeof records>();
 for(const r of records){if(!r.clockIn)continue;const group=byEmployee.get(r.employeeId)??[];group.push(r);byEmployee.set(r.employeeId,group)}
 for(const rows of byEmployee.values()){
  rows.sort((a,b)=>Date.parse(a.clockIn!)-Date.parse(b.clockIn!));
  let latestEnd=-Infinity;
  for(const r of rows){const start=Date.parse(r.clockIn!);const end=r.clockOut?Date.parse(r.clockOut):start+ACTIVE_SHIFT_MILLISECONDS;if(start<latestEnd)warnings.push(r.id??`${r.employeeId}/${r.workDate}`);latestEnd=Math.max(latestEnd,end)}
 }
 return warnings;
}

/** Match the server's timestamp-descending, binary-ID-descending choice for legacy duplicate active rows. */
export function selectActiveShift<T extends {id:string;clockIn:string|null;clockOut:string|null}>(records:T[],now:string):T|undefined {
 return records.filter(r=>isActiveShift(r,now)).sort((a,b)=>Date.parse(b.clockIn!)-Date.parse(a.clockIn!)||(a.id<b.id?1:a.id>b.id?-1:0))[0];
}
