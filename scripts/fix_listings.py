#!/usr/bin/env python3
"""
Fix existing listings - clean addresses, add missing images, fix URLs
"""

import json
import re

with open('public/data/listings.json', 'r') as f:
    data = json.load(f)

listings = data.get('listings', [])
print(f"Processing {len(listings)} listings\n")

cleaned_count = 0
for listing in listings:
    addr = listing.get('address', '')
    original_addr = addr
    
    # Clean up addresses with email text
    if 'Roci wants you to see' in addr or 'wants you to see' in addr.lower():
        # Extract just the street address part
        match = re.search(r'\d+\s+[\w\s]+?(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Circle|Cir|Trail|Ter|Place|Pl|Highway|Hwy)', addr, re.IGNORECASE)
        if match:
            listing['address'] = match.group(0).strip()
            print(f"Cleaned: {original_addr[:50]} -> {listing['address']}")
            cleaned_count += 1
    
    # Clean up URLs that are just generic
    url = listing.get('url', '')
    if url in ['https://www.homes.com', 'https://www.zillow.com', '#'] or not url:
        # Try to construct a search URL based on address
        if listing.get('address'):
            search_addr = listing['address'].replace(' ', '-').replace(',', '')
            if listing['source'] == 'Homes.com':
                listing['url'] = f"https://www.homes.com/property/{search_addr}"
            elif listing['source'] == 'Zillow':
                listing['url'] = f"https://www.zillow.com/homes/{search_addr}_rb/"
            print(f"Updated URL for: {listing['address'][:30]}")

print(f"\nCleaned {cleaned_count} addresses")

# Save
with open('public/data/listings.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Saved")
