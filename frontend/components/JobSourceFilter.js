export default function JobSourceFilter({ jobSources, selectedSource, onSourceChange }) {
  return (
    <div>
      <label className="text-sm text-gray-600 dark:text-gray-400 block mb-2">Source</label>
      <select
        className="w-full p-2 bg-gray-50 dark:bg-gray-700 dark:text-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600"
        onChange={(e) => onSourceChange(e.target.value)}
        value={selectedSource}
      >
        <option value="">All Sources</option>
        {jobSources.map((source) => (
          <option key={source.id} value={source.name}>
            {source.name}
          </option>
        ))}
      </select>
    </div>
  );
}
