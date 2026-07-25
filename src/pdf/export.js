// Builds a PDF of one or more finished stories, using the project's own
// fonts (Fraunces for the title, Hanken Grotesk for body text) rather than
// jsPDF's default Helvetica. Loaded on demand (dynamic import) so the fonts
// and jsPDF itself don't bloat the main bundle.

// Page margins, specified in cm and converted to pt (jsPDF's unit here;
// 1cm = 28.3465pt). "Bundsteg" (binding margin) is kept as its own constant
// for clarity even though it's 0 — it would be added to the inside edge if
// the export ever needs to support bound/printed booklets.
const CM = 28.3465;
const MARGIN_TOP = 4.5 * CM;
const MARGIN_BOTTOM = 2.9 * CM;
const MARGIN_LEFT = 2 * CM;
const MARGIN_RIGHT = 2.8 * CM;
const MARGIN_GUTTER = 0 * CM;

const TITLE_SIZE = 18;
const TITLE_LH = 22.5;
const AUTHOR_SIZE = 8;
const AUTHOR_LH = 12.5;
const GAP_TITLE_AUTHOR = 4;   // space below the title, above the author line
const GAP_AUTHOR_BODY = 6;

// Public sessions always export a single story. At 10pt with the margins
// above, a story fits on one A4 page up to ~3900 chars — which is exactly the
// server-side story cap (MAX_STORY_CHARS in core/games/story.js), so a
// finished public story fills at most one page. Private sessions can hold
// several long stories, so one-page-total isn't a realistic goal there; they
// get the more comfortable reading size instead, with each story starting on
// a fresh page.
const BODY_PUBLIC = { size: 10, leading: 13.8 };
const BODY_PRIVATE = { size: 11.5, leading: 16 };

function slugify(title) {
  const slug = (title || '')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return slug || 'knickgeschichte';
}

export async function exportStoriesPdf({ title, stories, storyAuthors, isAsync }) {
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

  const textX = MARGIN_LEFT + MARGIN_GUTTER;
  const textWidth = doc.internal.pageSize.getWidth() - textX - MARGIN_RIGHT;
  const pageHeight = doc.internal.pageSize.getHeight();
  const body = isAsync ? BODY_PUBLIC : BODY_PRIVATE;

  let y = MARGIN_TOP;
  const ensureSpace = needed => {
    if (y + needed > pageHeight - MARGIN_BOTTOM) {
      doc.addPage();
      y = MARGIN_TOP;
    }
  };
  const writeLines = (lines, lineHeight) => {
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, textX, y);
      y += lineHeight;
    }
  };

  doc.setFont('Fraunces', 'bold');
  doc.setFontSize(TITLE_SIZE);
  writeLines(doc.splitTextToSize(title || 'Knickgeschichte', textWidth), TITLE_LH);
  y += GAP_TITLE_AUTHOR;

  stories.forEach((story, i) => {
    // Private sessions can hold several long stories — start each on a
    // fresh page rather than letting them run together. Public exports
    // are always a single story, so this never fires for them.
    if (i > 0) {
      doc.addPage();
      y = MARGIN_TOP;
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

  doc.save(`${slugify(title)}.pdf`);
}
