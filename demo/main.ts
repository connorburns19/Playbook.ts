/**
 * Phase 1 demo — exercises every public API of the V2 library.
 * Mirrors the original V1 `landingpage.js` so behavior parity is testable
 * by side-by-side comparison against the V1 source under `pub/`.
 */

import { Playbook, PlayDisplayer, createConnectedLayout } from '../src/index.js';
import type { PageData } from '../src/index.js';
import '../src/styles.css';
import './styles.css';

// The V1 cover + instructions placeholders. These live in the demo now — the
// library no longer ships hardcoded image URLs; books seed intro pages opt-in.
const INTRO_PAGES: PageData[] = [
  { image: 'https://i.ibb.co/hyx1q6c/playbook.png', title: 'Playbook cover' },
  { image: 'https://i.ibb.co/7YhctXj/instructions.png', title: 'Usage instructions' },
];

// 1. Standalone book (cover + instructions, no plays)
new Playbook({ title: 'Sample', parentId: 'standalone-book', seedPages: INTRO_PAGES });

// 2. Book with plays
const bookWithPlays = new Playbook({ title: 'Sample', parentId: 'book-with-plays', seedPages: INTRO_PAGES });
bookWithPlays.addPage(
  'https://bestyouthfootballplays.com/wp-content/uploads/10-QB-Sneak-I-630x512.png',
  'QB Sneak',
  'https://youtu.be/qyqCTMirNWg?t=86',
);
bookWithPlays.addPage(
  'https://bestflagfootballplays.com/wp-content/uploads/Hail-Mary-Trips.jpg',
  'Hail Mary',
  'https://youtu.be/qyqCTMirNWg?t=289',
);
bookWithPlays.addPage(
  'https://www.dummies.com/wp-content/uploads/283523.image0.jpg',
  'Handoff',
  'https://youtu.be/qyqCTMirNWg?t=108',
);
bookWithPlays.addPage(
  'https://lh6.googleusercontent.com/-r311fMqwGdQ/TXHLNj4yb2I/AAAAAAAARAE/lVNOIrGbpPA/s1600/Boise+St.+Hook+and+Lateral+Play2.png',
  'Lateral',
  'https://youtu.be/qyqCTMirNWg?t=191',
);

// 3. Field with no animation
new PlayDisplayer({ size: 'large', name: 'Offence', parentId: 'field-no-anim' });

// 4. Field with a default play set programmatically
const fieldWithDefault = new PlayDisplayer({ size: 'large', name: 'Offence2', parentId: 'field-with-default' });
fieldWithDefault.setMove('lte', 'deep-90-right');
fieldWithDefault.setMove('rte', 'mid-90-left');
fieldWithDefault.setMove('rt', 'short-90-right');
fieldWithDefault.setMove('qb', 'pass-qb');
fieldWithDefault.setMove('fb', 'hole-five-fb');

// 5. Field + sandbox
const fieldWithSandbox = new PlayDisplayer({ size: 'large', name: 'Offence3', parentId: 'field-sandbox' });
fieldWithSandbox.spawnSandbox(false, 'field-sandbox');

// 6. Connected playbook + field
const fieldConnected = new PlayDisplayer({ size: 'large', name: 'Connected', parentId: 'connected-book' });
const connectedBook = new Playbook({ title: 'Connected', field: fieldConnected, allowSave: false, parentId: 'connected-book', seedPages: INTRO_PAGES });
connectedBook.addPage(
  'https://i.ibb.co/kSFmpZV/Hail-Mary-Out.png',
  'Hail Mary Out',
  'https://youtu.be/qyqCTMirNWg?t=289',
  ['straight-deep', 'mid-90-left', 'none', 'none', 'none', 'mid-90-right', 'straight-deep', 'pass-qb', 'none', 'hole-four-fb', 'none'],
);
connectedBook.addPage(
  'https://i.ibb.co/vsRPBKF/Left-Handoff-FB.png',
  'Left Handoff FB',
  null,
  ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'hand-off-left-qb', 'hole-one-lhb', 'hole-two-fb', 'hole-five-rhb'],
);
connectedBook.addPage(
  'https://i.ibb.co/xhpXQV7/Criss-Cross.png',
  'CrissCross',
  null,
  // V1 had 'pass-1b' here (a typo for 'pass-qb'). Fixed in V2.
  ['hole-eight-rhb', 'none', 'none', 'none', 'none', 'none', 'hole-one-fb', 'pass-qb', 'none', 'hole-six-rhb', 'none'],
);

// 7. Connected layout — the conjoined book + field + sandbox composition.
// One helper call wires the DOM scaffold; the three constructors mount
// into the returned slot IDs. On viewports >= 1400px, the book sits on
// the left with field + sandbox stacked on the right. Below that,
// everything stacks vertically.
//
// `pageOrientation: 'vertical'` stacks the book's pages top-to-bottom so
// the tall narrow book column balances visually with the tall field +
// sandbox column on the right.
const layout = createConnectedLayout('connected-demo');
const fieldSandboxSave = new PlayDisplayer({ size: 'large', name: 'Connected2', parentId: layout.fieldSlot });
const sandboxSaveBook = new Playbook({
  title: 'Connected2',
  field: fieldSandboxSave,
  allowSave: true,
  pageOrientation: 'vertical',
  parentId: layout.bookSlot,
  seedPages: INTRO_PAGES,
});
fieldSandboxSave.spawnSandbox(true, layout.sandboxSlot, sandboxSaveBook.createSaveButton());
sandboxSaveBook.addPage(
  'https://i.ibb.co/kSFmpZV/Hail-Mary-Out.png',
  'Hail Mary Out',
  'https://youtu.be/qyqCTMirNWg?t=289',
  ['straight-deep', 'mid-90-left', 'none', 'none', 'none', 'mid-90-right', 'straight-deep', 'pass-qb', 'none', 'hole-four-fb', 'none'],
);
sandboxSaveBook.addPage(
  'https://i.ibb.co/vsRPBKF/Left-Handoff-FB.png',
  'Left Handoff FB',
  null,
  ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'hand-off-left-qb', 'hole-one-lhb', 'hole-two-fb', 'hole-five-rhb'],
);

// 8. XX-large field size
new PlayDisplayer({ size: 'xx-large', name: 'Large', parentId: 'big' });
