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
      return parseInt(localStorage.getItem("perPage")) || 25;
    }
    return 25;
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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] w-full bg-white dark:bg-gray-900 overflow-hidden">
      {/* Left Column: Filters and Job List */}
      <div className="w-full lg:w-[400px] xl:w-[450px] border-r border-gray-100 dark:border-gray-700 flex flex-col h-full overflow-hidden">
        {/* Search and Filters */}
        <div className="p-4 space-y-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Search jobs..."
              className="w-full p-3 bg-gray-50 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 transition-all"
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <span className="absolute right-3 top-3 text-gray-400">🔍</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all flex items-center gap-2"
            >
              <span>Filters</span>
              <span className={`transform transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
            <button
              className={`flex-1 px-4 py-2 rounded-lg transition-all ${showFavorites
                ? 'bg-rose-500 text-white dark:bg-rose-600 dark:hover:bg-rose-500'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
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

        {/* Job List and Pagination - Made into a flex column with job list taking remaining space */}
        <div className="flex flex-col flex-grow overflow-hidden">
          {/* Job List */}
          <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {jobs.length > 0 ? (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className={`cursor-pointer transition-all ${selectedJob && selectedJob.id === job.id
                      ? "bg-gray-50 dark:bg-gray-700"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700"
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
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No jobs found matching your criteria
              </div>
            )}
          </div>

          {/* Pagination - Fixed at bottom */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="relative inline-block">
                <select
                  value={perPage}
                  onChange={handlePerPageChange}
                  className="appearance-none pl-3 pr-8 py-2 text-sm bg-gray-50 dark:bg-gray-700 dark:text-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 shadow-sm"
                >
                  {perPageOptions.map(option => (
                    <option key={option} value={option}>{option} per page</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <span>Page</span>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={customPage}
                    onChange={handleCustomPageChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const pageNum = parseInt(customPage);
                        if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
                          handlePageChange(pageNum);
                        }
                      }
                    }}
                    className="w-16 pl-3 pr-1 py-2 bg-gray-50 dark:bg-gray-700 dark:text-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 shadow-sm text-center"
                    placeholder={page}
                  />
                </div>
                <span>of {totalPages}</span>
              </div>
            </div>

            <div className="flex justify-center items-center pagination-controls">
              <div className="inline-flex rounded-md shadow-sm bg-gray-50 dark:bg-gray-700 p-1">
                <button
                  className="p-2 text-sm text-gray-700 dark:text-gray-200 rounded-l-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-all"
                  disabled={page === 1}
                  onClick={() => handlePageChange(1)}
                  aria-label="First page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className="p-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-all"
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                  aria-label="Previous page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Current Page Indicator */}
                <div className="inline-flex items-center justify-center min-w-[4.5rem] px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md shadow-sm mx-1 page-indicator">
                  <span>{page}</span>
                </div>

                <button
                  className="p-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-all"
                  disabled={page === totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  aria-label="Next page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  className="p-2 text-sm text-gray-700 dark:text-gray-200 rounded-r-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-all"
                  disabled={page === totalPages}
                  onClick={() => handlePageChange(totalPages)}
                  aria-label="Last page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Job Detail */}
      <div className="flex-1 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
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
            <p className="text-gray-500 dark:text-gray-400">Select a job to see details</p>
          </div>
        )}
      </div>
    </div>
  );
}
