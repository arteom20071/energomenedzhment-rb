export function escapeElementId(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }

  return id.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}

export function buildElementSelector(id: string): string {
  return `[data-element-id="${escapeElementId(id)}"]`;
}

export function queryElementById(container: ParentNode, id: string): HTMLElement | null {
  return container.querySelector(buildElementSelector(id));
}
