// utils/waterReadingParser.js - Fixed version

/**
 * Intelligent Water Reading Parser
 * Handles various human input formats with fuzzy matching
 */
export class WaterReadingParser {
  constructor() {
    // Common patterns for meter readings - ORDER MATTERS! Put more specific first
    this.patterns = [
      // ✅ FIXED: Pattern for meter number followed by dots and reading
      // Matches: 1...0606, 2...548, 7...0573, etc.
      /^([A-Za-z0-9]+)\s*[.…]+\s*(\d+)/,
      // Pattern: 1 - 0606 or 1-0606
      /^([A-Za-z0-9]+)\s*[-–—]\s*(\d+)/,
      // Pattern: 1: 0606 or 1:0606
      /^([A-Za-z0-9]+)\s*[:：]\s*(\d+)/,
      // Pattern: 1 = 0606 or 1=0606
      /^([A-Za-z0-9]+)\s*[=]\s*(\d+)/,
      // Pattern: 1 0606 (space separated)
      /^([A-Za-z0-9]+)\s+(\d+)$/,
      // Pattern: 0606 for meter 1 (implicit)
      /^(\d+)\s*$/,
    ];

    // Known valid meter numbers
    this.validMeters = new Set([
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
      "16",
      "17",
      "18",
      "19",
      "20",
      "21",
      "22",
      "23",
      "24",
      "25",
      "26",
      "27",
      "28",
      "29",
      "30",
      "31",
      "32",
      "33",
      "34",
      "35",
      "36",
      "37",
      "38",
      "39",
      "40",
      "41",
      "42",
      "43",
      "44",
      "45",
      "101",
      "102",
      "103",
      "104",
      "105",
      "106",
      "107",
      "108",
      "109",
      "201",
      "202",
      "203",
      "204",
      "205",
      "206",
      "207",
      "208",
      "209",
      "301",
      "302",
      "303",
      "304",
      "305",
      "306",
      "307",
      "308",
      "309",
      "401",
      "402",
      "403",
      "404",
      "405",
      "406",
      "407",
      "408",
      "409",
      "H1",
      "H2",
      "H3",
      "H4",
      "H5",
      "H6",
      "H7",
      "H8",
      "H9",
      "H10",
      "H11",
      "H12",
      "J1",
      "J2",
      "J3",
      "J4",
      "J5",
      "J6",
      "K1",
      "K2",
      "K3",
      "K4",
      "K5",
      "K6",
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
      "L6",
      "35",
      "36",
      "33",
      "34",
    ]);

    // Common meter number variations for fuzzy matching
    this.meterVariations = {
      1: ["1", "01", "001"],
      2: ["2", "02", "002"],
      3: ["3", "03", "003"],
      4: ["4", "04", "004"],
      5: ["5", "05", "005"],
      6: ["6", "06", "006"],
      7: ["7", "07", "007"],
      8: ["8", "08", "008"],
      9: ["9", "09", "009"],
      10: ["10", "010"],
      11: ["11", "011"],
      12: ["12", "012"],
      101: ["101"],
      102: ["102"],
      103: ["103"],
      104: ["104"],
      105: ["105"],
      106: ["106"],
      107: ["107"],
      108: ["108"],
      109: ["109"],
      201: ["201"],
      202: ["202"],
      203: ["203"],
      204: ["204"],
      205: ["205"],
      206: ["206"],
      207: ["207"],
      208: ["208"],
      209: ["209"],
      301: ["301"],
      302: ["302"],
      303: ["303"],
      304: ["304"],
      305: ["305"],
      306: ["306"],
      307: ["307"],
      308: ["308"],
      309: ["309"],
      401: ["401"],
      402: ["402"],
      403: ["403"],
      404: ["404"],
      405: ["405"],
      406: ["406"],
      407: ["407"],
      408: ["408"],
      409: ["409"],
      H1: ["H1", "h1", "H-1"],
      H2: ["H2", "h2", "H-2"],
      H7: ["H7", "h7", "H-7"],
      H8: ["H8", "h8", "H-8"],
      H9: ["H9", "h9", "H-9"],
      H10: ["H10", "h10", "H-10"],
      H11: ["H11", "h11", "H-11"],
      H12: ["H12", "h12", "H-12"],
      J1: ["J1", "j1", "J-1"],
      J2: ["J2", "j2", "J-2"],
      J3: ["J3", "j3", "J-3"],
      J4: ["J4", "j4", "J-4"],
      J5: ["J5", "j5", "J-5"],
      J6: ["J6", "j6", "J-6"],
      K1: ["K1", "k1", "K-1"],
      K2: ["K2", "k2", "K-2"],
      K3: ["K3", "k3", "K-3"],
      K4: ["K4", "k4", "K-4"],
      K5: ["K5", "k5", "K-5"],
      K6: ["K6", "k6", "K-6"],
      L1: ["L1", "l1", "L-1"],
      L2: ["L2", "l2", "L-2"],
      L3: ["L3", "l3", "L-3"],
      L4: ["L4", "l4", "L-4"],
      L5: ["L5", "l5", "L-5"],
      L6: ["L6", "l6", "L-6"],
      33: ["33"],
      34: ["34"],
      35: ["35"],
      36: ["36"],
    };

    // Common misspellings and variations
    this.commonMistakes = {
      k: "K",
      h: "H",
      j: "J",
      l: "L",
      I: "1",
      O: "0",
      S: "5",
      B: "8",
      Z: "2",
    };
  }

