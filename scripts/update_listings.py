#!/usr/bin/env python3
"""
Force update all existing listings with images and clean data
"""

import json
import os

# Load existing listings
data_file = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'listings.json')

with open(data_file, 'r') as f:
    data = json.load(f)

listings = data.get('listings', [])

# Image URLs manually extracted from the emails
image_updates = {
    'Redfin_<CAJBdUFeMjxPZe8YTDWgfCzAb8fRPdsD7Op7jwSsUjEsOgpAoRw@mail.gmail.com>': 'https://ssl.cdn-redfin.com/photo/235/bigphoto/013/PAMC2082013_0.jpg',
    'Redfin_<CAJBdUFerEHwvqDd-Jyah7sMaGKQHDhR1atqPOgQPS0Fo3vowg@mail.gmail.com>': 'https://ssl.cdn-redfin.com/photo/235/bigphoto/013/PAMC2082013_0.jpg',
    'Redfin_<CAJBdUFfLsSTFTSZvdogvsqooOw86hX6a3KOu-+s8+gsW+A-rQ@mail.gmail.com>': 'https://ssl.cdn-redfin.com/photo/235/bigphoto/206/PAMC2084206_0.jpg',
    'Redfin_<CAJBdUFdPnpyOBoKfH3OWYWHUXjwkhT+e=SJfSgW4cOXmnuZ4w@mail.gmail.com>': 'https://ssl.cdn-redfin.com/photo/235/bigphoto/346/PAMC2073346_0.jpg',
    'Redfin_<CAJBdUFdYGOXXvBJE1L2dr9b0UdKZ50Qe=BTYYzQqkyqxaVmOw@mail.gmail.com>': 'https://ssl.cdn-redfin.com/photo/235/bigphoto/506/PAMC2082506_0.jpg',
    'Redfin_<CAJBdUFe-m72UAXUbgCv4bfzq2cyXFRpEZNM00QdDtzdW-1w6w@mail.gmail.com>': 'https://ssl.cdn-redfin.com/photo/235/bigphoto/941/PAMC2082941_0.jpg',
    'Redfin_<CAJBdUFfKy8-2bRGW=pJO-NUUGz0OUmOBb_12u==++DKHTOShA@mail.gmail.com>': 'https://ssl.cdn-redfin.com/photo/235/bigphoto/876/PABU2038876_0.jpg',
    'Redfin_<CAJBdUFfE94g2Mf+uk8ZBCYS9fBDRjvS94MYXwbuPa-UCLs0Nw@mail.gmail.com>': 'https://ssl.cdn-redfin.com/photo/235/bigphoto/409/PAMC2082409_0.jpg',
}

# Sqft updates
sqft_updates = {
    '616 Tennis Ave': 1586,
    '312 Royal Ave': 1928,
    '317 Summer Ave': 1701,
    '414 Hallowell Ave': 1968,
    '2625 Horsham Rd': 1899,
    '2344 Oakfield Rd': 2048,
    '609 Kings Hwy': 1404,
    '409 Cherry St': 1520,
}

# City/State updates  
city_updates = {
    '616 Tennis Ave': {'city': 'Glenside', 'state': 'PA', 'zip': '19038'},
    '312 Royal Ave': {'city': 'North Wales', 'state': 'PA', 'zip': '19454'},
    '317 Summer Ave': {'city': 'Horsham', 'state': 'PA', 'zip': '19044'},
    '414 Hallowell Ave': {'city': 'Horsham', 'state': 'PA', 'zip': '19044'},
    '2625 Horsham Rd': {'city': 'Hatboro', 'state': 'PA', 'zip': '19040'},
    '2344 Oakfield Rd': {'city': 'Warrington', 'state': 'PA', 'zip': '18976'},
    '609 Kings Hwy': {'city': 'Barrington', 'state': 'NJ', 'zip': '08007'},
    '409 Cherry St': {'city': 'Jenkintown', 'state': 'PA', 'zip': '19046'},
    '1107 Lansdale Ave': {'city': 'Abington', 'state': 'PA', 'zip': '19001'},
}

# Email dates (approximate from when they arrived)
email_dates = {
    '616 Tennis Ave': '2025-02-19T17:15:00',
    '312 Royal Ave': '2025-02-19T17:15:00',
    '317 Summer Ave': '2025-02-19T17:15:00',
    '414 Hallowell Ave': '2025-02-19T17:15:00',
    '2625 Horsham Rd': '2025-02-19T17:15:00',
    '2344 Oakfield Rd': '2025-02-19T17:22:00',
    '609 Kings Hwy': '2025-02-19T17:22:00',
    '409 Cherry St': '2025-02-19T17:22:00',
    '1107 Lansdale Ave': '2025-02-19T17:22:00',
}

# Update each listing
for listing in listings:
    address = listing.get('address', '')
    
    # Update image
    if listing.get('id') in image_updates and not listing.get('imageUrl'):
        listing['imageUrl'] = image_updates[listing['id']]
    
    # Try to match by address
    for addr_key, sqft in sqft_updates.items():
        if addr_key in address:
            listing['sqft'] = sqft
            # Update city/state/zip
            if addr_key in city_updates:
                listing.update(city_updates[addr_key])
            # Update email date
            if addr_key in email_dates:
                listing['emailDate'] = email_dates[addr_key]
            break

# Save updated data
data['listings'] = listings
with open(data_file, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Updated {len(listings)} listings with images, sqft, city, and email dates")
