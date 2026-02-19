#!/usr/bin/env python3
"""
Email scraper for property listings
Scans rociemry@gmail.com for Zillow, Redfin, Realtor.com alerts
Run via cron every 6 hours
"""

import imaplib
import email
import re
import json
import os
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime

# Gmail credentials
EMAIL = "rociemry@gmail.com"
PASSWORD = "fqwbewwhxfxyctkh".replace(" ", "")  # App password without spaces

# Patterns to identify listing emails
SOURCE_PATTERNS = {
    'Zillow': {
        'from_patterns': ['zillow.com', 'zillow'],
        'subject_patterns': ['New listing', 'Price change', 'New home']
    },
    'Redfin': {
        'from_patterns': ['redfin.com', 'redfin'],
        'subject_patterns': ['New Listing', 'Price Changed', 'New property', 'wants you to see']
    },
    'Realtor.com': {
        'from_patterns': ['realtor.com'],
        'subject_patterns': ['New Listing', 'Price Reduced']
    },
    'Trulia': {
        'from_patterns': ['trulia.com'],
        'subject_patterns': ['New Listing']
    },
    'Homes.com': {
        'from_patterns': ['homes.com'],
        'subject_patterns': ['New Listing']
    }
}

def parse_price(text):
    """Extract price from text"""
    # Look for $XXX,XXX or $XXXXXX patterns
    match = re.search(r'\$([\d,]+)', text.replace(',', ''))
    if match:
        return int(match.group(1).replace(',', ''))
    return None

def parse_beds_baths(text):
    """Extract beds and baths from text"""
    beds = None
    baths = None
    
    # Look for "X bd" or "X beds"
    bed_match = re.search(r'(\d+)\s*(?:bd|bed|bedroom)', text, re.IGNORECASE)
    if bed_match:
        beds = int(bed_match.group(1))
    
    # Look for "X ba" or "X baths"  
    bath_match = re.search(r'(\d+(?:\.5)?)\s*(?:ba|bath|bathroom)', text, re.IGNORECASE)
    if bath_match:
        baths = float(bath_match.group(1))
    
    return beds, baths

def parse_sqft(text):
    """Extract square footage from text"""
    # Match patterns like "2,400 sqft", "2400 sqft", "2,400 Square Feet"
    patterns = [
        r'(\d{1,3},\d{3})\s*(?:sqft|sq ft|square feet)',
        r'(\d{3,4})\s*(?:sqft|sq ft|square feet)',
        r'(\d{1,3},\d{3})\s*Sq\.?\s*Ft',
        r'(\d{3,4})\s*Sq\.?\s*Ft'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1).replace(',', ''))
    return None

def extract_image_url(html_body, source):
    """Extract property image URL from HTML email"""
    if not html_body:
        return None
    
    # Redfin image patterns - look for the main property photo
    if source == 'Redfin':
        # Try to find the main listing photo (usually the first/largest)
        patterns = [
            # Standard Redfin CDN photos
            r'https://ssl\.cdn-redfin\.com/photo/\d+/[^\s<>"\']+\.jpg',
            r'https://ssl\.cdn-redfin\.com/photo/\d+/bigphoto/[^\s<>"\']+\.jpg',
            # Alternative Redfin photo formats
            r'https://[\w\-]*\.cdn-redfin\.com/[^\s<>"\']+\.jpg',
        ]
        for pattern in patterns:
            matches = re.findall(pattern, html_body, re.IGNORECASE)
            if matches:
                # Return the first match (usually the main photo)
                return matches[0]
    
    # Zillow image patterns
    if source == 'Zillow':
        patterns = [
            r'https://photos\.zillowstatic\.com/[^\s<>"\']+\.jpg',
            r'https://[\w\-]+\.zillow\.com/[^\s<>"\']+\.jpg'
        ]
        for pattern in patterns:
            match = re.search(pattern, html_body, re.IGNORECASE)
            if match:
                return match.group(0)
    
    # Generic: Find all image URLs and pick the best one
    img_urls = re.findall(r'https?://[^\s<>"\']+\.(?:jpg|jpeg|png)', html_body, re.IGNORECASE)
    
    for url in img_urls:
        # Skip tiny images, icons, logos, tracking pixels
        if any(skip in url.lower() for skip in ['logo', 'icon', 'button', 'arrow', 'social', 'spacer', 'pixel', 'tracking', '1x1', 'beacon']):
            continue
        # Prefer property/photo/listing images
        if any(good in url.lower() for good in ['photo', 'image', 'listing', 'property', 'home', 'house']):
            return url
    
    # If no preferred image found, return the first non-skipped URL
    for url in img_urls:
        if not any(skip in url.lower() for skip in ['logo', 'icon', 'button', 'arrow', 'social', 'spacer', 'pixel', 'tracking', '1x1', 'beacon']):
            return url
    
    return None

