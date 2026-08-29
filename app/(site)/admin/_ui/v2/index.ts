// Dashboard v2 — Home's component set, built on the 2026 design system
// (./tokens.css maps it onto the app's primitives; app/fonts.ts ships the two
// brand faces). Home is still the only screen that imports from here; every
// other /admin screen keeps using ../* (the v1, DESIGN-APP.md system).
export { formatFreshness } from "./format";
export { Card } from "./Card";
export { StatCard } from "./StatCard";
export { Table, Th, Tr, Td } from "./DataTable";
export { EmptyState } from "./EmptyState";
export { PageHeader } from "./PageHeader";
export { DeltaChip } from "./DeltaChip";
export { Sparkline, type SparkPoint } from "./Sparkline";
export { ProgressBar } from "./ProgressBar";
export { HealthDot, WiringDot, type Health } from "./HealthDot";
export { PacingStrip } from "./PacingStrip";
export { Blockers, type Blocker } from "./Blockers";
export { QualifiedByMonth, type TrendMonth, type ChannelLegend } from "./QualifiedByMonth";
export { ChannelsTable, type ChannelRow } from "./ChannelsTable";
export { CHANNEL_INK, channelLabel } from "./channelViz";
