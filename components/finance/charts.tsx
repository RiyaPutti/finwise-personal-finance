"use client";

import { Area, AreaChart, Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/finance/calculations";
import { DEFAULT_WORKSPACE_CURRENCY } from "@/lib/finance/currency";

const palette = ["#C6A15A", "#73B68B", "#98ABB8", "#D8C38E", "#C96F63", "#789E9B", "#A8A7A0"];
const tooltipStyle = { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--ink)", fontSize: 12 };

export function TrendChart({ data, currency = DEFAULT_WORKSPACE_CURRENCY }: { data: { label: string; income: number; expense: number }[]; currency?: string }) {
  if (!data.some((row) => row.income || row.expense)) return <ChartEmpty text="Your income and spending trend will appear as you add transactions." />;
  return <ResponsiveContainer width="100%" height={270}><AreaChart data={data} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#73B68B" stopOpacity={.26} /><stop offset="100%" stopColor="#73B68B" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={11} /><YAxis stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(value) => formatMoney(value, currency, true)} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatMoney(value, currency)} /><Area type="monotone" dataKey="income" stroke="#73B68B" fill="url(#incomeFill)" strokeWidth={2} /><Area type="monotone" dataKey="expense" stroke="#C96F63" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer>;
}

export function ReserveProgressChart({ data, currency = DEFAULT_WORKSPACE_CURRENCY, target, hasReserveAccount }: { data: { label: string; balance: number }[]; currency?: string; target: number; hasReserveAccount: boolean }) {
  if (!hasReserveAccount) return <ChartEmpty text="Add a Cash reserve account to see its ledger-derived progress over time." />;
  return <ResponsiveContainer width="100%" height={270}><AreaChart data={data} margin={{ top: 12, right: 4, left: -25, bottom: 0 }}><defs><linearGradient id="reserveFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#C6A15A" stopOpacity={.24} /><stop offset="100%" stopColor="#C6A15A" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="label" stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={11} /><YAxis stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(value) => formatMoney(value, currency, true)} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatMoney(value, currency), "Cash reserve"]} /><Area type="monotone" dataKey="balance" name="Cash reserve" stroke="#C6A15A" fill="url(#reserveFill)" strokeWidth={2.4} activeDot={{ r: 4, fill: "#C6A15A" }} />{target > 0 ? <ReferenceLine y={target} stroke="#D8C38E" strokeDasharray="5 5" label={{ value: "Target", fill: "#D8C38E", fontSize: 11, position: "insideTopRight" }} /> : null}</AreaChart></ResponsiveContainer>;
}

export function CashFlowForecastChart({ data, currency = DEFAULT_WORKSPACE_CURRENCY }: { data: { label: string; income: number; expense: number; projectedSafeToSpend: number }[]; currency?: string }) {
  if (!data.some((row) => row.income || row.expense)) return <ChartEmpty text="Add a recurring income or expense with a next due date to see the next 30 days here." />;
  return <ResponsiveContainer width="100%" height={270}><LineChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}><XAxis dataKey="label" interval="preserveStartEnd" stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={11} /><YAxis stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={11} tickFormatter={(value) => formatMoney(value, currency, true)} /><Tooltip contentStyle={tooltipStyle} formatter={(value: number, name) => [formatMoney(value, currency), name === "projectedSafeToSpend" ? "Projected safe to spend" : String(name)]} /><ReferenceLine y={0} stroke="var(--line)" /><Line type="monotone" dataKey="projectedSafeToSpend" stroke="#C6A15A" strokeWidth={2.4} dot={false} activeDot={{ r: 4, fill: "#C6A15A" }} /></LineChart></ResponsiveContainer>;
}

export function CategoryBars({ data, currency = DEFAULT_WORKSPACE_CURRENCY }: { data: { name: string; value: number }[]; currency?: string }) {
  if (!data.length) return <ChartEmpty text="Category spending will be visible here once you record an expense." />;
  return <ResponsiveContainer width="100%" height={270}><BarChart layout="vertical" data={data.slice(0, 6)} margin={{ top: 0, right: 5, left: 0, bottom: 0 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" width={100} stroke="var(--muted)" tickLine={false} axisLine={false} fontSize={11} /><Tooltip cursor={{ fill: "var(--raised)" }} contentStyle={tooltipStyle} formatter={(value: number) => formatMoney(value, currency)} /><Bar dataKey="value" radius={[0, 7, 7, 0]}>{data.slice(0, 6).map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}</Bar></BarChart></ResponsiveContainer>;
}

export function SplitDonut({ data, currency = DEFAULT_WORKSPACE_CURRENCY }: { data: { name: string; value: number }[]; currency?: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <ChartEmpty text="Your payment mix will appear after you record expenses." />;
  return <div className="relative h-[270px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={97} paddingAngle={3} stroke="none">{data.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatMoney(value, currency)} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-xs text-[var(--muted)]">Total</p><p className="mt-1 font-mono text-base font-medium tabular-nums">{formatMoney(total, currency, true)}</p></div></div></div>;
}

export function ChartEmpty({ text }: { text: string }) { return <div className="grid h-[270px] place-items-center px-8 text-center text-sm leading-6 text-[var(--muted)]">{text}</div>; }
