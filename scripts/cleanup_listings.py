#!/usr/bin/env python3
"""
Clean up existing listings - remove invalid ones, fix addresses
"""

import json
import re

# Load existing listings
with open('public/data/listings.json', 'r') as f:
    data = json.load(f)

listings = data.get('listings', [])
print(f"Starting with {len(listings)} listings")

# Clean addresses and remove invalid listings
cleaned = []
for listing in listings:
    addr = listing.get('address', '')
    
    # Skip if no valid address
    if not addr or len(addr) < 5:
        print(f"Removing (no address): {addr[:30]}")
        continue
    
    # Skip if address contains bad phrases
    bad_phrases = ['wants you to see', 'new listing', 'check out', 'for sale:', 'no image']
    if any(phrase in addr.lower() for phrase in bad_phrases):
        # Try to extract clean address
        match = re.search(r'(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Circle|Cir|Highway|Hwy|Parkway|Pkwy|Ave|Rd|St)\.?)(?:,|\s|$)', addr, re.IGNORECASE)
        if match:
            listing['address'] = match.group(1).strip()
            print(f"Cleaned: {listing['address']}")
        else:
            print(f"Removing (bad address): {addr[:40]}")
            continue
    
    # Skip if no price
    if not listing.get('price') or listing['price'] < 10000:
        print(f"Removing (no price): {addr[:30]}")
        continue
    
    cleaned.append(listing)

print(f"\nCleaned: {len(cleaned)} valid listings")

# Save cleaned data
data['listings'] = cleaned
with open('public/data/listings.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Saved cleaned listings")
