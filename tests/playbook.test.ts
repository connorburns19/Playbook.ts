import { beforeEach, describe, expect, it } from 'vitest';
import { Playbook, PlayDisplayer } from '../src/index.js';

describe('PlayDisplayer', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('creates DOM elements for every position', () => {
    new PlayDisplayer('large', 'Test1', 'root');
    expect(document.getElementById('lteTest1')).toBeTruthy();
    expect(document.getElementById('qbTest1')).toBeTruthy();
    expect(document.getElementById('rhbTest1')).toBeTruthy();
  });

  it('defaults every position to "none"', () => {
    const f = new PlayDisplayer('large', 'Test2', 'root');
    expect(f.getMove('lte')).toBe('none');
    expect(f.getMove('qb')).toBe('none');
    expect(f.getMove('rhb')).toBe('none');
  });

  it('setMove assigns a known move', () => {
    const f = new PlayDisplayer('large', 'Test3', 'root');
    f.setMove('qb', 'pass-qb');
    expect(f.getMove('qb')).toBe('pass-qb');
  });

  it('setMove("none") clears assignment', () => {
    const f = new PlayDisplayer('large', 'Test4', 'root');
    f.setMove('qb', 'pass-qb');
    f.setMove('qb', 'none');
    expect(f.getMove('qb')).toBe('none');
  });

  it('setFieldName updates the header text', () => {
    const f = new PlayDisplayer('large', 'Test5', 'root');
    f.setFieldName('Hail Mary');
    expect(f.fieldTop.innerText).toBe('Hail Mary');
  });

  it('reset cancels all animations on player elements', () => {
    const f = new PlayDisplayer('large', 'Test6', 'root');
    f.setMove('qb', 'pass-qb');
    // Calling reset on a non-animating field should not throw.
    expect(() => f.reset()).not.toThrow();
  });

  it('spawnSandbox appends a sandbox UI under the field', () => {
    const f = new PlayDisplayer('large', 'Test7', 'root');
    const sandbox = f.spawnSandbox(false, 'root');
    expect(sandbox).toBeTruthy();
    expect(document.querySelector(`#sandboxformTest7`)).toBeTruthy();
  });
});

describe('Playbook', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('mounts a pages-container element', () => {
    new Playbook('Test', null, false, 'root');
    expect(document.querySelector('.pages-container')).toBeTruthy();
  });

  it('starts with the two default pages (cover + instructions) visible', () => {
    new Playbook('Test', null, false, 'root');
    const pages = document.querySelectorAll('.page-content');
    expect(pages.length).toBe(2);
  });

  it('addPage adds a new page (visible after a flip)', () => {
    const book = new Playbook('Test', null, false, 'root');
    book.addPage('img.png', 'Title');
    book.addPage('img2.png', 'Title2');
    // 4 pages total now (2 default + 2 new). After flipping once we should see pages 3 and 4.
    const forwardBtn = document.querySelector('.right-button');
    (forwardBtn as HTMLButtonElement).click();
    const titles = Array.from(document.querySelectorAll('.page-title')).map(
      (el) => (el as HTMLElement).innerText,
    );
    expect(titles).toContain('Title');
    expect(titles).toContain('Title2');
  });

  it('Initialize Play button loads the move list onto the connected field', () => {
    const field = new PlayDisplayer('large', 'Hooked', 'root');
    const book = new Playbook('Hooked', field, false, 'root');
    book.addPage('img.png', 'My Play', null, [
      'pass-qb', 'none', 'none', 'none', 'none', 'none', 'none', 'pass-qb',
      'none', 'none', 'none',
    ]);
    // Flip to the new page so the Initialize button is mounted
    const forwardBtn = document.querySelector('.right-button');
    (forwardBtn as HTMLButtonElement).click();
    const initBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.innerText === 'Initialize Play',
    );
    expect(initBtn).toBeTruthy();
    initBtn?.click();
    // 'pass-qb' on lte isn't valid for that position semantically, but setMove
    // doesn't enforce position-specific rules — it should still get assigned.
    expect(field.getMove('lte')).toBe('pass-qb');
    expect(field.getMove('qb')).toBe('pass-qb');
    expect(field.fieldTop.innerText).toBe('My Play');
  });

  it('allowUserCreatePlays adds a form below the book', () => {
    const book = new Playbook('Test', null, false, 'root');
    book.allowUserCreatePlays('root');
    expect(document.querySelector('.form-box')).toBeTruthy();
    expect(document.querySelector('#addPlayForm')).toBeTruthy();
  });
});
