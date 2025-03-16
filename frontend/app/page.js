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
  const perPage = 10;

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
  }, [apiBase, selectedSource, search, page, showFavorites]);

  const totalPages = Math.ceil(total / perPage);

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
    <div className="flex h-[calc(100vh-80px)] shadow-lg bg-white rounded-lg overflow-hidden">
      {/* Left Column: Job List */}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Search jobs..."
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <div className="flex gap-2 mt-2">
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
              className={`px-4 py-2 rounded-md ${
                showFavorites
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700'
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
        {/* Pagination */}
        <div className="p-4 flex justify-between items-center border-t">
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span className="text-gray-700">
            Page {page} of {totalPages}
          </span>
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Right Column: Job Detail */}
      <div className="w-2/3 p-6 overflow-y-auto">
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
                className="px-6 py-3 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 transition-colors"
              >
                Apply Now
              </a>
              {isFavorite(selectedJob.id) ? (
                <button
                  onClick={() => deleteFavorite(selectedJob.id)}
                  className="px-6 py-3 bg-red-600 text-white rounded-md shadow hover:bg-red-700 transition-colors"
                >
                  Remove Favorite
                </button>
              ) : (
                <button
                  onClick={() => saveFavorite(selectedJob.id)}
                  className="px-6 py-3 bg-green-600 text-white rounded-md shadow hover:bg-green-700 transition-colors"
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
