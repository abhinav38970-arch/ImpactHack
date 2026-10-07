import { describe, expect, it } from 'vitest';
import { escapeCell, exportFilename, toCsv } from './csv';

describe('csv escaping', () => {
  it('quotes commas, quotes, and line breaks correctly', () => {
    expect(escapeCell('a,b')).toBe('"a,b"');
    expect(escapeCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCell('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCell('plain')).toBe('plain');
    expect(escapeCell(52)).toBe('52');
    expect(escapeCell(null)).toBe('');
    expect(escapeCell(undefined)).toBe('');
  });

  it('neutralizes spreadsheet formulas in user text', () => {
    expect(escapeCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(escapeCell('+5 magic')).toBe("'+5 magic");
    expect(escapeCell('-2 trick')).toBe("'-2 trick");
    expect(escapeCell('@evil')).toBe("'@evil");
    expect(escapeCell('  =cmd')).toBe("'  =cmd");
    // Ordinary text and numbers pass through untouched.
    expect(escapeCell('Morning walks')).toBe('Morning walks');
    expect(escapeCell(186.4)).toBe('186.4');
  });

  it('builds consistent CRLF rows with a header', () => {
    const csv = toCsv(['a', 'b'], [[1, 'x,y'], [2, '=z']]);
    expect(csv).toBe('a,b\r\n1,"x,y"\r\n2,\'=z\r\n');
  });

  it('names exports clearly with a date stamp', () => {
    expect(exportFilename('measurements', '2026-10-07')).toBe(
      'liverloop-measurements-20261007.csv',
    );
  });
});
