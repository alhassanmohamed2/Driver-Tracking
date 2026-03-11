import React, { useEffect, useState, useMemo } from 'react';
import { getTrips, exportTrips, createDriver, getDrivers, updateDriver, deleteDriver, changeAdminPassword, getCars, createCar, deleteCar, deleteTrip, updateTrip, getSettings, updateSettings, uploadLogo } from '../api';
import { useNavigate } from 'react-router-dom';
import { Download, LayoutDashboard, LogOut, UserPlus, Car, Users, Trash2, Edit, Save, X, Lock, PlusCircle, MapPin, Settings, Upload, Globe, Menu, BarChart3, Activity, Clock, TrendingUp, Truck, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// ══════════════════════════════════════════════════════════════
// DashboardView — Analytics Sub-component
// ══════════════════════════════════════════════════════════════
const DashboardView = ({ trips, drivers, cars, t, isRtl, formatSaudiDate, setViewMode, setStatusFilter, setDateFrom, setDateTo }) => {

    // ── KPI Calculations ──
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const totalTrips = trips.length;
    const activeTrips = trips.filter(tr => tr.status === 'in_progress').length;
    const completedTrips = trips.filter(tr => tr.status === 'completed').length;
    const tripsToday = trips.filter(tr => {
        const d = new Date(tr.start_date); d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    }).length;

    // ── Trip Status Breakdown ──
    const statusData = [
        { name: t('completedTrips'), value: completedTrips },
        { name: t('activeTrips'), value: activeTrips },
    ];

    // ── Recent Activity (last 10 events across all trips) ──
    const recentActivity = useMemo(() => {
        const allLogs = [];
        trips.forEach(tr => {
            if (tr.logs) {
                tr.logs.forEach(log => {
                    allLogs.push({
                        ...log,
                        driverName: tr.driver ? tr.driver.username : t('unknown'),
                        tripId: tr.id,
                    });
                });
            }
        });
        return allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
    }, [trips, t]);

    // ── Vehicle Status Dashboard ──
    const vehicleStatus = useMemo(() => {
        const atFactory = [];
        const atWarehouse = [];
        const outbound = [];
        const inbound = [];

        trips.filter(tr => tr.status === 'in_progress').forEach(tr => {
            if (!tr.logs || tr.logs.length === 0) {
                atFactory.push(tr);
            } else {
                const sortedLogs = [...tr.logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                const latestState = sortedLogs[0].state;
                if (latestState === 'Arrival at Factory') atFactory.push(tr);
                else if (latestState === 'Exit Factory') outbound.push(tr);
                else if (latestState === 'Arrival at Warehouse') atWarehouse.push(tr);
                else if (latestState === 'Exit Warehouse') inbound.push(tr);
                else atFactory.push(tr);
            }
        });

        return { atFactory, atWarehouse, outbound, inbound };
    }, [trips]);

    const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);

    // ── Trip Time Tracking ──
    const tripTimes = useMemo(() => {
        return trips.map(tr => {
            let departureTime = null;
            let returnTime = null;
            let waitingTime = null;

            if (tr.logs && tr.logs.length > 0) {
                const getLogTime = (stateName) => {
                    const log = tr.logs.find(l => l.state === stateName);
                    return log ? new Date(log.timestamp) : null;
                };

                const tExitFactory = getLogTime('Exit Factory');
                const tArriveWarehouse = getLogTime('Arrival at Warehouse');
                const tExitWarehouse = getLogTime('Exit Warehouse');
                const tArriveFactory = getLogTime('Arrival at Factory');
                const now = new Date();

                if (tExitFactory) {
                    departureTime = ((tArriveWarehouse || now) - tExitFactory) / 60000;
                }
                if (tArriveWarehouse) {
                    waitingTime = ((tExitWarehouse || now) - tArriveWarehouse) / 60000;
                }
                if (tExitWarehouse) {
                    returnTime = ((tArriveFactory || now) - tExitWarehouse) / 60000;
                }
            }

            return {
                ...tr,
                departureTime,
                waitingTime,
                returnTime
            };
        });
    }, [trips]);

    const formatTimeMetric = (minutes) => {
        if (minutes === null || minutes === undefined) return '—';
        const h = Math.floor(minutes / 60);
        const m = Math.floor(minutes % 60);
        return `${h}${t('hours').charAt(0)} ${m}${t('minutes').charAt(0)}`;
    };

    const getTimeColorClass = (minutes, isWait) => {
        if (minutes === null || minutes === undefined) return 'bg-gray-200';
        if (isWait) {
            if (minutes < 60) return 'bg-green-500';
            if (minutes < 120) return 'bg-yellow-400';
            return 'bg-red-500';
        } else {
            if (minutes < 120) return 'bg-green-500';
            if (minutes < 240) return 'bg-yellow-400';
            return 'bg-red-500';
        }
    };




    const KPICard = ({ icon: Icon, label, value, color, bgColor, onClick }) => (
        <div
            onClick={onClick}
            className={`${bgColor} rounded-xl p-4 md:p-5 border border-gray-100 shadow-sm transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:ring-2 hover:ring-offset-1 hover:ring-blue-200 hover:-translate-y-1' : ''}`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs md:text-sm font-medium text-gray-500">{label}</p>
                    <p className={`text-2xl md:text-3xl font-bold ${color} mt-1`}>{value}</p>
                </div>
                <div className={`p-2 md:p-3 rounded-full ${bgColor}`}>
                    <Icon className={`${color} w-5 h-5 md:w-6 md:h-6`} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
                <KPICard icon={BarChart3} label={t('totalTrips')} value={totalTrips} color="text-blue-600" bgColor="bg-blue-50" onClick={() => { setViewMode('trips'); setStatusFilter('all'); setDateFrom(''); setDateTo(''); }} />
                <KPICard icon={Activity} label={t('activeTrips')} value={activeTrips} color="text-amber-600" bgColor="bg-amber-50" onClick={() => { setViewMode('trips'); setStatusFilter('in_progress'); setDateFrom(''); setDateTo(''); }} />
                <KPICard icon={CheckCircle2} label={t('completedTrips')} value={completedTrips} color="text-green-600" bgColor="bg-green-50" onClick={() => { setViewMode('trips'); setStatusFilter('completed'); setDateFrom(''); setDateTo(''); }} />
                <KPICard icon={Users} label={t('totalDrivers')} value={drivers.length} color="text-purple-600" bgColor="bg-purple-50" onClick={() => { setViewMode('drivers'); }} />
                <KPICard icon={Truck} label={t('totalCars')} value={cars.length} color="text-indigo-600" bgColor="bg-indigo-50" onClick={() => { setViewMode('cars'); }} />
                <KPICard icon={TrendingUp} label={t('tripsToday')} value={tripsToday} color="text-rose-600" bgColor="bg-rose-50" onClick={() => {
                    setViewMode('trips');
                    setStatusFilter('all');
                    const td = new Date();
                    const yyyy = td.getFullYear();
                    const mm = String(td.getMonth() + 1).padStart(2, '0');
                    const dd = String(td.getDate()).padStart(2, '0');
                    const dateStr = `${yyyy}-${mm}-${dd}`;
                    setDateFrom(dateStr);
                    setDateTo(dateStr);
                }} />
            </div>

            {/* ── Vehicle Status Dashboard ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm md:text-base font-bold text-gray-800">{t('vehicleStatus')}</h3>
                    {selectedStatusFilter && (
                        <button onClick={() => setSelectedStatusFilter(null)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            <X size={14} /> {t('hideDetails')}
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <button
                        onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'atFactory' ? null : 'atFactory')}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${selectedStatusFilter === 'atFactory' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-200'}`}
                    >
                        <MapPin className={`w-6 h-6 mb-2 ${selectedStatusFilter === 'atFactory' ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span className="text-2xl font-bold text-gray-800">{vehicleStatus.atFactory.length}</span>
                        <span className="text-xs font-medium text-gray-500 text-center mt-1">{t('atFactory')}</span>
                    </button>

                    <button
                        onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'outbound' ? null : 'outbound')}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${selectedStatusFilter === 'outbound' ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200' : 'border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-200'}`}
                    >
                        <Truck className={`w-6 h-6 mb-2 ${selectedStatusFilter === 'outbound' ? 'text-amber-600' : 'text-gray-500'}`} />
                        <span className="text-2xl font-bold text-gray-800">{vehicleStatus.outbound.length}</span>
                        <span className="text-xs font-medium text-gray-500 text-center mt-1">{t('outbound')}</span>
                    </button>

                    <button
                        onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'atWarehouse' ? null : 'atWarehouse')}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${selectedStatusFilter === 'atWarehouse' ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200' : 'border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-200'}`}
                    >
                        <MapPin className={`w-6 h-6 mb-2 ${selectedStatusFilter === 'atWarehouse' ? 'text-purple-600' : 'text-gray-500'}`} />
                        <span className="text-2xl font-bold text-gray-800">{vehicleStatus.atWarehouse.length}</span>
                        <span className="text-xs font-medium text-gray-500 text-center mt-1">{t('atWarehouse')}</span>
                    </button>

                    <button
                        onClick={() => setSelectedStatusFilter(selectedStatusFilter === 'inbound' ? null : 'inbound')}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center transition-all ${selectedStatusFilter === 'inbound' ? 'border-green-500 bg-green-50 ring-2 ring-green-200' : 'border-gray-100 bg-gray-50 hover:bg-gray-100 hover:border-gray-200'}`}
                    >
                        <Truck className={`w-6 h-6 mb-2 ${selectedStatusFilter === 'inbound' ? 'text-green-600 transform scale-x-[-1]' : 'text-gray-500 transform scale-x-[-1]'}`} />
                        <span className="text-2xl font-bold text-gray-800">{vehicleStatus.inbound.length}</span>
                        <span className="text-xs font-medium text-gray-500 text-center mt-1">{t('inbound')}</span>
                    </button>
                </div>

                {selectedStatusFilter && (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500">
                                        <th className="py-3 px-4 rounded-l-lg font-medium">{t('tripId')}</th>
                                        <th className="py-3 px-4 font-medium">{t('driver')}</th>
                                        <th className="py-3 px-4 font-medium">{t('startDate')}</th>
                                        <th className="py-3 px-4 rounded-r-lg font-medium text-right">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vehicleStatus[selectedStatusFilter].length > 0 ? (
                                        vehicleStatus[selectedStatusFilter].map((tr) => (
                                            <tr key={tr.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors`}>
                                                <td className="py-3 px-4 font-medium text-gray-800">#{tr.id}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                            {tr.driver ? tr.driver.username.charAt(0).toUpperCase() : '?'}
                                                        </div>
                                                        <span className="font-medium text-gray-700">{tr.driver ? tr.driver.username : t('unknown')}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-gray-600">{formatSaudiDate(tr.start_date)}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <button onClick={() => { setSelectedTrip(tr); setShowDetailsModal(true); }} className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center justify-end gap-1">
                                                        <Activity size={14} /> {t('viewDetails')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="py-8 text-center text-gray-400">
                                                {t('noVehiclesInState')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Trip Time Tracking ── */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6 mb-6 overflow-hidden">
                <h3 className="text-sm md:text-base font-bold text-gray-800 mb-4">{t('tripTimeTracking')}</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500">
                                <th className="py-3 px-4 rounded-l-lg font-medium">{t('tripId')}</th>
                                <th className="py-3 px-4 font-medium">{t('driver')}</th>
                                <th className="py-3 px-4 font-medium">{t('status')}</th>
                                <th className="py-3 px-4 font-medium">{t('departureTime')}</th>
                                <th className="py-3 px-4 font-medium">{t('waitingTime')}</th>
                                <th className="py-3 px-4 rounded-r-lg font-medium">{t('returnTime')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {tripTimes.filter(tr => tr.status === 'in_progress').slice(0, 10).map((tr) => (
                                <tr key={`time-${tr.id}`} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 font-medium text-gray-800">#{tr.id}</td>
                                    <td className="py-3 px-4 text-gray-700">{tr.driver ? tr.driver.username : t('unknown')}</td>
                                    <td className="py-3 px-4">
                                        <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                            {t('active')}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getTimeColorClass(tr.departureTime, false)}`}></span>
                                            <span className="text-gray-600 font-medium">{formatTimeMetric(tr.departureTime)}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getTimeColorClass(tr.waitingTime, true)}`}></span>
                                            <span className="text-gray-600 font-medium">{formatTimeMetric(tr.waitingTime)}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getTimeColorClass(tr.returnTime, false)}`}></span>
                                            <span className="text-gray-600 font-medium">{formatTimeMetric(tr.returnTime)}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {tripTimes.filter(tr => tr.status === 'in_progress').length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-gray-400">
                                        {t('noData')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Additional Analytics ── */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-4 md:gap-6">
                {/* Recent Activity */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6 mb-6">
                    <h3 className="text-sm md:text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-green-500" /> {t('recentActivity')}
                    </h3>
                    {recentActivity.length > 0 ? (
                        <div className="space-y-3 max-h-[320px] overflow-y-auto">
                            {recentActivity.map((log, i) => (
                                <div key={i} className={`flex items-start gap-3 py-2 ${i < recentActivity.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1">
                                            <span className="text-sm font-bold text-gray-800">{log.driverName}</span>
                                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{log.state}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">{formatSaudiDate(log.timestamp)}</p>
                                        {log.address && <p className="text-xs text-gray-400 truncate">{log.address}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center text-gray-400">{t('noData')}</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════
const AdminDashboard = () => {
    const { language, toggleLanguage, t } = useLanguage();
    const isRtl = language === 'ar';

    const [trips, setTrips] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [cars, setCars] = useState([]);
    const [settings, setSettings] = useState({ companyName: '', logoUrl: '' });
    const [viewMode, setViewMode] = useState('dashboard');
    const [selectedDriver, setSelectedDriver] = useState('');

    // Driver Form State
    const [showDriverForm, setShowDriverForm] = useState(false);
    const [editingDriverId, setEditingDriverId] = useState(null);
    const [driverForm, setDriverForm] = useState({ username: '', password: '', carId: '' });

    // Car Form State
    const [showCarForm, setShowCarForm] = useState(false);
    const [carForm, setCarForm] = useState({ plate: '', model: '' });

    // Admin Password Form State
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');

    // Settings Modal State
    const [showSettingsForm, setShowSettingsForm] = useState(false);
    const [brandingForm, setBrandingForm] = useState({ companyName: '' });
    const [logoFile, setLogoFile] = useState(null);

    // Trip Edit Form State
    const [showTripEditForm, setShowTripEditForm] = useState(false);
    const [editingTripId, setEditingTripId] = useState(null);
    const [tripForm, setTripForm] = useState({ driverId: '', status: '', startDate: '', logs: [] });

    const [message, setMessage] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const tripsPerPage = 20;
    const navigate = useNavigate();

    useEffect(() => {
        // Direction is now managed by LanguageContext
        fetchTrips();
        fetchDrivers();
        fetchCars();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await getSettings();
            setSettings({
                companyName: data.company_name || t('adminDashboard'),
                logoUrl: data.company_logo ? `${data.company_logo}?t=${new Date().getTime()}` : ''
            });
            setBrandingForm({ companyName: data.company_name || '' });
        } catch (err) { console.error(err); }
    };

    const fetchTrips = async () => {
        try { setTrips(await getTrips()); } catch (err) { console.error(err); }
    };

    const fetchDrivers = async () => {
        try { setDrivers(await getDrivers()); } catch (err) { console.error(err); }
    };

    const fetchCars = async () => {
        try { setCars(await getCars()); } catch (err) { console.error(err); }
    };

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            let logoUrl = settings.logoUrl;
            if (logoFile) {
                const uploadRes = await uploadLogo(logoFile);
                logoUrl = uploadRes.url;
            }
            await updateSettings({
                company_name: brandingForm.companyName,
                company_logo: logoUrl
            });
            setMessage(t('settingsUpdated'));
            fetchSettings();
            setShowSettingsForm(false);
        } catch (err) {
            setMessage(t('failedUpdateSettings'));
        }
    };

    const handleSaveDriver = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            if (editingDriverId) {
                await updateDriver(editingDriverId, driverForm.username, driverForm.password, driverForm.carId);
                setMessage(t('driverUpdated'));
            } else {
                await createDriver(driverForm.username, driverForm.password, driverForm.carId);
                setMessage(t('driverCreated'));
            }
            setDriverForm({ username: '', password: '', carId: '' });
            setShowDriverForm(false);
            setEditingDriverId(null);
            fetchDrivers();
            fetchCars();
        } catch (err) {
            setMessage(t('failedSaveDriver'));
        }
    };

    const handleSaveCar = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await createCar(carForm.plate, carForm.model);
            setMessage(t('carAdded'));
            setCarForm({ plate: '', model: '' });
            setShowCarForm(false);
            fetchCars();
        } catch (err) {
            setMessage(t('failedAddCar'));
        }
    };

    const handleDeleteCar = async (id) => {
        if (window.confirm(t('confirmDeleteCar'))) {
            try {
                await deleteCar(id);
                setMessage(t('carDeleted'));
                fetchCars();
            } catch (err) {
                setMessage(t('failedDeleteCar'));
            }
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await changeAdminPassword(adminPassword);
            setMessage(t('passwordChanged'));
            setShowPasswordForm(false);
            setAdminPassword('');
        } catch (err) {
            setMessage(t('failedChangePassword'));
        }
    };

    const handleEditDriverClick = (driver) => {
        setDriverForm({
            username: driver.username,
            password: '',
            carId: driver.car_id || ''
        });
        setEditingDriverId(driver.id);
        setShowDriverForm(true);
        setViewMode('drivers');
    };

    const handleDeleteDriverClick = async (id) => {
        if (window.confirm(t('confirmDeleteDriver'))) {
            try {
                await deleteDriver(id);
                setMessage(t('driverDeleted'));
                fetchDrivers();
                fetchTrips();
                fetchCars();
            } catch (err) {
                setMessage(t('failedDeleteDriver'));
            }
        }
    };

    const handleDeleteTrip = async (id) => {
        if (window.confirm(t('confirmDeleteTrip'))) {
            try {
                await deleteTrip(id);
                setMessage(t('tripDeleted'));
                fetchTrips();
            } catch (err) {
                setMessage(t('failedDeleteTrip'));
            }
        }
    };

    const handleEditTripClick = (trip) => {
        setEditingTripId(trip.id);
        setTripForm({
            driverId: trip.driver_id,
            status: trip.status,
            startDate: trip.start_date ? trip.start_date.slice(0, 16) : '',
            logs: trip.logs ? trip.logs.map(l => ({
                id: l.id,
                state: l.state,
                timestamp: l.timestamp,
                address: l.address
            })) : []
        });
        setShowTripEditForm(true);
    };

    // Helper: format a naive Saudi datetime string for display
    const formatSaudiDate = (dateStr) => {
        if (!dateStr) return '';
        const utcStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
        const d = new Date(utcStr);
        return d.toLocaleString(isRtl ? 'ar-SA' : 'en-US', { timeZone: 'UTC' });
    };

    const formatSaudiTime = (dateStr) => {
        if (!dateStr) return '';
        const utcStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
        const d = new Date(utcStr);
        return d.toLocaleTimeString(isRtl ? 'ar-SA' : 'en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
    };

    const handleSaveTrip = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await updateTrip(editingTripId, {
                driver_id: parseInt(tripForm.driverId),
                status: tripForm.status,
                start_date: tripForm.startDate || null,
                logs: tripForm.logs.map(l => ({
                    id: l.id,
                    timestamp: l.timestamp || null,
                    address: l.address
                }))
            });
            setMessage(t('tripUpdated'));
            setShowTripEditForm(false);
            fetchTrips();
        } catch (err) {
            setMessage(t('failedUpdateTrip'));
        }
    };

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const handleExport = () => exportTrips(selectedDriver || null, dateFrom || null, dateTo || null);

    const handleViewDetails = (trip) => {
        setSelectedTrip(trip);
        setShowDetailsModal(true);
    };

    const displayedTrips = trips.filter(trip => {
        if (selectedDriver && trip.driver_id !== parseInt(selectedDriver)) return false;
        if (statusFilter !== 'all' && trip.status !== statusFilter) return false;
        if (dateFrom || dateTo) {
            const tripDate = new Date(trip.start_date);
            if (dateFrom && tripDate < new Date(dateFrom)) return false;
            if (dateTo) {
                const toDateEnd = new Date(dateTo);
                toDateEnd.setHours(23, 59, 59, 999);
                if (tripDate > toDateEnd) return false;
            }
        }
        return true;
    }).sort((a, b) => b.id - a.id);

    const totalPages = Math.ceil(displayedTrips.length / tripsPerPage);
    const paginatedTrips = displayedTrips.slice((currentPage - 1) * tripsPerPage, currentPage * tripsPerPage);

    // Reset to page 1 when filters change
    const resetPage = () => setCurrentPage(1);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    // Message type helper
    const isSuccessMessage = (msg) => {
        const successKeys = ['Updated', 'deleted', 'changed', 'created', 'updated', 'added',
            'بنجاح', 'تم'];
        return successKeys.some(k => msg.includes(k));
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* ═══ STICKY HEADER ═══ */}
            <header className="sticky top-0 bg-white shadow-sm z-20 border-b border-gray-200">
                {/* Top row: Logo + Icons */}
                <div className="p-3 md:p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0">
                        {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="h-12 md:h-16 lg:h-24 w-auto object-contain flex-shrink-0" />}
                        <h1 className="text-lg md:text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-2 truncate">
                            {!settings.logoUrl && <LayoutDashboard className="text-blue-600 flex-shrink-0" size={20} />}
                            <span className="font-branding text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight truncate">
                                {settings.companyName}
                            </span>
                        </h1>
                    </div>

                    {/* Desktop icon buttons */}
                    <div className="hidden md:flex gap-2 items-center flex-shrink-0">
                        <button onClick={toggleLanguage} className="p-2 text-gray-500 hover:text-blue-600 transition" title={t('languageLabel')}>
                            <Globe size={20} />
                        </button>
                        <button onClick={() => setShowSettingsForm(true)} className="p-2 text-gray-500 hover:text-blue-600 transition" title={t('companySettings')}>
                            <Settings size={20} />
                        </button>
                        <button onClick={() => setShowPasswordForm(!showPasswordForm)} className="p-2 text-gray-500 hover:text-blue-600 transition" title={t('changePassword')}>
                            <Lock size={20} />
                        </button>
                        <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-500 transition" title={t('logout')}>
                            <LogOut size={20} />
                        </button>
                    </div>

                    {/* Mobile hamburger + key icons */}
                    <div className="flex md:hidden gap-1 items-center flex-shrink-0">
                        <button onClick={toggleLanguage} className="p-2 text-gray-500 hover:text-blue-600" title={t('languageLabel')}>
                            <Globe size={18} />
                        </button>
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-500 hover:text-blue-600">
                            <Menu size={20} />
                        </button>
                    </div>
                </div>

                {/* Mobile dropdown menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-100 bg-gray-50 p-3 flex flex-wrap gap-2">
                        <button onClick={() => { setShowSettingsForm(true); setMobileMenuOpen(false); }} className="flex items-center gap-1 px-3 py-2 text-sm bg-white rounded-lg border text-gray-700">
                            <Settings size={14} /> {t('companySettings')}
                        </button>
                        <button onClick={() => { setShowPasswordForm(true); setMobileMenuOpen(false); }} className="flex items-center gap-1 px-3 py-2 text-sm bg-white rounded-lg border text-gray-700">
                            <Lock size={14} /> {t('changePassword')}
                        </button>
                        <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 rounded-lg border border-red-200 text-red-600">
                            <LogOut size={14} /> {t('logout')}
                        </button>
                    </div>
                )}

                {/* Second row: Tabs + Filters */}
                <div className="px-3 md:px-4 pb-3 flex flex-wrap gap-2 md:gap-4 items-center">
                    {/* View mode tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setViewMode('dashboard')} className={`px-3 py-1 text-xs md:text-sm font-medium rounded-md transition ${viewMode === 'dashboard' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>{t('dashboard')}</button>
                        <button onClick={() => setViewMode('trips')} className={`px-3 py-1 text-xs md:text-sm font-medium rounded-md transition ${viewMode === 'trips' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>{t('trips')}</button>
                        <button onClick={() => setViewMode('cars')} className={`px-3 py-1 text-xs md:text-sm font-medium rounded-md transition ${viewMode === 'cars' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>{t('cars')}</button>
                        <button onClick={() => setViewMode('drivers')} className={`px-3 py-1 text-xs md:text-sm font-medium rounded-md transition ${viewMode === 'drivers' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>{t('drivers')}</button>
                    </div>

                    {viewMode === 'trips' && (
                        <>
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); resetPage(); }}
                                className="px-2 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded-md text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">{t('statusLabel') || 'Status'}: {t('all') || 'All'}</option>
                                <option value="in_progress">{t('active')}</option>
                                <option value="completed">{t('completed')}</option>
                            </select>
                            <select
                                value={selectedDriver}
                                onChange={(e) => setSelectedDriver(e.target.value)}
                                className="px-2 md:px-4 py-1.5 md:py-2 border border-gray-300 rounded-md text-xs md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">{t('allDrivers')}</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.username}</option>
                                ))}
                            </select>
                            <button onClick={handleExport} className="px-3 md:px-4 py-1.5 md:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium">
                                <Download size={14} /> {t('exportBtn')}
                            </button>
                            <div className="flex items-center gap-1 md:gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-1 md:px-2 py-1 text-xs md:text-sm border rounded bg-white w-28 md:w-auto" title={t('fromDate')} />
                                <span className="text-gray-400">-</span>
                                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-1 md:px-2 py-1 text-xs md:text-sm border rounded bg-white w-28 md:w-auto" title={t('toDate')} />
                                {(dateFrom || dateTo) && (
                                    <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-500 hover:underline">{t('clear')}</button>
                                )}
                            </div>
                        </>
                    )}

                    {viewMode === 'drivers' && (
                        <button
                            onClick={() => {
                                setDriverForm({ username: '', password: '', carId: '' });
                                setEditingDriverId(null);
                                setShowDriverForm(true);
                            }}
                            className="px-3 md:px-4 py-1.5 md:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium"
                        >
                            <UserPlus size={14} /> {t('addDriver')}
                        </button>
                    )}
                    {viewMode === 'cars' && (
                        <button
                            onClick={() => setShowCarForm(true)}
                            className="px-3 md:px-4 py-1.5 md:py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-1 md:gap-2 text-xs md:text-sm font-medium"
                        >
                            <PlusCircle size={14} /> {t('addCar')}
                        </button>
                    )}
                </div>
            </header>

            {/* ═══ MAIN CONTENT ═══ */}
            <main className="flex-1 p-3 md:p-8 overflow-auto">
                {message && (
                    <div className={`mb-4 p-3 md:p-4 rounded-md text-center text-sm md:text-base ${isSuccessMessage(message) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                {/* ═══ MODALS ═══ */}

                {/* Settings Modal */}
                {showSettingsForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                            <button onClick={() => setShowSettingsForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> {t('companySettings')}</h3>
                            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('companyNameLabel')}</label>
                                    <input type="text" required className="w-full px-4 py-2 border rounded-lg" value={brandingForm.companyName} onChange={e => setBrandingForm({ ...brandingForm, companyName: e.target.value })} placeholder={t('companyNameLabel')} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('logo')}</label>
                                    <div className="flex items-center gap-2">
                                        <input type="file" accept="image/*" onChange={e => setLogoFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                                    </div>
                                    {settings.logoUrl && <div className="mt-2"><span className="text-xs text-gray-500">{t('currentLogo')}</span> <img src={settings.logoUrl} alt="Current" className="h-8 inline-block ml-2" /></div>}
                                </div>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">{t('saveSettings')}</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Password Modal */}
                {showPasswordForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                            <button onClick={() => setShowPasswordForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Lock className="w-5 h-5" /> {t('changePassword')}</h3>
                            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                                <input type="password" required className="w-full px-4 py-2 border rounded-lg" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder={t('newPassword')} />
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">{t('update')}</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Car Modal */}
                {showCarForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                            <button onClick={() => setShowCarForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Car className="w-5 h-5" /> {t('addCar')}</h3>
                            <form onSubmit={handleSaveCar} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('plateNumber')}</label>
                                    <input type="text" required className="w-full px-4 py-2 border rounded-lg uppercase" value={carForm.plate} onChange={e => setCarForm({ ...carForm, plate: e.target.value })} placeholder="ABC-123" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('modelDescription')}</label>
                                    <input type="text" required className="w-full px-4 py-2 border rounded-lg" value={carForm.model} onChange={e => setCarForm({ ...carForm, model: e.target.value })} placeholder="Toyota Hilux 2024" />
                                </div>
                                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">{t('saveCar')}</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Trip Edit Modal */}
                {showTripEditForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
                            <button onClick={() => setShowTripEditForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Edit className="w-5 h-5" /> {t('editTrip')} #{editingTripId}</h3>
                            <form onSubmit={handleSaveTrip} className="flex flex-col gap-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('driverLabel')}</label>
                                        <select className="w-full px-4 py-2 border rounded-lg" value={tripForm.driverId} onChange={e => setTripForm({ ...tripForm, driverId: e.target.value })}>
                                            {drivers.map(d => (
                                                <option key={d.id} value={d.id}>{d.username}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('statusLabel')}</label>
                                        <select className="w-full px-4 py-2 border rounded-lg" value={tripForm.status} onChange={e => setTripForm({ ...tripForm, status: e.target.value })}>
                                            <option value="in_progress">{t('inProgress')}</option>
                                            <option value="completed">{t('completed')}</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('startDate')}</label>
                                    <input type="datetime-local" className="w-full px-4 py-2 border rounded-lg" value={tripForm.startDate} onChange={e => setTripForm({ ...tripForm, startDate: e.target.value })} />
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="font-bold text-gray-800 mb-2">{t('tripLogsEvents')}</h4>
                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                        {tripForm.logs && tripForm.logs.map((log, index) => (
                                            <div key={log.id} className="p-3 bg-gray-50 rounded-lg border">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-xs uppercase text-gray-500">{t(log.state) || log.state}</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <div>
                                                        <label className="text-xs text-gray-500 block mb-1">{t('timeLabel')}</label>
                                                        <input
                                                            type="datetime-local"
                                                            className="w-full px-2 py-1 text-sm border rounded"
                                                            value={log.timestamp ? log.timestamp.slice(0, 16) : ''}
                                                            onChange={e => {
                                                                const newLogs = [...tripForm.logs];
                                                                newLogs[index].timestamp = e.target.value;
                                                                setTripForm({ ...tripForm, logs: newLogs });
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 block mb-1">{t('locationAddress')}</label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-2 py-1 text-sm border rounded"
                                                            value={log.address || ''}
                                                            onChange={e => {
                                                                const newLogs = [...tripForm.logs];
                                                                newLogs[index].address = e.target.value;
                                                                setTripForm({ ...tripForm, logs: newLogs });
                                                            }}
                                                            placeholder={t('enterLocation')}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">{t('saveChanges')}</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Driver Modal */}
                {showDriverForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative">
                            <button onClick={() => setShowDriverForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                {editingDriverId ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                {editingDriverId ? t('editDriver') : t('newDriver')}
                            </h3>
                            <form onSubmit={handleSaveDriver} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('username')}</label>
                                    <input type="text" required className="w-full px-4 py-2 border rounded-lg" value={driverForm.username} onChange={e => setDriverForm({ ...driverForm, username: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('passwordLabel')} {editingDriverId && t('passwordKeep')}</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg" value={driverForm.password} onChange={e => setDriverForm({ ...driverForm, password: e.target.value })} placeholder={editingDriverId ? "" : ""} required={!editingDriverId} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('assignCar')}</label>
                                    <div className="relative">
                                        <Car className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5 text-gray-400 w-5 h-5`} />
                                        <select
                                            className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border rounded-lg appearance-none bg-white`}
                                            value={driverForm.carId}
                                            onChange={e => setDriverForm({ ...driverForm, carId: e.target.value })}
                                        >
                                            <option value="">{t('noCarAssigned')}</option>
                                            {cars.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.plate} - {c.model}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">
                                    <Save size={18} className="inline" /> {editingDriverId ? t('updateDriver') : t('createDriver')}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Trip Details Modal */}
                {showDetailsModal && selectedTrip && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto relative">
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex justify-between items-center">
                                <h3 className="text-lg md:text-xl font-bold flex items-center gap-2"><MapPin className="text-blue-600" /> {t('tripDetails')} #{selectedTrip.id}</h3>
                                <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                            </div>
                            <div className="p-4 md:p-6">
                                <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">{t('driverLabel')}</span>
                                        <span className="font-medium text-gray-800">{selectedTrip.driver ? selectedTrip.driver.username : t('unknown')}</span>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">{t('carLabel')}</span>
                                        <span className="font-medium text-gray-800">{selectedTrip.driver && selectedTrip.driver.car ? selectedTrip.driver.car.plate : t('na')}</span>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">{t('startTime')}</span>
                                        <span className="font-medium text-gray-800">{formatSaudiDate(selectedTrip.start_date)}</span>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">{t('statusLabel')}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedTrip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                            {selectedTrip.status === 'in_progress' ? t('inProgress') : t('completed')}
                                        </span>
                                    </div>
                                </div>

                                <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">{t('timelineEvents')}</h4>
                                <div className={`space-y-4 relative ${isRtl ? 'pr-4 border-r-2' : 'pl-4 border-l-2'} border-gray-200 ${isRtl ? 'mr-2' : 'ml-2'}`}>
                                    {selectedTrip.logs && selectedTrip.logs.length > 0 ? (
                                        selectedTrip.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((log, index) => (
                                            <div key={index} className="relative">
                                                <div className={`absolute ${isRtl ? '-right-[21px]' : '-left-[21px]'} top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white`}></div>
                                                <p className="font-bold text-sm text-gray-800">{t(log.state) || log.state}</p>
                                                <p className="text-xs text-gray-500 mb-1">{formatSaudiDate(log.timestamp)}</p>
                                                {log.address && <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{log.address}</p>}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 italic">{t('noLogsYet')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ═══ ANALYTICS DASHBOARD ═══ */}
                {viewMode === 'dashboard' && <DashboardView trips={trips} drivers={drivers} cars={cars} t={t} isRtl={isRtl} formatSaudiDate={formatSaudiDate} setViewMode={setViewMode} setStatusFilter={setStatusFilter} setDateFrom={setDateFrom} setDateTo={setDateTo} />}

                {/* ═══ TRIPS TABLE ═══ */}
                {viewMode === 'trips' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 md:px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('idLabel')}</th>
                                    <th className="px-3 md:px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('driverLabel')}</th>
                                    <th className="hidden sm:table-cell px-3 md:px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('carLabel')}</th>
                                    <th className="px-3 md:px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('startTime')}</th>
                                    <th className="px-3 md:px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('statusLabel')}</th>
                                    <th className="px-3 md:px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedTrips.map((trip) => (
                                    <tr key={trip.id} className="hover:bg-gray-50">
                                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm text-gray-500">#{trip.id}</td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trip.driver ? trip.driver.username : t('unknown')}</td>
                                        <td className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm text-gray-500">{trip.driver && trip.driver.car ? trip.driver.car.plate : t('na')}</td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm text-gray-500">{formatSaudiDate(trip.start_date)}</td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${trip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                {trip.status === 'in_progress' ? t('active') : t('completed')}
                                            </span>
                                        </td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-end text-sm font-medium">
                                            <button onClick={() => handleViewDetails(trip)} className="px-2 md:px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-medium transition">
                                                {t('details')}
                                            </button>
                                            <button onClick={() => handleEditTripClick(trip)} className={`${isRtl ? 'mr-1 md:mr-2' : 'ml-1 md:ml-2'} px-2 py-1 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-md text-xs font-medium transition`} title={t('editTrip')}>
                                                <Edit size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteTrip(trip.id)} className={`${isRtl ? 'mr-1 md:mr-2' : 'ml-1 md:ml-2'} px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-medium transition`} title={t('delete')}>
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {displayedTrips.length === 0 && <div className="p-8 text-center text-gray-500">{t('noTripsFoundAdmin')}</div>}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                                <span className="text-sm text-gray-600">
                                    {displayedTrips.length} {t('trips')} — {currentPage} / {totalPages}
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 text-sm rounded-md border bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                    >
                                        {isRtl ? '›' : '‹'}
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                                        .reduce((acc, p, i, arr) => {
                                            if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                                            acc.push(p);
                                            return acc;
                                        }, [])
                                        .map((p, i) =>
                                            p === '...' ? (
                                                <span key={`dot-${i}`} className="px-2 text-gray-400">…</span>
                                            ) : (
                                                <button
                                                    key={p}
                                                    onClick={() => setCurrentPage(p)}
                                                    className={`px-3 py-1 text-sm rounded-md border transition ${currentPage === p
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {p}
                                                </button>
                                            )
                                        )}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 text-sm rounded-md border bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                    >
                                        {isRtl ? '‹' : '›'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ═══ DRIVERS TABLE ═══ */}
                {viewMode === 'drivers' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 md:px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('idLabel')}</th>
                                    <th className="px-3 md:px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('username')}</th>
                                    <th className="hidden sm:table-cell px-3 md:px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('assignedCar')}</th>
                                    <th className="px-3 md:px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {drivers.map((driver) => (
                                    <tr key={driver.id} className="hover:bg-gray-50">
                                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm text-gray-500">#{driver.id}</td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm font-medium text-gray-900">{driver.username}</td>
                                        <td className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm text-gray-500">
                                            {driver.car ? (
                                                <span className="flex items-center gap-1"><Car size={14} /> {driver.car.plate}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">{t('noCar')}</span>
                                            )}
                                        </td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-end text-sm font-medium flex justify-end gap-1 md:gap-2">
                                            <button onClick={() => handleEditDriverClick(driver)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"><Edit size={16} /></button>
                                            <button onClick={() => handleDeleteDriverClick(driver.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ═══ CARS TABLE ═══ */}
                {viewMode === 'cars' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 md:px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('idLabel')}</th>
                                    <th className="px-3 md:px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('plate')}</th>
                                    <th className="hidden sm:table-cell px-3 md:px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('model')}</th>
                                    <th className="px-3 md:px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">{t('statusLabel')}</th>
                                    <th className="px-3 md:px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {cars.map((car) => (
                                    <tr key={car.id} className="hover:bg-gray-50">
                                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm text-gray-500">#{car.id}</td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm font-bold text-gray-900">{car.plate}</td>
                                        <td className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-sm text-gray-600">{car.model}</td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap"><span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{car.status}</span></td>
                                        <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-end text-sm font-medium">
                                            <button onClick={() => handleDeleteCar(car.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {cars.length === 0 && <div className="p-8 text-center text-gray-500">{t('noCarsFound')}</div>}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;
