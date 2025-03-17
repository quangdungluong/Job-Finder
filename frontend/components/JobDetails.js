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
        <div className="max-w-3xl mx-auto p-6 lg:p-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <h1 className="text-2xl font-semibold text-gray-900">{job.title}</h1>
                        <button
                            onClick={onTranslate}
                            disabled={isTranslating}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:text-gray-300 bg-white rounded-full shadow-sm hover:shadow-md"
                            title={isTranslating ? 'Translating...' : showTranslation ? 'Show Original' : 'Translate to Vietnamese'}
                        >
                            <FaLanguage className={`w-5 h-5 ${showTranslation ? 'text-blue-600' : ''}`} />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                            {job.company}
                        </span>
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                            {job.location}
                        </span>
                        {job.salary && (
                            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                                {job.salary}
                            </span>
                        )}
                    </div>
                    <div className="prose prose-gray max-w-none">
                        <ReactMarkdown>
                            {showTranslation ? translation : job.description}
                        </ReactMarkdown>
                    </div>
                    <div className="flex flex-wrap gap-3 pt-4">
                        <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-2 bg-gray-100 text-white rounded-lg hover:bg-gray-200 transition-all"
                        >
                            Apply Now
                        </a>
                        <button
                            onClick={onToggleFavorite}
                            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all flex items-center gap-2"
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
