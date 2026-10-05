import { useEffect, useRef, useState } from "react";
import { TMenuSection } from "@/types/dish";
import styles from "../../styles/categoryChips.module.css";

export function CategoryChips({
  sections,
  themeColors,
}: {
  sections: TMenuSection[];
  themeColors?: any;
}) {
  const [active, setActive] = useState(sections[0]?.name.toLowerCase() || "");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const ignoreSpy = useRef(false);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll("main section[id]")) as HTMLElement[];
    if (!nodes.length) return;

    const onScroll = () => {
      if (ignoreSpy.current) return;
      let current = nodes[0]?.id || "";
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= 150) current = node.id;
      }
      if (current) setActive(current);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sections]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const chip = scroller.querySelector(`[data-chip="${CSS.escape(active)}"]`) as HTMLElement | null;
    if (!chip) return;
    const left = chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2;
    scroller.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [active]);

  const goTo = (id: string) => {
    setActive(id);
    ignoreSpy.current = true;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      ignoreSpy.current = false;
    }, 900);
  };

  const nav = themeColors?.navbar || {};
  const sectionsColors = themeColors?.sections || {};

  return (
    <div
      className={styles.wrap}
      style={{
        background: themeColors?.layout?.background || "#f3eadc",
      }}
    >
      <div className={styles.scroller} ref={scrollerRef} role="tablist" aria-label="Categorie del menu">
        {sections.map((section) => {
          const id = section.name.toLowerCase();
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              data-chip={id}
              role="tab"
              aria-selected={isActive}
              className={`${styles.chip} ${isActive ? styles.chipActive : ""}`}
              style={
                isActive
                  ? {
                      background: nav.background || "#1c1610",
                      color: nav.textColor || "#f4ead8",
                    }
                  : {
                      background: "transparent",
                      color: sectionsColors.titleColor || "#1c1610",
                    }
              }
              onClick={() => goTo(id)}
            >
              {section.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
