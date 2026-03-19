import React, { useState, useEffect } from 'react';
import { startTrip, logTripState, getActiveTrip, getSettings, logFuelRefill } from '../api';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, CheckCircle, LogOut, Truck, Home, PlayCircle, RotateCcw, History, Activity, Languages, Droplets, Camera, X } from 'lucide-react';
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
    const [settings, setSettings] = useState({ companyName: '', logoUrl: '' });
    const [showFuelModal, setShowFuelModal] = useState(false);
    const [fuelForm, setFuelForm] = useState({ amount: '', indicatorImg: null, machineImg: null });
    const [fuelLoading, setFuelLoading] = useState(false);
    const [fuelError, setFuelError] = useState('');
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
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await getSettings();
            setSettings({
                companyName: data.company_name || t('driverPanel'),
                logoUrl: data.company_logo ? `${data.company_logo}?t=${new Date().getTime()}` : ''
            });
        } catch (err) { console.error(err); }
    };

    const checkActiveTrip = async () => {
        try {
            const trip = await getActiveTrip();
            if (trip) {
                setActiveTrip(trip);
                const lastLog = trip.logs && trip.logs.length > 0 ? trip.logs[trip.logs.length - 1] : null;

                if (!lastLog) {
                    setNextState('EXIT_FACTORY');
                } else if (lastLog.state === 'EXIT_FACTORY') {
                    setNextState('ARRIVE_WAREHOUSE');
                } else if (lastLog.state === 'ARRIVE_WAREHOUSE') {
                    setNextState('EXIT_WAREHOUSE');
                } else if (lastLog.state === 'EXIT_WAREHOUSE') {
                    setNextState('choice');
                } else if (lastLog.state === 'ARRIVE_FACTORY') {
                    setNextState('COMPLETED');
                } else {
                    // Fallback for any unrecognized state
                    setNextState('EXIT_FACTORY');
                }
            } else {
                // No active trip — reset state
                setActiveTrip(null);
                setNextState(null);
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
                timeout: 5000,
                maximumAge: 5000
            });
        });
    };

    const getAddressFromCoords = async (lat, lon) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);
            const data = await response.json();
            return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        } catch (err) {
            return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        }
    };

    const handleLogState = async (state) => {
        setLoading(true);
        setError('');
        try {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;

            // Send state immediately with coordinates — don't wait for geocoding
            const coordsAddress = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            await logTripState(activeTrip.id, state, latitude, longitude, coordsAddress);

            // Update UI state immediately
            if (state === 'EXIT_FACTORY') setNextState('ARRIVE_WAREHOUSE');
            else if (state === 'ARRIVE_WAREHOUSE') setNextState('EXIT_WAREHOUSE');
            else if (state === 'EXIT_WAREHOUSE') setNextState('choice');
            else if (state === 'ARRIVE_FACTORY') {
                setNextState('COMPLETED');
                setActiveTrip(null);
            }

            // Refresh timeline in background (non-blocking)
            checkActiveTrip();

        } catch (err) {
            console.error(err);
            if (err && err.code === 1) {
                setError(t('locationDenied') || 'Location permission denied. Please enable GPS.');
            } else if (err && err.code === 2) {
                setError(t('locationUnavailable') || 'Location unavailable. Check GPS signal.');
            } else {
                setError(t('failedToLogState') || 'Failed to log state. Ensure GPS is enabled.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChoice = (choice) => {
        if (choice === 'next_warehouse') {
            setNextState('ARRIVE_WAREHOUSE');
        } else {
            setNextState('ARRIVE_FACTORY');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    const handleFuelSubmit = async (e) => {
        e.preventDefault();
        if (!fuelForm.amount || !fuelForm.indicatorImg || !fuelForm.machineImg) {
            setFuelError(t('fuelRequiredFields'));
            return;
        }

        if (!activeTrip) {
            setFuelError(t('noActiveTripForFuel') || 'No active trip. Start a trip first to log fuel.');
            return;
        }

        setFuelLoading(true);
        setFuelError('');
        try {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;
            const address = await getAddressFromCoords(latitude, longitude);

            await logFuelRefill(activeTrip.id, {
                amount_liters: fuelForm.amount,
                latitude,
                longitude,
                address,
                indicator_img: fuelForm.indicatorImg,
                machine_img: fuelForm.machineImg
            });

            setShowFuelModal(false);
            setFuelForm({ amount: '', indicatorImg: null, machineImg: null });
            setFuelError('');
            alert(t('fuelLoggedSuccess'));
        } catch (err) {
            console.error(err);
            setFuelError(t('failedLogFuel'));
        } finally {
            setFuelLoading(false);
        }
    };

    const renderActionButtons = () => {
        if (!activeTrip) {
            return (
                <button
                    onClick={handleStartTrip}
                    disabled={loading}
                    className="w-full py-6 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <RotateCcw className="animate-spin" /> : <PlayCircle size={28} />}
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

        if (nextState === 'COMPLETED') {
            return (
                <div className="p-6 bg-green-100 text-green-800 rounded-xl text-center font-bold text-xl">
                    {t('tripCompleted')}
                </div>
            )
        }

        const getButtonConfig = () => {
            switch (nextState) {
                case 'EXIT_FACTORY': return { label: t('logExitFactory'), icon: <Truck />, color: 'bg-indigo-600' };
                case 'ARRIVE_WAREHOUSE': return { label: t('logArriveWarehouse'), icon: <MapPin />, color: 'bg-purple-600' };
                case 'EXIT_WAREHOUSE': return { label: t('logExitWarehouse'), icon: <Truck />, color: 'bg-orange-600' };
                case 'ARRIVE_FACTORY': return { label: t('logArriveFactoryEnd'), icon: <Home />, color: 'bg-green-600' };
                default: return { label: t('loadingTripState'), icon: <RotateCcw className="animate-spin" />, color: 'bg-gray-400' };
            }
        };

        const config = getButtonConfig();

        return (
            <button
                onClick={() => handleLogState(nextState)}
                disabled={loading || !nextState}
                className={`w-full py-8 ${config.color} text-white rounded-xl font-bold text-2xl shadow-xl hover:opacity-90 transition flex flex-col items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                {loading ? <RotateCcw className="animate-spin w-8 h-8" /> : <div className="scale-125">{config.icon}</div>}
                <span>{loading ? t('processing') : config.label}</span>
            </button>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 relative">
            <header className="bg-blue-700 text-white p-4 shadow-md z-10">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" className="h-20 w-auto bg-white rounded-lg p-1 shadow-sm" />
                        ) : (
                            <Navigation className="w-8 h-8" />
                        )}
                        <h1 className="text-xl font-bold font-branding tracking-wide">
                            {settings.companyName || t('driverPanel')}
                        </h1>
                    </div>
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
                <main className="flex-1 p-6 flex flex-col items-center justify-center gap-6 pb-24 overflow-auto">
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
                                                    <span className="text-xs text-gray-500 font-mono">{new Date(log.timestamp.endsWith('Z') ? log.timestamp : log.timestamp + 'Z').toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}</span>
                                                    <span className="text-xs text-gray-400 italic leading-snug max-w-[200px] truncate">{log.address ? log.address.split(',')[0] : t('pinnedLocation')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Next Step Placeholder */}
                                    {nextState !== 'COMPLETED' && nextState !== 'choice' && (
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

            {/* Floating Fuel Button — always visible, bottom-right */}
            <button
                onClick={() => { setShowFuelModal(true); setFuelError(''); }}
                className="fixed bottom-6 right-6 w-16 h-16 bg-yellow-500 text-white rounded-full shadow-2xl hover:bg-yellow-600 active:scale-95 transition-all flex items-center justify-center z-40"
                title={t('logFuelRefill')}
            >
                <Droplets size={28} />
            </button>

            {/* Fuel Refill Modal */}
            {showFuelModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md relative animate-zoom-in">
                        <button onClick={() => { setShowFuelModal(false); setFuelError(''); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-yellow-600">
                            <Droplets /> {t('logFuelRefill')}
                        </h3>

                        {!activeTrip && (
                            <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-200">
                                {t('noActiveTripForFuel') || 'You need an active trip to log a fuel refill. Please start a trip first.'}
                            </div>
                        )}

                        {fuelError && (
                            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                                {fuelError}
                            </div>
                        )}

                        <form onSubmit={handleFuelSubmit} className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">{t('fuelAmountLiters')}</label>
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:border-yellow-500 focus:outline-none text-lg font-bold" 
                                    value={fuelForm.amount} 
                                    onChange={e => setFuelForm({ ...fuelForm, amount: e.target.value })} 
                                    placeholder="Ex: 450"
                                    required 
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">{t('fuelIndicatorPhoto')}</label>
                                    <div 
                                        className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition overflow-hidden relative ${fuelForm.indicatorImg ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-yellow-400'}`}
                                        onClick={() => document.getElementById('indicator-input').click()}
                                    >
                                        {fuelForm.indicatorImg ? (
                                            <img src={URL.createObjectURL(fuelForm.indicatorImg)} className="w-full h-full object-cover" />
                                        ) : (
                                            <><Camera className="text-slate-400" size={32} /><span className="text-[10px] text-slate-400 text-center px-2">{t('uploadPhoto')}</span></>
                                        )}
                                        <input id="indicator-input" type="file" accept="image/*" capture="environment" hidden onChange={e => setFuelForm({ ...fuelForm, indicatorImg: e.target.files[0] })} />
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">{t('petrolMachinePhoto')}</label>
                                    <div 
                                        className={`h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition overflow-hidden relative ${fuelForm.machineImg ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-yellow-400'}`}
                                        onClick={() => document.getElementById('machine-input').click()}
                                    >
                                        {fuelForm.machineImg ? (
                                            <img src={URL.createObjectURL(fuelForm.machineImg)} className="w-full h-full object-cover" />
                                        ) : (
                                            <><Camera className="text-slate-400" size={32} /><span className="text-[10px] text-slate-400 text-center px-2">{t('uploadPhoto')}</span></>
                                        )}
                                        <input id="machine-input" type="file" accept="image/*" capture="environment" hidden onChange={e => setFuelForm({ ...fuelForm, machineImg: e.target.files[0] })} />
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={fuelLoading || !activeTrip}
                                className="w-full py-4 bg-yellow-600 text-white font-bold rounded-xl shadow-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                            >
                                {fuelLoading ? <RotateCcw className="animate-spin" /> : <CheckCircle />}
                                {fuelLoading ? t('uploading') : t('submitRefill')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverDashboard;
