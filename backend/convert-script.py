import json
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable
import time

# --- Configuration ---
INPUT_FILENAME = "data.jsonl"
OUTPUT_FILENAME = "output_with_coordinates.jsonl" # Using .jsonl for JSON Lines format
USER_AGENT = "my_pharmacy_geocoder_app_v1" # Be polite, set a user agent for Nominatim
REQUEST_DELAY_SECONDS = 1.1 # IMPORTANT: To comply with Nominatim's usage policy (max 1 req/sec)

# --- Initialize Geolocator ---
geolocator = Nominatim(user_agent=USER_AGENT)

def geocode_address(full_address, city):
    """
    Attempts to geocode an address string.
    Returns a dictionary with 'latitude' and 'longitude' or None if not found/error.
    """
    if not full_address or not city:
        return None

    # Sometimes addresses might already contain the city, but it's safer to append it.
    # We'll try to be smart, but simplest is to append if city isn't obviously in full_address
    address_query = f"{full_address}, {city}"
    
    # A more robust check if city is already in full_address (case-insensitive)
    if city.lower() not in full_address.lower():
         address_query = f"{full_address}, {city}"
    else:
         address_query = full_address # Assume full_address is complete enough

    print(f"Attempting to geocode: '{address_query}'")
    try:
        location = geolocator.geocode(address_query, timeout=10) # 10-second timeout
        if location:
            print(f"Found: Lat={location.latitude}, Lon={location.longitude}")
            return {"latitude": location.latitude, "longitude": location.longitude}
        else:
            # Try a slightly simpler query if the first fails, e.g., if house number is problematic
            # Example: "улица Лобанка, МИНСК" if "улица Лобанка, дом 94, МИНСК" failed
            if "дом" in full_address:
                simpler_address_parts = full_address.split("дом")[0].strip().rstrip(',')
                simpler_query = f"{simpler_address_parts}, {city}"
                print(f"Retrying with simpler address: '{simpler_query}'")
                location_simple = geolocator.geocode(simpler_query, timeout=10)
                if location_simple:
                    print(f"Found (simple): Lat={location_simple.latitude}, Lon={location_simple.longitude}")
                    return {"latitude": location_simple.latitude, "longitude": location_simple.longitude}
            
            print("Address not found by geocoder.")
            return None
    except GeocoderTimedOut:
        print(f"Geocoding timed out for: '{address_query}'")
        return None
    except GeocoderUnavailable:
        print(f"Geocoding service unavailable for: '{address_query}'. Try again later.")
        # You might want to raise an exception here or retry after a longer delay
        return None
    except Exception as e:
        print(f"An unexpected error occurred during geocoding for '{address_query}': {e}")
        return None
    finally:
        # Respect Nominatim's usage policy
        time.sleep(REQUEST_DELAY_SECONDS)


def process_pharmacy_data(input_file, output_file):
    """
    Reads pharmacy data, geocodes addresses, and writes results.
    """
    processed_records = []
    line_count = 0

    try:
        with open(input_file, 'r', encoding='utf-8') as infile:
            for line_number, line in enumerate(infile, 1):
                line_count += 1
                try:
                    data = json.loads(line.strip())
                except json.JSONDecodeError:
                    print(f"Warning: Skipping line {line_number} due to invalid JSON.")
                    continue

                text_content = data.get("text")
                metadata = data.get("metadata")

                if not text_content or not metadata:
                    print(f"Warning: Skipping line {line_number} due to missing 'text' or 'metadata'.")
                    continue
                
                # Extract address components for geocoding
                # 'full_address_computed' seems like the best candidate
                full_address_computed = metadata.get("full_address_computed")
                city = metadata.get("city")
                
                # Fallback if full_address_computed is missing
                if not full_address_computed:
                    street = metadata.get("street")
                    house_number = metadata.get("house_number", "") # house_number might be "0" or absent
                    if street and city:
                        full_address_computed = f"улица {street}, дом {house_number}".strip() if house_number and house_number != "0" else f"улица {street}".strip()
                    else:
                        print(f"Warning: Skipping geocoding for line {line_number} due to insufficient address info.")
                        coordinates = None
                
                if full_address_computed and city:
                    coordinates = geocode_address(full_address_computed, city)
                else:
                    coordinates = None
                    if not (full_address_computed and city): # only print if we didn't print the warning above
                         print(f"Warning: Skipping geocoding for line {line_number} due to insufficient address info (full_address_computed or city missing).")


                processed_records.append({
                    "text": text_content,
                    "coordinates": coordinates
                })

    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found.")
        return
    except Exception as e:
        print(f"An unexpected error occurred during file processing: {e}")
        return

    # Write the processed data to the output file
    try:
        with open(output_file, 'w', encoding='utf-8') as outfile:
            for record in processed_records:
                outfile.write(json.dumps(record, ensure_ascii=False) + '\n')
        print(f"\nSuccessfully processed {len(processed_records)} out of {line_count} lines.")
        print(f"Output written to '{output_file}'")
    except IOError as e:
        print(f"Error writing to output file '{output_file}': {e}")


if __name__ == "__main__":
    process_pharmacy_data(INPUT_FILENAME, OUTPUT_FILENAME)
