/**
 * Phase 1 demo — exercises every public API of the V2 library.
 * Mirrors the original V1 `landingpage.js` so behavior parity is testable
 * by side-by-side comparison against the V1 source under `pub/`.
 */

import { Playbook, PlayDisplayer } from '../src/index.js';
import '../src/styles.css';

// 1. Standalone book (cover + instructions, no plays)
new Playbook('Sample', null, false, 'standalone-book');

// 2. Book with plays
const bookWithPlays = new Playbook('Sample', null, false, 'book-with-plays');
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
new PlayDisplayer('large', 'Offence', 'field-no-anim');

// 4. Field with a default play set programmatically
const fieldWithDefault = new PlayDisplayer('large', 'Offence2', 'field-with-default');
fieldWithDefault.setMove('lte', 'deep-90-right');
fieldWithDefault.setMove('rte', 'mid-90-left');
fieldWithDefault.setMove('rt', 'short-90-right');
fieldWithDefault.setMove('qb', 'pass-qb');
fieldWithDefault.setMove('fb', 'hole-five-fb');

// 5. Field + sandbox
const fieldWithSandbox = new PlayDisplayer('large', 'Offence3', 'field-sandbox');
fieldWithSandbox.spawnSandbox(false, 'field-sandbox');

// 6. Connected playbook + field
const fieldConnected = new PlayDisplayer('large', 'Connected', 'connected-book');
const connectedBook = new Playbook('Connected', fieldConnected, false, 'connected-book');
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

// 7. Sandbox + book with save enabled
const fieldSandboxSave = new PlayDisplayer('large', 'Connected2', 'field-sandbox-save');
fieldSandboxSave.spawnSandbox(true, 'field-sandbox-save');
const sandboxSaveBook = new Playbook('Connected2', fieldSandboxSave, true, 'field-sandbox-save-2');
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

// 8. User can create plays (form + connected book)
const userCreateField = new PlayDisplayer('large', 'Connected3', 'user-create-1');
userCreateField.spawnSandbox(true, 'user-create-1');
const userCreateBook = new Playbook('Connected3', userCreateField, true, 'user-create-2');
userCreateBook.allowUserCreatePlays('user-create-1');
userCreateBook.addPage(
  'https://i.ibb.co/kSFmpZV/Hail-Mary-Out.png',
  'Hail Mary Out',
  null,
  ['straight-deep', 'mid-90-left', 'none', 'none', 'none', 'mid-90-right', 'straight-deep', 'pass-qb', 'none', 'hole-four-fb', 'none'],
);

// 9. XX-large field size
new PlayDisplayer('xx-large', 'Large', 'big');
