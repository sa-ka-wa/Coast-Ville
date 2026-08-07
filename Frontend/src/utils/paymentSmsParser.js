// utils/paymentSmsParser.js - AI-powered payment SMS parser
import api from "../services/api";

/**
 * AI-Powered Payment SMS Parser
 * Intelligently parses M-Pesa SMS and matches to tenants
 */
export class PaymentSmsParser {
  constructor() {
    // Patterns for M-Pesa SMS parsing
    this.patterns = {
      amount: [
        /(?:Ksh|KES|KSh|Kenya Shillings?)\s*([\d,]+\.?\d*)/i,
        /Confirmed\s*[\w.]*\s*([\d,]+\.?\d*)/i,
        /Amount:\s*([\d,]+\.?\d*)/i,
        /([\d,]+\.?\d*)\s*(?:to|for|from|received)/i,
        /([\d,]+\.?\d*)\s*\/\s*/i,
        /([\d,]+\.?\d*)\s*-\s*/i,
      ],

      account_ref: [
        /A\/C\s*Ref\.?Number\s*([\w\s#\-]+)/i,
        /Account\s*Ref(?:erence)?:\s*([\w\s#\-]+)/i,
        /Ref\.?Number\s*([\w\s#\-]+)/i,
        /Ref\.?\s*([\w\s#\-]+)/i,
        /A\/C\s*([\w\s#\-]+)/i,
        /Account\s*([\w\s#\-]+)/i,
      ],

      mpesa_code: [
        /MPESA\s*Ref\s*([A-Z0-9]+)/i,
        /Ref\s*([A-Z0-9]+)/i,
        /Transaction\s*([A-Z0-9]+)/i,
        /Code\s*([A-Z0-9]+)/i,
        /([A-Z0-9]{6,12})\s*(?:on|at|from)/i,
      ],

      phone: [
        /Phone\s*([0-9]+)/i,
        /Sent\s*from\s*([0-9]+)/i,
        /from\s*([0-9]{10,12})/i,
        /([0-9]{10,12})\s*(?:on|at)/i,
        /(\+?254[0-9]{9})/i,
      ],

      name: [
        /by\s*([A-Z\s]+)\s*Phone/i,
        /from\s*([A-Z\s]+)\s*(?:Phone|on)/i,
        /to\s*([A-Z\s]+)\s*A\/C/i,
        /([A-Z\s]+)\s*(?:has|made|paid)/i,
        /received\s*from\s*([A-Z\s]+)/i,
      ],

      house_number: [
        /Ref\.?Number\s*(?:\d+\s+)(\w+)/i,
        /A\/C\s*(?:\d+\s+)(\w+)/i,
        /#\s*(\w+)/i,
        /-\s*(\w+)/i,
        /(\b[A-Z]?\d{1,3}\b)(?=\s*(?:$|on|at|via))/i,
      ],

      date: [
        /on\s*(\d{2}-\d{2}-\d{4}|\d{2}\/\d{2}\/\d{4})/i,
        /(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i,
        /(\d{4}-\d{2}-\d{2})/i,
        /(\d{1,2}\.\d{1,2}\.\d{2,4})/i,
      ],
    };

    this.accountPrefixes = ["911936", "177914"];
  }

  /**
   * Parse the SMS text
   */
  parse(smsText) {
    try {
      console.log("🤖 AI Parsing Payment SMS...");

      const result = {
        raw: smsText,
        parsed: true,
        confidence: 0,
        matches: [],
        matched_tenant: null,
      };

      // Extract amount
      const amount = this.extractAmount(smsText);
      if (amount) {
        result.amount = amount;
        result.matches.push({ field: "amount", value: amount, confidence: 90 });
      }

      // Extract account reference
      const accountRef = this.extractAccountReference(smsText);
      if (accountRef) {
        result.account_reference = accountRef;
        result.matches.push({
          field: "account_reference",
          value: accountRef,
          confidence: 85,
        });

        // Extract house number from account reference
        const houseNo = this.extractHouseNumber(accountRef);
        if (houseNo) {
          result.house_no = houseNo;
          result.matches.push({
            field: "house_no",
            value: houseNo,
            confidence: 80,
          });
        }
      }

      // Extract M-Pesa code
      const mpesaCode = this.extractMpesaCode(smsText);
      if (mpesaCode) {
        result.mpesa_code = mpesaCode;
        result.matches.push({
          field: "mpesa_code",
          value: mpesaCode,
          confidence: 95,
        });
      }

      // Extract phone number
      const phone = this.extractPhone(smsText);
      if (phone) {
        result.phone_number = phone;
        result.matches.push({
          field: "phone_number",
          value: phone,
          confidence: 80,
        });
      }

      // Extract sender name
      const name = this.extractName(smsText);
      if (name) {
        result.sender_name = name;
        result.matches.push({
          field: "sender_name",
          value: name,
          confidence: 70,
        });
      }

      // Extract date
      const date = this.extractDate(smsText);
      if (date) {
        result.payment_date = date;
        result.matches.push({
          field: "payment_date",
          value: date,
          confidence: 85,
        });
      }

      // Calculate overall confidence
      result.confidence = this.calculateConfidence(result.matches);
      result.is_valid_payment = this.isValidPayment(result);

      console.log("✅ AI Parsing Result:", result);
      return result;
    } catch (error) {
      console.error("❌ AI Parsing error:", error);
      return { parsed: false, error: error.message, raw: smsText };
    }
  }

  /**
   * Extract amount from SMS
   */
  extractAmount(text) {
    for (const pattern of this.patterns.amount) {
      const match = text.match(pattern);
      if (match) {
        const value = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }
    return null;
  }

  /**
   * Extract account reference from SMS
   */
  extractAccountReference(text) {
    for (const pattern of this.patterns.account_ref) {
      const match = text.match(pattern);
      if (match) {
        const ref = match[1].trim();
        // Check if it contains known prefixes
        for (const prefix of this.accountPrefixes) {
          if (ref.includes(prefix)) {
            return ref;
          }
        }
        if (/\d/.test(ref)) {
          return ref;
        }
      }
    }
    return null;
  }

  /**
   * Extract house number from account reference
   */
  extractHouseNumber(accountRef) {
    if (!accountRef) return null;

    // Try patterns
    for (const pattern of this.patterns.house_number) {
      const match = accountRef.match(pattern);
      if (match) {
        return match[1].trim().toUpperCase();
      }
    }

    // Try to split by common separators
    const separators = ["#", " ", "-", "_", "/"];
    for (const sep of separators) {
      if (accountRef.includes(sep)) {
        const parts = accountRef.split(sep);
        if (parts.length >= 2) {
          for (const part of parts) {
            const clean = part.trim().toUpperCase();
            if (clean.length <= 10 && /[A-Z]?\d+/.test(clean)) {
              return clean;
            }
          }
          const last = parts[parts.length - 1].trim().toUpperCase();
          if (last.length <= 10) {
            return last;
          }
        }
      }
    }

    const rawMatch = accountRef.match(/([A-Z]?\d{1,3})/i);
    if (rawMatch) {
      return rawMatch[1].toUpperCase();
    }

    return null;
  }

  /**
   * Extract M-Pesa code
   */
  extractMpesaCode(text) {
    for (const pattern of this.patterns.mpesa_code) {
      const match = text.match(pattern);
      if (match) {
        const code = match[1].trim();
        if (code.length >= 6 && /[A-Z0-9]/.test(code)) {
          return code;
        }
      }
    }
    return null;
  }

  /**
   * Extract phone number
   */
  extractPhone(text) {
    for (const pattern of this.patterns.phone) {
      const match = text.match(pattern);
      if (match) {
        let phone = match[1].trim();
        phone = phone.replace(/\s/g, "");
        if (phone.startsWith("0")) {
          phone = "254" + phone.slice(1);
        } else if (phone.startsWith("7")) {
          phone = "254" + phone;
        }
        if (phone.length >= 10) {
          return phone;
        }
      }
    }
    return null;
  }

  /**
   * Extract sender name
   */
  extractName(text) {
    for (const pattern of this.patterns.name) {
      const match = text.match(pattern);
      if (match) {
        const name = match[1].trim();
        if (name.length >= 3 && !/^\d+$/.test(name)) {
          return name;
        }
      }
    }
    return null;
  }

  /**
   * Extract date
   */
  extractDate(text) {
    for (const pattern of this.patterns.date) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(matches) {
    if (!matches || matches.length === 0) return 0;
    let total = 0;
    for (const match of matches) {
      total += match.confidence || 50;
    }
    return Math.round(total / matches.length);
  }

  /**
   * Check if this looks like a valid payment
   */
  isValidPayment(result) {
    if (!result.amount) return false;
    if (!result.account_reference && !result.phone_number) return false;
    if (!result.mpesa_code && result.confidence < 60) return false;
    return true;
  }

  /**
   * Find matching tenant from parsed data
   */
  async findMatchingTenant(parsedData, propertyId) {
    try {
      console.log("🔍 Finding matching tenant...");

      const candidates = [];

      // 1. Match by house number
      if (parsedData.house_no) {
        const houseNo = parsedData.house_no.toUpperCase();
        const response = await api.get("/units", {
          params: { property_id: propertyId, search: houseNo },
        });

        const units = response.data || [];
        for (const unit of units) {
          if (
            unit.unit_number.toUpperCase() === houseNo ||
            unit.unit_number.toUpperCase() === houseNo.padStart(3, "0")
          ) {
            const tenantRes = await api.get(`/tenants/unit/${unit.id}`);
            if (tenantRes.data) {
              candidates.push({
                tenant: tenantRes.data,
                unit: unit,
                score: 100,
                matched_by: "house_number_exact",
              });
              break;
            }
          }
        }
      }

      // 2. Match by phone
      if (parsedData.phone_number) {
        const phone = parsedData.phone_number;
        const response = await api.get("/tenants", {
          params: { phone: phone, property_id: propertyId },
        });
        const tenants = response.data || [];
        for (const tenant of tenants) {
          if (tenant.phone === phone) {
            candidates.push({
              tenant: tenant,
              score: 95,
              matched_by: "phone_exact",
            });
          } else if (tenant.phone && tenant.phone.includes(phone.slice(-9))) {
            candidates.push({
              tenant: tenant,
              score: 75,
              matched_by: "phone_partial",
            });
          }
        }
      }

      // 3. Match by name
      if (parsedData.sender_name) {
        const name = parsedData.sender_name.toLowerCase();
        const response = await api.get("/tenants", {
          params: { property_id: propertyId, search: name },
        });
        const tenants = response.data || [];
        for (const tenant of tenants) {
          if (tenant.name && tenant.name.toLowerCase().includes(name)) {
            candidates.push({
              tenant: tenant,
              score: 70,
              matched_by: "name_partial",
            });
          }
        }
      }

      // 4. Match by amount
      if (parsedData.amount) {
        const amount = parsedData.amount;
        const response = await api.get("/tenants", {
          params: { property_id: propertyId, monthly_rent: amount },
        });
        const tenants = response.data || [];
        for (const tenant of tenants) {
          if (tenant.monthly_rent === amount) {
            candidates.push({
              tenant: tenant,
              score: 60,
              matched_by: "rent_amount",
            });
          }
        }
      }

      // Remove duplicates and sort
      const seen = new Set();
      const unique = [];
      for (const c of candidates) {
        if (!seen.has(c.tenant.id)) {
          seen.add(c.tenant.id);
          unique.push(c);
        }
      }
      unique.sort((a, b) => b.score - a.score);

      console.log("📊 Candidate matches:", unique);
      return unique;
    } catch (error) {
      console.error("❌ Error finding matching tenant:", error);
      return [];
    }
  }

  /**
   * Parse SMS and find matching tenant in one call
   */
  async parseAndMatch(smsText, propertyId) {
    const parsed = this.parse(smsText);
    if (!parsed.is_valid_payment) {
      return {
        ...parsed,
        matched: false,
        message: "Could not parse payment details from SMS",
      };
    }

    const matches = await this.findMatchingTenant(parsed, propertyId);

    if (matches.length === 0) {
      return {
        ...parsed,
        matched: false,
        message: "No matching tenant found",
        candidates: [],
      };
    }

    return {
      ...parsed,
      matched: true,
      candidates: matches,
      best_match: matches[0],
      message: `Matched to ${matches[0].tenant.name}`,
    };
  }
}

export const paymentSmsParser = new PaymentSmsParser();
export default paymentSmsParser;
