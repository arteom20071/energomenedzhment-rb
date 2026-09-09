import { Image, LayoutTemplate, Shapes, Sparkles, Type } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { useRovingTabIndex } from "./useRovingTabIndex";

export type ToolTabId = "ai" | "text" | "shapes" | "media" | "templates";

interface ToolTab {
  id: ToolTabId;
  label: string;
  icon: typeof Sparkles;
}

const toolTabs: ToolTab[] = [
  { id: "ai", label: "ИИ", icon: Sparkles },
  { id: "text", label: "Текст", icon: Type },
  { id: "shapes", label: "Фигуры", icon: Shapes },
  { id: "media", label: "Медиа", icon: Image },
  { id: "templates", label: "Шаблоны", icon: LayoutTemplate },
];

interface LeftToolSidebarProps {
  aiCreatePanel?: ReactNode;
  textPanel?: ReactNode;
  shapesPanel?: ReactNode;
  mediaPanel?: ReactNode;
  templatesPanel?: ReactNode;
}

const panelByTab: Record<ToolTabId, keyof LeftToolSidebarProps> = {
  ai: "aiCreatePanel",
  text: "textPanel",
  shapes: "shapesPanel",
  media: "mediaPanel",
  templates: "templatesPanel",
};

function getTabAccessibleName(label: string): string {
  return label === "ИИ" ? "ИИ Создать" : label;
}

export function LeftToolSidebar(props: LeftToolSidebarProps) {
  const [activeTab, setActiveTab] = useState<ToolTabId>("ai");
  const tabIds = useMemo(() => toolTabs.map((tab) => tab.id), []);
  const { handleKeyDown, getTabProps } = useRovingTabIndex(tabIds, activeTab, "horizontal");

  const panelKey = panelByTab[activeTab];
  const activePanel = props[panelKey];

  const onTablistKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const nextTab = handleKeyDown(event);
    if (nextTab) {
      setActiveTab(nextTab);
    }
  };

  return (
    <nav
      aria-label="Инструменты"
      className="flex w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-900"
    >
      <div
        role="tablist"
        aria-label="Панели инструментов"
        aria-orientation="horizontal"
        className="flex border-b border-slate-800"
        onKeyDown={onTablistKeyDown}
      >
        {toolTabs.map(({ id, label, icon: Icon }) => {
          const selected = activeTab === id;
          const tabProps = getTabProps(id);
          const accessibleName = getTabAccessibleName(label);

          return (
            <button
              key={id}
              ref={tabProps.ref}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={accessibleName}
              title={accessibleName}
              tabIndex={tabProps.tabIndex}
              onFocus={tabProps.onFocus}
              onClick={() => setActiveTab(id)}
              className={`flex flex-1 flex-col items-center gap-1 px-2 py-3 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-400 ${
                selected
                  ? "border-b-2 border-indigo-500 text-indigo-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-auto p-4 text-sm text-slate-300">
        {activePanel ?? (
          <p className="text-slate-500">
            {toolTabs.find((tab) => tab.id === activeTab)?.label} — панель будет подключена позже.
          </p>
        )}
      </div>
    </nav>
  );
}
