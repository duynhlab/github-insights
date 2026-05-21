"use client";

import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "#activity", label: "Activity" },
  { href: "#users-chart", label: "By User (chart)" },
  { href: "#health", label: "Repo Health" },
  { href: "#users", label: "Users" },
  { href: "#reviewers", label: "Review Load" },
  { href: "#size", label: "PR Size" },
  { href: "#merge-heatmap", label: "Merge Heatmap" },
  { href: "#ttfr", label: "Review Speed" },
  { href: "#stale", label: "Stale PRs" },
  { href: "#ci", label: "CI Failures" },
  { href: "#deps", label: "Deps" },
  { href: "#glossary", label: "Glossary" },
];

export default function StickyNav() {
  const [active, setActive] = useState<string>(LINKS[0].href);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(`#${visible[0].target.id}`);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0.1, 0.5, 1] },
    );
    LINKS.forEach((l) => {
      const el = document.getElementById(l.href.slice(1));
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  // Scroll active tab into view on small screens
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLAnchorElement>(`a[href="${active}"]`);
    if (el) {
      el.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    }
  }, [active]);

  return (
    <nav
      aria-label="Section navigation"
      className="sticky top-0 z-20 -mx-4 sm:-mx-6 mb-4 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="mx-auto max-w-7xl xl:max-w-[88rem] px-4 sm:px-6 overflow-x-auto no-scrollbar scroll-fade">
        <ul ref={listRef} className="flex gap-1 whitespace-nowrap text-sm">
          {LINKS.map((l) => {
            const isActive = active === l.href;
            return (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    "relative inline-flex min-h-10 items-center rounded-md px-3 py-2 font-medium transition-colors " +
                    (isActive
                      ? "text-fg after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary"
                      : "text-muted-fg hover:bg-muted/60 hover:text-fg")
                  }
                >
                  {l.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
