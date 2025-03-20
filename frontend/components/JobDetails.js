"use client";

import { FaHeart, FaRegHeart, FaLanguage } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';

export default function JobDetails({
    job,
    isFavorite,
    onToggleFavorite,
    translation,
    showTranslation,
    isTranslating,
    onTranslate
}) {
    return (
        <div className="h-full p-4 lg:p-6 overflow-hidden">
            <div className="h-full bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                <div className="max-w-5xl mx-auto space-y-4">
                    <div className="flex justify-between items-start">
                        <h1 className="text-xl lg:text-2xl font-semibold text-gray-900 dark:text-white">{job.title}</h1>
                        <button
                            onClick={onTranslate}
                            disabled={isTranslating}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:text-gray-300 bg-white dark:bg-gray-700 dark:text-gray-300 rounded-full shadow-sm hover:shadow-md flex-shrink-0 ml-2"
                            title={isTranslating ? 'Translating...' : showTranslation ? 'Show Original' : 'Translate to Vietnamese'}
                        >
                            <FaLanguage className={`w-5 h-5 ${showTranslation ? 'text-blue-600' : ''}`} />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
                            {job.company}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
                            {job.location}
                        </span>
                        {job.salary && (
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300">
                                {job.salary}
                            </span>
                        )}
                    </div>
                    <div className="prose prose-gray dark:prose-invert prose-p:text-gray-700 dark:prose-p:text-gray-300 max-w-none">
                        <ReactMarkdown>
                            {showTranslation ? translation : job.description}
                        </ReactMarkdown>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-4">
                        <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2 bg-gray-100 text-white dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                        >
                            Apply Now
                        </a>
                        <button
                            onClick={onToggleFavorite}
                            className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center gap-2"
                        >
                            {isFavorite ? (
                                <>
                                    <FaHeart className="text-red-600" />
                                    Remove Favorite
                                </>
                            ) : (
                                <>
                                    <FaRegHeart />
                                    Save Favorite
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
