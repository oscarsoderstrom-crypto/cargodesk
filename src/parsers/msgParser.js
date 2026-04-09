// msgParser.js — Parse Outlook .msg files (OLE2/CFBF format)
// Extracts: subject, body (text + HTML), sender, date, attachments
// This is a minimal pure-JS implementation for the browser.

// ─── OLE2 Compound Binary File (CFBF) reader ───────────────────────────────

const ENDOFCHAIN = 0xFFFFFFFE;
const FREESECT = 0xFFFFFFFF;
const HEADER_SIG = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];

class CFBReader {
  constructor(buffer) {
    this.data = new DataView(buffer);
    this.u8 = new Uint8Array(buffer);
    this.parse();
  }

  getU16(off) { return this.data.getUint16(off, true); }
  getU32(off) { return this.data.getUint32(off, true); }

  parse() {
    // Validate signature
    for (let i = 0; i < 8; i++) {
      if (this.u8[i] !== HEADER_SIG[i]) throw new Error('Not a valid OLE2/MSG file');
    }

    this.sectorSize = 1 << this.getU16(30);      // Usually 512
    this.miniSectorSize = 1 << this.getU16(32);   // Usually 64
    this.fatSectors = this.getU32(44);
    this.dirStartSector = this.getU32(48);
    this.miniCutoff = this.getU32(56);             // Usually 4096
    this.miniFatStart = this.getU32(60);
    this.miniFatCount = this.getU32(64);
    this.difatStart = this.getU32(68);
    this.difatCount = this.getU32(72);

    // Read DIFAT (first 109 entries in header at offset 76)
    this.difat = [];
    for (let i = 0; i < 109; i++) {
      const s = this.getU32(76 + i * 4);
      if (s !== FREESECT && s !== ENDOFCHAIN) this.difat.push(s);
    }

    // Follow DIFAT chain for additional sectors
    let difatSector = this.difatStart;
    while (difatSector !== ENDOFCHAIN && difatSector !== FREESECT) {
      const off = this.sectorOffset(difatSector);
      for (let i = 0; i < (this.sectorSize / 4 - 1); i++) {
        const s = this.getU32(off + i * 4);
        if (s !== FREESECT && s !== ENDOFCHAIN) this.difat.push(s);
      }
      difatSector = this.getU32(off + this.sectorSize - 4);
    }

    // Build FAT
    this.fat = [];
    for (const s of this.difat) {
      const off = this.sectorOffset(s);
      for (let i = 0; i < this.sectorSize / 4; i++) {
        this.fat.push(this.getU32(off + i * 4));
      }
    }

    // Build Mini FAT
    this.miniFat = [];
    let mfSector = this.miniFatStart;
    while (mfSector !== ENDOFCHAIN && mfSector !== FREESECT) {
      const off = this.sectorOffset(mfSector);
      for (let i = 0; i < this.sectorSize / 4; i++) {
        this.miniFat.push(this.getU32(off + i * 4));
      }
      mfSector = this.fat[mfSector];
    }

    // Read directory entries
    this.dirs = [];
    let dirSector = this.dirStartSector;
    while (dirSector !== ENDOFCHAIN && dirSector !== FREESECT) {
      const off = this.sectorOffset(dirSector);
      for (let i = 0; i < this.sectorSize / 128; i++) {
        this.dirs.push(this.readDirEntry(off + i * 128));
      }
      dirSector = this.fat[dirSector];
    }

    // Root entry's stream = mini stream container
    this.rootEntry = this.dirs[0];
    this.miniStreamData = this.rootEntry.startSector !== ENDOFCHAIN
      ? this.readStream(this.rootEntry.startSector, this.rootEntry.size, false)
      : new Uint8Array(0);
  }

  sectorOffset(sector) {
    return (sector + 1) * this.sectorSize;
  }

  readDirEntry(off) {
    const nameLen = this.getU16(off + 64);
    let name = '';
    for (let i = 0; i < Math.max(0, nameLen - 2); i += 2) {
      const ch = this.getU16(off + i);
      if (ch === 0) break;
      name += String.fromCharCode(ch);
    }
    return {
      name,
      type: this.u8[off + 66],     // 1=storage, 2=stream, 5=root
      startSector: this.getU32(off + 116),
      size: this.getU32(off + 120),
      childId: this.getU32(off + 68),
      leftId: this.getU32(off + 72),
      rightId: this.getU32(off + 76),
    };
  }

  readStream(startSector, size, mini = false) {
    const result = new Uint8Array(size);
    let sector = startSector;
    let pos = 0;
    const sSize = mini ? this.miniSectorSize : this.sectorSize;
    const fatTable = mini ? this.miniFat : this.fat;

    let safety = 0;
    while (sector !== ENDOFCHAIN && sector !== FREESECT && pos < size && safety++ < 100000) {
      const len = Math.min(sSize, size - pos);
      let srcOff;
      if (mini) {
        srcOff = sector * this.miniSectorSize;
        result.set(this.miniStreamData.slice(srcOff, srcOff + len), pos);
      } else {
        srcOff = this.sectorOffset(sector);
        result.set(this.u8.slice(srcOff, srcOff + len), pos);
      }
      pos += len;
      sector = fatTable[sector] ?? ENDOFCHAIN;
    }
    return result;
  }

  getStreamData(dirEntry) {
    if (dirEntry.size === 0) return new Uint8Array(0);
    const useMini = dirEntry.size < this.miniCutoff;
    return this.readStream(dirEntry.startSector, dirEntry.size, useMini);
  }

