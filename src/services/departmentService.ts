import api from "./axiosInstance";
import endpoints from "../utilities/endpoint";
import type { BaseResponse } from "../types/auth";
import type { DepartmentDto } from "../types/department";

export interface ListDepartmentsParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListDepartmentsResult {
  items: DepartmentDto[];
  totalCount: number;
}

/** All raw HTTP calls for the Department reference-data domain — components/AsyncPaginateSelect loadOptions call this directly (no thunk yet, mirrors how AsyncSelect callers hit roleService directly). */
const departmentService = {
  listDepartments: async (params: ListDepartmentsParams): Promise<ListDepartmentsResult> => {
    const res = await api.get<BaseResponse<DepartmentDto[]>>(endpoints.departments.base, { params });
    const totalHeader = res.headers?.["x-total-count"];
    const items = res.data.responseData ?? [];
    const totalCount = totalHeader ? Number(totalHeader) : items.length;
    return { items, totalCount };
  },
};

export default departmentService;
