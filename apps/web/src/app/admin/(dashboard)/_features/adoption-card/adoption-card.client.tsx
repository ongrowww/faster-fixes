"use client";

import { useTRPC } from "@/lib/trpc/trpc-client";
import { useQuery } from "@tanstack/react-query";
import { getErrorMessage } from "@/utils/error/get-error-message";
import { matchQueryStatus } from "@/utils/tanstack-query/match-query-status";
import { DashboardPanel } from "../../_components/dashboard-panel";
import { FigureUnavailable } from "../../_components/figure-unavailable";
import { ShareBar, ShareBarSkeleton } from "../../_components/share-bar";

const ROW_LABELS = {
  tracker: "Tracker, of paying",
  slack: "Slack, of paying",
  agentToken: "Agent token, of engaged",
} as const;

const ROW_KEYS = ["tracker", "slack", "agentToken"] as const;

export function AdoptionCard() {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.admin.dashboard.getActivationOverview.queryOptions(),
  );

  return (
    <DashboardPanel title="Adoption">
      {matchQueryStatus(query, {
        Loading: (
          <>
            {ROW_KEYS.map((key) => (
              <ShareBarSkeleton key={key} label={ROW_LABELS[key]} />
            ))}
          </>
        ),
        Errored: (error) => (
          <FigureUnavailable description={getErrorMessage(error)} />
        ),
        Empty: (
          <FigureUnavailable description="No usage figures were returned." />
        ),
        Success: ({ data }) => (
          <>
            {ROW_KEYS.map((key) => (
              <ShareBar
                key={key}
                label={ROW_LABELS[key]}
                count={data.adoption[key].count}
                base={data.adoption[key].base}
              />
            ))}
          </>
        ),
      })}
    </DashboardPanel>
  );
}
