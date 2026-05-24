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

export function createInput(type: string, placeholder: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  input.placeholder = placeholder;
  return input;
}

export function createOption(value: string, label: string = value): HTMLOptionElement {
  const opt = document.createElement('option');
  opt.value = value;
  opt.innerText = label;
  return opt;
}

/**
 * Append `element` to the DOM node with id `parentId`, or to `document.body` if
 * `parentId` is null/undefined or the id isn't found in the document.
 */
export function mountInto(element: HTMLElement, parentId?: string | null): void {
  const parent =
    parentId != null
      ? document.getElementById(parentId) ?? document.body
      : document.body;
  parent.append(element);
}
