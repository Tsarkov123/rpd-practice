import { useAuth } from "@entities/auth";
import { useRpdComplectsQuery, type GetRpdComplectsParams } from "@entities/rpd-complect/model/queries";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import {
  Box,
  Breadcrumbs,
  Button,
  CssBaseline,
  Typography,
} from "@mui/material";
import { UserRole } from "@shared/ability";
import { RedirectPath } from "@shared/enums";
import { useStore } from "@shared/hooks";
import type { ComplectData } from "@shared/types";
import { Loader, PageTitle, StatusWithDate } from "@shared/ui";
import { ComplectTableHeader } from "@widgets/table-header/ui/ComplectTableHeader";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  type MRT_ColumnFiltersState,
  type MRT_SortingState,
} from "material-react-table";
import { MRT_Localization_RU } from "material-react-table/locales/ru";
import { FC, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export const RpdComplectsList: FC = () => {
  const { setComplectId } = useStore();
  const navigate = useNavigate();
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<MRT_SortingState>([]);
  const userRole = useAuth.getState().userRole;


// формируем параметры запроса только для админа
const queryParams: GetRpdComplectsParams | undefined =
  userRole === UserRole.ADMIN
    ? {
        sortBy: sorting[0]?.id,
        sortOrder: sorting[0]?.desc ? "desc" : "asc",
        filters: columnFilters.reduce<Record<string, string>>((acc, filter) => {
          if (filter.value) {
            acc[filter.id] = String(filter.value);
          }
          return acc;
        }, {}),
      }
    : undefined;

  const { complects, isLoading } = useRpdComplectsQuery(queryParams);

  const handleViewComplect = useCallback(
    (complect: ComplectData) => {
      navigate(`${RedirectPath.COMPLECTS}/${complect.uuid}`);
      setComplectId(complect.id);
    },
    [setComplectId, navigate]
  );

  const adminColumns = [
    {
      accessorKey: "faculty",
      header: "Институт",
    },
    {
      accessorKey: "levelEducation",
      header: "Уровень \nобразования",
      size: 90,
    },
    {
      accessorKey: "directionOfStudy",
      header: "Направление",
    },
  ];

  const generalColumns = useMemo<MRT_ColumnDef<ComplectData>[]>(
    () => [
      ...(userRole === UserRole.ADMIN ? adminColumns : []),
      {
        accessorKey: "profile",
        header: "Профиль",
        Cell: ({ table, row }) => {
          const rows = table.getRowModel().rows;
          const prev = rows[row.index - 1];
          return prev && prev.original.profile === row.original.profile
            ? null
            : row.original.profile;
        },
      },
      {
        accessorKey: "formEducation",
        header: "Форма обучения",
        size: 110,
      },
      {
        accessorKey: "year",
        header: "Год набора",
        size: 100,
      },
      {
        accessorKey: "status",
        header: "Статус",
        size: 120,
        Cell: ({ row }) => {
          if (!row.original.hasPendingChanges) return null;
          return (
            <StatusWithDate label="Обновлён" date={row.original.lastSyncedAt} />
          );
        },
      },
      {
        accessorKey: "actions",
        header: "",
        enableSorting: false,
        enableColumnActions: false,
        enableColumnFilter: false,
        size: 200,
        Cell: ({ row }) => (
          <Breadcrumbs separator={"/"}>
            {[
              <Button
                size="medium"
                sx={{ textDecoration: "underline" }}
                onClick={() => handleViewComplect(row.original)}
              >
                Комплект РПД
              </Button>,
              <Button
                size="medium"
                sx={{ textDecoration: "underline" }}
                onClick={() => {
                  const originalRow = row.original;
                  navigate(RedirectPath.PLANNED_RESULTS, {
                    state: {
                      profile: originalRow.profile,
                      formEducation: originalRow.formEducation,
                      year: originalRow.year,
                    },
                  });
                }}
              >
                Компетенции
              </Button>,
            ]}
          </Breadcrumbs>
        ),
      },
    ],
    [handleViewComplect, navigate]
  );

  const table = useMaterialReactTable<ComplectData>({
    columns: generalColumns,
    data: complects,
    localization: MRT_Localization_RU,
    enableFilters: true,
    enableSorting: true,
    enableColumnFilters: true,
    manualFiltering: userRole === UserRole.ADMIN,
    manualSorting: userRole === UserRole.ADMIN,
    enableRowSelection: true,
    enableColumnResizing: true,
    positionToolbarAlertBanner: "none",
    layoutMode: "grid",
    state: {
      rowSelection,
      columnFilters,
      sorting,
    },
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    initialState: {
      sorting:
        userRole !== UserRole.ADMIN
          ? [
              { id: "profile", desc: false },
              { id: "year", desc: false },
            ]
          : [],
      pagination: {
        pageIndex: 0,
        pageSize: 20,
      },
    },
    muiTableProps: {
      size: "small",
      className: "table",
    },
    muiTableBodyCellProps: {
      sx: {
        py: 0.5,
      },
    },
    renderTopToolbarCustomActions: ({ table }) => (
      <ComplectTableHeader setRowSelection={setRowSelection} table={table} />
    ),
  });

  if (isLoading) return <Loader />;

  return (
    <Box>
      <CssBaseline />
      <PageTitle title={"Список загруженных комплектов РПД"} />
      <Box py={0.5}>
        {complects.length > 0 && userRole !== UserRole.ADMIN && (
          <Breadcrumbs
            separator={
              <FiberManualRecordIcon color="secondary" sx={{ fontSize: 5 }} />
            }
          >
            {[
              <Typography component={"span"} color="textSecondary">
                {complects[0].directionOfStudy}
              </Typography>,
              <Typography component={"span"} color="textSecondary">
                {complects[0].levelEducation}
              </Typography>,
            ]}
          </Breadcrumbs>
        )}
      </Box>
      <Box pt={2}>
        <MaterialReactTable table={table} />
      </Box>
    </Box>
  );
};