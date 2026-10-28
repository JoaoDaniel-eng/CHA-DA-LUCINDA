import { queryOptions } from "@tanstack/react-query";
import { getPublicInvite } from "./invite.functions";

export const inviteQuery = queryOptions({
  queryKey: ["invite"],
  queryFn: () => getPublicInvite(),
  staleTime: 30_000,
});
