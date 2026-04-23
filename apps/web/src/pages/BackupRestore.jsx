import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import api from '../lib/api';
import { 
  Database, Download, Upload, Trash2, Clock, AlertCircle, 
  CheckCircle, FileJson, Calendar, HardDrive, RefreshCw,
  ChevronDown, ChevronUp, Shield, X
} from 'lucide-react';

export default function BackupRestore() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState(null);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [expandedBackup, setExpandedBackup] = useState(null);

  // Load backup list and stats on mount
  useEffect(() => {
    loadBackups();
    loadStats();
  }, [loadBackups, loadStats]);

  const loadBackups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/backups');
      setBackups(res.data.backups || []);
    } catch (err) {
      console.error('Failed to load backups:', err);
      setError('Failed to load backup list');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/backups/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load backup stats:', err);
    }
  }, []);

  const createBackup = async () => {
    try {
      setBackupInProgress(true);
      setError('');
      setSuccess('');
      
      const res = await api.post('/backups', {}, {
        headers: { 'X-CSRF-Token': await getCsrfToken() }
      });
      
      setSuccess(`Backup created successfully: ${res.data.filename}`);
      loadBackups();
      loadStats();
    } catch (err) {
      console.error('Failed to create backup:', err);
      setError(err.response?.data?.error || 'Failed to create backup');
    } finally {
      setBackupInProgress(false);
    }
  };

  const restoreBackup = async (backupId) => {
    try {
      setRestoreInProgress(true);
      setError('');
      setSuccess('');
      
      await api.post(`/backups/${backupId}/restore`, {}, {
        headers: { 'X-CSRF-Token': await getCsrfToken() }
      });
      
      setSuccess('Data restored successfully! Please refresh the page.');
      setShowRestoreConfirm(false);
      setSelectedBackup(null);
    } catch (err) {
      console.error('Failed to restore backup:', err);
      setError(err.response?.data?.error || 'Failed to restore backup');
    } finally {
      setRestoreInProgress(false);
    }
  };

  const restoreFromFile = async () => {
    if (!uploadFile) {
      setError('Please select a backup file to upload');
      return;
    }

    try {
      setRestoreInProgress(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('backup', uploadFile);

      await api.post('/backups/restore-file', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'X-CSRF-Token': await getCsrfToken()
        }
      });

      setSuccess('Data restored from file successfully! Please refresh the page.');
      setUploadFile(null);
    } catch (err) {
      console.error('Failed to restore from file:', err);
      setError(err.response?.data?.error || 'Failed to restore from file');
    } finally {
      setRestoreInProgress(false);
    }
  };

  const deleteBackup = async (backupId) => {
    try {
      setLoading(true);
      setError('');
      
      await api.delete(`/backups/${backupId}`, {
        headers: { 'X-CSRF-Token': await getCsrfToken() }
      });
      
      setSuccess('Backup deleted successfully');
      setShowDeleteConfirm(false);
      setSelectedBackup(null);
      loadBackups();
      loadStats();
    } catch (err) {
      console.error('Failed to delete backup:', err);
      setError(err.response?.data?.error || 'Failed to delete backup');
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (backupId, filename) => {
    try {
      const res = await api.get(`/backups/${backupId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download backup:', err);
      setError('Failed to download backup');
    }
  };

  const getCsrfToken = async () => {
    try {
      const res = await api.get('/csrf-token');
      return res.data.csrfToken;
    } catch {
      return '';
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  const toggleExpand = (backupId) => {
    setExpandedBackup(expandedBackup === backupId ? null : backupId);
  };

  return (
    <div className="page-container min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Backup & Restore
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your ScreenSprout data backups. Create backups before making major changes,
            or restore from a previous point in time.
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3 text-green-700 dark:text-green-400">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <Database className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Backups</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalBackups}</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <HardDrive className="w-5 h-5 text-purple-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Storage Used</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatSize(stats.totalSize)}</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Latest Backup</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.latestBackup ? new Date(stats.latestBackup).toLocaleDateString() : 'Never'}
              </p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-orange-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Data Records</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRecords?.toLocaleString() || 0}</p>
            </div>
          </div>
        )}

        {/* Actions Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Create Backup Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Backup</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Export all your data</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-4 text-sm text-gray-600 dark:text-gray-400">
              <p>This will backup:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All children profiles</li>
                <li>Device configurations</li>
                <li>Screen time data</li>
                <li>Settings and preferences</li>
                <li>Goals and rewards</li>
              </ul>
            </div>
            
            <button
              onClick={createBackup}
              disabled={backupInProgress}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              {backupInProgress ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Create Full Backup
                </>
              )}
            </button>
          </div>

          {/* Restore Backup Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Upload className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Restore from File</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Upload a backup file</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload a previously exported backup file to restore your data.
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Warning: This will replace all current data!
              </p>
            </div>
            
            <div className="space-y-3">
              <input
                type="file"
                accept=".json,.backup"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 dark:file:bg-gray-700 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-gray-600"
              />
              
              <button
                onClick={restoreFromFile}
                disabled={!uploadFile || restoreInProgress}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
              >
                {restoreInProgress ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Restore from File
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Backup List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Backup History
            </h2>
          </div>
          
          {loading && backups.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
              Loading backups...
            </div>
          ) : backups.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No backups found</p>
              <p className="text-sm mt-1">Create your first backup to protect your data</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {backups.map((backup) => (
                <div key={backup.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <FileJson className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{backup.filename}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(backup.created_at)} • {formatSize(backup.size)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpand(backup.id)}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="View details"
                      >
                        {expandedBackup === backup.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => downloadBackup(backup.id, backup.filename)}
                        className="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedBackup(backup);
                          setShowRestoreConfirm(true);
                        }}
                        className="p-2 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                        title="Restore"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedBackup(backup);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {expandedBackup === backup.id && backup.metadata && (
                    <div className="mt-4 ml-12 p-4 bg-gray-50 dark:bg-gray-750 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Backup Contents</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Children:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">{backup.metadata.children || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Devices:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">{backup.metadata.devices || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Activities:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">{backup.metadata.activities || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Version:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">{backup.metadata.version || '1.0'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && selectedBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Restore</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to restore from <strong>{selectedBackup.filename}</strong>?
            </p>
            
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
              <p className="text-sm text-amber-800 dark:text-amber-400">
                <strong>Warning:</strong> This will replace all current data with the backup data. 
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowRestoreConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => restoreBackup(selectedBackup.id)}
                disabled={restoreInProgress}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg font-medium transition-colors"
              >
                {restoreInProgress ? 'Restoring...' : 'Restore Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Backup</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete <strong>{selectedBackup.filename}</strong>? 
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteBackup(selectedBackup.id)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
              >
                {loading ? 'Deleting...' : 'Delete Backup'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
