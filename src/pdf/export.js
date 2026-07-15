// Builds a PDF of one or more finished stories, using the project's own
// fonts (Fraunces for the title, Hanken Grotesk for body text) rather than
// jsPDF's default Helvetica. Loaded on demand (dynamic import) so the fonts
// and jsPDF itself don't bloat the main bundle.

const MARGIN_X = 56;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 56;

const TITLE_SIZE = 20;
const TITLE_LH = 25;
const AUTHOR_SIZE = 9;
const AUTHOR_LH = 14;
const GAP_TITLE_AUTHOR = 8;   // space below the title, above the author line
const GAP_AUTHOR_BODY = 6;
const GAP_BETWEEN_STORIES = 20;

// Body font sizes tried largest-first: we pick the biggest one that still
// keeps the whole export on a single A4 page. A maxed-out story (~4000 chars,
// MAX_STORY_CHARS) needs ~10.5pt to fit; shorter stories keep the larger,
// more comfortable size. If nothing fits on one page (e.g. a private session
// with several long stories), we fall back to the largest size and let it
// paginate — shrinking wouldn't help there anyway.
const BODY_STEPS = [
  { size: 11.5, leading: 16 },
  { size: 11, leading: 15.3 },
  { size: 10.5, leading: 14.5 },
  { size: 10, leading: 13.8 },
  { size: 9.5, leading: 13.2 },
];

function slugify(title) {
  const slug = (title || '')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return slug || 'knickgeschichte';
}

// Lay out the whole document. When draw is false this is a dry run that only
// counts how many pages the content would need (used to choose the body size);
// when true it actually renders. Returns the page count.
function layout(doc, { title, stories, storyAuthors, textWidth, pageHeight, body }, draw) {
  let y = MARGIN_TOP;
  let pages = 1;

  const ensureSpace = needed => {
    if (y + needed > pageHeight - MARGIN_BOTTOM) {
      if (draw) doc.addPage();
      pages++;
      y = MARGIN_TOP;
    }
  };
  const writeLines = (lines, lineHeight) => {
    for (const line of lines) {
      ensureSpace(lineHeight);
      if (draw) doc.text(line, MARGIN_X, y);
      y += lineHeight;
    }
  };

  doc.setFont('Fraunces', 'bold');
  doc.setFontSize(TITLE_SIZE);
  writeLines(doc.splitTextToSize(title || 'Knickgeschichte', textWidth), TITLE_LH);
  y += GAP_TITLE_AUTHOR;

  stories.forEach((story, i) => {
    if (i > 0) {
      y += GAP_BETWEEN_STORIES;
      ensureSpace(40);
    }

    const authors = storyAuthors(story);
    if (authors) {
      doc.setFont('HankenGrotesk', 'medium');
      doc.setFontSize(AUTHOR_SIZE);
      writeLines(doc.splitTextToSize(authors, textWidth), AUTHOR_LH);
      y += GAP_AUTHOR_BODY;
    }

    doc.setFont('HankenGrotesk', 'normal');
    doc.setFontSize(body.size);
    const text = story.map(entry => entry.link).join(' ');
    writeLines(doc.splitTextToSize(text, textWidth), body.leading);
  });

  return pages;
}

export async function exportStoriesPdf({ title, stories, storyAuthors }) {
  const [{ jsPDF }, fonts] = await Promise.all([
    import('jspdf'),
    import('./fonts'),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  doc.addFileToVFS('Fraunces-Bold.ttf', fonts.frauncesBold);
  doc.addFont('Fraunces-Bold.ttf', 'Fraunces', 'bold');
  doc.addFileToVFS('HankenGrotesk-Regular.ttf', fonts.hankenRegular);
  doc.addFont('HankenGrotesk-Regular.ttf', 'HankenGrotesk', 'normal');
  doc.addFileToVFS('HankenGrotesk-Medium.ttf', fonts.hankenMedium);
  doc.addFont('HankenGrotesk-Medium.ttf', 'HankenGrotesk', 'medium');

  const params = {
    title,
    stories,
    storyAuthors,
    textWidth: doc.internal.pageSize.getWidth() - MARGIN_X * 2,
    pageHeight: doc.internal.pageSize.getHeight(),
  };

  // Pick the largest body size that keeps everything on one page.
  let chosen = BODY_STEPS[0];
  for (const step of BODY_STEPS) {
    if (layout(doc, { ...params, body: step }, false) === 1) {
      chosen = step;
      break;
    }
  }

  layout(doc, { ...params, body: chosen }, true);

  doc.save(`${slugify(title)}.pdf`);
}
