"use client";

import React, { useState, useMemo } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { clearLogs, removeLogById } from "@/store/slices/chatLogSlice";
import { FaTrash, FaEye, FaFilter, FaDownload } from "react-icons/fa";

type LogType = "all" | "request" | "response" | "error";

const LogViewer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { logs, totalRequests, totalErrors, averageResponseTime } =
    useAppSelector((state) => state.chatLog);
  const [filter, setFilter] = useState<LogType>("all");
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Lọc theo loại
    if (filter !== "all") {
      filtered = filtered.filter((log) => log.type === filter);
    }

    // Lọc theo từ khóa tìm kiếm
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.userId &&
            log.userId.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  }, [logs, filter, searchTerm]);

  const handleClearLogs = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tất cả log?")) {
      dispatch(clearLogs());
    }
  };

  const handleRemoveLog = (logId: string) => {
    dispatch(removeLogById(logId));
  };

  const handleExportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `chat-logs-${
      new Date().toISOString().split("T")[0]
    }.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case "request":
        return "text-blue-600 bg-blue-50";
      case "response":
        return "text-green-600 bg-green-50";
      case "error":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("vi-VN");
  };

  const selectedLogData = selectedLog
    ? logs.find((log) => log.id === selectedLog)
    : null;

  return (
    <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl border border-blue-100 p-8">
      {/* Header với thống kê */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-blue-800 bg-clip-text text-transparent mb-6">Chat Logs</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-700 to-blue-800 p-6 rounded-xl shadow-lg border border-blue-600">
            <h3 className="text-sm font-semibold text-blue-100 mb-2">Tổng Requests</h3>
            <p className="text-3xl font-bold text-white">{totalRequests}</p>
          </div>
          <div className="bg-gradient-to-br from-red-700 to-red-800 p-6 rounded-xl shadow-lg border border-red-600">
            <h3 className="text-sm font-semibold text-red-100 mb-2">Tổng Errors</h3>
            <p className="text-3xl font-bold text-white">{totalErrors}</p>
          </div>
          <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl shadow-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-700 mb-2">
              Tỷ lệ thành công
            </h3>
            <p className="text-3xl font-bold text-blue-800">
              {totalRequests > 0
                ? Math.round(
                    ((totalRequests - totalErrors) / totalRequests) * 100
                  )
                : 0}
              %
            </p>
          </div>
          <div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl shadow-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-700 mb-2">
              Thời gian TB
            </h3>
            <p className="text-3xl font-bold text-blue-800">
              {averageResponseTime > 0 ? Math.round(averageResponseTime) : 0}ms
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-blue-200">
          <FaFilter className="text-blue-700 w-4 h-4" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as LogType)}
            className="border-0 bg-transparent text-blue-800 font-medium focus:outline-none focus:ring-0"
          >
            <option value="all">Tất cả</option>
            <option value="request">Request</option>
            <option value="response">Response</option>
            <option value="error">Error</option>
          </select>
        </div>

        <input
          type="text"
          placeholder="Tìm kiếm log..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-blue-200 rounded-xl px-4 py-3 flex-1 min-w-0 bg-white/80 backdrop-blur-sm shadow-lg focus:border-blue-700 focus:ring-2 focus:ring-blue-700 focus:ring-opacity-30 transition-all duration-200 text-blue-800 placeholder-blue-400"
        />

        <button
          onClick={handleExportLogs}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-700 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-800 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
        >
          <FaDownload className="w-4 h-4" /> Export
        </button>

        <button
          onClick={handleClearLogs}
          className="flex items-center gap-2 bg-gradient-to-r from-red-700 to-red-800 text-white px-6 py-3 rounded-xl hover:from-red-800 hover:to-red-900 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
        >
          <FaTrash className="w-4 h-4" /> Xóa tất cả
        </button>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-blue-200">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-blue-700 to-blue-800">
              <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-600 last:border-r-0">
                Thời gian
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-600 last:border-r-0">
                Loại
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-600 last:border-r-0">
                Tin nhắn
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-600 last:border-r-0">
                Response Time
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white border-r border-blue-600 last:border-r-0">
                Status
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log, index) => (
              <tr key={log.id} className={`transition-all duration-200 hover:bg-blue-50/50 ${index % 2 === 0 ? 'bg-white/50' : 'bg-blue-50/20'}`}>
                <td className="px-6 py-4 text-sm text-blue-800 border-r border-blue-100 last:border-r-0">
                  {formatTimestamp(log.timestamp)}
                </td>
                <td className="px-6 py-4 border-r border-blue-100 last:border-r-0">
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getLogTypeColor(
                      log.type
                    )}`}
                  >
                    {log.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm max-w-xs truncate text-blue-800 border-r border-blue-100 last:border-r-0">
                  {log.message}
                </td>
                <td className="px-6 py-4 text-sm text-blue-800 border-r border-blue-100 last:border-r-0">
                  {log.responseTime ? `${log.responseTime}ms` : "-"}
                </td>
                <td className="px-6 py-4 text-sm border-r border-blue-100 last:border-r-0">
                  {log.statusCode ? (
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        log.statusCode >= 200 && log.statusCode < 300
                          ? "bg-gradient-to-r from-blue-700 to-blue-800 text-white"
                          : "bg-gradient-to-r from-red-700 to-red-800 text-white"
                      }`}
                    >
                      {log.statusCode}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedLog(log.id)}
                      className="p-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                      title="Xem chi tiết"
                    >
                      <FaEye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveLog(log.id)}
                      className="p-2 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                      title="Xóa log"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 mx-4">
              <div className="text-blue-700 text-lg font-semibold mb-2">
                Không có log nào để hiển thị
              </div>
              <div className="text-blue-600 text-sm">
                Hãy thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLogData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-2xl border border-blue-200 max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Chi tiết Log</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-white hover:text-blue-200 text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-600/50 transition-all duration-200"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">

              <div className="space-y-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200 shadow-lg">
                  <div className="text-sm font-semibold text-blue-700 mb-2">ID:</div>
                  <div className="text-blue-800 font-mono text-sm">{selectedLogData.id}</div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200 shadow-lg">
                  <div className="text-sm font-semibold text-blue-700 mb-2">Thời gian:</div>
                  <div className="text-blue-800">{formatTimestamp(selectedLogData.timestamp)}</div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200 shadow-lg">
                  <div className="text-sm font-semibold text-blue-700 mb-3">Loại:</div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${getLogTypeColor(
                      selectedLogData.type
                    )}`}
                  >
                    {selectedLogData.type.toUpperCase()}
                  </span>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200 shadow-lg">
                  <div className="text-sm font-semibold text-blue-700 mb-3">Tin nhắn:</div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-sm text-blue-800 border border-blue-200">
                    {selectedLogData.message}
                  </div>
                </div>
                
                {selectedLogData.responseTime && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200 shadow-lg">
                    <div className="text-sm font-semibold text-blue-700 mb-2">Response Time:</div>
                    <div className="text-blue-800 font-semibold">{selectedLogData.responseTime}ms</div>
                  </div>
                )}
                
                {selectedLogData.statusCode && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200 shadow-lg">
                    <div className="text-sm font-semibold text-blue-700 mb-3">Status Code:</div>
                    <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                      selectedLogData.statusCode >= 200 && selectedLogData.statusCode < 300
                        ? "bg-gradient-to-r from-blue-700 to-blue-800 text-white"
                        : "bg-gradient-to-r from-red-700 to-red-800 text-white"
                    }`}>
                      {selectedLogData.statusCode}
                    </span>
                  </div>
                )}
                
                {selectedLogData.errorDetails && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-red-200 shadow-lg">
                    <div className="text-sm font-semibold text-red-700 mb-3">Chi tiết lỗi:</div>
                    <pre className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 text-sm overflow-x-auto text-red-800 border border-red-200">
                      {selectedLogData.errorDetails}
                    </pre>
                  </div>
                )}
                
                {selectedLogData.metadata && (
                  <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200 shadow-lg">
                    <div className="text-sm font-semibold text-blue-700 mb-3">Metadata:</div>
                    <pre className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-sm overflow-x-auto text-blue-800 border border-blue-200">
                      {JSON.stringify(selectedLogData.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewer;
