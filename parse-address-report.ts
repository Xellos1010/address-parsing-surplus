import { createReadStream } from "fs";
import csv from "csv-parser";
import { parseAddress, ParsedAddress } from "./addressUtils";

const inputFile = "addresses.csv";

interface ParseResult {
  address: string;
  parsed: ParsedAddress | null;
  error?: string;
}

const results: ParseResult[] = [];

createReadStream(inputFile)
  .pipe(csv())
  .on("data", (row: { "Property Address": string; "Legal Description": string }) => {
    const address = row["Property Address"];
    const legalDescription = row["Legal Description"];
    const parsed: ParsedAddress | null = parseAddress(address);
    if (parsed) {
      results.push({ address, parsed });
    } else {
      results.push({ address, parsed: null, error: `Failed to parse: ${address}` });
    }
  })
  .on("end", () => {
    console.log("\n====== 📝 Address Parsing Report ======");
    
    // Summary
    const successCount = results.filter(r => r.parsed !== null).length;
    const failureCount = results.filter(r => r.parsed === null).length;
    console.log(`✅ Successfully parsed: ${successCount}`);
    console.log(`❌ Failed to parse: ${failureCount}\n`);

    // Detailed Results
    console.log("--- 📋 Parsed Addresses ---");
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. Original Address: ${result.address}`);
      if (result.parsed) {
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
      results
        .filter(r => r.parsed === null)
        .forEach((result, index) => {
          console.log(`${index + 1}. ${result.address} (${result.error})`);
        });
    } else {
      console.log("\n🎉 All addresses parsed successfully!");
    }

    console.log("========================================\n");
  })
  .on("error", (err: Error) => {
    console.error(`Error reading CSV file: ${err.message}`);
  });