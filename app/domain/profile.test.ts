import { describe, expect, test } from "vitest";
import { parseProfile } from "./profile";

const valid = { email: " farah@example.com ", phone: "+60 (12) 301-7782", bankName: " Maybank ", bankAccountNumber: " 0012-3456 " };
describe("profile validation", () => {
 test("normalizes email and bank details while preserving phone formatting and account zeros", () => {
  expect(parseProfile(valid)).toEqual({ success: true, data: { email: "farah@example.com", phone: "+60 (12) 301-7782", bankName: "Maybank", bankAccountNumber: "00123456" } });
 });
 test.each(["bad", "a@b", "a".repeat(250) + "@example.com"])("rejects invalid email %s", email => {
  expect(parseProfile({ ...valid, email })).toMatchObject({ success: false, fieldErrors: { email: expect.any(String) } });
 });
 test.each(["123456", "1234567890123456", "60+1234567", "+60 ext 1234567", "++601234567"])("rejects invalid phone %s", phone => {
  expect(parseProfile({ ...valid, phone })).toMatchObject({ success: false, fieldErrors: { phone: expect.any(String) } });
 });
 test.each(["12345", "1".repeat(35), "00123abc", "0012.3456"])("rejects invalid bank account %s", bankAccountNumber => {
  expect(parseProfile({ ...valid, bankAccountNumber })).toMatchObject({ success: false, fieldErrors: { bankAccountNumber: expect.any(String) } });
 });
 test("allows blank optional bank details", () => {
  expect(parseProfile({ email: "a@example.com", phone: "1234567" })).toEqual({ success: true, data: { email: "a@example.com", phone: "1234567", bankName: "", bankAccountNumber: "" } });
 });
});
