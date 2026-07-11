import { axiosBase } from "@shared/api";
import { ComplectData } from "@shared/types";

export interface GetRpdComplectsParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: {
    faculty?: string;
    directionOfStudy?: string;
    profile?: string;
    formEducation?: string;
    levelEducation?: string;
    year?: number;
  };
}

export const getRpdComplects = async (params?: GetRpdComplectsParams): Promise<ComplectData[]> => {
  const { sortBy, sortOrder, filters } = params || {};
  
  // Формируем query параметры
  const queryParams = new URLSearchParams();
  
  if (sortBy) queryParams.append('sortBy', sortBy);
  if (sortOrder) queryParams.append('sortOrder', sortOrder);
  if (filters && Object.keys(filters).length > 0) {
    queryParams.append('filter', JSON.stringify(filters));
  }

  const queryString = queryParams.toString();
  const url = queryString ? `get-rpd-complects?${queryString}` : 'get-rpd-complects';
  
  const { data } = await axiosBase.get<ComplectData[]>(url);
  return data;
};

export const deleteRpdComplects = async (ids: string[]): Promise<void> => {
  await axiosBase.post("delete_rpd_complect", ids);
};