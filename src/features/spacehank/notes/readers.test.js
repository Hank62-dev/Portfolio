import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { kindOf, readNoteFile } from './readers';

// The Word and Excel readers are real: these files are built here, byte for byte as the programs write them, so what the
// libraries do with them is what happens in the browser.

const RELS = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';

const zip = async (files, name, type) => {
  const archive = new JSZip();
  for (const [path, content] of Object.entries(files)) archive.file(path, content);
  return new File([await archive.generateAsync({ type: 'uint8array' })], name, { type });
};

const docx = (body) =>
  zip(
    {
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      '_rels/.rels': `${RELS}<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
      'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
    },
    'Báo cáo tuần.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );

const xlsx = () =>
  zip(
    {
      '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>',
      '_rels/.rels': `${RELS}<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Chi tiêu" sheetId="1" r:id="rId1"/></sheets></workbook>',
      'xl/_rels/workbook.xml.rels': `${RELS}<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`,
      'xl/sharedStrings.xml': '<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3"><si><t>Khoản</t></si><si><t>Số tiền</t></si><si><t>Cà phê &amp; bánh</t></si></sst>',
      'xl/worksheets/sheet1.xml': '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>45000</v></c></row></sheetData></worksheet>',
    },
    'chi-tieu.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

describe('which files are notes', () => {
  it('knows the formats, whatever the case', () => {
    expect(['a.md', 'A.MARKDOWN', 'a.txt', 'a.csv', 'a.tsv', 'a.html', 'a.docx', 'a.xlsx', 'a.json', 'a.pdf', 'a.doc', 'noext'].map(kindOf)).toEqual(['markdown', 'markdown', 'text', 'csv', 'csv', 'html', 'docx', 'xlsx', 'json', '', '', '']);
  });

  it('says why an old or unsupported file is refused', async () => {
    await expect(readNoteFile(new File(['x'], 'old.doc'))).rejects.toThrow('.docx');
    await expect(readNoteFile(new File(['x'], 'old.xls'))).rejects.toThrow('.xlsx');
    await expect(readNoteFile(new File(['x'], 'paper.pdf'))).rejects.toThrow('PDF');
    await expect(readNoteFile(new File(['x'], 'pic.png'))).rejects.toThrow('cannot be imported');
    await expect(readNoteFile(new File(['  \n'], 'blank.txt'))).rejects.toThrow('nothing in it');
  });
});

describe('reading a file as a note', () => {
  it('reads markdown, text, csv and html', async () => {
    expect(await readNoteFile(new File(['# Ý tưởng\n\nMột **ghi chú** #idea'], 'a.md'))).toMatchObject({ title: 'a', text: 'Ý tưởng\nMột ghi chú #idea' });
    expect((await readNoteFile(new File(['dòng 1\ndòng 2'], 'ghi chú.txt'))).html).toBe('<h1>ghi chú</h1><p>dòng 1</p><p>dòng 2</p>');
    expect((await readNoteFile(new File(['a,b\n1,2'], 'data.csv'))).html).toBe('<h1>data</h1><table><tbody><tr><th><p>a</p></th><th><p>b</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>');
    expect((await readNoteFile(new File(['<html><head><title>x</title></head><body><h2>Hi</h2><p>there</p></body></html>'], 'page.html'))).html).toBe('<h2>Hi</h2><p>there</p>');
  });

  it('reads a Word file: headings, bold, lists, and Vietnamese text', async () => {
    const file = await docx(
      '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Báo cáo</w:t></w:r></w:p><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Đậm</w:t></w:r><w:r><w:t xml:space="preserve"> và thường</w:t></w:r></w:p>'
    );
    const note = await readNoteFile(file);
    expect(note.html).toContain('<h1>Báo cáo</h1>');
    expect(note.html).toContain('<strong>Đậm</strong> và thường');
    expect(note.text).toBe('Báo cáo\nĐậm và thường');
  });

  it('reads an Excel file: the sheet is a section, the rows a table', async () => {
    const note = await readNoteFile(await xlsx());
    expect(note.title).toBe('chi-tieu');
    expect(note.html).toBe(
      '<h1>chi-tieu</h1><h2>Chi tiêu</h2><table><tbody><tr><th><p>Khoản</p></th><th><p>Số tiền</p></th></tr><tr><td><p>Cà phê &amp; bánh</p></td><td><p>45000</p></td></tr></tbody></table>'
    );
    expect(note.text).toContain('Cà phê & bánh · 45000');
  });

  it('refuses a damaged Word or Excel file with a sentence, not a crash', async () => {
    await expect(readNoteFile(new File(['not a zip'], 'broken.docx'))).rejects.toThrow('could not be read');
    await expect(readNoteFile(new File(['not a zip'], 'broken.xlsx'))).rejects.toThrow('could not be read');
  });
});
