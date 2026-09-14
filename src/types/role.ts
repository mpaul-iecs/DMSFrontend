/** Mirrors InnerEye.DMS.Foundation.Payloads.RoleDto (or wherever RoleDto lives) — GET /roles, GET /roles/{id}. */
export interface Role {
  idRole: number;
  name: string;
  remarks?: string | null;
  activeYN: boolean;
  idDepartment?: number | null;
  idPost?: number | null;
  roleIndex?: number | null;
  idApplication?: number | null;
  type?: string | null;
  tenantId: string;
}
