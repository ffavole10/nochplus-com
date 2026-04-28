import { Plug, CheckCircle2, Clock, ExternalLink, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Status = "connected" | "available" | "coming-soon";

interface Integration {
  id: string;
  name: string;
  category: "CMS" | "OEM" | "Protocol";
  status: Status;
  statusLabel?: string; // optional override of pill text
  subStatus?: string; // additional in-progress note
  lastSync?: string;
  lastSyncLabel?: string;
  connectorCount?: number;
  connectorLabel?: string;
  description: string;
  initials: string;
  color: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "chargepoint",
    name: "ChargePoint",
    category: "CMS",
    status: "connected",
    statusLabel: "Connected · Portal access",
    subStatus: "API integration: Pilot with CARB",
    lastSync: "—",
    lastSyncLabel: "Last dataset upload",
    connectorCount: 421,
    connectorLabel: "Connectors managed",
    description: "Portal-based CMS integration. Live API integration in pilot with CARB chargers.",
    initials: "CP",
    color: "bg-emerald-500",
  },
  { id: "tesla", name: "Tesla", category: "OEM", status: "available", description: "Connect Tesla Wall Connectors and Superchargers.", initials: "T", color: "bg-red-500" },
  { id: "evconnect", name: "EV Connect", category: "CMS", status: "available", description: "Multi-network management and roaming.", initials: "EV", color: "bg-blue-500" },
  { id: "chargelab", name: "ChargeLab", category: "CMS", status: "available", description: "OCPP-native white-label charging platform.", initials: "CL", color: "bg-purple-500" },
  { id: "ampup", name: "AmpUp", category: "CMS", status: "available", description: "Workplace and fleet charging management.", initials: "AU", color: "bg-orange-500" },
  { id: "greenlots", name: "Greenlots", category: "CMS", status: "available", description: "Shell Recharge Solutions network.", initials: "GL", color: "bg-green-600" },
  { id: "ocpp", name: "Generic OCPP", category: "Protocol", status: "available", description: "Any OCPP 1.6 / 2.0.1 compliant station.", initials: "OC", color: "bg-slate-500" },
];

const STATUS_LABEL: Record<Status, string> = {
  connected: "Connected",
  available: "Available",
  "coming-soon": "Coming Soon",
};

function StatusPill({ status, label }: { status: Status; label?: string }) {
  const text = label || STATUS_LABEL[status];
  if (status === "connected") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        {text}
      </Badge>
    );
  }
  if (status === "coming-soon") {
    return (
      <Badge className="bg-muted text-muted-foreground border-border gap-1">
        <Clock className="h-3 w-3" />
        {text}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {text}
    </Badge>
  );
}

function IntegrationCard({ item }: { item: Integration }) {
  const action =
    item.status === "connected" ? "Configure" : item.status === "available" ? "Connect" : "Notify Me";
  return (
    <Card className="border-border/60 hover:border-border transition-colors">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className={`h-12 w-12 rounded-xl ${item.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {item.initials}
          </div>
          <div className="flex flex-col items-end gap-1">
            <StatusPill status={item.status} label={item.statusLabel} />
            {item.subStatus && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5">
                <AlertCircle className="h-2.5 w-2.5" />
                {item.subStatus}
              </span>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">{item.name}</h3>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {item.category}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
        </div>
        {item.status === "connected" && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border/50 pt-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider">{item.lastSyncLabel || "Last sync"}</p>
              <p className="font-medium text-foreground">{item.lastSync}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider">{item.connectorLabel || "Connectors"}</p>
              <p className="font-medium text-foreground">{item.connectorCount?.toLocaleString()}</p>
            </div>
          </div>
        )}
        <Button
          size="sm"
          variant={item.status === "connected" ? "outline" : "default"}
          className="w-full gap-1.5"
          disabled={item.status === "coming-soon"}
        >
          {action}
          <ExternalLink className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}

export function IntegrationsTab() {
  const groups: { title: string; status: Status }[] = [
    { title: "Connected", status: "connected" },
    { title: "Available", status: "available" },
    { title: "Coming Soon", status: "coming-soon" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Plug className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Integrations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Source-agnostic by design. Neural OS plugs into every CMS, every OEM, every OCPP-compliant charger.
          </p>
        </div>
      </div>

      {groups.map((g) => {
        const items = INTEGRATIONS.filter((i) => i.status === g.status);
        return (
          <div key={g.status} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold tracking-wider uppercase text-muted-foreground">{g.title}</h3>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground italic px-1">
                More integrations announced soon.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => (
                  <IntegrationCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
