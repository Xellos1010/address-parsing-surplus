/**
 * Interface for parsed address components
 */
export interface ParsedAddress {
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  unit?: string; // Optional unit number (e.g., "6", "6G", "203")
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
  
  const addressMatch = legalDescription.match(/(\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Court|Ct|Lane|Ln|Place|Pl|Circle|Cir|Terrace|Ter))/i);
  return addressMatch ? addressMatch[1] : null;
}

/**
 * Extract unit information from property address
 * @param address - Property address string
 * @returns Unit number if found, undefined otherwise
 */
export function extractUnitFromPropertyAddress(address: string): string | undefined {
  if (!address) return undefined;

  // Check for explicit unit indicators (e.g., "Unit 123", "Apt 456", etc.)
  const unitRegex = /(?:Unit|Apt|Suite|#)\s*([\w-]+)/i;
  const unitMatch = address.match(unitRegex);
  if (unitMatch) {
    return unitMatch[1];
  }

  // Check for trailing unit number (e.g., "8511 OAKSHADE CIR 101")
  const trailingUnitRegex = /\b(\d+[A-Za-z]?(-\d+)?)\s*$/i;
  const trailingUnitMatch = address.match(trailingUnitRegex);
  if (trailingUnitMatch) {
    return trailingUnitMatch[1];
  }

  return undefined;
}

/**
 * Parse address string into components, including unit number
 * @param addressString - Full address string
 * @param legalDescription - Optional legal description that may contain unit or address information
 * @returns Object with address components or null if parsing fails
 */
export function parseAddress(addressString: string, legalDescription?: string): ParsedAddress | null {
  try {
    // Initialize variables
    let streetAddress: string;
    let city: string;
    let stateZipPart: string;
    let unit: string | undefined;

    // Handle invalid address string
    if (!addressString || typeof addressString !== "string" || isInvalidPropertyAddress(addressString)) {
      if (legalDescription) {
        const extractedAddress = extractAddressFromLegalDescription(legalDescription);
        if (extractedAddress && !isInvalidPropertyAddress(extractedAddress)) {
          addressString = extractedAddress;
        } else {
          throw new Error("No valid address found in legal description");
        }
      } else {
        throw new Error("Empty or invalid address");
      }
    }

    if (!addressString.includes(",")) {
      throw new Error("No commas in address");
    }

    let parts = addressString.split(",");
    if (parts.length < 3) {
      throw new Error(`Incomplete address format: ${parts.length} parts found`);
    }

    // Parse address parts
    streetAddress = parts[0].trim();
    city = parts[1].trim();
    stateZipPart = parts.slice(2).join(",").trim();

    // First try to extract unit from property address
    unit = extractUnitFromPropertyAddress(streetAddress);

    // If no unit found in property address, try legal description
    if (!unit && legalDescription) {
      const unitResult = extractUnitFromLegalDescription(legalDescription);
      unit = unitResult.unitNumber || undefined;
    }

    // Handle cases where city is a unit
    // const unitLikeInCityRegex = /^(?:Unit|Apt|Suite|#)\s*([\w-]+)/i;
    // if (unitLikeInCityRegex.test(city) && parts.length >= 4) {
    //   const unitMatch = city.match(unitLikeInCityRegex);
    //   streetAddress = parts[0].trim();
    //   city = parts[2].trim();
    //   stateZipPart = parts.slice(3).join(",").trim();
    //   // Extract unit from the misplaced city part if not already found
    //   if (unitMatch && !unit) {
    //     unit = unitMatch[1];
    //   }
    // }

    return {
      streetAddress,
      city,
      state: stateZipPart.match(/\b([A-Z]{2})\b/)?.[1] || "",
      zip: stateZipPart.match(/\b(\d{5})\b/)?.[1] || "",
      unit,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.log(`Failed to parse address "${addressString}": ${err.message}`);
    } else {
      console.log(`Failed to parse address "${addressString}": ${String(err)}`);
    }
    return null;
  }
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
      /^\s*$/  // Empty or only whitespace
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