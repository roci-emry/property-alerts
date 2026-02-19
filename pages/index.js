import { useState, useEffect } from 'react';

export default function PropertyAlerts() {
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minBeds: '',
    source: 'all'
  });
  const [lastScanned, setLastScanned] = useState(null);
  const [stats, setStats] = useState({ total: 0, newToday: 0 });

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    try {
      const response = await fetch('/data/listings.json');
      if (response.ok) {
        const data = await response.json();
        let listingsData = data.listings || [];
        
        // Merge viewed status from localStorage
        const saved = localStorage.getItem('propertyListings');
        if (saved) {
          const savedData = JSON.parse(saved);
          listingsData = listingsData.map(listing => {
            const savedListing = savedData.listings?.find(l => l.id === listing.id);
            return savedListing ? { ...listing, viewed: savedListing.viewed } : listing;
          });
        }
        
        setListings(listingsData);
        setLastScanned(data.lastScanned);
        calculateStats(listingsData);
      }
    } catch (e) {
      console.error('Failed to load listings:', e);
    }
  }

  function calculateStats(listings) {
    const today = new Date().toISOString().split('T')[0];
    const newToday = listings.filter(l => l.dateAdded?.startsWith(today)).length;
    setStats({ total: listings.length, newToday });
  }

  const filteredListings = listings.filter(listing => {
    if (filters.minPrice && listing.price < parseInt(filters.minPrice)) return false;
    if (filters.maxPrice && listing.price > parseInt(filters.maxPrice)) return false;
    if (filters.minBeds && listing.beds < parseInt(filters.minBeds)) return false;
    if (filters.source !== 'all' && listing.source !== filters.source) return false;
    return true;
  });

  const sources = [...new Set(listings.map(l => l.source))];

  const markAsViewed = (id) => {
    const updated = listings.map(l => 
      l.id === id ? { ...l, viewed: true } : l
    );
    setListings(updated);
    localStorage.setItem('propertyListings', JSON.stringify({ 
      listings: updated, 
      lastScanned 
    }));
  };

  const formatAlertDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#f8fafc',
      minHeight: '100vh',
      color: '#1e293b'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <header style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              🏠
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#0f172a' }}>
                Property Alerts
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
                Conshohocken, Oreland & Surrounding Areas
              </p>
            </div>
          </div>
          <p style={{ margin: '12px 0 0 0', color: '#94a3b8', fontSize: '13px' }}>
            Last updated: {lastScanned ? new Date(lastScanned).toLocaleString() : 'Never'} • Auto-scans every 6 hours
          </p>
        </header>

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '32px'
        }}>
          {[
            { label: 'Total Listings', value: stats.total, color: '#3b82f6' },
            { label: 'New Today', value: stats.newToday, color: '#10b981' },
            { label: 'Unviewed', value: listings.filter(l => !l.viewed).length, color: '#f59e0b' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: '#ffffff',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '13px' }}>{stat.label}</p>
              <p style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{
          background: '#ffffff',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Filter Listings</h3>
          <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            <input
              type="number"
              placeholder="Min Price"
              value={filters.minPrice}
              onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
              style={{
                padding: '10px 12px',
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                color: '#1f2937',
                fontSize: '14px'
              }}
            />
            <input
              type="number"
              placeholder="Max Price"
              value={filters.maxPrice}
              onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
              style={{
                padding: '10px 12px',
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                color: '#1f2937',
                fontSize: '14px'
              }}
            />
            <input
              type="number"
              placeholder="Min Beds"
              value={filters.minBeds}
              onChange={(e) => setFilters({...filters, minBeds: e.target.value})}
              style={{
                padding: '10px 12px',
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                color: '#1f2937',
                fontSize: '14px'
              }}
            />
            <select
              value={filters.source}
              onChange={(e) => setFilters({...filters, source: e.target.value})}
              style={{
                padding: '10px 12px',
                background: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                color: '#1f2937',
                fontSize: '14px'
              }}
            >
              <option value="all">All Sources</option>
              {sources.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Listings */}
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
          New Listings ({filteredListings.length})
        </h2>

        {filteredListings.length === 0 ? (
          <div style={{
            background: '#ffffff',
            padding: '48px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <p style={{ color: '#6b7280' }}>No listings found. Waiting for email alerts...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
            {filteredListings.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).map((listing) => (
              <div key={listing.id} style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: listing.viewed ? '1px solid #e5e7eb' : '2px solid #3b82f6',
                overflow: 'hidden',
                boxShadow: listing.viewed ? '0 1px 2px rgba(0,0,0,0.05)' : '0 4px 6px -1px rgba(59, 130, 246, 0.1)',
                transition: 'all 0.2s ease'
              }}>
                {/* Property Image */}
                <div style={{
                  width: '100%',
                  height: '220px',
                  background: listing.imageUrl 
                    ? `url(${listing.imageUrl}) center/cover no-repeat`
                    : '#f1f5f9',
                  position: 'relative',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  {!listing.imageUrl && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: '#9ca3af',
                      fontSize: '14px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏠</div>
                      No Image Available
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: listing.source === 'Zillow' ? '#0074e4' :
                                  listing.source === 'Redfin' ? '#c82021' :
                                  '#3b82f6',
                      color: '#ffffff'
                    }}>
                      {listing.source}
                    </span>
                    {!listing.viewed && (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: '#10b981',
                        color: '#ffffff'
                      }}>
                        NEW
                      </span>
                    )}
                  </div>
                  
                  {/* Price badge */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    padding: '8px 16px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    borderRadius: '8px'
                  }}>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>
                      {listing.price ? `$${listing.price.toLocaleString()}` : 'Price N/A'}
                    </p>
                  </div>
                </div>
                
                {/* Card Content */}
                <div style={{ padding: '20px' }}>
                  {/* Address */}
                  <h3 style={{ 
                    margin: '0 0 6px 0', 
                    fontSize: '17px', 
                    fontWeight: '600', 
                    color: '#111827',
                    lineHeight: '1.4'
                  }}>
                    {listing.address}
                  </h3>
                  
                  {/* City/State */}
                  <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '14px' }}>
                    {listing.city || 'Unknown City'}{listing.state ? `, ${listing.state}` : ''} {listing.zip || ''}
                  </p>
                  
                  {/* Property Details */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '20px', 
                    marginBottom: '16px', 
                    padding: '12px 16px', 
                    background: '#f9fafb', 
                    borderRadius: '8px' 
                  }}>
                    {listing.beds !== null && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 2px 0', color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase' }}>Beds</p>
                        <p style={{ margin: 0, color: '#374151', fontSize: '16px', fontWeight: '600' }}>{listing.beds}</p>
                      </div>
                    )}
                    {listing.baths !== null && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 2px 0', color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase' }}>Baths</p>
                        <p style={{ margin: 0, color: '#374151', fontSize: '16px', fontWeight: '600' }}>{listing.baths}</p>
                      </div>
                    )}
                    {listing.sqft !== null && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 2px 0', color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase' }}>Sq Ft</p>
                        <p style={{ margin: 0, color: '#374151', fontSize: '16px', fontWeight: '600' }}>{listing.sqft.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Alert Date */}
                  <p style={{ margin: '0 0 16px 0', color: '#9ca3af', fontSize: '12px' }}>
                    Alerted: {formatAlertDate(listing.emailDate)}
                  </p>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markAsViewed(listing.id)}
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        textAlign: 'center',
                        textDecoration: 'none',
                        fontWeight: '600',
                        fontSize: '14px'
                      }}
                    >
                      View on {listing.source}
                    </a>
                    {!listing.viewed && (
                      <button
                        onClick={() => markAsViewed(listing.id)}
                        style={{
                          padding: '10px 16px',
                          background: '#ffffff',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          color: '#6b7280',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Mark Viewed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
