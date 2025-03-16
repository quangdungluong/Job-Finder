export default function JobSourceFilter({ jobSources, selectedSource, onSourceChange }) {
  return (
    <div>
      <label className="text-sm text-gray-600 block mb-2">Source</label>
      <select
        className="w-full p-2 bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200"
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
