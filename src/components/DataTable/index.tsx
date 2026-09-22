import Autocomplete from "@mui/material/Autocomplete";
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Skeleton from "@mui/material/Skeleton";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDPagination from "components/MDPagination";
import MDTypography from "components/MDTypography";
import { useDensity } from "context/density";
import { emptyDash, useT } from "i18n";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type UIEvent,
} from "react";
import {
  useAsyncDebounce,
  useGlobalFilter,
  usePagination,
  useSortBy,
  useTable,
  type Column,
  type HeaderGroup,
  type Row as TableRowType,
} from "react-table";

export interface DataColumn {
  Header: string;
  accessor: string;
  align?: "left" | "right" | "center";
  minWidth?: number;
  maxWidth?: number;
  width?: number | string;
  flex?: number;
  truncate?: boolean;
  primary?: boolean;
  numeric?: boolean;
}

export interface DataRow {
  id?: string;
  _ariaLabel?: string;
  [key: string]: ReactNode;
}

interface Props {
  table: {
    columns: DataColumn[];
    rows: DataRow[];
  };
  entriesPerPage?:
    | false
    | {
        defaultValue: number;
        entries: number[];
      };
  canSearch?: boolean;
  showTotalEntries?: boolean;
  isSorted?: boolean;
  noEndBorder?: boolean;
  pagination?: {
    variant: "contained" | "gradient";
    color: "primary" | "secondary" | "info" | "success" | "warning" | "error" | "dark" | "light";
  };
  ariaLabel?: string;
  loading?: boolean;
}

type SortDir = false | "none" | "ascending" | "descending";

function cellContent(value: ReactNode, dash: string): ReactNode {
  if (value == null || value === "") return dash;
  return value;
}

function columnWidthSx(column: DataColumn): CSSProperties {
  const style: CSSProperties = {};
  if (column.minWidth != null) style.minWidth = column.minWidth;
  if (column.maxWidth != null) style.maxWidth = column.maxWidth;
  if (column.width != null) style.width = column.width;
  if (column.flex) {
    style.width = `${column.flex}fr`;
    style.minWidth = column.minWidth ?? 120;
  }
  if (column.truncate) {
    style.overflow = "hidden";
    style.textOverflow = "ellipsis";
    style.whiteSpace = "nowrap";
  }
  if (column.numeric) {
    style.fontVariantNumeric = "tabular-nums";
  }
  return style;
}

function rowCellSx(rowPx: number, column?: DataColumn): object {
  return {
    ...columnWidthSx(column ?? { Header: "", accessor: "" }),
    height: rowPx,
    maxHeight: rowPx,
    py: 0,
    px: 1.5,
    boxSizing: "border-box",
    overflow: "hidden",
    whiteSpace: "nowrap",
    verticalAlign: "middle",
    lineHeight: 1.25,
  };
}

