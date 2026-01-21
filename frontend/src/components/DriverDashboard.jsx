import React, { useState, useEffect } from 'react';
import { startTrip, logTripState, getActiveTrip } from '../api';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, CheckCircle, LogOut, Truck, Home, PlayCircle, Loader, History, Activity, Languages } from 'lucide-react';
import DriverHistory from './DriverHistory';
import { useLanguage } from '../contexts/LanguageContext';

const DriverDashboard = () => {
    const { t, toggleLanguage, language } = useLanguage();
    const [activeTrip, setActiveTrip] = useState(null);
    const [nextState, setNextState] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locationPermission, setLocationPermission] = useState(null);
    const [currentTab, setCurrentTab] = useState('active'); // 'active' or 'history'
    const navigate = useNavigate();

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                () => { setLocationPermission(true); },
                (err) => {
                    setLocationPermission(false);
                    console.error(err);
                },
                { enableHighAccuracy: true }
            );
        }
        checkActiveTrip();
    }, []);

    const checkActiveTrip = async () => {
        try {
            const trip = await getActiveTrip();
            if (trip) {
                setActiveTrip(trip);
                const lastLog = trip.logs && trip.logs.length > 0 ? trip.logs[trip.logs.length - 1] : null;

                if (!lastLog) {
                    setNextState('Exit Factory');
                } else if (lastLog.state === 'Exit Factory') {
                    setNextState('Arrival at Warehouse');
                } else if (lastLog.state === 'Arrival at Warehouse') {
                    setNextState('Exit Warehouse');
                } else if (lastLog.state === 'Exit Warehouse') {
                    setNextState('choice');
                } else if (lastLog.state === 'Arrival at Factory') {
                    setNextState('completed');
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleStartTrip = async () => {
        setLoading(true);
        try {
            const trip = await startTrip();
            setActiveTrip(trip);
            setNextState('Exit Factory');
        } catch (err) {
            console.error(err);
            setError('Failed to start trip. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getCurrentPosition = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });
    };

    const getAddressFromCoords = async (lat, lon) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();
            return data.display_name || "Unknown Location";
        } catch (err) {
            console.error("Geocoding failed", err);
            return `Lat: ${lat}, Lon: ${lon}`;
        }
    };

    const handleLogState = async (state) => {
        setLoading(true);
        setError('');
        try {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;
            const address = await getAddressFromCoords(latitude, longitude);

            await logTripState(activeTrip.id, state, latitude, longitude, address);

            if (state === 'Exit Factory') setNextState('Arrival at Warehouse');
            else if (state === 'Arrival at Warehouse') setNextState('Exit Warehouse');
            else if (state === 'Exit Warehouse') setNextState('choice');
            else if (state === 'Arrival at Factory') {
                setNextState('completed');
                setActiveTrip(null);
            }

            checkActiveTrip(); // Refresh logs for timeline

        } catch (err) {
            console.error(err);
            if (err && err.code === 1) {
                setError('Location permission denied. Please enable GPS.');
            } else if (err && err.code === 2) {
                setError('Location unavailable. Check GPS signal.');
            } else {
                setError('Failed to log state. Ensure GPS is enabled.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChoice = (choice) => {
        if (choice === 'next_warehouse') {
            setNextState('Arrival at Warehouse');
        } else {
            setNextState('Arrival at Factory');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    const renderActionButtons = () => {
        if (!activeTrip) {
            return (
                <button
                    onClick={handleStartTrip}
                    disabled={loading}
                    className="w-full py-6 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader className="animate-spin" /> : <PlayCircle size={28} />}
                    {loading ? t('starting') : t('startNewTrip')}
                </button>
            );
        }

        if (nextState === 'choice') {
            return (
                <div className="grid grid-cols-1 gap-4 w-full animate-fade-in-up">
                    <div className="bg-yellow-50 p-4 rounded-lg text-yellow-800 text-center mb-2 font-medium border border-yellow-200">
                        {t('warehouseExitQuestion')}<br />{t('whereGoingNext')}
                    </div>
                    <button
                        onClick={() => handleChoice('next_warehouse')}
                        className="w-full py-5 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                    >
                        <Navigation /> {t('goToAnotherWarehouse')}
                    </button>
                    <button
                        onClick={() => handleChoice('return_factory')}
                        className="w-full py-5 bg-green-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                    >
                        <Home /> {t('returnToFactory')}
                    </button>
                </div>
            )
        }

        if (nextState === 'completed') {
            return (
                <div className="p-6 bg-green-100 text-green-800 rounded-xl text-center font-bold text-xl">
                    {t('tripCompleted')}
                </div>
            )
        }

        const getButtonConfig = () => {
            switch (nextState) {
                case 'Exit Factory': return { label: t('logExitFactory'), icon: <Truck />, color: 'bg-indigo-600' };
                case 'Arrival at Warehouse': return { label: t('logArriveWarehouse'), icon: <MapPin />, color: 'bg-purple-600' };
                case 'Exit Warehouse': return { label: t('logExitWarehouse'), icon: <Truck />, color: 'bg-orange-600' };
                case 'Arrival at Factory': return { label: t('logArriveFactoryEnd'), icon: <Home />, color: 'bg-green-600' };
                default: return { label: t('loadingTripState'), icon: <Loader className="animate-spin" />, color: 'bg-gray-400' };
            }
        };

        const config = getButtonConfig();

        return (
            <button
                onClick={() => handleLogState(nextState)}
                disabled={loading || !nextState}
                className={`w-full py-8 ${config.color} text-white rounded-xl font-bold text-2xl shadow-xl hover:opacity-90 transition flex flex-col items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {loading ? <Loader className="animate-spin w-8 h-8" /> : <div className="scale-125">{config.icon}</div>}
                <span>{loading ? t('processing') : config.label}</span>
            </button>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <header className="bg-blue-700 text-white p-4 shadow-md z-10">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Navigation className="w-6 h-6" /> {t('driverPanel')}
                    </h1>
                    <div className="flex items-center gap-4">
                        <span className="text-xs opacity-80">{activeTrip ? `${t('trip')} #${activeTrip.id}` : t('idle')}</span>
                        <button
                            onClick={toggleLanguage}
                            className="p-2 bg-blue-800 rounded-full hover:bg-blue-900 transition"
                            title={language === 'en' ? 'العربية' : 'English'}
                        >
                            <Languages size={16} />
                        </button>
                        <button onClick={handleLogout} className="p-2 bg-blue-800 rounded-full text-xs hover:bg-blue-900 transition">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex mt-4 gap-2">
                    <button
                        onClick={() => setCurrentTab('active')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${currentTab === 'active'
                            ? 'bg-blue-800 text-white shadow-lg'
                            : 'bg-blue-600 text-blue-100 hover:bg-blue-800'
                            }`}
                    >
                        <Activity size={18} />
                        {t('activeTrip')}
                    </button>
                    <button
                        onClick={() => setCurrentTab('history')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${currentTab === 'history'
                            ? 'bg-blue-800 text-white shadow-lg'
                            : 'bg-blue-600 text-blue-100 hover:bg-blue-800'
                            }`}
                    >
                        <History size={18} />
                        {t('tripHistory')}
                    </button>
                </div>
            </header>

            {currentTab === 'active' ? (
                <main className="flex-1 p-6 flex flex-col items-center justify-center gap-6 pb-20 overflow-auto">
                    {error && (
                        <div className="p-4 rounded-lg w-full max-w-md text-center bg-red-100 text-red-700 border border-red-200 shadow-sm">
                            {error}
                        </div>
                    )}

                    {locationPermission === false && (
                        <div className="p-3 bg-yellow-100 text-yellow-800 text-sm rounded-md w-full max-w-md text-center">
                            {t('locationWarning')}
                        </div>
                    )}

                    <div className="w-full max-w-sm flex flex-col items-center gap-6">

                        {/* Trip Timeline */}
                        {activeTrip && activeTrip.logs && activeTrip.logs.length > 0 && (
                            <div className="w-full bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-2">
                                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('tripTimeline')}</h3>
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{activeTrip.logs.length} {t('steps')}</span>
                                </div>

                                <div className="flex flex-col gap-0 relative pl-2">
                                    {/* Vertical Line */}
                                    <div className="absolute left-[19px] top-2 bottom-4 w-0.5 bg-gray-200 -z-10"></div>

                                    {/* Actual Log History */}
                                    {activeTrip.logs.map((log, index) => (
                                        <div key={index} className="flex items-start gap-3 mb-6 last:mb-0 animate-fade-in-right" style={{ animationDelay: `${index * 100}ms` }}>
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 text-green-600 shrink-0 border-2 border-white shadow-sm z-10 box-content">
                                                <CheckCircle size={20} />
                                            </div>
                                            <div className="pt-1">
                                                <p className="font-bold text-gray-800 text-sm leading-tight">{t(log.state) || log.state}</p>
                                                <div className="flex flex-col gap-0.5 mt-1">
                                                    <span className="text-xs text-gray-500 font-mono">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="text-xs text-gray-400 italic leading-snug max-w-[200px] truncate">{log.address ? log.address.split(',')[0] : t('pinnedLocation')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Next Step Placeholder */}
                                    {nextState !== 'completed' && nextState !== 'choice' && (
                                        <div className="flex items-center gap-3 mt-4 opacity-60">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 shrink-0 border-2 border-slate-100 z-10 border-dashed">
                                                <div className="w-2 h-2 bg-slate-300 rounded-full animate-ping"></div>
                                            </div>
                                            <div className="pt-1">
                                                <p className="font-semibold text-slate-400 text-sm italic">{t('next')}: {t(nextState) || t('processing')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {renderActionButtons()}
                    </div>
                </main>
            ) : (
                <DriverHistory />
            )}
        </div>
    );
};

export default DriverDashboard;
