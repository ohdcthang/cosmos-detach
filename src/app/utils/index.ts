export function fromHex(hexstring: string): Uint8Array {
    if (hexstring.length % 2 !== 0) {
      throw new Error("hex string length must be a multiple of 2");
    }
  
    const out = new Uint8Array(hexstring.length / 2);
    for (let i = 0; i < out.length; i++) {
      const j = 2 * i;
      const hexByteAsString = hexstring.slice(j, j + 2);
      if (!hexByteAsString.match(/[0-9a-f]{2}/i)) {
        throw new Error("hex string contains invalid characters");
      }
      out[i] = parseInt(hexByteAsString, 16);
    }
    return out;
  }
  

  // See https://github.com/paulmillr/noble-hashes/issues/25 for why this is needed
export function toRealUint8Array(data: ArrayLike<number>): Uint8Array {
    if (data instanceof Uint8Array) return data;
    else return Uint8Array.from(data);
  }
  

  export function toAscii(input: string): Uint8Array {
    const toNums = (str: string): readonly number[] =>
      str.split("").map((x: string) => {
        const charCode = x.charCodeAt(0);
        // 0x00–0x1F control characters
        // 0x20–0x7E printable characters
        // 0x7F delete character
        // 0x80–0xFF out of 7 bit ascii range
        if (charCode < 0x20 || charCode > 0x7e) {
          throw new Error("Cannot encode character that is out of printable ASCII range: " + charCode);
        }
        return charCode;
      });
    return Uint8Array.from(toNums(input));
  }