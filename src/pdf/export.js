// Builds a PDF of one or more finished stories, using the project's own
// fonts (Fraunces for the title, Hanken Grotesk for body text) rather than
// jsPDF's default Helvetica. Loaded on demand (dynamic import) so the fonts
// and jsPDF itself don't bloat the main bundle.

const MARGIN_X = 56;
const MARGIN_TOP = 72;
const MARGIN_BOTTOM = 56;

function slugify(title) {
  const slug = (title || '')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return slug || 'knickgeschichte';
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

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const textWidth = pageWidth - MARGIN_X * 2;
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
      doc.text(line, MARGIN_X, y);
      y += lineHeight;
    }
  };

  doc.setFont('Fraunces', 'bold');
  doc.setFontSize(22);
  writeLines(doc.splitTextToSize(title || 'Knickgeschichte', textWidth), 28);
  y += 16;

  stories.forEach((story, i) => {
    if (i > 0) {
      y += 20;
      ensureSpace(40);
    }

    const authors = storyAuthors(story);
    if (authors) {
      doc.setFont('HankenGrotesk', 'medium');
      doc.setFontSize(10);
      writeLines(doc.splitTextToSize(authors, textWidth), 16);
      y += 6;
    }

    doc.setFont('HankenGrotesk', 'normal');
    doc.setFontSize(11.5);
    const text = story.map(entry => entry.link).join(' ');
    writeLines(doc.splitTextToSize(text, textWidth), 16);
  });

  doc.save(`${slugify(title)}.pdf`);
}
