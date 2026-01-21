import React, { useState, useEffect } from 'react';
import { getDriverHistory } from '../api';
import { Calendar, MapPin, Clock, Truck, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const DriverHistory = () => {
    const { t } = useLanguage();
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [expandedTrip, setExpandedTrip] = useState(null);

    useEffect(() => {
        fetchHistory();
    }, [selectedMonth, selectedYear]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const data = await getDriverHistory(selectedMonth, selectedYear);
            setTrips(data);
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoading(false);
        }
    };

    const months = [
        { value: 1, label: t('january') }, { value: 2, label: t('february') },
        { value: 3, label: t('march') }, { value: 4, label: t('april') },
        { value: 5, label: t('may') }, { value: 6, label: t('june') },
        { value: 7, label: t('july') }, { value: 8, label: t('august') },
        { value: 9, label: t('september') }, { value: 10, label: t('october') },
        { value: 11, label: t('november') }, { value: 12, label: t('december') }
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const calculateDuration = (trip) => {
        if (!trip.logs || trip.logs.length === 0) return 'N/A';
        const start = new Date(trip.logs[0].timestamp);
        const end = new Date(trip.logs[trip.logs.length - 1].timestamp);
        const diffMs = end - start;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    const countWarehouses = (trip) => {
        if (!trip.logs) return 0;
        return trip.logs.filter(log => log.state === 'Arrival at Warehouse').length;
    };

    const getRouteEmoji = (trip) => {
        const warehouseCount = countWarehouses(trip);
        const warehouses = Array(warehouseCount).fill('📦').join(' → ');
        return `🏭 → ${warehouses} → 🏭`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Month/Year Selector */}
            <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <Calendar size={20} className="text-blue-600" />
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {months.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Trip List */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">{t('loadingTrips')}</div>
                ) : trips.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <p className="text-gray-500 font-medium">{t('noTripsFound')}</p>
                        <p className="text-gray-400 text-sm mt-1">
                            {t('noTripsMessage')} {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                        </p>
                    </div>
                ) : (
                    trips.map((trip) => {
                        const isExpanded = expandedTrip === trip.id;
                        const duration = calculateDuration(trip);
                        const warehouseCount = countWarehouses(trip);
                        const tripDate = new Date(trip.start_date);

                        return (
                            <div key={trip.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition hover:shadow-md">
                                {/* Card Header */}
                                <div className="p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">✅</span>
                                                <h3 className="font-bold text-gray-800">{t('trip')} #{trip.id}</h3>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {tripDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                        </div>
                                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                            {t('completed')}
                                        </span>
                                    </div>

                                    {/* Route Visual */}
                                    <div className="bg-blue-50 rounded-lg p-3 mb-3">
                                        <p className="text-sm text-center font-medium text-gray-700" style={{ fontSize: '16px', lineHeight: '1.6' }}>
                                            {getRouteEmoji(trip)}
                                        </p>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin size={16} className="text-blue-600" />
                                            <span className="text-gray-700">{warehouseCount} {warehouseCount !== 1 ? t('warehouses') : t('warehouse')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock size={16} className="text-blue-600" />
                                            <span className="text-gray-700">{duration}</span>
                                        </div>
                                    </div>

                                    {/* Toggle Button */}
                                    <button
                                        onClick={() => setExpandedTrip(isExpanded ? null : trip.id)}
                                        className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium text-sm rounded-lg transition flex items-center justify-center gap-2"
                                    >
                                        {isExpanded ? (
                                            <><ChevronUp size={16} /> {t('hideDetails')}</>
                                        ) : (
                                            <><ChevronDown size={16} /> {t('viewDetails')}</>
                                        )}
                                    </button>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && trip.logs && trip.logs.length > 0 && (
                                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                                        <h4 className="font-bold text-gray-700 text-sm mb-3">{t('timeline')}</h4>
                                        <div className="space-y-3">
                                            {trip.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((log, idx) => {
                                                const logDate = new Date(log.timestamp);
                                                const time = logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                const icon = log.state.includes('Factory') ? <Truck size={14} /> : <MapPin size={14} />;

                                                // Check if date changed from previous log
                                                const prevLog = idx > 0 ? trip.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))[idx - 1] : null;
                                                const prevDate = prevLog ? new Date(prevLog.timestamp).toDateString() : null;
                                                const currentDate = logDate.toDateString();
                                                const showDate = !prevDate || prevDate !== currentDate;

                                                return (
                                                    <div key={idx} className="flex items-start gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                                            {icon}
                                                        </div>
                                                        <div className="flex-1 pt-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-medium text-gray-800 text-sm">{t(log.state) || log.state}</span>
                                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">
                                                                    {showDate && (
                                                                        <span className="font-semibold">
                                                                            {logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} •{' '}
                                                                        </span>
                                                                    )}
                                                                    {time}
                                                                </span>
                                                            </div>
                                                            {log.address && (
                                                                <p className="text-xs text-gray-500 mt-1">{log.address.split(',')[0]}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default DriverHistory;
