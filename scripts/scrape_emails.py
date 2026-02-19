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
        'subject_patterns': ['New Listing', 'Price Changed', 'New property']
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
    match = re.search(r'(\d{3,4})\s*sqft', text, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None

def extract_image_url(body, source):
    """Extract the main property image URL from email"""
    image_url = None
    
    # Look for image URLs in the email body
    if source == 'Zillow':
        # Zillow image patterns
        match = re.search(r'https://photos\.zillowstatic\.com/[^\s<>"\']+\.jpg', body, re.IGNORECASE)
        if match:
            image_url = match.group(0)
    elif source == 'Redfin':
        # Redfin image patterns
        match = re.search(r'https://ssl\.cdn-redfin\.com/[^\s<>"\']+\.jpg', body, re.IGNORECASE)
        if not match:
            match = re.search(r'https://[\w\-]+\.redfin\.com/[^\s<>"\']+\.jpg', body, re.IGNORECASE)
        if match:
            image_url = match.group(0)
    elif source == 'Realtor.com':
        # Realtor.com image patterns
        match = re.search(r'https://ap\.rcdn\.com/[^\s<>"\']+\.jpg', body, re.IGNORECASE)
        if match:
            image_url = match.group(0)
    
    # Generic image URL pattern fallback
    if not image_url:
        # Look for any image URL that looks like a property photo
        generic_patterns = [
            r'(https?://[^\s<>"\']+\.(?:jpg|jpeg|png))',
            r'(https?://[^\s<>"\']+/photos/[^\s<>"\']+)',
            r'(https?://[^\s<>"\']+/_next/image[^\s<>"\']+)'
        ]
        for pattern in generic_patterns:
            match = re.search(pattern, body, re.IGNORECASE)
            if match:
                potential_url = match.group(1)
                # Filter out tiny icons and logos
                if not any(x in potential_url.lower() for x in ['logo', 'icon', 'button', 'arrow', 'social']):
                    image_url = potential_url
                    break
    
    return image_url

def parse_address(subject, body):
    """Extract address from email"""
    # Common patterns in listing emails
    # Try to find street address pattern
    address_patterns = [
        r'(\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Circle|Cir)\.?)',
        r'(\d+\s+[\w\s]+,?\s*(?:Conshohocken|Oreland|Norristown|Plymouth Meeting|Glenside|Ambler|Blue Bell))'
    ]
    
    for pattern in address_patterns:
        match = re.search(pattern, subject + ' ' + body, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    # If no match, return the subject as address (common in Zillow)
    return subject.split(' - ')[0].strip()

def parse_listing_email(msg, source):
    """Parse a listing email and extract details"""
    subject = msg.get('Subject', '')
    body = ''
    
    # Get email body
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == 'text/plain' or content_type == 'text/html':
                try:
                    body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    break
                except:
                    continue
    else:
        try:
            body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
        except:
            body = str(msg.get_payload())
    
    # Clean HTML tags if present
    body = re.sub(r'<[^>]+>', ' ', body)
    body = re.sub(r'\s+', ' ', body)
    
    # Extract details
    full_text = subject + ' ' + body
    
    listing = {
        'id': f"{source}_{msg.get('Message-ID', datetime.now().isoformat())}",
        'source': source,
        'subject': subject,
        'address': parse_address(subject, body),
        'price': parse_price(full_text),
        'beds': parse_beds_baths(full_text)[0],
        'baths': parse_beds_baths(full_text)[1],
        'sqft': parse_sqft(full_text),
        'dateAdded': datetime.now().isoformat(),
        'viewed': False,
        'url': extract_url(body, source),
        'imageUrl': extract_image_url(body, source)
    }
    
    return listing

def extract_url(body, source):
    """Extract listing URL from email body"""
    # Look for URLs in the email
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
    
    # Default URLs if we can't extract
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
        # Check from patterns
        for from_pattern in patterns['from_patterns']:
            if from_pattern.lower() in from_lower:
                return source
        
        # Check subject patterns
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
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(data_file), exist_ok=True)
    
    data = {
        'listings': listings,
        'lastScanned': datetime.now().isoformat()
    }
    
    with open(data_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Saved {len(listings)} listings to {data_file}")

def scrape_emails():
    """Main function to scrape listing emails"""
    print(f"Starting email scrape at {datetime.now()}")
    
    try:
        # Connect to Gmail
        mail = imaplib.IMAP4_SSL('imap.gmail.com')
        mail.login(EMAIL, PASSWORD)
        mail.select('INBOX')
        
        # Search for emails from last 7 days
        since_date = (datetime.now() - timedelta(days=7)).strftime('%d-%b-%Y')
        
        # Get all emails from last 7 days
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
                    
                    # Identify source
                    source = identify_source(from_email, subject)
                    
                    if source:
                        print(f"Found {source} listing: {subject[:60]}...")
                        
                        # Parse the listing
                        listing = parse_listing_email(msg, source)
                        
                        # Check if it's a duplicate
                        if listing['id'] not in existing_ids:
                            new_listings.append(listing)
                            existing_ids.add(listing['id'])
                            print(f"  → New listing: {listing['address'][:50]} - ${listing['price']}")
        
        # Combine and save
        all_listings = new_listings + existing_listings
        
        # Keep only last 100 listings
        all_listings = all_listings[:100]
        
        save_listings(all_listings)
        
        print(f"\nScrape complete. Found {len(new_listings)} new listings.")
        print(f"Total listings: {len(all_listings)}")
        
        mail.close()
        mail.logout()
        
        return len(new_listings)
        
    except Exception as e:
        print(f"Error: {e}")
        return 0

if __name__ == '__main__':
    new_count = scrape_emails()
    exit(0 if new_count >= 0 else 1)
