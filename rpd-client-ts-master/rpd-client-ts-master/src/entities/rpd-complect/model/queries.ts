export type { GetRpdComplectsParams } from "../api/rpdComplects";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getRpdComplects, deleteRpdComplects, type GetRpdComplectsParams } from "../api/rpdComplects";
import { ComplectData } from "@shared/types";
import { showErrorMessage } from "@shared/lib";

const rpdComplectsQueryKey = ["rpd-complects"] as const;

export const useRpdComplectsQuery = (params?: GetRpdComplectsParams) => {
  const { data, isError, isLoading } = useQuery({
    queryKey: params ? [...rpdComplectsQueryKey, params] : rpdComplectsQueryKey,
    queryFn: () => getRpdComplects(params),
    
  });
  
  const complects = data || [];

  if (isError) showErrorMessage("Ошибка при получении данных");

  return { complects, isError, isLoading };
};

export const useDeleteRpdComplectsMutation = () => {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: deleteRpdComplects,
    onSuccess: (_data, ids) => {
      qc.setQueryData<ComplectData[]>(rpdComplectsQueryKey, (prev) => {
        if (!prev) return prev;
        const toDelete = new Set(ids);
        return prev.filter(c => !toDelete.has(c.uuid));
      });
    },
  });
};
