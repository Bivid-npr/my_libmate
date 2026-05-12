// src/pages/admin/SmokeAlertsPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaFire, FaExclamationTriangle, FaCheckCircle, FaMicrochip, FaCheckDouble } from 'react-icons/fa';
import { io } from 'socket.io-client';
import { adminAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const SmokeAlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [resolvingAll, setResolvingAll] = useState(false);
  const { showToast } = useToast();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getSmokeAlerts();
      setAlerts(data || []);
    } catch (error) {
      showToast('Failed to load smoke alerts', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Add this after the socket useEffect in SmokeAlertsPage.jsx
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchAlerts();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchAlerts]);

  const socketRef = useRef(null);

  useEffect(() => {
    fetchAlerts();

    // Prevent duplicate connections from React StrictMode
    if (socketRef.current) return;

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    socketRef.current = io({ query: { token } });

    socketRef.current.on('connect', () => {
      fetchAlerts();
    });

    socketRef.current.on('new_notification', (data) => {
      fetchAlerts();
    });

    return () => {
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleResolve = async (alertId) => {
    setResolving(alertId);
    try {
      await adminAPI.resolveSmokeAlert(alertId, 'Resolved by admin');
      setAlerts(prev => prev.map(a => 
        a.alert_id === alertId ? { ...a, status: 'resolved', resolved_at: new Date().toISOString() } : a
      ));
      showToast('Alert resolved', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to resolve', 'error');
    } finally {
      setResolving(null);
    }
  };

  const handleResolveAll = async () => {
    if (!window.confirm(`Resolve all ${activeAlerts} active alerts?`)) return;
    setResolvingAll(true);
    try {
      const activeAlertIds = alerts.filter(a => a.status === 'active').map(a => a.alert_id);
      for (const id of activeAlertIds) {
        await adminAPI.resolveSmokeAlert(id, 'Bulk resolved by admin');
      }
      setAlerts(prev => prev.map(a => 
        a.status === 'active' ? { ...a, status: 'resolved', resolved_at: new Date().toISOString() } : a
      ));
      showToast(`Resolved ${activeAlertIds.length} alerts`, 'success');
    } catch (error) {
      showToast(error.message || 'Failed to resolve all', 'error');
    } finally {
      setResolvingAll(false);
    }
  };

  const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      // The DB stores Nepal time but JS treats it as UTC
      // Append +05:45 to tell JS it's Nepal time, not UTC
      const fixedDate = dateString + '+05:45';
      const date = new Date(fixedDate);
      return date.toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: true
      });
  };

  const activeAlerts = alerts.filter(a => a.status === 'active').length;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-[#9A8478] mt-1 font-medium">
            IoT smoke detection monitoring
            {activeAlerts > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                {activeAlerts} active
              </span>
            )}
          </p>
        </div>
        {activeAlerts > 1 && (
          <button
            onClick={handleResolveAll}
            disabled={resolvingAll}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-sm font-medium disabled:opacity-50"
          >
            <FaCheckDouble size={14} />
            {resolvingAll ? 'Resolving...' : 'Resolve All'}
          </button>
        )}
      </div>

      {activeAlerts > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <FaExclamationTriangle className="text-red-500 text-xl mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-700">Active Smoke Alert!</h3>
            <p className="text-sm text-red-600">There {activeAlerts === 1 ? 'is' : 'are'} {activeAlerts} unresolved smoke alert{activeAlerts > 1 ? 's' : ''}. Please investigate immediately.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-[#EAE0D0] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-[#C4895A] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaCheckCircle className="text-green-500 text-2xl" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[#2C1F14] mb-2">All Clear</h3>
            <p className="text-[#9A8478] text-sm">No smoke alerts detected. The system is monitoring.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F3EDE3] border-b border-[#EAE0D0]">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Device</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Sensor Value</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Threshold</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Detected</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Resolved</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#2C1F14] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D0]">
                {alerts.map((alert) => (
                  <tr key={alert.alert_id} className={`hover:bg-[#FAF7F2] transition ${alert.status === 'active' ? 'bg-red-50/50' : ''}`}>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                        alert.status === 'active' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {alert.status === 'active' ? <><FaFire size={10} /> Active</> : <><FaCheckCircle size={10} /> Resolved</>}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <FaMicrochip className="text-[#9A8478]" size={12} />
                        <span className="text-sm text-[#2C1F14] font-mono">{alert.device_id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-[#4A3728] font-mono">{alert.sensor_value?.toFixed(1)}</td>
                    <td className="py-3 px-4 text-sm text-[#9A8478]">{alert.threshold_value}</td>
                    <td className="py-3 px-4 text-sm text-[#4A3728]">{formatDate(alert.detected_at)}</td>
                    <td className="py-3 px-4 text-sm text-[#9A8478]">
                      {alert.resolved_at ? formatDate(alert.resolved_at) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {alert.status === 'active' && (
                        <button
                          onClick={() => handleResolve(alert.alert_id)}
                          disabled={resolving === alert.alert_id}
                          className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                        >
                          {resolving === alert.alert_id ? 'Resolving...' : 'Resolve'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmokeAlertsPage;