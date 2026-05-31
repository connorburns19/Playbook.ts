/**
 * Portfolio prototype entry — single-scroll demo intended to be ported
 * to a Next.js route at connorburns.dev/projects/playbook. See
 * PortfolioPreparation.md for the full scope.
 *
 * Layout:
 *   - Hero: full connected layout (book + field + sandbox)
 *   - "How it's built": each code snippet has a live mini-demo
 *     beside it showing what that snippet's API call produces in
 *     isolation.
 *
 * Snippet 5 ("compose with createConnectedLayout") deliberately has
 * no mini-demo — the hero IS that snippet, so duplicating it would
 * just be noise.
 */

import { Playbook, PlayDisplayer, createConnectedLayout } from '../../src/index.js';
import '../../src/styles.css';
import './styles.css';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';

hljs.registerLanguage('typescript', typescript);
// Run after DOM is painted so all <pre><code> blocks exist.
document.addEventListener('DOMContentLoaded', () => hljs.highlightAll());

/* -------------------- Hero -------------------- */

const heroLayout = createConnectedLayout('hero-connected');
const heroField = new PlayDisplayer({ size: 'large', name: 'Example', parentId: heroLayout.fieldSlot });
const heroBook = new Playbook({
  title: 'Example',
  field: heroField,
  allowSave: true,
  pageOrientation: 'vertical',
  parentId: heroLayout.bookSlot,
});
heroField.spawnSandbox(true, heroLayout.sandboxSlot, heroBook.createSaveButton());
heroBook.addPage(
  '/images/hailmaryout.png',
  'Hail Mary Out',
  'https://youtu.be/qyqCTMirNWg?t=289',
  { lte: 'straight-deep', lt: 'mid-90-left', rt: 'mid-90-right', rte: 'straight-deep', qb: 'pass-qb', fb: 'hole-four-fb' },
);
heroBook.addPage(
  '/images/lbhandoff.png',
  'Left Handoff FB',
  null,
  { qb: 'hand-off-left-qb', lhb: 'hole-one-lhb', fb: 'hole-two-fb', rhb: 'hole-five-rhb' },
);

/* -------------------- "How it's built" mini demos -------------------- */

// 1. Bare field — no moves set. Play Animation auto-disables itself
//    via the hasAnyMoves guard; tooltip reads "Set a move using a
//    dropdown first." Demonstrates the contract.
new PlayDisplayer({ size: 'large', parentId: 'demo-field' });

// 2. Field with moves preset — Play Animation is live; click to run.
const demoSetmove = new PlayDisplayer({ size: 'large', parentId: 'demo-setmove' });
demoSetmove.setMove('lte', 'straight-deep');
demoSetmove.setMove('rte', 'mid-90-right');
demoSetmove.setMove('qb', 'pass-qb');
demoSetmove.setMove('fb', 'hole-four-fb');

// 3. Field + sandbox (no book) — end-user composition UI in isolation.
const demoSandboxField = new PlayDisplayer({ size: 'large', parentId: 'demo-sandbox-field' });
demoSandboxField.spawnSandbox(false, 'demo-sandbox-controls');

// 4. Book + field bound (no sandbox) — Initialize Play loads the saved
//    move list back into the field; Play Animation then runs it.
const demoBookField = new PlayDisplayer({ size: 'large', parentId: 'demo-bookfield-field' });
const demoBook = new Playbook({
  title: 'Playbook',
  field: demoBookField,
  allowSave: false,
  pageOrientation: 'vertical',
  parentId: 'demo-bookfield-book',
});
demoBook.addPage(
  '/images/hailmaryout.png',
  'Hail Mary Out',
  null,
  { lte: 'straight-deep', lt: 'mid-90-left', rt: 'mid-90-right', rte: 'straight-deep', qb: 'pass-qb', fb: 'hole-four-fb' },
);
demoBook.addPage(
  '/images/lbhandoff.png',
  'Left Handoff FB',
  null,
  { qb: 'hand-off-left-qb', lhb: 'hole-one-lhb', fb: 'hole-two-fb', rhb: 'hole-five-rhb' },
);

/* -------------------- Snippet 5 clone (bottom of page) -------------------- */

const cloneLayout = createConnectedLayout('demo-connected');
const cloneField = new PlayDisplayer({ size: 'large', parentId: cloneLayout.fieldSlot });
const cloneBook = new Playbook({
  title: 'Example',
  field: cloneField,
  allowSave: true,
  pageOrientation: 'vertical',
  parentId: cloneLayout.bookSlot,
});
cloneField.spawnSandbox(true, cloneLayout.sandboxSlot, cloneBook.createSaveButton());
cloneBook.addPage(
  '/images/hailmaryout.png',
  'Hail Mary Out',
  'https://youtu.be/qyqCTMirNWg?t=289',
  { lte: 'straight-deep', lt: 'mid-90-left', rt: 'mid-90-right', rte: 'straight-deep', qb: 'pass-qb', fb: 'hole-four-fb' },
);
cloneBook.addPage(
  '/images/lbhandoff.png',
  'Left Handoff FB',
  null,
  { qb: 'hand-off-left-qb', lhb: 'hole-one-lhb', fb: 'hole-two-fb', rhb: 'hole-five-rhb' },
);
