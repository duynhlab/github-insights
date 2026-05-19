"use client";

import { useMemo, useState } from "react";
import {
  Card,
  Title,
  Text,
  AreaChart,
  MultiSelect,
  MultiSelectItem,
  Switch,
  Flex,
  Badge,
} from "@tremor/react";

export type UserWeekRow = {
  week: string;
  author: string;
  is_bot: boolean;
  created: number;
  merged: number;
};

type Props = {
  data: UserWeekRow[];
};

type Metric = "created" | "merged";

export default function UserActivityChart({ data }: Props) {
  const authors = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const r of data) m.set(r.author, r.is_bot);
    return [...m.entries()]
      .sort(([a, abot], [b, bbot]) => Number(abot) - Number(bbot) || a.localeCompare(b))
      .map(([author, is_bot]) => ({ author, is_bot }));
  }, [data]);

  const defaultPick = useMemo(() => {
    const totals = new Map<string, number>();
    for (const r of data) totals.set(r.author, (totals.get(r.author) ?? 0) + r.merged + r.created);
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([a]) => a);
  }, [data]);

  const [selected, setSelected] = useState<string[]>(defaultPick);
  const [metric, setMetric] = useState<Metric>("merged");
  const [includeBots, setIncludeBots] = useState(true);

  const visible = useMemo(
    () => (selected.length ? selected : defaultPick),
    [selected, defaultPick],
  );

  const chartData = useMemo(() => {
    const weeks = [...new Set(data.map((r) => r.week))].sort();
    const allowedAuthor = (a: string) => {
      if (!visible.includes(a)) return false;
      if (!includeBots && authors.find((x) => x.author === a)?.is_bot) return false;
      return true;
    };
    return weeks.map((wk) => {
      const row: Record<string, string | number> = { week: wk };
      for (const a of visible) {
        if (!includeBots && authors.find((x) => x.author === a)?.is_bot) continue;
        row[a] = 0;
      }
      for (const r of data) {
        if (r.week !== wk || !allowedAuthor(r.author)) continue;
        row[r.author] = (row[r.author] as number ?? 0) + r[metric];
      }
      return row;
    });
  }, [data, visible, includeBots, metric, authors]);

  const categories = visible.filter(
    (a) => includeBots || !authors.find((x) => x.author === a)?.is_bot,
  );

  return (
    <Card>
      <Flex flexDirection="col" alignItems="start" className="gap-3">
        <Flex justifyContent="between" alignItems="start" className="w-full gap-4 flex-wrap">
          <div>
            <Title>Weekly PR activity (by user)</Title>
            <Text>
              PRs {metric === "merged" ? "merged" : "created"} per ISO week, per author.
              Bots tinted as {" "}
              <Badge color="amber" size="xs">bot</Badge> in the picker.
            </Text>
          </div>
          <Flex className="gap-4 w-auto" justifyContent="end">
            <Flex className="gap-2 w-auto">
              <Text>Bots</Text>
              <Switch checked={includeBots} onChange={setIncludeBots} />
            </Flex>
            <Flex className="gap-2 w-auto">
              <Text>Metric</Text>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as Metric)}
                className="text-sm rounded-tremor-default border-tremor-border bg-tremor-background px-2 py-1 border"
              >
                <option value="merged">Merged</option>
                <option value="created">Created</option>
              </select>
            </Flex>
          </Flex>
        </Flex>

        <MultiSelect
          className="w-full"
          value={selected}
          onValueChange={setSelected}
          placeholder={`Showing top ${defaultPick.length} by default — pick authors…`}
        >
          {authors.map(({ author, is_bot }) => (
            <MultiSelectItem key={author} value={author}>
              {author}{is_bot ? " (bot)" : ""}
            </MultiSelectItem>
          ))}
        </MultiSelect>
      </Flex>

      <AreaChart
        className="h-72 mt-4"
        data={chartData}
        index="week"
        categories={categories}
        colors={["indigo", "emerald", "amber", "rose", "cyan", "violet", "lime", "fuchsia"]}
        stack={false}
        showLegend
      />
    </Card>
  );
}
