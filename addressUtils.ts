/**
 * Interface for parsed address components
 */
export interface ParsedAddress {
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  unit: string | null;
}

/**
 * Type for PropertyRadar API criteria value
 */
export type CriteriaValue =
  | string[]
  | number[]
  | Array<[string | number | null]>
  | Array<{ name: string; value: string[] }>;

/**
 * Type for PropertyRadar API criteria
 */
export interface PropertyCriteria {
  name: string;
  value: CriteriaValue;
}

/**
 * Extract address from legal description
 * @param legalDescription - Legal description text
 * @returns Extracted address or null if not found
 */
export function extractAddressFromLegalDescription(legalDescription: string): string | null {
  if (!legalDescription) return null;
  
  // Common address patterns in legal descriptions
  const addressPatterns = [
    /(?:PROPERTY ADDRESS:\s*)(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Court|Ct|Lane|Ln|Place|Pl|Circle|Cir|Terrace|Ter)(?:[^,]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)?)/i,
    /(?:AKA\s+)(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Court|Ct|Lane|Ln|Place|Pl|Circle|Cir|Terrace|Ter)(?:[^,]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)?)/i,
    /(?:MORE COMMONLY ADDRESSED AS\s+)(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Court|Ct|Lane|Ln|Place|Pl|Circle|Cir|Terrace|Ter)(?:[^,]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)?)/i,
    /(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Court|Ct|Lane|Ln|Place|Pl|Circle|Cir|Terrace|Ter)(?:[^,]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)?)/i,
  ];

  for (const pattern of addressPatterns) {
    const match = legalDescription.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract unit information from property address
 * @param address - Property address string
 * @returns Unit number if found, undefined otherwise
 */
export function extractUnitFromPropertyAddress(address: string): string | null {
  if (!address) return null;

  // Explicit unit indicators (e.g., "Unit 123", "Apt 456", "#6G")
  const unitRegex = /(?:Unit|Apt|#)\s*([A-Z0-9]+)/i;
  const match = address.match(unitRegex);
  return match && match[1] ? match[1] : null;
}

/**
 * Parse address string into components, including unit number
 * @param addressString - Full address string
 * @param legalDescription - Optional legal description that may contain unit or address information
 * @returns Object with address components or null if parsing fails
 */
export function parseAddress(address: string, legalDescription?: string): ParsedAddress | null {
  // First try to parse the address directly
  const parsedAddress = parseAddressString(address);
  
  // If we have a valid address, return it
  if (parsedAddress && parsedAddress.streetAddress && parsedAddress.city && parsedAddress.state && parsedAddress.zip) {
    return parsedAddress;
  }

  // If we have a legal description, try to extract address from it
  if (legalDescription) {
    // Look for common address patterns in legal descriptions
    const addressPatterns = [
      /PROPERTY ADDRESS:\s*([^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)/i,
      /MORE COMMONLY ADDRESSED AS\s*([^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)/i,
      /AKA\s*([^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)/i,
      /KNOWN AS\s*([^,]+),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)/i
    ];

    for (const pattern of addressPatterns) {
      const match = legalDescription.match(pattern);
      if (match) {
        const [_, streetAddress, city, state, zip] = match;
        return {
          streetAddress: streetAddress.trim(),
          unit: extractUnitNumber(streetAddress),
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim()
        };
      }
    }
  }

  // If we still don't have a valid address, try to parse what we have
  if (parsedAddress) {
    // If we have a street address but missing other components, try to extract from legal description
    if (parsedAddress.streetAddress && (!parsedAddress.city || !parsedAddress.state || !parsedAddress.zip)) {
      if (legalDescription) {
        const cityMatch = legalDescription.match(/([A-Z\s]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)/);
        if (cityMatch) {
          parsedAddress.city = cityMatch[1].trim();
          parsedAddress.state = cityMatch[2].trim();
          parsedAddress.zip = cityMatch[3].trim();
          return parsedAddress;
        }
      }
    }
  }

  return null;
}

/**
 * Convert parsed address into PropertyRadar API criteria format
 * @param parsedAddress - Parsed address components
 * @returns Array of criteria objects for PropertyRadar API
 */
export function addressToCriteria(parsedAddress: ParsedAddress): PropertyCriteria[] {
  const criteria: PropertyCriteria[] = [];

  // Add criteria in order of specificity (most specific first)
  if (parsedAddress.streetAddress) {
    criteria.push({
      name: "Address",
      value: [parsedAddress.streetAddress.toUpperCase()],
    });
  }

  if (parsedAddress.unit) {
    criteria.push({
      name: "Unit",
      value: [parsedAddress.unit],
    });
  }

  if (parsedAddress.zip) {
    criteria.push({
      name: "ZipFive",
      value: [parsedAddress.zip],
    });
  }

  if (parsedAddress.city) {
    criteria.push({
      name: "City",
      value: [parsedAddress.city.toUpperCase()],
    });
  }

  if (parsedAddress.state) {
    criteria.push({
      name: "State",
      value: [parsedAddress.state.toUpperCase()],
    });
  }

  return criteria;
}

/**
 * Format criteria for API request
 * @param criteria - Array of criteria objects
 * @returns Formatted criteria array for API request
 */
export function formatCriteriaForApi(criteria: PropertyCriteria[]): PropertyCriteria[] {
  // Ensure all values are arrays of strings
  return criteria.map(criterion => ({
    ...criterion,
    value: Array.isArray(criterion.value)
      ? criterion.value.map(v => String(v).toUpperCase())
      : [String(criterion.value).toUpperCase()]
  }));
}

export function isInvalidPropertyAddress(address: string): boolean {
  const invalidPatterns = [
    /^UNKNOWN$/i,
    /^VACANT LOT$/i,
    /^UNASSIGNED$/i,
    /^NO SITUS$/i,
    /^\s*$/,
    /^VACANT LOT IN/i,
  ];
  return invalidPatterns.some(pattern => pattern.test(address.trim()));
}

export function extractUnitFromLegalDescription(legalDescription: string): { unitNumber: string | null, locationName: string | null } {
  // First try to find unit patterns
  const unitPatterns = [
    /UNIT\s+([A-Z0-9\-]+)/i,
    /APT\s+([A-Z0-9\-]+)/i,
    /SUITE\s+([A-Z0-9\-]+)/i,
    /#\s*([A-Z0-9\-]+)/i,
    /UNIT\s+#\s*([A-Z0-9\-]+)/i,
    /APT\s+#\s*([A-Z0-9\-]+)/i,
    /SUITE\s+#\s*([A-Z0-9\-]+)/i,
    // Additional patterns for complex formats
    /UNIT\s+([A-Z]-\d+[A-Z]+-\d+)/i,  // Matches formats like S-1001MZ-12
    /UNIT\s+([A-Z]-\d+[A-Z]+)/i,      // Matches formats like S-1001MZ
    /UNIT\s+([A-Z]-\d+)/i,            // Matches formats like S-1001
    /UNIT\s+(\d+[A-Z]+)/i,            // Matches formats like 1001MZ
    /UNIT\s+([A-Z]+\d+)/i             // Matches formats like S1001
  ];

  for (const pattern of unitPatterns) {
    const match = legalDescription.match(pattern);
    if (match && match[1]) {
      const unitNumber = match[1];
      const unitIndex = legalDescription.indexOf(match[0]);
      
      // Look backwards from the unit number until we find a number
      let locationStart = unitIndex;
      while (locationStart > 0) {
        if (/\d/.test(legalDescription[locationStart])) {
          // Move forward until we find a non-number character
          while (locationStart < legalDescription.length && /\d/.test(legalDescription[locationStart])) {
            locationStart++;
          }
          break;
        }
        locationStart--;
      }

      // Extract the location name
      const locationName = legalDescription
        .substring(locationStart, unitIndex)
        .trim()
        .replace(/\s+/g, ' ');

      return { unitNumber, locationName };
    }
  }

  // If no unit pattern is found, try to extract location name from common patterns
  const locationPatterns = [
    // Look for BLK/LOT pattern
    /(.*?)(?:BLK\s+\d+\s+LOT\s+\d+)/i,
    // Look for PLAT pattern
    /(.*?)(?:PLAT\s+BOOK\s+[A-Z]\s+PAGE\s+\d+)/i,
    // Look for SEC/TWP/RGE pattern
    /(.*?)(?:SEC\s+\d+\s+TWP\s+\d+\s+RGE\s+\d+)/i
  ];

  for (const pattern of locationPatterns) {
    const match = legalDescription.match(pattern);
    if (match && match[1]) {
      // Clean up the location name
      let locationName = match[1].trim();
      
      // If the location name contains SEC/TWP/RGE, preserve the numbers
      if (locationName.match(/SEC|TWP|RGE/i)) {
        locationName = locationName
          .replace(/\s+/g, ' ')
          .trim();
      } else {
        // For other cases, remove non-letter characters
        locationName = locationName
          .replace(/\s+/g, ' ')
          .replace(/[^A-Za-z\s]/g, '')
          .trim();
      }

      if (locationName) {
        return { unitNumber: null, locationName };
      }
    }
  }

  return { unitNumber: null, locationName: null };
}

function parseAddressString(address: string): ParsedAddress | null {
  try {
    if (!address || typeof address !== "string" || isInvalidPropertyAddress(address)) {
      return null;
    }

    // Match state and ZIP (5 or 9 digits, with or without dash) at the end of the string, after a comma
    const stateZipRegex = /,\s*([A-Z]{2})\s*(\d{5}(?:-?\d{4})?)$/;
    const stateZipMatch = address.match(stateZipRegex);
    if (!stateZipMatch) {
      return {
        streetAddress: null,
        unit: null,
        city: null,
        state: null,
        zip: null
      };
    }

    const state = stateZipMatch[1];
    const zip = stateZipMatch[2] || null;
    const addressWithoutStateZip = address.replace(stateZipRegex, "").trim();

    // Split remaining parts by comma
    const parts = addressWithoutStateZip.split(",").map(part => part.trim()).filter(part => part);
    if (parts.length < 1) {
      return {
        streetAddress: null,
        unit: null,
        city: null,
        state: null,
        zip: null
      };
    }

    const streetAddress = parts[0];
    const city = parts.length > 1 ? parts[1] : null;
    const unit = extractUnitFromPropertyAddress(address) || null;

    return {
      streetAddress,
      unit,
      city,
      state,
      zip
    };
  } catch (err) {
    return null;
  }
}

function extractUnitNumber(address: string): string | null {
  const unitMatch = address.match(/(?:UNIT|#|APT|SUITE|STE|LOT)\s*([A-Z0-9-]+)/i);
  return unitMatch ? unitMatch[1] : null;
}