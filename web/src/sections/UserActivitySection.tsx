import type { UserWeekRow } from "@/lib/data";
import { Section } from "@/components/Section";
import UserActivityChart from "@/components/UserActivityChart";

export default function UserActivitySection({ data }: { data: UserWeekRow[] }) {
  return (
    <Section
      id="users-chart"
      title="Weekly PR activity (by user)"
      description="Filter authors, toggle bots, switch between created vs merged PRs."
    >
      <UserActivityChart data={data} />
    </Section>
  );
}