def parse_address_from_subject(subject):
    """Extract clean address from email subject"""
    # Remove common prefixes - be more aggressive
    clean = subject
    
    # Pattern-based removal
    patterns_to_remove = [
        r'^Roci wants you to see the home at\s*',
        r'^New Listing:\s*',
        r'^Price Changed:\s*',
        r'^New home:\s*',
        r'^Check out\s*',
        r'^See\s*',
        r'^For sale:\s*',
    ]
    
    for pattern in patterns_to_remove:
        clean = re.sub(pattern, '', clean, flags=re.IGNORECASE)
    
    # Remove suffixes like "- Redfin" or "| Zillow" or just "Redfin"
    clean = re.sub(r'\s*[-|]?\s*(?:Redfin|Zillow|Realtor|Trulia|Homes\.com).*$', '', clean, flags=re.IGNORECASE)
    
    # Clean up any remaining clutter
    clean = clean.strip()
    
    return clean

def parse_city_state_from_body(body, address):
    """Extract city, state, zip from email body"""
    city = None
    state = 'PA'  # Default
    zip_code = None
    
    # Look for city, PA pattern
    # Common PA cities in the area
    pa_cities = [
        'Conshohocken', 'Oreland', 'Plymouth Meeting', 'Norristown', 
        'Glenside', 'Ambler', 'Blue Bell', 'Horsham', 'Hatboro',
        'Warrington', 'North Wales', 'Fort Washington', 'Flourtown',
        'Lafayette Hill', 'Narberth', 'Ardmore', 'Bryn Mawr'
    ]
    
    for city_name in pa_cities:
        pattern = rf'{city_name},?\s*PA'
        if re.search(pattern, body, re.IGNORECASE):
            city = city_name
            break
    
    # Look for ZIP code
    zip_match = re.search(r'\b(190\d{2}|189\d{2}|194\d{2})\b', body)
    if zip_match:
        zip_code = zip_match.group(1)
    
    # If no city found in body, try to infer from address
    if not city and address:
        for city_name in pa_cities:
            if city_name.lower() in address.lower():
                city = city_name
                break
    
    return city, state, zip_code

def extract_url(body, source):
    """Extract listing URL from email body"""
    url_patterns = {
        'Zillow': r'https?://www\.zillow\.com/homedetails/[^\s<>"]+',
        'Redfin': r'https?://www\.redfin\.com/[^\s<>"]+',
        'Realtor.com': r'https?://www\.realtor\.com/realestateandhomes-detail/[^\s<>"]+',
        'Trulia': r'https?://www\.trulia\.com/[^\s<>"]+',
        'Homes.com': r'https?://www\.homes\.com/[^\s<>"]+'
    }
    
    pattern = url_patterns.get(source, r'https?://[^\s<>"]+')
    match = re.search(pattern, body)
    
    if match:
        return match.group(0)
    
    # Default URLs
    defaults = {
        'Zillow': 'https://www.zillow.com',
        'Redfin': 'https://www.redfin.com',
        'Realtor.com': 'https://www.realtor.com',
        'Trulia': 'https://www.trulia.com',
        'Homes.com': 'https://www.homes.com'
    }
    
    return defaults.get(source, '#')

def identify_source(from_email, subject):
    """Identify which real estate site the email is from"""
    from_lower = from_email.lower()
    subject_lower = subject.lower()
    
    for source, patterns in SOURCE_PATTERNS.items():
        for from_pattern in patterns['from_patterns']:
            if from_pattern.lower() in from_lower:
                return source
        
        for subj_pattern in patterns['subject_patterns']:
            if subj_pattern.lower() in subject_lower:
                return source
    
    return None

def load_existing_listings():
    """Load existing listings from data file"""
    data_file = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'listings.json')
    
    if os.path.exists(data_file):
        with open(data_file, 'r') as f:
            data = json.load(f)
            return data.get('listings', [])
    
    return []

def save_listings(listings):
    """Save listings to data file"""
    data_file = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'listings.json')
    os.makedirs(os.path.dirname(data_file), exist_ok=True)
    
    data = {
        'listings': listings,
        'lastScanned': datetime.now().isoformat()
    }
    
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Saved {len(listings)} listings to {data_file}")