  /**
   * Check if a meter number is valid
   */
  isValidMeter(meter) {
    return (
      this.validMeters.has(meter) || this.validMeters.has(meter.toUpperCase())
    );
  }

  /**
   * Try to split combined meter+reading (e.g., "10606" -> "1" and "0606")
   */
  splitMeterNumber(combined) {
    // Try to match patterns like "10606" -> "1" and "0606"
    // Check if the combined string starts with a valid meter number
    for (const validMeter of this.validMeters) {
      if (combined.startsWith(validMeter)) {
        const remaining = combined.slice(validMeter.length);
        // Remaining should be all digits
        if (/^\d+$/.test(remaining)) {
          return {
            meter: validMeter,
            reading: parseInt(remaining),
          };
        }
      }
    }

    // Try to split by the first digit pattern
    // e.g., "10606" -> "1" and "0606"
    const match = combined.match(/^(\d)(\d{4})$/);
    if (match) {
      const meter = match[1];
      const reading = parseInt(match[2]);
      if (this.isValidMeter(meter)) {
        return { meter, reading };
      }
    }

    return null;
  }

  /**
   * Clean and normalize a string
   */
  normalizeString(str) {
    return str
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[，,]/g, " ")
      .replace(/[.;;]/g, "")
      .replace(/[：:]/g, " ")
      .replace(/[=]/g, " ")
      .replace(/[–—\-]/g, " ")
      .replace(/[.…]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Find the best match for a meter number from known meters
   */
  findBestMeterMatch(input) {
    const normalized = input.trim().toUpperCase();

    // Direct match
    for (const [key, variations] of Object.entries(this.meterVariations)) {
      if (variations.some((v) => v.toUpperCase() === normalized)) {
        return key;
      }
    }

    // Try with common mistakes corrected
    let corrected = "";
    for (const char of normalized) {
      corrected += this.commonMistakes[char] || char;
    }

    for (const [key, variations] of Object.entries(this.meterVariations)) {
      if (variations.some((v) => v.toUpperCase() === corrected)) {
        return key;
      }
    }

    // Try partial match
    for (const [key, variations] of Object.entries(this.meterVariations)) {
      for (const v of variations) {
        if (
          normalized.includes(v.toUpperCase()) ||
          v.toUpperCase().includes(normalized)
        ) {
          return key;
        }
      }
    }

    return null;
  }

  /**
   * Parse a single line of text
   */
  parseLine(line) {
    const cleanLine = line.trim();
    if (!cleanLine) return null;

    // ✅ FIRST: Try the dot pattern directly (most common for meter readings)
    const dotMatch = cleanLine.match(/^([A-Za-z0-9]+)\s*[.…]+\s*(\d+)/);
    if (dotMatch) {
      const meterCandidate = dotMatch[1].trim();
      const reading = parseInt(dotMatch[2]);

      if (!isNaN(reading)) {
        // Try to find the best meter match
        const bestMatch = this.findBestMeterMatch(meterCandidate);
        if (bestMatch) {
          return {
            meter: bestMatch,
            reading: reading,
            originalMeter: meterCandidate,
            isImplicit: false,
          };
        }

        // If no match, check if it's a combined number
        const splitResult = this.splitMeterNumber(meterCandidate);
        if (splitResult) {
          return {
            meter: splitResult.meter,
            reading: splitResult.reading,
            originalMeter: meterCandidate,
            isImplicit: false,
          };
        }

        // Unknown meter
        return {
          meter: meterCandidate,
          reading: reading,
          originalMeter: meterCandidate,
          isImplicit: false,
          isUnknown: true,
        };
      }
    }

    // Try other patterns
    for (const pattern of this.patterns) {
      const match = cleanLine.match(pattern);
      if (match) {
        // Check if it's just a number (implicit meter)
        if (match.length === 2 && !isNaN(match[1]) && !isNaN(match[0])) {
          return {
            meter: match[1],
            reading: parseInt(match[1]),
            isImplicit: true,
          };
        }

        const meterCandidate = match[1];
        const reading = parseInt(match[match.length - 1]);

        if (!isNaN(reading)) {
          // Try to find the best meter match
          const bestMatch = this.findBestMeterMatch(meterCandidate);
          if (bestMatch) {
            return {
              meter: bestMatch,
              reading: reading,
              originalMeter: meterCandidate,
              isImplicit: false,
            };
          }

          // If no match, return as-is with a warning
          return {
            meter: meterCandidate,
            reading: reading,
            originalMeter: meterCandidate,
            isImplicit: false,
            isUnknown: true,
          };
        }
      }
    }

    return null;
  }

  /**
   * Parse the entire text block
   */
  parse(text) {
    const lines = text.split("\n");
    const results = [];
    const motherMeters = {};
    let isMotherMeterSection = false;
    let month = "";
    let year = "";
    let day = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect mother meter section
      if (trimmed.toLowerCase().includes("mother")) {
        isMotherMeterSection = true;
        continue;
      }

      // Detect month header
      const monthMatch = trimmed.match(
        /(\d+)(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/,
      );
      if (monthMatch) {
        day = monthMatch[1];
        month = monthMatch[2];
        year = monthMatch[3];
        continue;
      }

      // Also detect if it says "WATER READINGS" or similar
      if (
        trimmed.toLowerCase().includes("water") ||
        trimmed.toLowerCase().includes("reading")
      ) {
        continue;
      }

      // Parse the line
      if (isMotherMeterSection) {
        const parsed = this.parseLine(line);
        if (parsed && !isNaN(parsed.reading)) {
          motherMeters[parsed.meter] = parsed.reading;
        }
      } else {
        const parsed = this.parseLine(line);
        if (parsed && !isNaN(parsed.reading)) {
          results.push({
            meter_number: parsed.meter,
            current_reading: parsed.reading,
            is_unknown: parsed.isUnknown || false,
            is_implicit: parsed.isImplicit || false,
          });
        }
      }
    }

    return {
      readings: results,
      mother_meters: motherMeters,
      month_info: month ? { month, year, day } : null,
      total_readings: results.length,
      total_mother_meters: Object.keys(motherMeters).length,
    };
  }

  /**
   * Validate readings against known units
   */
  validateReadings(readings, existingUnits) {
    const valid = [];
    const warnings = [];
    const errors = [];

    for (const reading of readings) {
      const meter = reading.meter_number;

      // Try exact match
      let unit = existingUnits.find(
        (u) =>
          u.unit_number === meter ||
          u.unit_number === meter.padStart(3, "0") ||
          u.unit_number === meter.toUpperCase(),
      );

      if (unit) {
        valid.push({
          ...reading,
          unit_id: unit.id,
          tenant_id: unit.tenant_id,
          unit_number: unit.unit_number,
        });
      } else {
        // Try to find by partial match
        const partialMatch = existingUnits.find(
          (u) =>
            meter.includes(u.unit_number) ||
            u.unit_number.includes(meter) ||
            meter.toUpperCase().includes(u.unit_number.toUpperCase()),
        );

        if (partialMatch) {
          warnings.push({
            ...reading,
            unit_id: partialMatch.id,
            tenant_id: partialMatch.tenant_id,
            unit_number: partialMatch.unit_number,
            matched_by: "partial",
          });
        } else {
          errors.push({
            ...reading,
            error: `No unit found for meter: ${meter}`,
          });
        }
      }
    }

    return { valid, warnings, errors };
  }
}

// Create and export a singleton instance
export const waterReadingParser = new WaterReadingParser();
export default waterReadingParser;
