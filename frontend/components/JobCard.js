"use client";

export default function JobCard({ job, compact = false }) {
    return (
        <div className={`${compact ? "py-1" : "py-3"} hover:shadow-md transition-shadow`}>
            <h3 className={`font-semibold ${compact ? "text-base" : "text-lg"} text-gray-800`}>{job.title}</h3>
            <p className="text-sm text-gray-500">
                {job.company} - {job.location}
            </p>
            {!compact && (
                <p className="mt-2 text-gray-600 text-sm">
                    {job.description.length > 150
                        ? `${job.description.substring(0, 150)}...`
                        : job.description}
                </p>
            )}
        </div>
    );
}
