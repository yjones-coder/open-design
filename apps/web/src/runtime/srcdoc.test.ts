import { describe, expect, it } from 'vitest';
import { buildSrcdoc } from './srcdoc';

const deckHtml = `<!doctype html>
<html>
  <head><title>Deck</title></head>
  <body>
    <section class="slide active">One</section>
    <section class="slide">Two</section>
    <section class="slide">Three</section>
  </body>
</html>`;

describe('buildSrcdoc', () => {
  it('injects an initial slide index for deck previews', () => {
    const doc = buildSrcdoc(deckHtml, { deck: true, initialSlideIndex: 2 });

    expect(doc).toContain('var initialSlideIndex = 2;');
    expect(doc).toContain('setTimeout(restoreInitialSlide, 200)');
    expect(doc).toContain('setTimeout(restoreInitialSlide, 100)');
  });

  it('clamps invalid initial slide indices before injecting deck bridge script', () => {
    const doc = buildSrcdoc(deckHtml, { deck: true, initialSlideIndex: -4 });

    expect(doc).toContain('var initialSlideIndex = 0;');
  });
});
