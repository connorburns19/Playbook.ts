"use strict";

const book = new playBook("Sample", null, false, 'standalonebook');

const book2 = new playBook("Sample", null, false, 'bookwithplays');

book2.addPage(
    "/images/hailmaryout.png",
    "QB Sneak",
    "https://youtu.be/qyqCTMirNWg?t=86"
  );
  book2.addPage(
    "/images/lbhandoff.png",
    "Hail Mary",
    "https://youtu.be/qyqCTMirNWg?t=289"
  );
  book2.addPage(
    "/images/hailmaryout.png",
    "Handoff",
    "https://youtu.be/qyqCTMirNWg?t=108"
  );
  book2.addPage(
    "/images/lbhandoff.png",
    "Lateral",
    "https://youtu.be/qyqCTMirNWg?t=191"
  );

  const field = new PlayDisplayer('large', 'Offence', 'fieldnoanimation');
  const field2 = new PlayDisplayer('large', 'Offence2', 'fieldanimation');
  field2.setLTEMove('deep-90-right')
  field2.setRTEMove('mid-90-left')
  field2.setRTMove('short-90-right')
  field2.setQBMove('pass-qb')           
  field2.setFBMove('hole-five-fb')

  const field3 = new PlayDisplayer('large', 'Offence3', 'fieldsandbox');
  field2.setLTEMove('deep-90-right')
  field2.setRTEMove('mid-90-left')
  field2.setRTMove('short-90-right')
  field2.setQBMove('pass-qb')           
  field2.setFBMove('hole-five-fb')
  field3.spawnSandbox(null, 'fieldsandbox')


  const field4 = new PlayDisplayer('large', 'Connected', 'fieldsandboxplaybook');
  
  const connectedbook = new playBook("Connected", field4, false, 'fieldsandboxplaybook');

  connectedbook.addPage(
    "/images/hailmaryout.png",
    "Hail Mary Out",
    "https://youtu.be/qyqCTMirNWg?t=289",
    ['straight-deep', 'mid-90-left', 'none', 'none', 'none', 'mid-90-right', 'straight-deep', 'pass-qb', 'none', 'hole-four-fb', 'none']
  );

  connectedbook.addPage(
    "/images/lbhandoff.png",
    "Left Handoff FB",
    null,
    ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'hand-off-left-qb', 'hole-one-lhb', 'hole-two-fb', 'hole-five-rhb']
  );
  connectedbook.addPage(
    "/images/hailmaryout.png",
    "CrissCross",
    null,
    ['hole-eight-rhb', 'none', 'none', 'none', 'none', 'none', 'hole-one-fb', 'pass-1b', 'none', 'hole-six-rhb', 'none']
  );

  const field5 = new PlayDisplayer('large', 'Connected2', 'fieldsandboxplaybooksave');
  field5.spawnSandbox(true, 'fieldsandboxplaybooksave')
  
  const connectedbook2 = new playBook("Connected", field5, true, 'fieldsandboxplaybooksave2');

  connectedbook2.addPage(
    "/images/hailmaryout.png",
    "Hail Mary Out",
    "https://youtu.be/qyqCTMirNWg?t=289",
    ['straight-deep', 'mid-90-left', 'none', 'none', 'none', 'mid-90-right', 'straight-deep', 'pass-qb', 'none', 'hole-four-fb', 'none']
  );

  connectedbook2.addPage(
    "/images/lbhandoff.png",
    "Left Handoff FB",
    null,
    ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'hand-off-left-qb', 'hole-one-lhb', 'hole-two-fb', 'hole-five-rhb']
  );
  connectedbook2.addPage(
    "/images/hailmaryout.png",
    "CrissCross",
    null,
    ['hole-eight-rhb', 'none', 'none', 'none', 'none', 'none', 'hole-one-fb', 'pass-1b', 'none', 'hole-six-rhb', 'none']
  );

  /////////////////
  const field6 = new PlayDisplayer('large', 'Connected3', 'fieldsandboxplaybooksave3');
  field6.spawnSandbox(true, 'fieldsandboxplaybooksave3')
  
  const connectedbook3 = new playBook("Connected", field6, true, 'fieldsandboxplaybooksave4');
  connectedbook3.allowUserCreatePlays('fieldsandboxplaybooksave3')

  connectedbook3.addPage(
    "/images/hailmaryout.png",
    "Hail Mary Out",
    "https://youtu.be/qyqCTMirNWg?t=289",
    ['straight-deep', 'mid-90-left', 'none', 'none', 'none', 'mid-90-right', 'straight-deep', 'pass-qb', 'none', 'hole-four-fb', 'none']
  );

  connectedbook3.addPage(
    "/images/lbhandoff.png",
    "Left Handoff FB",
    null,
    ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'hand-off-left-qb', 'hole-one-lhb', 'hole-two-fb', 'hole-five-rhb']
  );
  connectedbook3.addPage(
    "/images/hailmaryout.png",
    "CrissCross",
    null,
    ['hole-eight-rhb', 'none', 'none', 'none', 'none', 'none', 'hole-one-fb', 'pass-1b', 'none', 'hole-six-rhb', 'none']
  );
  

  const big = new PlayDisplayer('xx-large', 'Large', 'big')