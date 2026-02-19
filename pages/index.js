import { useState, useEffect } from 'react';

export default function PropertyAlerts() {
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minBeds: '',
    source: 'all',
    favoritesOnly: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [stats, setStats] = useState({ total: 0, newToday: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadListings();
  }, []);

  async function loadListings() {
    try {
      const response = await fetch('/data/listings.json');
      if (response.ok) {
        const data = await response.json();
        let listingsData = data.listings || [];
        
        // Merge favorites from localStorage
        const saved = localStorage.getItem('propertyListings');
        if (saved) {
          const savedData = JSON.parse(saved);
          listingsData = listingsData.map(listing => {
            const savedListing = savedData.listings?.find(l => l.id === listing.id);
            return savedListing ? { ...listing, favorite: savedListing.favorite } : listing;
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
    if (filters.favoritesOnly && !listing.favorite) return false;
    return true;
  });

  const sources = [...new Set(listings.map(l => l.source))];
  const favoriteCount = listings.filter(l => l.favorite).length;

  const toggleFavorite = (id) => {
    const updated = listings.map(l => 
      l.id === id ? { ...l, favorite: !l.favorite } : l
    );
    setListings(updated);
    localStorage.setItem('propertyListings', JSON.stringify({ 
      listings: updated, 
      lastScanned 
    }));
  };

  const deleteListing = (id) => {
    if (deleteConfirm === id) {
      const updated = listings.filter(l => l.id !== id);
      setListings(updated);
      localStorage.setItem('propertyListings', JSON.stringify({ 
        listings: updated, 
        lastScanned 
      }));
      calculateStats(updated);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <header style={{ marginBottom: '24px', textAlign: 'center' }}>
          <h1 style={{ 
            margin: '0 0 8px 0', 
            fontSize: 'clamp(24px, 5vw, 32px)',
            fontWeight: '700', 
            color: '#0f172a' 
          }}>
            Roci Real Estate Engine
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
            Brian and Gianna's Search for a New Home
          </p>
          <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '12px' }}>
            Last updated: {lastScanned ? new Date(lastScanned).toLocaleString() : 'Never'}
          </p>
        </header>

        {/* Stats Cards - 3 columns on mobile */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '20px',
          maxWidth: '400px',
          margin: '0 auto 20px auto'
        }}>
          <div style={{
            background: '#ffffff',
            padding: '16px 12px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '11px' }}>Total</p>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#3b82f6' }}>{stats.total}</p>
          </div>
          <div style={{
            background: '#ffffff',
            padding: '16px 12px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '11px' }}>New Today</p>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#10b981' }}>{stats.newToday}</p>
          </div>
          <div style={{
            background: '#ffffff',
            padding: '16px 12px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 4px 0', color: '#64748b', fontSize: '11px' }}>Favorites</p>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#ef4444' }}>{favoriteCount}</p>
          </div>
        </div>

        {/* Filter Toggle */}
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '10px 20px',
              background: showFilters ? '#3b82f6' : '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              color: showFilters ? '#ffffff' : '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {showFilters ? '✕ Hide Filters' : '⚙ Filters'}
            {filters.favoritesOnly && ' ⭐'}
          </button>
        </div>

        {/* Filters Dropdown */}
        {showFilters && (
          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            marginBottom: '24px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
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
            
            {/* Favorite Filter */}
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filters.favoritesOnly}
                  onChange={(e) => setFilters({...filters, favoritesOnly: e.target.checked})}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ color: '#374151', fontSize: '14px' }}>⭐ Show favorites only</span>
              </label>
            </div>
          </div>
        )}

        {/* Listings */}
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
          Listings ({filteredListings.length})
        </h2>

        {filteredListings.length === 0 ? (
          <div style={{
            background: '#ffffff',
            padding: '48px 24px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <p style={{ color: '#6b7280' }}>No listings found.</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gap: '16px', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'
          }}>
            {filteredListings.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).map((listing) => (
              <div key={listing.id} style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                {/* Property Image */}
                <div style={{
                  width: '100%',
                  height: '200px',
                  background: listing.imageUrl 
                    ? `url(${listing.imageUrl}) center/cover no-repeat`
                    : '#f1f5f9',
                  position: 'relative'
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
                      No Image
                    </div>
                  )}
                  
                  {/* Pills container */}
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    display: 'flex',
                    gap: '6px',
                    flexWrap: 'wrap'
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
                    {listing.favorite && (
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        background: '#ef4444',
                        color: '#ffffff'
                      }}>
                        ❤️
                      </span>
                    )}
                  </div>
                  
                  {/* Price badge */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    padding: '8px 14px',
                    background: 'rgba(0, 0, 0, 0.85)',
                    borderRadius: '8px'
                  }}>
                    <p style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#ffffff' }}>
                      {listing.price ? `$${listing.price.toLocaleString()}` : 'Price N/A'}
                    </p>
                  </div>
                </div>
                
                {/* Card Content */}
                <div style={{ padding: '16px' }}>
                  {/* Address */}
                  <h3 style={{ 
                    margin: '0 0 4px 0', 
                    fontSize: '17px', 
                    fontWeight: '600', 
                    color: '#111827',
                    lineHeight: '1.3'
                  }}>
                    {listing.address}
                  </h3>
                  
                  {/* City/State */}
                  <p style={{ margin: '0 0 12px 0', color: '#6b7280', fontSize: '14px' }}>
                    {listing.city || 'Unknown City'}{listing.state ? `, ${listing.state}` : ''} {listing.zip || ''}
                  </p>
                  
                  {/* Property Details */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    marginBottom: '12px', 
                    padding: '10px 14px', 
                    background: '#f9fafb', 
                    borderRadius: '8px' 
                  }}>
                    {listing.beds !== null && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 2px 0', color: '#9ca3af', fontSize: '10px', textTransform: 'uppercase' }}>Beds</p>
                        <p style={{ margin: 0, color: '#374151', fontSize: '15px', fontWeight: '600' }}>{listing.beds}</p>
                      </div>
                    )}
                    {listing.baths !== null && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 2px 0', color: '#9ca3af', fontSize: '10px', textTransform: 'uppercase' }}>Baths</p>
                        <p style={{ margin: 0, color: '#374151', fontSize: '15px', fontWeight: '600' }}>{listing.baths}</p>
                      </div>
                    )}
                    {listing.sqft !== null && (
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ margin: '0 0 2px 0', color: '#9ca3af', fontSize: '10px', textTransform: 'uppercase' }}>Sq Ft</p>
                        <p style={{ margin: 0, color: '#374151', fontSize: '15px', fontWeight: '600' }}>{listing.sqft.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Alert Date */}
                  <p style={{ margin: '0 0 14px 0', color: '#9ca3af', fontSize: '12px' }}>
                    Alerted: {formatAlertDate(listing.emailDate)}
                  </p>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        padding: '10px 14px',
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
                    
                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(listing.id)}
                      style={{
                        padding: '10px 14px',
                        background: listing.favorite ? '#fef2f2' : '#ffffff',
                        border: listing.favorite ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '8px',
                        color: listing.favorite ? '#ef4444' : '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '18px',
                        lineHeight: 1
                      }}
                    >
                      {listing.favorite ? '❤️' : '🤍'}
                    </button>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => deleteListing(listing.id)}
                      style={{
                        padding: '10px 14px',
                        background: deleteConfirm === listing.id ? '#fef2f2' : '#ffffff',
                        border: deleteConfirm === listing.id ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '8px',
                        color: deleteConfirm === listing.id ? '#ef4444' : '#9ca3af',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      {deleteConfirm === listing.id ? '✓ Tap again' : '🗑'}
                    </button>
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
