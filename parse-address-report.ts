import { createReadStream } from "fs";
import csv from "csv-parser";
import { parseAddress, ParsedAddress } from "./addressUtils";
import { writeFileSync } from "fs";

const inputFile = "addresses.csv";

interface ParseResult {
  address: string;
  legalDescription?: string;
  parsed: ParsedAddress | null;
  error?: string;
  usedLegalDescription?: boolean;
}

const results: ParseResult[] = [];

createReadStream(inputFile)
  .pipe(csv())
  .on("data", (row: { "Property Address": string; "Legal Description": string }) => {
    const address = row["Property Address"];
    const legalDescription = row["Legal Description"];
    const parsed: ParsedAddress | null = parseAddress(address, legalDescription);
    
    if (parsed) {
      results.push({ 
        address, 
        legalDescription,
        parsed,
        usedLegalDescription: address !== parsed.streetAddress
      });
    } else {
      results.push({ 
        address, 
        legalDescription,
        parsed: null, 
        error: `Failed to parse: ${address}${legalDescription ? ` (Legal Description: ${legalDescription})` : ''}` 
      });
    }
  })
  .on("end", () => {
    console.log("\n====== 📝 Address Parsing Report ======");
    
    // Summary
    const successCount = results.filter(r => r.parsed !== null).length;
    const failureCount = results.filter(r => r.parsed === null).length;
    const legalDescriptionUsedCount = results.filter(r => r.usedLegalDescription).length;
    
    console.log(`✅ Successfully parsed: ${successCount}`);
    console.log(`❌ Failed to parse: ${failureCount}`);
    console.log(`📄 Used legal description: ${legalDescriptionUsedCount}\n`);

    // Detailed Results
    console.log("--- 📋 Parsed Addresses ---");
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. Original Address: ${result.address}`);
      if (result.parsed) {
        if (result.usedLegalDescription) {
          console.log(`   📄 Used legal description for address`);
        }
        console.log(`   Street Address: ${result.parsed.streetAddress}`);
        if (result.parsed.unit) {
          console.log(`   Unit: ${result.parsed.unit}`);
        }
        console.log(`   City: ${result.parsed.city}`);
        console.log(`   State: ${result.parsed.state}`);
        console.log(`   ZIP: ${result.parsed.zip}`);
      } else {
        console.log(`   Error: ${result.error}`);
      }
    });

    // Failed Addresses (if any)
    if (failureCount > 0) {
      console.log("\n--- 🚫 Failed Addresses ---");
      const failed = results.filter(r => r.parsed === null);
      failed.forEach((result, index) => {
        console.log(`${index + 1}. ${result.address}`);
        console.log(`   Error: ${result.error}`);
        if (result.legalDescription) {
          console.log(`   Legal Description: ${result.legalDescription}`);
        }
      });
      // Write to timestamped log file
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const logFile = `failed-addresses-${timestamp}.log`;
      const logContent = failed.map((result, index) => {
        return [
          `#${index + 1}`,
          `Address: ${result.address}`,
          `Error: ${result.error}`,
          result.legalDescription ? `Legal Description: ${result.legalDescription}` : null,
          ''
        ].filter(Boolean).join('\n');
      }).join('\n');
      writeFileSync(logFile, logContent, { encoding: 'utf8' });
      console.log(`\n🚫 Failed addresses have been logged to: ${logFile}`);
    } else {
      console.log("\n🎉 All addresses parsed successfully!");
    }

    console.log("========================================\n");
  })
  .on("error", (err: Error) => {
    console.error(`Error reading CSV file: ${err.message}`);
  });