function DataTable({
  entriesPerPage = { defaultValue: 10, entries: [5, 10, 25, 50] },
  canSearch = false,
  showTotalEntries = true,
  table,
  pagination = { variant: "gradient", color: "info" },
  isSorted = true,
  noEndBorder = false,
  ariaLabel,
  loading = false,
}: Props): JSX.Element {
  const { t } = useT();
  const { rowPx } = useDensity();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dash = emptyDash();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const defaultValue = entriesPerPage ? entriesPerPage.defaultValue : 10;
  const entries = entriesPerPage ? entriesPerPage.entries.map(String) : [];

  const columns = useMemo(
    () =>
      table.columns.map((col) => ({
        Header: col.Header,
        accessor: col.accessor,
        align: col.align ?? (col.numeric ? "right" : "left"),
        minWidth: col.minWidth,
        maxWidth: col.maxWidth,
        width: col.width,
        flex: col.flex,
        truncate: col.truncate,
        primary: col.primary,
        numeric: col.numeric,
      })) as Column<DataRow>[],
    [table.columns]
  );
  const data = useMemo(() => table.rows, [table.rows]);

  const tableInstance = useTable(
    { columns, data, initialState: { pageIndex: 0 } },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    rows,
    page,
    pageOptions,
    canPreviousPage,
    canNextPage,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    setGlobalFilter,
    state: { pageIndex, pageSize, globalFilter },
  } = tableInstance;

  useEffect(() => {
    const next = defaultValue || 10;
    if (pageSize !== next) setPageSize(next);
    // setPageSize from react-table is not referentially stable — listing it
    // in deps re-fires this effect every render and trips React #185.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  const measureOverflow = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) {
      setOverflow({ left: false, right: false });
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setOverflow({
      left: el.scrollLeft > 2,
      right: max > 2 && el.scrollLeft < max - 2,
    });
  }, []);

  useEffect(() => {
    measureOverflow();
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => measureOverflow());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureOverflow, page, isMobile]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget;
    const max = el.scrollWidth - el.clientWidth;
    setOverflow({
      left: el.scrollLeft > 2,
      right: max > 2 && el.scrollLeft < max - 2,
    });
  };

  const [search, setSearch] = useState(globalFilter ?? "");
  const onSearchChange = useAsyncDebounce((value: string) => {
    setGlobalFilter(value || undefined);
  }, 300);

  const setSortedValue = (column: { isSorted?: boolean; isSortedDesc?: boolean }): SortDir => {
    if (!isSorted) return false;
    if (column.isSorted) return column.isSortedDesc ? "descending" : "ascending";
    return "none";
  };

  const entriesStart = pageIndex === 0 ? 1 : pageIndex * pageSize + 1;
  let entriesEnd = pageSize * (pageIndex + 1);
  if (pageIndex === 0) entriesEnd = Math.min(pageSize, rows.length);
  else if (pageIndex === pageOptions.length - 1) entriesEnd = rows.length;

  const primaryColumns = table.columns.filter((c) => c.primary).slice(0, 3);
  const mobileColumns = primaryColumns.length > 0 ? primaryColumns : table.columns.slice(0, 3);

  const renderPagination = pageOptions.map((option: number) => (
    <MDPagination item key={option} onClick={() => gotoPage(Number(option))} active={pageIndex === option}>
      {option + 1}
    </MDPagination>
  ));

  const customizedPageOptions = pageOptions.map((option: number) => option + 1);

  const toolbar = (entriesPerPage || canSearch) && (
    <MDBox display="flex" justifyContent="space-between" alignItems="center" p={3} gap={2} flexWrap="wrap">
      {entriesPerPage && (
        <MDBox display="flex" alignItems="center">
          <Autocomplete
            disableClearable
            value={pageSize.toString()}
            options={entries}
            onChange={(_event, newValue) => {
              setPageSize(parseInt(newValue, 10));
            }}
            size="small"
            sx={{ width: "5rem" }}
            renderInput={(params) => (
              <MDInput {...params} label={t("table.entriesPerPage")} />
            )}
          />
        </MDBox>
      )}
      {canSearch && (
        <MDBox width="12rem" ml="auto">
          <MDInput
            placeholder={t("table.search")}
            label={t("table.searchAria")}
            value={search}
            size="small"
            fullWidth
            inputProps={{ "aria-label": t("table.searchAria") }}
            onChange={({ currentTarget }: { currentTarget: HTMLInputElement }) => {
              setSearch(currentTarget.value);
              onSearchChange(currentTarget.value);
            }}
          />
        </MDBox>
      )}
    </MDBox>
  );

  const footer = (
    <MDBox
      display="flex"
      flexDirection={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      p={!showTotalEntries && pageOptions.length === 1 ? 0 : 3}
    >
      {showTotalEntries && (
        <MDBox mb={{ xs: 3, sm: 0 }}>
          <MDTypography variant="button" color="secondary" fontWeight="regular">
            {t("table.showing", {
              start: entriesStart,
              end: entriesEnd,
              total: rows.length,
            })}
          </MDTypography>
        </MDBox>
      )}
      {pageOptions.length > 1 && (
        <MDPagination variant={pagination.variant} color={pagination.color}>
          {canPreviousPage && (
            <MDPagination item onClick={() => previousPage()} aria-label={t("table.prevPage")}>
              <Icon aria-hidden sx={{ fontWeight: "bold" }}>
                chevron_left
              </Icon>
            </MDPagination>
          )}
          {renderPagination.length > 6 ? (
            <MDBox width="5rem" mx={1}>
              <MDInput
                inputProps={{
                  type: "number",
                  min: 1,
                  max: customizedPageOptions.length,
                  "aria-label": t("table.showing", {
                    start: entriesStart,
                    end: entriesEnd,
                    total: rows.length,
                  }),
                }}
                value={customizedPageOptions[pageIndex]}
                onChange={(event: { target: { value: string } }) => {
                  const value = Number(event.target.value);
                  if (value > pageOptions.length || value < 1) gotoPage(0);
                  else gotoPage(value - 1);
                }}
              />
            </MDBox>
          ) : (
            renderPagination
          )}
          {canNextPage && (
            <MDPagination item onClick={() => nextPage()} aria-label={t("table.nextPage")}>
              <Icon aria-hidden sx={{ fontWeight: "bold" }}>
                chevron_right
              </Icon>
            </MDPagination>
          )}
        </MDPagination>
      )}
    </MDBox>
  );

  if (isMobile) {
    return (
      <MDBox>
        {toolbar}
        <MDBox display="flex" flexDirection="column" gap={1.5} px={1} pb={1}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={`sk-m-${i}`} variant="outlined" sx={{ p: 1.5 }}>
                  {mobileColumns.map((col) => (
                    <Skeleton key={col.accessor} height={20} sx={{ my: 0.5 }} />
                  ))}
                </Card>
              ))
            : page.map((row: TableRowType<DataRow>) => {
                prepareRow(row);
                const original = row.original;
                const label = String(original._ariaLabel ?? original.id ?? "");
                return (
                  <Card key={row.id} variant="outlined" sx={{ p: 1.5 }} aria-label={label || undefined}>
                    {mobileColumns.map((col) => (
                      <MDBox
                        key={col.accessor}
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        gap={2}
                        py={0.5}
                      >
                        <MDTypography variant="caption" color="secondary">
                          {col.Header}
                        </MDTypography>
                        <MDBox
                          sx={{
                            ...columnWidthSx({ ...col, truncate: true, maxWidth: 220 }),
                            textAlign: col.numeric ? "right" : "left",
                            fontVariantNumeric: col.numeric ? "tabular-nums" : undefined,
                          }}
                        >
                          {cellContent(original[col.accessor], dash)}
                        </MDBox>
                      </MDBox>
                    ))}
                  </Card>
                );
              })}
        </MDBox>
        {footer}
      </MDBox>
    );
  }

  return (
    <TableContainer sx={{ boxShadow: "none", position: "relative" }}>
      {toolbar}
      <MDBox
        ref={scrollerRef}
        onScroll={onScroll}
        tabIndex={0}
        role="region"
        aria-label={ariaLabel ?? t("table.scrollHint")}
        sx={{
          overflowX: "auto",
          position: "relative",
          "&::after": overflow.right
            ? {
                content: '""',
                position: "sticky",
                right: 0,
                top: 0,
                display: "block",
                width: 24,
                marginLeft: "-24px",
                float: "right",
                height: "100%",
                pointerEvents: "none",
                boxShadow: ({ palette }) => `inset -16px 0 12px -12px ${palette.grey[700]}`,
              }
            : undefined,
          "&::before": overflow.left
            ? {
                content: '""',
                position: "sticky",
                left: 0,
                top: 0,
                display: "block",
                width: 24,
                float: "left",
                height: "100%",
                pointerEvents: "none",
                boxShadow: ({ palette }) => `inset 16px 0 12px -12px ${palette.grey[700]}`,
              }
            : undefined,
        }}
      >
        {overflow.right || overflow.left ? (
          <MDTypography variant="caption" color="secondary" sx={{ px: 2, display: "block" }}>
            {t("table.scrollHint")}
          </MDTypography>
        ) : null}
        <Table {...getTableProps()} role="table" aria-label={ariaLabel} sx={{ tableLayout: "fixed", width: "100%" }}>
          <TableHead>
            {headerGroups.map((headerGroup: HeaderGroup<DataRow>) => {
              const headerGroupProps = headerGroup.getHeaderGroupProps();
              const { key: hgKey, ...hgRest } = headerGroupProps;
              return (
                <TableRow key={String(hgKey)} {...hgRest} role="row">
                  {headerGroup.headers.map((column) => {
                    const colDef = table.columns.find((c) => c.accessor === column.id);
                    const sort = setSortedValue(column);
                    const headerProps = column.getHeaderProps(isSorted ? column.getSortByToggleProps() : undefined);
                    const { key: hKey, ...hRest } = headerProps;
                    return (
                      <TableCell
                        key={String(hKey)}
                        {...hRest}
                        component="th"
                        scope="col"
                        role="columnheader"
                        aria-sort={sort === false || sort === "none" ? undefined : sort}
                        align={colDef?.numeric ? "right" : colDef?.align ?? "left"}
                        sx={{
                          ...rowCellSx(rowPx, colDef ?? { Header: "", accessor: column.id }),
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          cursor: isSorted ? "pointer" : "default",
                          userSelect: isSorted ? "none" : "auto",
                        }}
                      >
                        {column.render("Header")}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableHead>
          <TableBody {...getTableBodyProps()}>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={`sk-${i}`} role="row" sx={{ height: rowPx, maxHeight: rowPx }}>
                    {table.columns.map((col) => (
                      <TableCell
                        key={col.accessor}
                        role="cell"
                        sx={rowCellSx(rowPx, col)}
                      >
                        <Skeleton height={18} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : page.map((row: TableRowType<DataRow>) => {
                  prepareRow(row);
                  const rowProps = row.getRowProps();
                  const { key: rKey, ...rRest } = rowProps;
                  const original = row.original;
                  const rowLabel = original._ariaLabel ?? original.id;
                  return (
                    <TableRow
                      key={String(rKey)}
                      {...rRest}
                      role="row"
                      aria-label={rowLabel ? String(rowLabel) : undefined}
                      sx={{ height: rowPx, maxHeight: rowPx }}
                    >
                      {row.cells.map((cell) => {
                        const colDef = table.columns.find((c) => c.accessor === cell.column.id);
                        const cellProps = cell.getCellProps();
                        const { key: cKey, ...cRest } = cellProps;
                        const raw = cell.value as ReactNode;
                        const title =
                          colDef?.truncate && (typeof raw === "string" || typeof raw === "number")
                            ? String(raw)
                            : undefined;
                        return (
                          <TableCell
                            key={String(cKey)}
                            {...cRest}
                            role="cell"
                            align={colDef?.numeric ? "right" : colDef?.align ?? "left"}
                            title={title}
                            sx={{
                              ...rowCellSx(rowPx, colDef ?? { Header: "", accessor: cell.column.id }),
                              borderBottom: noEndBorder ? "none" : undefined,
                              fontVariantNumeric: colDef?.numeric ? "tabular-nums" : undefined,
                              "& > *": {
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: "100%",
                                display: "block",
                              },
                            }}
                          >
                            {cellContent(raw, dash)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </MDBox>
      {footer}
    </TableContainer>
  );
}

export default DataTable;
