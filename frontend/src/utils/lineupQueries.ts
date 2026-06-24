import type { QueryClient } from "@tanstack/react-query";

export async function invalidateLineupQueries(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["sports-games"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard-tactical-games"] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] })
  ]);
}
