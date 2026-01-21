import React, { useEffect, useState } from 'react';
import { getTrips, exportTrips, createDriver, getDrivers, updateDriver, deleteDriver, changeAdminPassword, getCars, createCar, deleteCar, deleteTrip, updateTrip, getSettings, updateSettings, uploadLogo } from '../api';
import { useNavigate } from 'react-router-dom';
import { Download, LayoutDashboard, LogOut, UserPlus, Car, Users, Trash2, Edit, Save, X, Lock, PlusCircle, MapPin, Settings, Upload } from 'lucide-react';

const AdminDashboard = () => {
    const [trips, setTrips] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [cars, setCars] = useState([]);
    const [settings, setSettings] = useState({ companyName: '', logoUrl: '' });
    const [viewMode, setViewMode] = useState('trips'); // 'trips', 'drivers', 'cars'
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
    const navigate = useNavigate();

    useEffect(() => {
        // Enforce LTR for Admin Dashboard to prevent RTL context leakage
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = 'en';

        fetchTrips();
        fetchDrivers();
        fetchCars();
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await getSettings();
            setSettings({
                companyName: data.company_name || 'Admin Dashboard',
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

            setMessage('Settings updated successfully!');
            fetchSettings();
            setShowSettingsForm(false);
        } catch (err) {
            setMessage('Failed to update settings.');
        }
    };

    // ... (keep other existing handlers: handleSaveDriver, handleSaveCar, etc.)
    const handleSaveDriver = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            if (editingDriverId) {
                await updateDriver(editingDriverId, driverForm.username, driverForm.password, driverForm.carId);
                setMessage('Driver updated successfully!');
            } else {
                await createDriver(driverForm.username, driverForm.password, driverForm.carId);
                setMessage('Driver created successfully!');
            }
            setDriverForm({ username: '', password: '', carId: '' });
            setShowDriverForm(false);
            setEditingDriverId(null);
            fetchDrivers();
            fetchCars(); // Refresh cars to update assignment status if needed
        } catch (err) {
            setMessage('Failed to save driver. Username might be taken.');
        }
    };

    const handleSaveCar = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await createCar(carForm.plate, carForm.model);
            setMessage('Car added successfully!');
            setCarForm({ plate: '', model: '' });
            setShowCarForm(false);
            fetchCars();
        } catch (err) {
            setMessage('Failed to add car. Plate might ensure be unique.');
        }
    };

    const handleDeleteCar = async (id) => {
        if (window.confirm('Are you sure?')) {
            try {
                await deleteCar(id);
                setMessage('Car deleted.');
                fetchCars();
            } catch (err) {
                setMessage('Failed to delete car. It might be assigned to a driver.');
            }
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await changeAdminPassword(adminPassword);
            setMessage('Password changed successfully.');
            setShowPasswordForm(false);
            setAdminPassword('');
        } catch (err) {
            setMessage('Failed to change password.');
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
        if (window.confirm('Are you sure you want to delete this driver? All their trips will be deleted.')) {
            try {
                await deleteDriver(id);
                setMessage('Driver deleted.');
                fetchDrivers();
                fetchTrips();
                fetchCars(); // Car might become available
            } catch (err) {
                setMessage('Failed to delete driver.');
            }
        }
    };

    const handleDeleteTrip = async (id) => {
        if (window.confirm('Are you sure you want to delete this trip/log?')) {
            try {
                await deleteTrip(id);
                setMessage('Trip deleted successfully.');
                fetchTrips();
            } catch (err) {
                setMessage('Failed to delete trip.');
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

    const handleSaveTrip = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await updateTrip(editingTripId, {
                driver_id: parseInt(tripForm.driverId),
                status: tripForm.status,
                start_date: tripForm.startDate ? new Date(tripForm.startDate).toISOString() : null,
                logs: tripForm.logs.map(l => ({
                    id: l.id,
                    timestamp: l.timestamp ? new Date(l.timestamp).toISOString() : null,
                    address: l.address
                }))
            });
            setMessage('Trip updated successfully!');
            setShowTripEditForm(false);
            fetchTrips();
        } catch (err) {
            setMessage('Failed to update trip.');
        }
    };

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const handleExport = () => exportTrips(selectedDriver || null);

    const handleViewDetails = (trip) => {
        setSelectedTrip(trip);
        setShowDetailsModal(true);
    };

    const displayedTrips = trips.filter(trip => {
        // Driver Filter
        if (selectedDriver && trip.driver_id !== parseInt(selectedDriver)) return false;

        // Date Filter
        if (dateFrom || dateTo) {
            const tripDate = new Date(trip.start_date);
            if (dateFrom && tripDate < new Date(dateFrom)) return false;

            // For "To Date", we set it to end of day to include trips on that day
            if (dateTo) {
                const toDateEnd = new Date(dateTo);
                toDateEnd.setHours(23, 59, 59, 999);
                if (tripDate > toDateEnd) return false;
            }
        }

        return true;
    });

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    {settings.logoUrl && <img src={settings.logoUrl} alt="Logo" className="h-24 w-auto object-contain" />}
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        {!settings.logoUrl && <LayoutDashboard className="text-blue-600" />}
                        <span className="font-branding text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
                            {settings.companyName}
                        </span>
                    </h1>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setViewMode('trips')} className={`px-3 py-1 text-sm font-medium rounded-md transition ${viewMode === 'trips' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Trips</button>
                        <button onClick={() => setViewMode('cars')} className={`px-3 py-1 text-sm font-medium rounded-md transition ${viewMode === 'cars' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Cars</button>
                        <button onClick={() => setViewMode('drivers')} className={`px-3 py-1 text-sm font-medium rounded-md transition ${viewMode === 'drivers' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}>Drivers</button>
                    </div>

                    {viewMode === 'trips' && (
                        <>
                            <select
                                value={selectedDriver}
                                onChange={(e) => setSelectedDriver(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Drivers</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.username}</option>
                                ))}
                            </select>
                            <button onClick={handleExport} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 text-sm font-medium">
                                <Download size={16} /> Export
                            </button>
                        </>
                    )}

                    {viewMode === 'trips' && (
                        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-2 py-1 text-sm border rounded bg-white"
                                title="From Date"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-2 py-1 text-sm border rounded bg-white"
                                title="To Date"
                            />
                            {(dateFrom || dateTo) && (
                                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-500 hover:underline">Clear</button>
                            )}
                        </div>
                    )}

                    {viewMode === 'drivers' && (
                        <button
                            onClick={() => {
                                setDriverForm({ username: '', password: '', carId: '' });
                                setEditingDriverId(null);
                                setShowDriverForm(true);
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                        >
                            <UserPlus size={16} /> Add Driver
                        </button>
                    )}
                    {viewMode === 'cars' && (
                        <button
                            onClick={() => setShowCarForm(true)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2 text-sm font-medium"
                        >
                            <PlusCircle size={16} /> Add Car
                        </button>
                    )}

                    <button onClick={() => setShowSettingsForm(true)} className="p-2 text-gray-500 hover:text-blue-600" title="Company Settings">
                        <Settings size={20} />
                    </button>
                    <button onClick={() => setShowPasswordForm(!showPasswordForm)} className="p-2 text-gray-500 hover:text-blue-600" title="Change Admin Password">
                        <Lock size={20} />
                    </button>
                    <button onClick={handleLogout} className="p-2 text-gray-500 hover:text-red-500" title="Logout">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 p-8 overflow-auto">
                {message && (
                    <div className={`mb-4 p-4 rounded-md text-center ${message.includes('Success') || message.includes('deleted') || message.includes('changed') || message.includes('created') || message.includes('updated') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                {/* Settings Modal */}
                {showSettingsForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                            <button onClick={() => setShowSettingsForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> Company Settings</h3>
                            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                    <input type="text" required className="w-full px-4 py-2 border rounded-lg" value={brandingForm.companyName} onChange={e => setBrandingForm({ ...brandingForm, companyName: e.target.value })} placeholder="My Company" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={e => setLogoFile(e.target.files[0])}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                    </div>
                                    {settings.logoUrl && <div className="mt-2"><span className="text-xs text-gray-500">Current Logo:</span> <img src={settings.logoUrl} alt="Current" className="h-8 inline-block ml-2" /></div>}
                                </div>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Save Settings</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Password Modal */}
                {showPasswordForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                            <button onClick={() => setShowPasswordForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Lock className="w-5 h-5" /> Change Password</h3>
                            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                                <input type="password" required className="w-full px-4 py-2 border rounded-lg" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="New password" />
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Update</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Car Modal */}
                {showCarForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                            <button onClick={() => setShowCarForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Car className="w-5 h-5" /> Add New Car</h3>
                            <form onSubmit={handleSaveCar} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Plate Number</label>
                                    <input type="text" required className="w-full px-4 py-2 border rounded-lg uppercase" value={carForm.plate} onChange={e => setCarForm({ ...carForm, plate: e.target.value })} placeholder="ABC-123" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Model / Description</label>
                                    <input type="text" required className="w-full px-4 py-2 border rounded-lg" value={carForm.model} onChange={e => setCarForm({ ...carForm, model: e.target.value })} placeholder="Toyota Hilux 2024" />
                                </div>
                                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Save Car</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Trip Edit Modal */}
                {showTripEditForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                            <button onClick={() => setShowTripEditForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Edit className="w-5 h-5" /> Edit Trip #{editingTripId}</h3>
                            <form onSubmit={handleSaveTrip} className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                                        <select
                                            className="w-full px-4 py-2 border rounded-lg"
                                            value={tripForm.driverId}
                                            onChange={e => setTripForm({ ...tripForm, driverId: e.target.value })}
                                        >
                                            {drivers.map(d => (
                                                <option key={d.id} value={d.id}>{d.username}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            className="w-full px-4 py-2 border rounded-lg"
                                            value={tripForm.status}
                                            onChange={e => setTripForm({ ...tripForm, status: e.target.value })}
                                        >
                                            <option value="in_progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full px-4 py-2 border rounded-lg"
                                        value={tripForm.startDate}
                                        onChange={e => setTripForm({ ...tripForm, startDate: e.target.value })}
                                    />
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="font-bold text-gray-800 mb-2">Trip Logs / Events</h4>
                                    <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                        {tripForm.logs && tripForm.logs.map((log, index) => (
                                            <div key={log.id} className="p-3 bg-gray-50 rounded-lg border">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-bold text-xs uppercase text-gray-500">{log.state}</span>
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <div>
                                                        <label className="text-xs text-gray-500 block mb-1">Time</label>
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
                                                        <label className="text-xs text-gray-500 block mb-1">Location / Address</label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-2 py-1 text-sm border rounded"
                                                            value={log.address || ''}
                                                            onChange={e => {
                                                                const newLogs = [...tripForm.logs];
                                                                newLogs[index].address = e.target.value;
                                                                setTripForm({ ...tripForm, logs: newLogs });
                                                            }}
                                                            placeholder="Enter location"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Save Changes</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Driver Modal */}
                {showDriverForm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg relative">
                            <button onClick={() => setShowDriverForm(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                {editingDriverId ? <Edit className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                {editingDriverId ? 'Edit Driver' : 'New Driver'}
                            </h3>
                            <form onSubmit={handleSaveDriver} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                    <input type="text" required className="w-full px-4 py-2 border rounded-lg" value={driverForm.username} onChange={e => setDriverForm({ ...driverForm, username: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Password {editingDriverId && '(Leave blank to keep)'}</label>
                                    <input type="text" className="w-full px-4 py-2 border rounded-lg" value={driverForm.password} onChange={e => setDriverForm({ ...driverForm, password: e.target.value })} placeholder={editingDriverId ? "Unchanged" : ""} required={!editingDriverId} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign Car</label>
                                    <div className="relative">
                                        <Car className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                                        <select
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg appearance-none bg-white"
                                            value={driverForm.carId}
                                            onChange={e => setDriverForm({ ...driverForm, carId: e.target.value })}
                                        >
                                            <option value="">-- No Car Assigned --</option>
                                            {cars.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.plate} - {c.model}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">
                                    <Save size={18} inline /> {editingDriverId ? 'Update Driver' : 'Create Driver'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Trip Details Modal */}
                {showDetailsModal && selectedTrip && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto relative">
                            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                                <h3 className="text-xl font-bold flex items-center gap-2"><MapPin className="text-blue-600" /> Trip #{selectedTrip.id} Details</h3>
                                <button onClick={() => setShowDetailsModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Driver</span>
                                        <span className="font-medium text-gray-800">{selectedTrip.driver ? selectedTrip.driver.username : 'Unknown'}</span>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Car</span>
                                        <span className="font-medium text-gray-800">{selectedTrip.driver && selectedTrip.driver.car ? selectedTrip.driver.car.plate : 'N/A'}</span>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Start Time</span>
                                        <span className="font-medium text-gray-800">{new Date(selectedTrip.start_date).toLocaleString()}</span>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Status</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedTrip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                            {selectedTrip.status === 'in_progress' ? 'In Progress' : 'Completed'}
                                        </span>
                                    </div>
                                </div>

                                <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">Timeline Events</h4>
                                <div className="space-y-4 relative pl-4 border-l-2 border-gray-200 ml-2">
                                    {selectedTrip.logs && selectedTrip.logs.length > 0 ? (
                                        selectedTrip.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((log, index) => (
                                            <div key={index} className="relative">
                                                <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white"></div>
                                                <p className="font-bold text-sm text-gray-800">{log.state}</p>
                                                <p className="text-xs text-gray-500 mb-1">{new Date(log.timestamp).toLocaleString()}</p>
                                                {log.address && <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{log.address}</p>}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 italic">No logs recorded yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'trips' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Car</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {displayedTrips.map((trip) => (
                                    <tr key={trip.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{trip.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trip.driver ? trip.driver.username : 'Unknown'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trip.driver && trip.driver.car ? trip.driver.car.plate : 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(trip.start_date).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${trip.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800 '}`}>
                                                {trip.status === 'in_progress' ? 'Active' : 'Completed'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleViewDetails(trip)}
                                                className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-medium transition"
                                            >
                                                Details
                                            </button>
                                            <button
                                                onClick={() => handleEditTripClick(trip)}
                                                className="ml-2 px-2 py-1 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-md text-xs font-medium transition"
                                                title="Edit Trip"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTrip(trip.id)}
                                                className="ml-2 px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-medium transition"
                                                title="Delete Trip"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {displayedTrips.length === 0 && <div className="p-8 text-center text-gray-500">No trips found.</div>}
                    </div>
                )}

                {viewMode === 'drivers' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Car</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {drivers.map((driver) => (
                                    <tr key={driver.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{driver.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{driver.username}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {driver.car ? (
                                                <span className="flex items-center gap-1"><Car size={14} /> {driver.car.plate}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">No Car</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                                            <button onClick={() => handleEditDriverClick(driver)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"><Edit size={16} /></button>
                                            <button onClick={() => handleDeleteDriverClick(driver.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewMode === 'cars' && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plate</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {cars.map((car) => (
                                    <tr key={car.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{car.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{car.plate}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{car.model}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">{car.status}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleDeleteCar(car.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {cars.length === 0 && <div className="p-8 text-center text-gray-500">No cars found. Add one!</div>}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;
