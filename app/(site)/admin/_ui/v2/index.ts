// The ops design system — /admin's component set, built on tokens.css.
//
// Home is the first screen on it; Leads, Markets, Performance and Channels
// migrate next pass by swapping their v1 imports for these. Nothing here is
// Home-specific — if a component only makes sense on one screen, it belongs in
// that screen's folder, not this index.
export { OpsShell } from "./OpsShell";
export { OpsCard, OpsMetric, OpsDelta } from "./OpsCard";
export { PaceGauge } from "./PaceGauge";
export { ProgressRows, type ProgressRow } from "./ProgressRows";
export { RangeTabs } from "./RangeTabs";
export { QualifiedByMonth, type TrendMonth, type ChannelLegend } from "./QualifiedByMonth";
export { ChannelsTable, type ChannelRow } from "./ChannelsTable";
export { OpsNotifications, type OpsAlert } from "./OpsNotifications";
export { CHANNEL_INK, channelLabel } from "./channelViz";
export { Sparkline, type SparkPoint } from "./Sparkline";
export { formatFreshness } from "./format";
export { opsFontVars } from "./fonts";
