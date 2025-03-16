'use client'

import { useState, useRef, useEffect } from 'react';

export default function LocationFilter({ locations, selectedLocations, onLocationChange }) {
  const [locationSearch, setLocationSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Debug logging
  useEffect(() => {
    console.log('Locations received:', locations);
  }, [locations]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Ensure locations is an array and handle potential null/undefined values
  const safeLocations = Array.isArray(locations) ? locations : [];

  // Filter and sort locations alphabetically
  const filteredLocations = safeLocations
    .filter(location => location?.toLowerCase().includes(locationSearch.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const handleLocationClick = (location) => {
    if (!location) return;
    onLocationChange(location);
    setLocationSearch(""); // Clear search when selecting a location
    // setIsDropdownOpen(false); // Close dropdown after selection
  };

  const handleSearchChange = (e) => {
    setLocationSearch(e.target.value);
    setIsDropdownOpen(true); // Open dropdown when typing
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="text-sm text-gray-600 block mb-2">
        Locations ({selectedLocations.length} selected)
      </label>

      {/* Selected locations tags */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedLocations.map((loc) => (
            <span
              key={loc}
              className="inline-flex items-center px-2 py-1 bg-gray-200 text-xs text-gray-700 rounded-full group hover:bg-gray-300 transition-all"
            >
              {loc}
              <button
                onClick={() => handleLocationClick(loc)}
                className="ml-1 opacity-60 group-hover:opacity-100"
                aria-label="Remove location"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search locations..."
          className="w-full p-2 bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
          value={locationSearch}
          onChange={handleSearchChange}
          onFocus={() => setIsDropdownOpen(true)}
        />
        <button
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span className={`transform transition-transform inline-block ${isDropdownOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>
      </div>

      {/* Dropdown list */}
      {isDropdownOpen && (
        <div className="fixed z-[100] w-[calc(20%-2rem)] mt-1 bg-white rounded-lg shadow-lg border border-gray-100 max-h-[300px] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {filteredLocations.length} {filteredLocations.length === 1 ? 'location' : 'locations'} found
            </div>
          </div>
          {filteredLocations.length > 0 ? (
            <div className="py-1">
              {filteredLocations.map((location) => (
                <button
                  key={location}
                  onClick={() => handleLocationClick(location)}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between transition-colors duration-150 ${selectedLocations.includes(location) ? 'bg-gray-50' : ''
                    }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center ${selectedLocations.includes(location)
                      ? 'bg-gray-900 border-gray-900'
                      : 'border-gray-300'
                      }`}>
                      {selectedLocations.includes(location) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="text-gray-700">{location}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-6 text-center">
              <div className="text-gray-500 text-sm mb-1">No locations found</div>
              <div className="text-gray-400 text-xs">Try adjusting your search</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
