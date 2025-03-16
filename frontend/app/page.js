'use client'

import { useState, useEffect } from "react";
import JobCard from "../components/JobCard";

export default function JobBoard() {
  const [jobs, setJobs] = useState([]);
  const [jobSources, setJobSources] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [perPage, setPerPage] = useState(() => {
    // Check if running in the browser before accessing localStorage
    if (typeof window !== "undefined") {
      return parseInt(localStorage.getItem("perPage")) || 10;
    }
    return 10; // Default value for SSR
  });
  const [customPage, setCustomPage] = useState("");
  const perPageOptions = [5, 10, 25, 50];

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

  // Fetch jobs with favorites filter
  useEffect(() => {
    async function fetchJobs() {
      try {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("per_page", perPage);
        if (selectedSource) params.append("source", selectedSource);
        if (search) params.append("search", search);
        if (showFavorites) params.append("favorites", "true");

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
  }, [apiBase, selectedSource, search, page, showFavorites, perPage]);

  // Save perPage to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("perPage", perPage);
    }
  }, [perPage]);

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
        alert("Job saved as favorite!");
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
        alert("Favorite removed!");
      } else {
        alert("Could not remove favorite.");
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
    }
  }

  const isFavorite = (jobId) => favorites.includes(jobId);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-80px)] shadow-lg bg-white rounded-lg overflow-hidden">
      {/* Left Column: Job List */}
      <div className="w-full md:w-[40%] border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b bg-gray-50">
          <input
            type="text"
            placeholder="Search jobs..."
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <div className="flex flex-col md:flex-row gap-2 mt-2">
            <select
              className="flex-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
              onChange={(e) => { setSelectedSource(e.target.value); setPage(1); }}
            >
              <option value="">All Sources</option>
              {jobSources.map((source) => (
                <option key={source.id} value={source.name}>
                  {source.name}
                </option>
              ))}
            </select>
            <button
              className={`px-4 py-2 rounded-md transition-colors ${showFavorites
                ? 'bg-gray-700 text-white hover:bg-gray-800'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              onClick={() => setShowFavorites(!showFavorites)}
            >
              ❤️ Favorites
            </button>
          </div>
        </div>
        <ul>
          {jobs.map((job) => (
            <li
              key={job.id}
              className={`cursor-pointer transition-colors px-4 py-3 border-b hover:bg-gray-50 ${selectedJob && selectedJob.id === job.id ? "bg-blue-50" : ""
                }`}
              onClick={() => setSelectedJob(job)}
            >
              <JobCard job={job} compact={true} />
            </li>
          ))}
        </ul>
        {/* Enhanced Pagination */}
        <div className="p-4 space-y-3 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Items per page:</span>
              <select
                value={perPage}
                onChange={handlePerPageChange}
                className="p-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                {perPageOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Go to page:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={customPage}
                onChange={handleCustomPageChange}
                className="w-16 p-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder={page}
              />
              <span className="text-sm text-gray-600">of {totalPages}</span>
            </div>
          </div>
          <div className="flex justify-center items-center space-x-1">
            <button
              className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page === 1}
              onClick={() => handlePageChange(1)}
            >
              First
            </button>
            <button
              className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page === 1}
              onClick={() => handlePageChange(page - 1)}
            >
              ←
            </button>
            {generatePaginationNumbers().map((pageNum, idx) => (
              <button
                key={idx}
                onClick={() => typeof pageNum === 'number' && handlePageChange(pageNum)}
                className={`px-3 py-1 text-sm border rounded ${pageNum === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-white hover:bg-gray-50'
                  } ${typeof pageNum !== 'number' ? 'cursor-default' : 'cursor-pointer'}`}
                disabled={typeof pageNum !== 'number'}
              >
                {pageNum}
              </button>
            ))}
            <button
              className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page === totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              →
            </button>
            <button
              className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={page === totalPages}
              onClick={() => handlePageChange(totalPages)}
            >
              Last
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Job Detail */}
      <div className="w-full md:w-[60%] p-6 overflow-y-auto">
        {selectedJob ? (
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{selectedJob.title}</h1>
            <p className="mt-1 text-lg text-gray-600">{selectedJob.company} • {selectedJob.location}</p>
            <div className="mt-4 text-gray-700 whitespace-pre-line">
              {selectedJob.description}
            </div>
            <div className="mt-6 flex space-x-4">
              <a
                href={selectedJob.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gray-500 text-white rounded-md shadow hover:bg-gray-600 transition-colors"
              >
                Apply Now
              </a>
              {isFavorite(selectedJob.id) ? (
                <button
                  onClick={() => deleteFavorite(selectedJob.id)}
                  className="px-6 py-3 bg-gray-500 text-white rounded-md shadow hover:bg-gray-600 transition-colors"
                >
                  Remove Favorite
                </button>
              ) : (
                <button
                  onClick={() => saveFavorite(selectedJob.id)}
                  className="px-6 py-3 bg-gray-500 text-white rounded-md shadow hover:bg-gray-600 transition-colors"
                >
                  Save Favorite
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-500">Select a job to see details</p>
        )}
      </div>
    </div>
  );
}
