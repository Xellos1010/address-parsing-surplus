import pandas as pd
import sys
from pathlib import Path

def extract_address_info(csv_path):
    """
    Extract Property Address and Legal Description from a CSV file.
    
    Args:
        csv_path (str): Path to the input CSV file
        
    Returns:
        pd.DataFrame: DataFrame containing only Property Address and Legal Description columns
    """
    try:
        # Read the CSV file
        df = pd.read_csv(csv_path)
        
        # Select only the required columns
        result_df = df[['Property Address', 'Legal Description']]
        
        # Create output filename
        input_path = Path(csv_path)
        output_path = input_path.parent / f"{input_path.stem}_address_info{input_path.suffix}"
        
        # Save to new CSV
        result_df.to_csv(output_path, index=False)
        print(f"Successfully extracted address information to: {output_path}")
        
        return result_df
        
    except FileNotFoundError:
        print(f"Error: Could not find the file {csv_path}")
        sys.exit(1)
    except KeyError as e:
        print(f"Error: Required column not found in CSV: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_address_specific_info.py <path_to_csv>")
        sys.exit(1)
        
    csv_path = sys.argv[1]
    extract_address_info(csv_path)


