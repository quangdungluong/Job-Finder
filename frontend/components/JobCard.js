"use client";

export default function JobCard({ job, compact = false, isFavorite, onToggleFavorite }) {
    return (
        <div className="p-4 hover:bg-gray-50 transition-all">
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                        {job.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                        <span className="text-sm text-gray-500">
                            {job.company}
                        </span>
                        <span className="text-sm text-gray-500">
                            • {job.location}
                        </span>
                    </div>
                    {!compact && job.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {job.description}
                        </p>
                    )}
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite();
                    }}
                    className="ml-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    {isFavorite ? '❤️' : '🤍'}
                </button>
            </div>
        </div>
    );
}
