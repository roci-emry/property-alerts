import { useState, useEffect } from 'react';

export default function PropertyAlerts() {
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minBeds: '',
    minBaths: '',
    source: 'all'
  });
  const [lastScanned, setLastScanned] = useState(null);
  const [stats, setStats] = useState({ total: 0, newToday: 0 });

  useEffect(() => {
    loadListings();
  }, []);

  function loadListings() {
    const saved = localStorage.getItem('propertyListings');
    if (saved) {
      const data = JSON.parse(saved);
      setListings(data.listings || []);
      setLastScanned(data.lastScanned);
      calculateStats(data.listings || []);
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
    if (filters.minBaths && listing.baths < parseFloat(filters.minBaths)) return false;
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

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#0a0e27',
      minHeight: '100vh',
      color: '#ccd6f6'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Header */}
        <header style={{ 
          borderBottom: '1px solid rgba(0, 243, 255, 0.2)',
          paddingBottom: '30px',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #00f3ff 0%, #0066ff 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              🏠
            </div>
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '32px',
                fontWeight: '700',
                background: 'linear-gradient(90deg, #00f3ff, #0066ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Property Alerts
              </h1>
              <p style={{ margin: '5px 0 0 0', color: '#8892b0', fontSize: '14px' }}>
                Conshohocken / Oreland / Surrounding Areas
              </p>
            </div>
          </div>
          <p style={{ margin: '10px 0 0 0', color: '#8892b0', fontSize: '13px' }}>
            Last scanned: {lastScanned ? new Date(lastScanned).toLocaleString() : 'Never'} • 
            Auto-scan every 6 hours
          </p>
        </header>

        {/* Stats */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          marginBottom: '30px'
        }}>
          <div style={{
            background: 'rgba(10, 25, 47, 0.7)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 243, 255, 0.2)',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, height: '2px',
              background: 'linear-gradient(90deg, #00f3ff, transparent)'
            }} />
            <p style={{ margin: '0 0 5px 0', color: '#8892b0', fontSize: '11px' }}>TOTAL LISTINGS</p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#00f3ff' }}>{stats.total}</p>
          </div>
          <div style={{
            background: 'rgba(10, 25, 47, 0.7)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 243, 255, 0.2)',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, height: '2px',
              background: 'linear-gradient(90deg, #00ff88, transparent)'
            }} />
            <p style={{ margin: '0 0 5px 0', color: '#8892b0', fontSize: '11px' }}>NEW TODAY</p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#00ff88' }}>{stats.newToday}</p>
          </div>
          <div style={{
            background: 'rgba(10, 25, 47, 0.7)',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 243, 255, 0.2)',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, height: '2px',
              background: 'linear-gradient(90deg, #bd34fe, transparent)'
            }} />
            <p style={{ margin: '0 0 5px 0', color: '#8892b0', fontSize: '11px' }}>UNVIEWED</p>
            <p style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#bd34fe' }}>
              {listings.filter(l => !l.viewed).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          background: 'rgba(10, 25, 47, 0.7)',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid rgba(0, 243, 255, 0.2)',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#00f3ff', margin: '0 0 15px 0', fontSize: '14px' }}>Filters</h3>
          <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            <input
              type="number"
              placeholder="Min Price"
              value={filters.minPrice}
              onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
              style={{
                padding: '10px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(0, 243, 255, 0.3)',
                borderRadius: '6px',
                color: '#ccd6f6'
              }}
            />
            <input
              type="number"
              placeholder="Max Price"
              value={filters.maxPrice}
              onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
              style={{
                padding: '10px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(0, 243, 255, 0.3)',
                borderRadius: '6px',
                color: '#ccd6f6'
              }}
            />
            <input
              type="number"
              placeholder="Min Beds"
              value={filters.minBeds}
              onChange={(e) => setFilters({...filters, minBeds: e.target.value})}
              style={{
                padding: '10px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(0, 243, 255, 0.3)',
                borderRadius: '6px',
                color: '#ccd6f6'
              }}
            />
            <select
              value={filters.source}
              onChange={(e) => setFilters({...filters, source: e.target.value})}
              style={{
                padding: '10px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(0, 243, 255, 0.3)',
                borderRadius: '6px',
                color: '#ccd6f6'
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
        <h2 style={{ color: '#00f3ff', marginBottom: '20px', fontSize: '18px' }}>
          New Listings ({filteredListings.length})
        </h2>

        {filteredListings.length === 0 ? (
          <div style={{
            background: 'rgba(10, 25, 47, 0.5)',
            padding: '40px',
            borderRadius: '12px',
            border: '1px solid rgba(0, 243, 255, 0.1)',
            textAlign: 'center'
          }}>
            <p style={{ color: '#8892b0' }}>No listings found. Waiting for email alerts...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {filteredListings.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).map(listing => (
              <div key={listing.id} style={{
                background: listing.viewed 
                  ? 'rgba(10, 25, 47, 0.5)' 
                  : 'linear-gradient(135deg, rgba(10, 25, 47, 0.9) 0%, rgba(17, 34, 64, 0.9) 100%)',
                borderRadius: '12px',
                border: `1px solid ${listing.viewed ? 'rgba(136, 146, 176, 0.2)' : 'rgba(0, 243, 255, 0.3)'}`,
                opacity: listing.viewed ? 0.7 : 1,
                overflow: 'hidden'
              }}>
                {/* Property Image */}
                <div style={{
                  width: '100%',
                  height: '200px',
                  background: listing.imageUrl 
                    ? `url(${listing.imageUrl}) center/cover no-repeat`
                    : 'linear-gradient(135deg, #1a2744 0%, #0a1628 100%)',
                  position: 'relative'
                }}>
                  {!listing.imageUrl && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: '#8892b0',
                      fontSize: '14px'
                    }}>
                      🏠 No Image
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      background: listing.source === 'Zillow' ? 'rgba(0, 116, 228, 0.9)' :
                                  listing.source === 'Redfin' ? 'rgba(165, 20, 35, 0.9)' :
                                  'rgba(0, 243, 255, 0.9)',
                      color: '#fff',
                      fontWeight: '600'
                    }}>
                      {listing.source}
                    </span>
                    {!listing.viewed && (
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: '#00ff88',
                        color: '#0a0e27',
                        fontWeight: '600'
                      }}>
                        NEW
                      </span>
                    )}
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    padding: '8px 16px',
                    background: 'rgba(0,0,0,0.8)',
                    borderRadius: '6px'
                  }}>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#00f3ff' }}>
                      ${listing.price?.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div style={{ padding: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#ccd6f6', fontSize: '18px', fontWeight: '600' }}>
                    {listing.address}
                  </h3>
                  <p style={{ margin: '0 0 15px 0', color: '#8892b0', fontSize: '14px' }}>
                    {listing.city}, {listing.state} {listing.zip}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 2px 0', color: '#8892b0', fontSize: '11px' }}>BEDS</p>
                      <p style={{ margin: 0, color: '#ccd6f6', fontSize: '16px', fontWeight: '600' }}>{listing.beds || '-'}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 2px 0', color: '#8892b0', fontSize: '11px' }}>BATHS</p>
                      <p style={{ margin: 0, color: '#ccd6f6', fontSize: '16px', fontWeight: '600' }}>{listing.baths || '-'}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ margin: '0 0 2px 0', color: '#8892b0', fontSize: '11px' }}>SQFT</p>
                      <p style={{ margin: 0, color: '#ccd6f6', fontSize: '16px', fontWeight: '600' }}>{listing.sqft?.toLocaleString() || '-'}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        background: listing.source === 'Zillow' ? 'rgba(0, 116, 228, 0.2)' :
                                    listing.source === 'Redfin' ? 'rgba(165, 20, 35, 0.2)' :
                                    'rgba(0, 243, 255, 0.2)',
                        color: listing.source === 'Zillow' ? '#0074e4' :
                               listing.source === 'Redfin' ? '#a51423' :
                               '#00f3ff'
                      }}>
                        {listing.source}
                      </span>
                      {!listing.viewed && (
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: 'rgba(0, 255, 136, 0.2)',
                          color: '#00ff88'
                        }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#ccd6f6', fontSize: '18px' }}>
                      {listing.address}
                    </h3>
                    <p style={{ margin: 0, color: '#8892b0', fontSize: '14px' }}>
                      {listing.city}, {listing.state} {listing.zip}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '24px', fontWeight: '700', color: '#00f3ff' }}>
                      ${listing.price?.toLocaleString()}
                    </p>
                    <p style={{ margin: 0, color: '#8892b0', fontSize: '12px' }}>
                      {listing.beds} bd | {listing.baths} ba | {listing.sqft?.toLocaleString()} sqft
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                  <a
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => markAsViewed(listing.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'linear-gradient(90deg, #00f3ff, #0066ff)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#0a0e27',
                      textAlign: 'center',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '13px'
                    }}
                  >
                    View on {listing.source} →
                  </a>
                  {!listing.viewed && (
                    <button
                      onClick={() => markAsViewed(listing.id)}
                      style={{
                        padding: '10px 15px',
                        background: 'transparent',
                        border: '1px solid rgba(136, 146, 176, 0.3)',
                        borderRadius: '6px',
                        color: '#8892b0',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Mark Viewed
                    </button>
                  )}
                </div>

                <p style={{ margin: '10px 0 0 0', color: '#8892b0', fontSize: '11px' }}>
                  Found: {new Date(listing.dateAdded).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
