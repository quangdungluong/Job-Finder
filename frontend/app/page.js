'use client'

import { useState, useEffect } from "react";

export default function JobBoard() {
  const [jobs, setJobs] = useState([]);
  const [jobSources, setJobSources] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
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

  // Fetch jobs
  useEffect(() => {
    async function fetchJobs() {
      try {
        const params = new URLSearchParams();
        params.append("page", page);
        params.append("per_page", perPage);
        if (selectedSource) params.append("source", selectedSource);
        if (search) params.append("search", search);

        const res = await fetch(`${apiBase}/jobs?${params.toString()}`);
        const data = await res.json();
        setJobs(data.jobs);
        setTotal(data.total);
        if (data.jobs.length > 0) setSelectedJob(data.jobs[0]);
      }
      catch (error) {
        console.error("Error fetching jobs:", error);
      }
    }
    fetchJobs();
  }, [apiBase, selectedSource, search, page]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="flex h-screen">
      {/* Left Panel: Job List */}
      <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b">
          <input
            type="text"
            placeholder="Search jobs..."
            className="w-full p-2 border rounded"
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="w-full mt-2 p-2 border rounded"
            onChange={(e) => setSelectedSource(e.target.value)}
          >
            <option value="">All Sources</option>
            {jobSources.map((source) => (
              <option key={source.id} value={source.name}>
                {source.name}
              </option>
            ))}
          </select>
        </div>
        <ul>
          {jobs.map((job) => (
            <li
              key={job.id}
              className={`p-4 cursor-pointer ${
                selectedJob?.id === job.id ? "bg-blue-100" : "hover:bg-gray-100"
              }`}
              onClick={() => setSelectedJob(job)}
            >
              <h3 className="font-semibold">{job.title}</h3>
              <p className="text-sm text-gray-500">{job.company} - {job.location}</p>
            </li>
          ))}
        </ul>
        {/* Pagination */}
        <div className="p-4 flex justify-between items-center border-t">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>Page {page} of {totalPages}</span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Right Panel: Job Detail */}
      <div className="w-2/3 p-6">
        {selectedJob ? (
          <>
            <h1 className="text-2xl font-bold">{selectedJob.title}</h1>
            <p className="text-gray-600">{selectedJob.company} - {selectedJob.location}</p>
            <p className="mt-2 text-gray-700">{selectedJob.description}</p>
            <a
              href={selectedJob.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded"
            >
              Apply Now
            </a>
          </>
        ) : (
          <p className="text-center text-gray-500">Select a job to see details</p>
        )}
      </div>
    </div>
  );
}
