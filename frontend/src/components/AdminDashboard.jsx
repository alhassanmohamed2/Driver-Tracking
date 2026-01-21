import React, { useEffect, useState } from 'react';
import { getTrips, exportTrips, createDriver, getDrivers, updateDriver, deleteDriver, changeAdminPassword, getCars, createCar, deleteCar } from '../api';
import { useNavigate } from 'react-router-dom';
import { Download, LayoutDashboard, LogOut, UserPlus, Car, Users, Trash2, Edit, Save, X, Lock, PlusCircle, MapPin } from 'lucide-react';

const AdminDashboard = () => {
    const [trips, setTrips] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [cars, setCars] = useState([]);
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

    const [message, setMessage] = useState('');
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTrips();
        fetchDrivers();
        fetchCars();
    }, []);

    const fetchTrips = async () => {
        try { setTrips(await getTrips()); } catch (err) { console.error(err); }
    };

    const fetchDrivers = async () => {
        try { setDrivers(await getDrivers()); } catch (err) { console.error(err); }
    };

    const fetchCars = async () => {
        try { setCars(await getCars()); } catch (err) { console.error(err); }
    };

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
            setMessage('Password changed successfully! Please login again.');
            setShowPasswordForm(false);
            setAdminPassword('');
            setTimeout(() => { handleLogout(); }, 1500);
        } catch (err) {
            setMessage('Failed to change password.');
        }
    };

    const handleEditDriverClick = (driver) => {
        // Find car id from driver object (driver.car.id)
        const carId = driver.car ? driver.car.id : (driver.car_id || '');
        setDriverForm({ username: driver.username, password: '', carId: carId });
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

    const handleExport = () => exportTrips(selectedDriver || null);

    const handleViewDetails = (trip) => {
        setSelectedTrip(trip);
        setShowDetailsModal(true);
    };

    const displayedTrips = selectedDriver
        ? trips.filter(t => t.driver_id === parseInt(selectedDriver))
        : trips;

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <LayoutDashboard className="text-blue-600" /> Admin Dashboard
                </h1>
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
                    <div className={`mb-4 p-4 rounded-md text-center ${message.includes('Success') || message.includes('deleted') || message.includes('changed') || message.includes('created') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
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
                                                    {/* Ideally indicate if assigned? Backend doesn't enforce 1-to-1 rigidly but UI suggests it. */}
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
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Trip #{selectedTrip.id} - Full Timeline</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {selectedTrip.driver ? selectedTrip.driver.username : 'Unknown Driver'} •
                                        {selectedTrip.driver && selectedTrip.driver.car ? ` ${selectedTrip.driver.car.plate}` : ''}
                                    </p>
                                </div>
                                <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6">
                                {selectedTrip.logs && selectedTrip.logs.length > 0 ? (
                                    <div className="space-y-4">
                                        {selectedTrip.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((log, index) => (
                                            <div key={index} className="border-l-4 border-blue-400 pl-4 py-2 hover:bg-gray-50 rounded-r transition">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-gray-800">{log.state}</span>
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">
                                                                {new Date(log.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        {log.address && log.latitude && log.longitude ? (
                                                            <a
                                                                href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-sm text-blue-600 hover:text-blue-800 hover:underline mt-2 flex items-start gap-1.5 w-fit group"
                                                            >
                                                                <MapPin size={14} className="mt-0.5 shrink-0 group-hover:scale-110 transition" />
                                                                <span className="break-words">{log.address}</span>
                                                            </a>
                                                        ) : (
                                                            <p className="text-sm text-gray-400 italic mt-1">No location data</p>
                                                        )}
                                                        {log.latitude && log.longitude && (
                                                            <p className="text-xs text-gray-400 mt-1 font-mono">
                                                                GPS: {log.latitude.toFixed(6)}, {log.longitude.toFixed(6)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-500 py-8">No logs recorded for this trip</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'trips' && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Car</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest State</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {displayedTrips.map((trip) => (
                                    <tr key={trip.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#{trip.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{trip.driver ? trip.driver.username : 'Unknown'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trip.driver && trip.driver.car ? trip.driver.car.plate : (trip.driver.car_plate || '-')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(trip.start_date).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${trip.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{trip.status}</span></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {trip.logs && trip.logs.length > 0 ? trip.logs[trip.logs.length - 1].state : 'Started'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleViewDetails(trip)}
                                                className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-medium transition"
                                            >
                                                View Details
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
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
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
