/**
 * Internal DOM construction helpers shared by `displayer.ts` and `playbook.ts`.
 * Keeps the class files focused on library logic rather than `document.createElement`
 * boilerplate.
 */

export function createDiv(className?: string): HTMLDivElement {
  const div = document.createElement('div');
  if (className) div.className = className;
  return div;
}

export function createButton(className: string, label: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  if (className) btn.className = className;
  btn.innerText = label;
  return btn;
}

export function createOption(value: string, label: string = value): HTMLOptionElement {
  const opt = document.createElement('option');
  opt.value = value;
  opt.innerText = label;
  return opt;
}

/**
 * Append `element` to the DOM node with id `parentId`. Falls back to
 * `document.body` when `parentId` is null/undefined (the documented "mount at
 * body" path) — but when a *specific* `parentId` is given and not found, that's
 * almost always a typo, so warn before falling back rather than silently
 * mounting the widget at the bottom of `<body>` where it's easy to miss.
 */
export function mountInto(element: HTMLElement, parentId?: string | null): void {
  if (parentId != null) {
    const parent = document.getElementById(parentId);
    if (parent) {
      parent.append(element);
      return;
    }
    console.warn(
      `[playbook] mountInto: no element with id "${parentId}" found; mounting on <body> instead.`,
    );
  }
  document.body.append(element);
}
