import React, { useState, useEffect } from 'react';
import type { HistoryRecord, InspectionResult } from '../types/inspection';
import { fetchServerHistory, clearLocalHistory } from '../services/api';
import { 
  History as HistoryIcon, 
  Trash2, 
  Lock, 
  FileText,
  Search,
  Filter
} from 'lucide-react';

interface HistoryProps {
  onReopenResult: (result: InspectionResult) => void;
}

export const History: React.FC<HistoryProps> = ({ onReopenResult }) => {
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const records = await fetchServerHistory();
      setHistoryRecords(records);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear your inspection history? This removes local audit entries.')) {
      clearLocalHistory();
      setHistoryRecords([]);
    }
  };

  const handleDownloadSingleJson = (record: HistoryRecord) => {
    const rawJson = {
      is_document: record.results.is_document,
      document_type: record.results.document_type,
      rotation_clockwise: record.results.rotation_clockwise,
      rotation_confidence: record.results.rotation_confidence,
      main_text_readable: record.results.main_text_readable,
      readability_confidence: record.results.readability_confidence,
      is_cropped: record.results.is_cropped,
      cropping_confidence: record.results.cropping_confidence,
      background_clutter: record.results.background_clutter,
      feedback: record.results.feedback,
      recommended_fix: record.results.recommended_fix,
      analysis_status: record.results.analysis_status,
    };
    const blob = new Blob([JSON.stringify(rawJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spasthascan_${record.filename.replace(/\.[^/.]+$/, '')}_results.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredRecords = historyRecords.filter((record) => {
    const matchesSearch = record.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.feedback.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'all' || record.document_type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <HistoryIcon className="w-7 h-7 text-indigo-600" />
            <span>Inspection History</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review past document quality evaluations, inspection metrics, and JSON records.
          </p>
        </div>

        {historyRecords.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="self-start sm:self-auto px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3 text-xs text-slate-600">
        <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-800">Privacy & Data Governance</p>
          <p className="mt-0.5 text-slate-500">
            Inspection metadata is stored locally on this device/browser session. To protect document privacy, raw image files are processed transiently in memory and are <strong>never permanently retained</strong> on the server.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by filename or issue..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <span className="text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Type:
          </span>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="photo">Photo</option>
            <option value="scan">Scan</option>
            <option value="other">Other</option>
            <option value="uncertain">Uncertain</option>
          </select>
        </div>
      </div>

      {/* History Records Table or Empty State */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <p className="text-xs">Loading inspection records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <h4 className="text-sm font-semibold text-slate-700">No inspection history found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No records match your search criteria.'
              : 'Uploaded documents and inspection outcomes will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Readability</th>
                  <th className="py-3 px-4">Cropping</th>
                  <th className="py-3 px-4">Clutter</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.map((record) => {
                  const readableText = record.main_text_readable === true 
                    ? 'Readable' 
                    : record.main_text_readable === false 
                    ? 'Unreadable' 
                    : 'Uncertain';

                  const readableBadgeColor = record.main_text_readable === true
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : record.main_text_readable === false
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';

                  const cropBadgeColor = record.is_cropped === false
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : record.is_cropped === true
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 truncate max-w-[160px]" title={record.filename}>
                        {record.filename}
                      </td>
                      <td className="py-3.5 px-4 uppercase text-[11px] font-medium">
                        {record.document_type}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md font-medium text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {record.document_category || 'General Document'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-medium border text-[11px] ${readableBadgeColor}`}>
                          {readableText}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-medium border text-[11px] ${cropBadgeColor}`}>
                          {record.is_cropped ? 'Cropped' : 'Complete'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 capitalize">
                        {record.background_clutter}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] bg-slate-100 text-slate-700">
                          {record.analysis_status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onReopenResult(record.results)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium transition-colors"
                          title="Reopen Inspection in Workspace"
                        >
                          Reopen
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleJson(record)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium transition-colors"
                          title="Download Inspection JSON"
                        >
                          JSON
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
