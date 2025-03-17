'use client'

import { useState, useEffect } from "react";
import JobCard from "../components/JobCard";
import JobSourceFilter from "../components/JobSourceFilter";
import LocationFilter from "../components/LocationFilter";
import JobDetails from "../components/JobDetails";

export default function JobBoard() {
  const [jobs, setJobs] = useState([]);
  const [jobSources, setJobSources] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [perPage, setPerPage] = useState(() => {
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("perPage")) || 10;
    }
    return 10;
  });
  const [customPage, setCustomPage] = useState("");
  const perPageOptions = [5, 10, 25, 50];
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [translations, setTranslations] = useState(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("translations")) || {};
    }
    return {};
  });
  const [translationStates, setTranslationStates] = useState(() => {
    if (typeof window !== "undefined") {
      return JSON.parse(localStorage.getItem("translationStates")) || {};
    }
    return {};
  });
  const [isTranslating, setIsTranslating] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Fetch locations
  useEffect(() => {
    async function fetchLocations() {
      try {
        const res = await fetch(`${apiBase}/locations`);
        const data = await res.json();
        console.log('Fetched locations:', data); // Debug log
        // Ensure we're getting an array of location strings
        const locationArray = Array.isArray(data) ? data : [];
        setLocations(locationArray);
      } catch (error) {
        console.error("Error fetching locations:", error);
        setLocations([]); // Set empty array on error
      }
    }
    fetchLocations();
  }, [apiBase]);

  // Fetch job sources
  useEffect(() => {
    async function fetchJobSources() {
      try {
        const res = await fetch(`${apiBase}/job-sources`);
        const data = await res.json();
        setJobSources(data);
      } catch (error) {
        console.error("Error fetching job sources:", error)
      }
    }
    fetchJobSources();
  }, [apiBase]);

  // Fetch favorites
  useEffect(() => {
    async function fetchFavorites() {
      try {
        const res = await fetch(`${apiBase}/favorites`);
        const data = await res.json();
        setFavorites(data);
      } catch (error) {
        console.error("Error fetching favorites:", error);
      }
    }
    fetchFavorites();
  }, [apiBase]);

  // Fetch jobs with location filter
  useEffect(() => {
    async function fetchJobs() {
      try {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("per_page", perPage);
        if (selectedSource) params.append("source", selectedSource);
        if (search) params.append("search", search);
        if (showFavorites) params.append("favorites", "true");
        if (selectedLocations.length > 0) {
          selectedLocations.forEach(loc => params.append("locations", loc));
        }

        const res = await fetch(`${apiBase}/jobs?${params.toString()}`);
        const data = await res.json();
        setJobs(data.jobs);
        setTotal(data.total);
        if (data.jobs.length > 0) {
          setSelectedJob(data.jobs[0]);
        } else {
          setSelectedJob(null);
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
      }
    }
    fetchJobs();
  }, [apiBase, selectedSource, search, page, showFavorites, perPage, selectedLocations]);

  // Save perPage to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("perPage", perPage);
    }
  }, [perPage]);

  // Save translations and states to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("translations", JSON.stringify(translations));
      localStorage.setItem("translationStates", JSON.stringify(translationStates));
    }
  }, [translations, translationStates]);

  const totalPages = Math.ceil(total / perPage);

  // Generate pagination numbers with ellipsis
  const generatePaginationNumbers = () => {
    const delta = 2; // Number of pages to show before and after current page
    const range = [];
    const rangeWithDots = [];
    let l;

    range.push(1);

    for (let i = page - delta; i <= page + delta; i++) {
      if (i < totalPages && i > 1) {
        range.push(i);
      }
    }

    if (totalPages > 1) {
      range.push(totalPages);
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      setCustomPage("");
    }
  };

  const handleCustomPageChange = (e) => {
    const value = e.target.value;
    setCustomPage(value);

    const pageNum = parseInt(value);
    if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
    }
  };

  const handlePerPageChange = (e) => {
    const newPerPage = parseInt(e.target.value);
    setPerPage(newPerPage);
    setPage(1); // Reset to first page when changing items per page
  };

  const handleLocationChange = (location) => {
    setSelectedLocations(prev =>
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
    setPage(1);
  };

  const filteredLocations = locations.filter(location =>
    location.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const handleTranslate = async (jobId, text) => {
    if (translations[jobId]) {
      setTranslationStates(prev => ({
        ...prev,
        [jobId]: !prev[jobId]
      }));
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch(`${apiBase}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: jobId,
          text: text,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      setTranslations(prev => ({
        ...prev,
        [jobId]: data.translated_text
      }));
      setTranslationStates(prev => ({
        ...prev,
        [jobId]: true
      }));
    } catch (error) {
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  async function saveFavorite(jobId) {
    try {
      const res = await fetch(`${apiBase}/favorites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_listing_id: jobId }),
      });
      if (res.ok) {
        const updatedFavorites = [...favorites, jobId];
        setFavorites(updatedFavorites);
      } else {
        alert("Could not save favorite.");
      }
    } catch (error) {
      console.error("Error saving favorite:", error);
    }
  }

  async function deleteFavorite(jobId) {
    try {
      const res = await fetch(`${apiBase}/favorites/${jobId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const updatedFavorites = favorites.filter(id => id !== jobId);
        setFavorites(updatedFavorites);
      } else {
        alert("Could not remove favorite.");
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  }

  const isFavorite = (jobId) => favorites.includes(jobId);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen w-full bg-white">
      {/* Left Column: Filters and Job List */}
      <div className="w-full lg:w-[400px] xl:w-[450px] border-r border-gray-100 flex flex-col h-screen">
        {/* Search and Filters */}
        <div className="p-4 space-y-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Search jobs..."
              className="w-full p-3 bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all"
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <span className="absolute right-3 top-3 text-gray-400">🔍</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="px-4 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all text-gray-700 flex items-center gap-2"
            >
              <span>Filters</span>
              <span className={`transform transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            <button
              className={`flex-1 px-4 py-2 rounded-lg transition-all ${showFavorites
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              onClick={() => setShowFavorites(!showFavorites)}
            >
              {showFavorites ? '❤️ Favorites' : '🤍 Show Favorites'}
            </button>
          </div>

          {/* Expandable Filters */}
          <div className={`space-y-4 overflow-hidden transition-all ${isFilterOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
            <JobSourceFilter
              jobSources={jobSources}
              selectedSource={selectedSource}
              onSourceChange={(value) => { setSelectedSource(value); setPage(1); }}
            />

            <LocationFilter
              locations={locations}
              selectedLocations={selectedLocations}
              onLocationChange={handleLocationChange}
            />
          </div>
        </div>

        {/* Job List */}
        <div className="flex-1 overflow-y-auto">
          {jobs.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className={`cursor-pointer transition-all ${selectedJob && selectedJob.id === job.id
                    ? "bg-gray-50"
                    : "hover:bg-gray-50"
                    }`}
                  onClick={() => setSelectedJob(job)}
                >
                  <JobCard
                    job={job}
                    compact={true}
                    isFavorite={isFavorite(job.id)}
                    onToggleFavorite={() =>
                      isFavorite(job.id) ? deleteFavorite(job.id) : saveFavorite(job.id)
                    }
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No jobs found matching your criteria
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 bg-white sticky bottom-0">
          <div className="flex items-center justify-between mb-3">
            <select
              value={perPage}
              onChange={handlePerPageChange}
              className="px-2 py-1 text-sm bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              {perPageOptions.map(option => (
                <option key={option} value={option}>{option} per page</option>
              ))}
            </select>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Page</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={customPage}
                onChange={handleCustomPageChange}
                className="w-16 px-2 py-1 bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
                placeholder={page}
              />
              <span>of {totalPages}</span>
            </div>
          </div>

          <div className="flex justify-center items-center space-x-1">
            <button
              className="p-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-gray-50 transition-all"
              disabled={page === 1}
              onClick={() => handlePageChange(1)}
            >
              ««
            </button>
            <button
              className="p-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-gray-50 transition-all"
              disabled={page === 1}
              onClick={() => handlePageChange(page - 1)}
            >
              «
            </button>
            <span className="px-4 py-2 text-sm">
              {page} / {totalPages}
            </span>
            <button
              className="p-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-gray-50 transition-all"
              disabled={page === totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              »
            </button>
            <button
              className="p-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-gray-50 transition-all"
              disabled={page === totalPages}
              onClick={() => handlePageChange(totalPages)}
            >
              »»
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Job Detail */}
      <div className="flex-1 h-screen overflow-y-auto bg-gray-50">
        {selectedJob ? (
          <JobDetails
            job={selectedJob}
            isFavorite={isFavorite(selectedJob.id)}
            onToggleFavorite={() =>
              isFavorite(selectedJob.id)
                ? deleteFavorite(selectedJob.id)
                : saveFavorite(selectedJob.id)
            }
            translation={translations[selectedJob.id]}
            showTranslation={translationStates[selectedJob.id] || false}
            isTranslating={isTranslating}
            onTranslate={() => handleTranslate(selectedJob.id, selectedJob.description)}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">Select a job to see details</p>
          </div>
        )}
      </div>
    </div>
  );
}
