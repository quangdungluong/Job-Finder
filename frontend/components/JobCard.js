"use client";

export default function JobCard({ job, compact = false }) {
    return (
        <div className={`p-2 ${compact ? "py-1" : "py-3"}`}>
            <h3 className={`font-bold ${compact ? "text-base" : "text-xl"}`}>{job.title}</h3>
            <p className="text-sm text-gray-500">
                {job.company} - {job.location}
            </p>
            {!compact && (
                <p className="mt-2 text-gray-700">
                    {job.description.length > 150
                        ? `${job.description.substring(0, 150)}...`
                        : job.description}
                </p>
            )}
        </div>
    );
}
