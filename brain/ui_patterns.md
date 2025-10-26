# UI recipe (KPI card, table, drawer)
- Components: <KPIGrid/>, <TimeSeries/>, <IncidentsTable/>, <IncidentDrawer/>.
- Data via `useDataSource()`; no direct fetch in components.
- Always add: loading skeleton, error toast, empty state.
