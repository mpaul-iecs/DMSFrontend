/**
 * Department reference-data types — mirrors InnerEye.DMS.Foundation.Payloads.Departments.DepartmentDto
 * field-for-field, same convention as types/auth.ts.
 */

/** Mirrors InnerEye.DMS.Foundation.Payloads.Departments.DepartmentDto */
export interface DepartmentDto {
  departmentId: number;
  departmentName: string;
  deptCode: string | null;
}
