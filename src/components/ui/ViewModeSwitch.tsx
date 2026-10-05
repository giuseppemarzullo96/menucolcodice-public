import { AppstoreOutlined, UnorderedListOutlined } from "@ant-design/icons";
import styles from "../../styles/viewModeSwitch.module.css";

export type MenuViewMode = "list" | "carousel";

export function ViewModeSwitch({
  value,
  onChange,
  themeColors,
}: {
  value: MenuViewMode;
  onChange: (mode: MenuViewMode) => void;
  themeColors?: any;
}) {
  const nav = themeColors?.navbar || {};
  const activeBg = nav.background || "#1c1610";
  const activeText = nav.textColor || "#f4ead8";
  const idleText = themeColors?.sections?.titleColor || "#1c1610";

  return (
    <div className={styles.switch} role="group" aria-label="Vista del menu">
      <button
        type="button"
        className={`${styles.btn} ${value === "list" ? styles.btnActive : ""}`}
        style={
          value === "list"
            ? { background: activeBg, color: activeText }
            : { color: idleText }
        }
        aria-pressed={value === "list"}
        onClick={() => onChange("list")}
      >
        <UnorderedListOutlined />
        <span>Elenco</span>
      </button>
      <button
        type="button"
        className={`${styles.btn} ${value === "carousel" ? styles.btnActive : ""}`}
        style={
          value === "carousel"
            ? { background: activeBg, color: activeText }
            : { color: idleText }
        }
        aria-pressed={value === "carousel"}
        onClick={() => onChange("carousel")}
      >
        <AppstoreOutlined />
        <span>Carosello</span>
      </button>
    </div>
  );
}
