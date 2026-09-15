import { memo, type ReactNode } from "react";
import { FileText } from "lucide-react";
import Card from "../components/ui/Card";
import { IBMPlexSans400, IBMPlexSans600, IBMPlexSans700 } from "../components/ui/Text";

/*
 * Dummy content mirroring the "isDashboard" screen of the neumorphism reference
 * design (DMS Prototype.dc.html) — greeting header, 4 stat cards, a "continue
 * where you left off" doc list, and a recent-activity feed. All data below is
 * placeholder until a real dashboard/documents API exists; swap these consts
 * for a thunk-backed slice once that's wired up.
 */

type StatusKey = "draft" | "in_review" | "approved" | "rejected";

/** Same soft gradient-pill palette as the reference design's STATUS_META map. */
const STATUS_META: Record<StatusKey, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-linear-to-br from-[#eef1f4] to-[#dfe4ea] text-[#5b6b7c]" },
  in_review: { label: "In Review", className: "bg-linear-to-br from-[#fdf0d9] to-[#f8dfae] text-[#8a5a10]" },
  approved: { label: "Approved", className: "bg-linear-to-br from-[#dcf3e4] to-[#c1e8cf] text-[#15803d]" },
  rejected: { label: "Rejected", className: "bg-linear-to-br from-[#fbdfda] to-[#f6c8c0] text-[#b42318]" },
};

interface StatCard {
  label: string;
  value: string;
  sub: string;
  colorClassName: string;
}

const STAT_CARDS: StatCard[] = [
  { label: "Total Documents", value: "248", sub: "+12 this month", colorClassName: "text-primary-600" },
  { label: "Pending Review", value: "12", sub: "3 overdue", colorClassName: "text-[#8a5a10]" },
  { label: "Approved", value: "186", sub: "This quarter", colorClassName: "text-[#15803d]" },
  { label: "Rejected", value: "7", sub: "Needs revision", colorClassName: "text-[#b42318]" },
];

interface QuickDoc {
  id: string;
  name: string;
  dept: string;
  version: string;
  status: StatusKey;
}

const QUICK_DOCS: QuickDoc[] = [
  { id: "d1", name: "SOP-114 Cleaning Validation Protocol", dept: "Quality Assurance", version: "V1.3", status: "in_review" },
  { id: "d2", name: "Batch Record - Line 4 Production", dept: "Manufacturing", version: "V0.2", status: "draft" },
  { id: "d3", name: "Vendor Qualification Report - Acme Labs", dept: "Procurement", version: "V1.0", status: "approved" },
];

interface ActivityItem {
  id: string;
  docName: string;
  action: string;
  actor: string;
  time: string;
}

const RECENT_ACTIVITY: ActivityItem[] = [
  { id: "a1", docName: "SOP-114 Cleaning Validation Protocol", action: "Requested changes on Section 4.2", actor: "J. Okafor", time: "2 hours ago" },
  { id: "a2", docName: "Vendor Qualification Report - Acme Labs", action: "Approved and applied electronic signature", actor: "S. Iyer", time: "3 days ago" },
  { id: "a3", docName: "Batch Record - Line 4 Production", action: "Created document from Batch Record Template v1.0", actor: "R. Chen", time: "Yesterday" },
  { id: "a4", docName: "Change Control CC-0091", action: "Submitted for review", actor: "M. Alvarez", time: "1 week ago" },
];

interface PanelProps {
  title: string;
  children: ReactNode;
}

const Panel = memo(function Panel({ title, children }: PanelProps) {
  return (
    <Card noPadding>
      <div className="px-5 py-4 border-b border-surface-200">
        <IBMPlexSans600 as="h2" className="text-sm text-gray-900">
          {title}
        </IBMPlexSans600>
      </div>
      <div className="divide-y divide-surface-200">{children}</div>
    </Card>
  );
});

const StatCardTile = memo(function StatCardTile({ label, value, sub, colorClassName }: StatCard) {
  return (
    <Card noPadding className="p-5">
      <IBMPlexSans600 as="p" className="text-sm text-gray-500">
        {label}
      </IBMPlexSans600>
      <p className={`text-2xl mt-2 ${colorClassName}`}>
        <IBMPlexSans700 as="span">{value}</IBMPlexSans700>
      </p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </Card>
  );
});

const QuickDocRow = memo(function QuickDocRow({ name, dept, version, status }: QuickDoc) {
  const meta = STATUS_META[status];
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-surface-200/50 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-surface-100 shadow-neu-raised-sm flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-primary-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-900 truncate">
          <IBMPlexSans600>{name}</IBMPlexSans600>
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {dept} &middot; {version}
        </p>
      </div>
      <span className={`text-[11.5px] rounded-lg px-2.5 py-1 shrink-0 ${meta.className}`}>
        <IBMPlexSans600 as="span">{meta.label}</IBMPlexSans600>
      </span>
    </div>
  );
});

const ActivityRow = memo(function ActivityRow({ docName, action, actor, time }: ActivityItem) {
  return (
    <div className="px-5 py-3.5">
      <p className="text-sm text-gray-900">
        <IBMPlexSans600>{docName}</IBMPlexSans600>
      </p>
      <p className="text-gray-500 text-sm mt-0.5">{action}</p>
      <p className="text-gray-400 text-xs mt-1">
        {actor} &middot; {time}
      </p>
    </div>
  );
});

function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1180px]">
      <div>
        <IBMPlexSans700 as="h1" className="text-xl md:text-2xl text-gray-900">
          Good afternoon
        </IBMPlexSans700>
        <IBMPlexSans400 as="p" className="text-gray-500 text-sm mt-1">
          Here's what's moving across your documents and templates today.
        </IBMPlexSans400>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STAT_CARDS.map((card) => (
          <StatCardTile key={card.label} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
        <Panel title="Continue where you left off">
          {QUICK_DOCS.map((doc) => (
            <QuickDocRow key={doc.id} {...doc} />
          ))}
        </Panel>
        <Panel title="Recent activity">
          {RECENT_ACTIVITY.map((item) => (
            <ActivityRow key={item.id} {...item} />
          ))}
        </Panel>
      </div>
    </div>
  );
}

export default memo(DashboardPage);