  // Walk the red-black tree to collect all children of a storage entry
  collectChildren(storageIndex) {
    const entry = this.dirs[storageIndex];
    if (!entry || entry.childId === 0xFFFFFFFF) return [];
    const result = [];
    const visited = new Set();
    const stack = [entry.childId];
    while (stack.length > 0) {
      const idx = stack.pop();
      if (idx === 0xFFFFFFFF || visited.has(idx)) continue;
      visited.add(idx);
      const child = this.dirs[idx];
      if (child) {
        result.push({ ...child, _dirIndex: idx });
        stack.push(child.leftId);
        stack.push(child.rightId);
      }
    }
    return result;
  }
}

// ─── MSG Property extraction ────────────────────────────────────────────────

// Common MAPI property IDs
const PID = {
  SUBJECT:           0x0037,
  BODY:              0x1000,
  BODY_HTML:         0x1013,
  SENDER_NAME:       0x0C1A,
  SENDER_EMAIL:      0x0065,
  SENT_DATE:         0x0039,
  RECEIVED_DATE:     0x0E06,
  DISPLAY_TO:        0x0E04,
  ATTACH_FILENAME:   0x3707,
  ATTACH_LONG_FNAME: 0x3707,
  ATTACH_DATA:       0x3701,
  ATTACH_MIME_TAG:   0x370E,
  ATTACH_EXTENSION:  0x3703,
};

function readUTF16LE(bytes) {
  let str = '';
  for (let i = 0; i < bytes.length - 1; i += 2) {
    const code = bytes[i] | (bytes[i + 1] << 8);
    if (code === 0) break;
    str += String.fromCharCode(code);
  }
  return str;
}

function readUTF8(bytes) {
  try {
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  }
}

function getPropertyStream(cfb, parentIndex, propId, type) {
  const children = cfb.collectChildren(parentIndex);
  // Property streams named like: "__substg1.0_XXXXYYYY" where XXXX = propId, YYYY = type
  const hexId = propId.toString(16).toUpperCase().padStart(4, '0');
  
  for (const child of children) {
    const name = child.name.toUpperCase();
    if (name.includes(hexId) && child.type === 2) {
      return cfb.getStreamData(child);
    }
  }
  return null;
}

function getStringProp(cfb, parentIndex, propId) {
  const data = getPropertyStream(cfb, parentIndex, propId);
  if (!data || data.length === 0) return null;
  // Try UTF-16LE first (type 001F), fall back to UTF-8/ASCII (type 001E)
  const str16 = readUTF16LE(data);
  if (str16 && str16.length > 0 && !/[\x00-\x08]/.test(str16)) return str16;
  return readUTF8(data);
}

// ─── Main parse function ────────────────────────────────────────────────────

export async function parseMsgFile(file) {
  const buffer = await file.arrayBuffer();
  let cfb;
  try {
    cfb = new CFBReader(buffer);
  } catch (e) {
    console.error('MSG parse error:', e);
    return null;
  }

  const result = {
    subject: null,
    body: null,
    bodyHtml: null,
    sender: null,
    senderEmail: null,
    date: null,
    attachments: [],
  };

  // Root entry (index 0) contains message properties
  result.subject = getStringProp(cfb, 0, PID.SUBJECT);
  result.body = getStringProp(cfb, 0, PID.BODY);
  result.bodyHtml = getStringProp(cfb, 0, PID.BODY_HTML);
  result.sender = getStringProp(cfb, 0, PID.SENDER_NAME);
  result.senderEmail = getStringProp(cfb, 0, PID.SENDER_EMAIL);

  // Find attachment storages (named like "__attach_version1.0_#XXXXXXXX")
  const rootChildren = cfb.collectChildren(0);
  for (const child of rootChildren) {
    if (child.name.toLowerCase().startsWith('__attach') && child.type === 1) {
      const filename = getStringProp(cfb, child._dirIndex, PID.ATTACH_FILENAME) ||
                       getStringProp(cfb, child._dirIndex, PID.ATTACH_LONG_FNAME);
      const mimeType = getStringProp(cfb, child._dirIndex, PID.ATTACH_MIME_TAG);
      const extension = getStringProp(cfb, child._dirIndex, PID.ATTACH_EXTENSION);
      const dataBytes = getPropertyStream(cfb, child._dirIndex, PID.ATTACH_DATA);

      if (filename || dataBytes) {
        const attachment = {
          filename: filename || `attachment${extension || ''}`,
          mimeType: mimeType || 'application/octet-stream',
          size: dataBytes?.length || 0,
          data: dataBytes || null,
        };

        // If it's a PDF, convert to base64 for the document store
        if (extension === '.pdf' || mimeType === 'application/pdf' || filename?.toLowerCase().endsWith('.pdf')) {
          attachment.isPdf = true;
          attachment.base64 = dataBytes ? uint8ToBase64(dataBytes) : null;
        }

        result.attachments.push(attachment);
      }
    }
  }

  return result;
}

// ─── Extract text from HTML body ────────────────────────────────────────────

export function htmlToText(html) {
  if (!html) return null;
  // Simple HTML→text: strip tags, decode entities, normalize whitespace
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function uint8ToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── Convenience: full pipeline for a .msg drop ─────────────────────────────

export async function processMsgFile(file) {
  const msg = await parseMsgFile(file);
  if (!msg) return null;

  // Get the best text body
  const bodyText = msg.body || htmlToText(msg.bodyHtml) || '';

  return {
    ...msg,
    bodyText,
    fileName: file.name,
    fileSize: file.size,
  };
}
