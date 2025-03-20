"use client";

import { FaHeart, FaRegHeart } from 'react-icons/fa';

export default function JobCard({ job, compact = false, isFavorite, onToggleFavorite }) {
    return (
        <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {job.title}
                    </h3>
                    <div className="mt-1 flex flex-wrap gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {job.company}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            • {job.location}
                        </span>
                    </div>
                    {!compact && job.description && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                            {job.description}
                        </p>
                    )}
                </div>
                <div className="ml-4 flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite();
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                        {isFavorite ? <FaHeart className="w-5 h-5 text-red-600" /> : <FaRegHeart className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    );
}