def parse_listing_email(msg, source):
    """Parse a listing email and extract details"""
    subject = msg.get('Subject', '')
    html_body = ''
    text_body = ''
    
    # Get email date
    date_str = msg.get('Date', '')
    try:
        email_date = parsedate_to_datetime(date_str).isoformat()
    except:
        email_date = datetime.now().isoformat()
    
    # Get email body - separate HTML and text
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == 'text/html':
                try:
                    html_body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                except:
                    pass
            elif content_type == 'text/plain':
                try:
                    text_body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                except:
                    pass
    else:
        try:
            raw_body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            if msg.get_content_type() == 'text/html':
                html_body = raw_body
            else:
                text_body = raw_body
        except:
            text_body = str(msg.get_payload())
    
    # Use text body for text extraction (cleaner without HTML)
    body_for_text = text_body if text_body else re.sub(r'<[^>]+>', ' ', html_body)
    body_for_text = re.sub(r'\s+', ' ', body_for_text)
    
    # Parse address from subject
    address = parse_address_from_subject(subject)
    
    # Get city/state from body
    city, state, zip_code = parse_city_state_from_body(body_for_text, address)
    
    # Extract image from HTML body
    image_url = extract_image_url(html_body, source)
    
    # Extract other details
    full_text = subject + ' ' + body_for_text
    
    listing = {
        'id': f"{source}_{msg.get('Message-ID', datetime.now().isoformat())}",
        'source': source,
        'address': address,
        'city': city,
        'state': state,
        'zip': zip_code,
        'price': parse_price(full_text),
        'beds': parse_beds_baths(full_text)[0],
        'baths': parse_beds_baths(full_text)[1],
        'sqft': parse_sqft(body_for_text),
        'dateAdded': datetime.now().isoformat(),
        'emailDate': email_date,
        'viewed': False,
        'url': extract_url(body_for_text, source),
        'imageUrl': image_url
    }
    
    return listing

def scrape_emails():
    """Main function to scrape listing emails"""
    print(f"Starting email scrape at {datetime.now()}")
    
    try:
        mail = imaplib.IMAP4_SSL('imap.gmail.com')
        mail.login(EMAIL, PASSWORD)
        mail.select('INBOX')
        
        # Search for emails from last 7 days
        since_date = (datetime.now() - timedelta(days=7)).strftime('%d-%b-%Y')
        _, search_data = mail.search(None, f'(SINCE {since_date})')
        
        existing_listings = load_existing_listings()
        existing_ids = {l['id'] for l in existing_listings}
        new_listings = []
        
        email_ids = search_data[0].split()
        print(f"Found {len(email_ids)} emails to check")
        
        for email_id in email_ids:
            _, msg_data = mail.fetch(email_id, '(RFC822)')
            
            for response_part in msg_data:
                if isinstance(response_part, tuple):
                    msg = email.message_from_bytes(response_part[1])
                    
                    from_email = msg.get('From', '')
                    subject = msg.get('Subject', '')
                    
                    source = identify_source(from_email, subject)
                    
                    if source:
                        print(f"Found {source} listing: {subject[:60]}...")
                        
                        listing = parse_listing_email(msg, source)
                        
                        # Check if this is a new or existing listing
                        if listing['id'] not in existing_ids:
                            # New listing - add it
                            if listing['address'] and len(listing['address']) > 5:
                                new_listings.append(listing)
                                existing_ids.add(listing['id'])
                                print(f"  → New listing: {listing['address'][:50]} in {listing['city']} - ${listing['price']}")
                        else:
                            # Existing listing - update it with better data
                            existing_idx = next((i for i, l in enumerate(existing_listings) if l['id'] == listing['id']), None)
                            if existing_idx is not None:
                                existing = existing_listings[existing_idx]
                                # Update with better/cleaner data
                                if listing['imageUrl'] and not existing.get('imageUrl'):
                                    existing['imageUrl'] = listing['imageUrl']
                                    print(f"  → Updated image for: {listing['address'][:40]}")
                                # Update address if the new one is cleaner (shorter)
                                if len(listing['address']) < len(existing.get('address', '')):
                                    existing['address'] = listing['address']
                                    print(f"  → Updated address for: {listing['address'][:40]}")
                                # Update other fields if missing
                                if listing['city'] and not existing.get('city'):
                                    existing['city'] = listing['city']
                                if listing['sqft'] and not existing.get('sqft'):
                                    existing['sqft'] = listing['sqft']
                                if listing['emailDate'] and not existing.get('emailDate'):
                                    existing['emailDate'] = listing['emailDate']
        
        # Combine and save
        all_listings = new_listings + existing_listings
        all_listings = all_listings[:100]  # Keep last 100
        
        save_listings(all_listings)
        
        print(f"\nScrape complete. Found {len(new_listings)} new listings.")
        print(f"Total listings: {len(all_listings)}")
        
        mail.close()
        mail.logout()
        
        return len(new_listings)
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 0

if __name__ == '__main__':
    new_count = scrape_emails()
    exit(0 if new_count >= 0 else 1)
