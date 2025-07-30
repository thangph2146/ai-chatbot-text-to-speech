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
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header với thống kê */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Chat Logs</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-600">Tổng Requests</h3>
            <p className="text-2xl font-bold text-blue-800">{totalRequests}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-red-600">Tổng Errors</h3>
            <p className="text-2xl font-bold text-red-800">{totalErrors}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-600">
              Tỷ lệ thành công
            </h3>
            <p className="text-2xl font-bold text-green-800">
              {totalRequests > 0
                ? Math.round(
                    ((totalRequests - totalErrors) / totalRequests) * 100
                  )
                : 0}
              %
            </p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-600">
              Thời gian TB
            </h3>
            <p className="text-2xl font-bold text-purple-800">
              {averageResponseTime > 0 ? Math.round(averageResponseTime) : 0}ms
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <FaFilter className="text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as LogType)}
            className="border border-gray-300 rounded px-3 py-2"
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
          className="border border-gray-300 rounded px-3 py-2 flex-1 min-w-0"
        />

        <button
          onClick={handleExportLogs}
          className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          <FaDownload /> Export
        </button>

        <button
          onClick={handleClearLogs}
          className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          <FaTrash /> Xóa tất cả
        </button>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-2 text-left">
                Thời gian
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Loại
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Tin nhắn
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Response Time
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Status
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {formatTimestamp(log.timestamp)}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getLogTypeColor(
                      log.type
                    )}`}
                  >
                    {log.type.toUpperCase()}
                  </span>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm max-w-xs truncate">
                  {log.message}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {log.responseTime ? `${log.responseTime}ms` : "-"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm">
                  {log.statusCode ? (
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        log.statusCode >= 200 && log.statusCode < 300
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {log.statusCode}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedLog(log.id)}
                      className="text-blue-500 hover:text-blue-700"
                      title="Xem chi tiết"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => handleRemoveLog(log.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Xóa log"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Không có log nào để hiển thị
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLogData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Chi tiết Log</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <strong>ID:</strong> {selectedLogData.id}
              </div>
              <div>
                <strong>Thời gian:</strong>{" "}
                {formatTimestamp(selectedLogData.timestamp)}
              </div>
              <div>
                <strong>Loại:</strong>
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getLogTypeColor(
                    selectedLogData.type
                  )}`}
                >
                  {selectedLogData.type.toUpperCase()}
                </span>
              </div>
              <div>
                <strong>Tin nhắn:</strong>
                <div className="mt-1 p-3 bg-gray-50 rounded text-sm">
                  {selectedLogData.message}
                </div>
              </div>
              {selectedLogData.responseTime && (
                <div>
                  <strong>Response Time:</strong> {selectedLogData.responseTime}
                  ms
                </div>
              )}
              {selectedLogData.statusCode && (
                <div>
                  <strong>Status Code:</strong> {selectedLogData.statusCode}
                </div>
              )}
              {selectedLogData.errorDetails && (
                <div>
                  <strong>Chi tiết lỗi:</strong>
                  <pre className="mt-1 p-3 bg-red-50 rounded text-sm overflow-x-auto">
                    {selectedLogData.errorDetails}
                  </pre>
                </div>
              )}
              {selectedLogData.metadata && (
                <div>
                  <strong>Metadata:</strong>
                  <pre className="mt-1 p-3 bg-gray-50 rounded text-sm overflow-x-auto">
                    {JSON.stringify(selectedLogData.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewer;
