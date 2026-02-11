// src/app/dashboard/page.tsx
'use client';

import React, { JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ModalForm, { FieldDef } from '@/components/ui/ModalForm';
import { listCollection, createDocument, updateDocument, deleteDocument } from '@/services/crudService';
import { db } from '@/lib/firebaseClient';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { toast, Toaster } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  RadialLinearScale,
  BubbleController,
} from 'chart.js';
import { Line, Bar, Doughnut, Radar, Bubble } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import {
  FaIndustry,
  FaUsers,
  FaCar,
  FaChartLine,
  FaDatabase,
  FaTrash,
  FaEdit,
  FaPlus,
  FaDownload,
  FaTimes,
  FaSearch,
  FaFilter,
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
  RadialLinearScale,
  BubbleController
);

type Row = Record<string, any>;

/**
 * Dashboard page
 * - Typed Chart.js options to avoid TypeScript "arithmetic" error
 * - Only PDF download (no JSON)
 * - Filters, search, paginated vehicles grid (scalable)
 * - Enterprises, Users, Assets lists
 * - Derived metrics & many charts
 * - ModalForm usage preserved (use key modalKey to avoid infinite loop)
 */

export default function DashboardPage(): JSX.Element {
  // Data
  const [enterprises, setEnterprises] = useState<Row[]>([]);
  const [vehicles, setVehicles] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Row[]>([]);
  const [users, setUsers] = useState<Row[]>([]);
  const [telemetry, setTelemetry] = useState<Row[]>([]);
  const [analytics, setAnalytics] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [modal, setModal] = useState<{ collection: string; action: 'create' | 'edit'; data?: Row } | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedEnterprise, setSelectedEnterprise] = useState<string | 'all'>('all');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<'all'|'Active'|'Idle'|'Maintenance'>('all');
  const [assetStatusFilter, setAssetStatusFilter] = useState<'all'|'Active'|'defective'|'replaced'>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<string|'all'>('all');
  const [search, setSearch] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);

  // pagination for vehicles
  const [vehiclesPerPage] = useState(24);
  const [vehiclePage, setVehiclePage] = useState(1);

  // report ref (for PDF)
  const reportRef = useRef<HTMLDivElement | null>(null);

  // Load all data once on mount
  useEffect(() => {
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      try {
        const [
          enterprisesRows,
          vehiclesRows,
          assetsRows,
          usersRows,
          telemetryRows,
          analyticsRows,
        ] = await Promise.all([
          listCollection('enterprises'),
          listCollection('vehicles'),
          listCollection('assets'),
          listCollection('users'),
          (async () => {
            const q = query(collection(db, 'telemetry'), orderBy('timestamp', 'desc'), limit(1000));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
          })(),
          listCollection('analytics'),
        ]);
        if (cancelled) return;
        setEnterprises(enterprisesRows);
        setVehicles(vehiclesRows);
        setAssets(assetsRows);
        setUsers(usersRows);
        setTelemetry(telemetryRows);
        setAnalytics(analyticsRows);
      } catch (err) {
        console.error('loadAll error', err);
        toast.error('Failed loading dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
    return () => { cancelled = true; };
  }, []);

  // stable key for ModalForm to avoid it receiving new initialData objects repeatedly (prevents its useEffect loop).
  const modalKey = useMemo(() => {
    if (!modal) return 'modal-none';
    return `${modal.collection}-${modal.action}-${modal.data?.id ?? 'new'}`;
  }, [modal?.collection, modal?.action, modal?.data?.id]);

  // reload single collection
  const reloadCollection = useCallback(async (name: string) => {
    try {
      const rows = await listCollection(name);
      if (name === 'vehicles') setVehicles(rows);
      if (name === 'enterprises') setEnterprises(rows);
      if (name === 'assets') setAssets(rows);
      if (name === 'users') setUsers(rows);
      if (name === 'analytics') setAnalytics(rows);
      toast.success(`${name} reloaded`);
    } catch (err) {
      console.error('reloadCollection', err);
      toast.error(`Failed to reload ${name}`);
    }
  }, []);

  // Create/Update/Delete wrappers
  const handleCreateOrUpdate = useCallback(async (collectionName: string, action: 'create'|'update', payload: any) => {
    try {
      if (action === 'create') await createDocument(collectionName, payload);
      else await updateDocument(collectionName, payload.id, payload);
      toast.success(`${collectionName} ${action === 'create' ? 'created' : 'updated'}`);
      await reloadCollection(collectionName);
    } catch (err: any) {
      console.error('createOrUpdate', err);
      toast.error(`Failed ${action}: ${err?.message ?? err}`);
    }
  }, [reloadCollection]);

  const handleDelete = useCallback(async (collectionName: string, id: string) => {
    if (!confirm('Delete permanently?')) return;
    try {
      await deleteDocument(collectionName, id);
      toast.success(`${collectionName} deleted`);
      await reloadCollection(collectionName);
    } catch (err: any) {
      console.error('delete', err);
      toast.error(`Delete failed: ${err?.message ?? err}`);
    }
  }, [reloadCollection]);

  // quick open helpers
  const openCreate = (collection: string) => setModal({ collection, action: 'create' });
  const openEdit = (collection: string, data: Row) => setModal({ collection, action: 'edit', data });

  // ---------- Derived and filtered datasets ----------
  function matchesSearch(row: Row) {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(row).some(v => String(v ?? '').toLowerCase().includes(s));
  }

  const filteredVehicles = useMemo(() => {
    return vehicles
      .filter(v => selectedEnterprise === 'all' ? true : (v.enterpriseId === selectedEnterprise || v.enterprise_id === selectedEnterprise))
      .filter(v => vehicleStatusFilter === 'all' ? true : (v.status === vehicleStatusFilter))
      .filter(v => showOnlyActive ? (v.status === 'Active' || v.status === 'active') : true)
      .filter(v => matchesSearch(v));
  }, [vehicles, selectedEnterprise, vehicleStatusFilter, showOnlyActive, search]);

  const filteredAssets = useMemo(() => {
    return assets
      .filter(a => selectedEnterprise === 'all' ? true : (a.enterpriseId === selectedEnterprise || a.enterprise_id === selectedEnterprise))
      .filter(a => assetStatusFilter === 'all' ? true : (a.status === assetStatusFilter))
      .filter(a => matchesSearch(a));
  }, [assets, selectedEnterprise, assetStatusFilter, search]);

  const filteredUsers = useMemo(() => {
    return users
      .filter(u => selectedEnterprise === 'all' ? true : (u.enterpriseId === selectedEnterprise || u.enterprise_id === selectedEnterprise))
      .filter(u => userRoleFilter === 'all' ? true : (u.role === userRoleFilter))
      .filter(u => matchesSearch(u));
  }, [users, selectedEnterprise, userRoleFilter, search]);

  const filteredTelemetry = useMemo(() => {
    return telemetry.filter(t => selectedEnterprise === 'all' ? true : (t.enterpriseId === selectedEnterprise || t.enterprise_id === selectedEnterprise));
  }, [telemetry, selectedEnterprise]);

  // pagination for vehicles
  const totalVehiclePages = Math.max(1, Math.ceil(filteredVehicles.length / vehiclesPerPage));
  const paginatedVehicles = useMemo(() => {
    const start = (vehiclePage - 1) * vehiclesPerPage;
    return filteredVehicles.slice(start, start + vehiclesPerPage);
  }, [filteredVehicles, vehiclePage, vehiclesPerPage]);

  // aggregated metrics
  const avgSpeed = useMemo(() => {
    if (!filteredTelemetry.length) return 0;
    const sum = filteredTelemetry.reduce((s, t) => s + Number(t.speed ?? t.speed_kmh ?? 0), 0);
    return +(sum / filteredTelemetry.length).toFixed(1);
  }, [filteredTelemetry]);

  const avgBattery = useMemo(() => {
    if (!filteredTelemetry.length) return 0;
    const sum = filteredTelemetry.reduce((s, t) => s + Number(t.batteryLevel ?? t.battery_level ?? t.battery ?? 0), 0);
    return +(sum / filteredTelemetry.length).toFixed(1);
  }, [filteredTelemetry]);

  const maintenanceDueCount = useMemo(() => {
    let count = 0;
    vehicles.forEach(v => {
      if (v.maintenance_due || v.needs_service || v.status === 'Maintenance') count++;
    });
    if (count === 0) count = Math.round(vehicles.length * 0.05);
    return count;
  }, [vehicles]);

  // fleet health radar
  const vehicleHealthRadarData = useMemo(() => {
    const labels = ['Battery', 'Temperature', 'Speed', 'Uptime', 'Efficiency'];
    const values = [0,0,0,0,0];
    let total = 0;
    filteredVehicles.forEach(v => {
      const vt = telemetry.find(t => (t.vehicleId === v.id || t.vehicle_id === v.id || t.vehicle_vin === v.vin || t.vehicleId === v.vin));
      const battery = Number(vt?.batteryLevel ?? vt?.battery_level ?? 70);
      const temp = Math.max(0, 100 - Math.abs(Number(vt?.temperature ?? 25) - 25) * 2);
      const speed = Math.max(0, 100 - (Number(vt?.speed ?? 20) / 2));
      const uptime = Number(v.uptime ?? v.uptime_percent ?? 90);
      const eff = Number(v.energy_efficiency ?? v.energyEfficiency ?? 75);
      values[0] += battery;
      values[1] += temp;
      values[2] += speed;
      values[3] += uptime;
      values[4] += eff;
      total++;
    });
    if (total === 0) return { labels, values: [50,50,50,50,50] };
    return { labels, values: values.map(v => Math.round(v / total)) };
  }, [filteredVehicles, telemetry]);

  // bubble data (speed samples)
  const bubbleData = useMemo(() => {
    const points = filteredTelemetry.slice(0, 200).map(t => {
      const x = (typeof t.timestamp === 'number') ? t.timestamp : (t.timestamp?.seconds ? t.timestamp.seconds * 1000 : Date.now());
      const y = Number(t.speed ?? 0);
      const b = Number(t.batteryLevel ?? t.battery_level ?? 50);
      const r = Math.max(3, Math.min(12, Math.round(b / 10)));
      return { x, y, r };
    });
    return { datasets: [{ label: 'Speed bubbles', data: points, backgroundColor: 'rgba(59,130,246,0.6)' }] };
  }, [filteredTelemetry]);

  // asset status counts
  const assetStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredAssets.forEach(a => {
      const s = a.status ?? 'Unknown';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [filteredAssets]);

  // top counts for header
  const topCounts = useMemo(() => ({
    enterprises: enterprises.length,
    vehicles: vehicles.length,
    assets: assets.length,
    users: users.length,
    telemetry: telemetry.length,
    analytics: analytics.length,
  }), [enterprises, vehicles, assets, users, telemetry, analytics]);

  // ---------------- Chart.js typed options to avoid TS errors ----------------
  const lineOptions: import('chart.js').ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'nearest' },
    },
    scales: {
      x: { grid: { color: '#0f172a' }, ticks: { color: '#c7d2fe' } },
      y: { grid: { color: '#0f172a' }, ticks: { color: '#c7d2fe' } }
    }
  };

  const barOptions: import('chart.js').ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#c7d2fe' }, grid: { color: '#0f172a' } },
      y: { ticks: { color: '#c7d2fe' }, grid: { color: '#0f172a' } },
    }
  };

  const doughnutOptions: import('chart.js').ChartOptions<'doughnut'> = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom' as const, labels: { color: '#c7d2fe' } },
    }
  };

  const radarOptions: import('chart.js').ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#c7d2fe' } },
    },
    scales: {
      r: {
        grid: { color: '#0f172a' },
        angleLines: { color: '#0f172a' },
        pointLabels: { color: '#c7d2fe' },
      }
    }
  };

  const bubbleOptions: import('chart.js').ChartOptions<'bubble'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { type: 'time', time: { unit: 'hour' }, ticks: { color: '#c7d2fe' } },
      y: { ticks: { color: '#c7d2fe' } },
    }
  };

  // ---------------- PDF export (cover + paginated content) ----------------
  const downloadPDF = useCallback(async () => {
  if (!reportRef.current) {
    toast.error('Nothing to export');
    return;
  }

  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();

    // 📘 Cover Page
    pdf.setFillColor('#0b1220');
    pdf.rect(0, 0, w, h, 'F');
    pdf.setFontSize(22);
    pdf.setTextColor('#fff');
    pdf.text('Smart Enterprise — Dashboard Report', 40, 90);
    pdf.setFontSize(12);
    pdf.setTextColor('#d1d5db');
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 40, 120);
    pdf.addPage();

    // 🖼️ Capture reportRef as an image using html2canvas with CORS-safe config
    const canvas = await html2canvas(reportRef.current!, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      imageTimeout: 0,
      backgroundColor: '#0b1220', // consistent with theme
      logging: false,
      onclone: (doc) => {
        // Fix for images without CORS headers: replace them with proxied data URLs
        const imgs = doc.querySelectorAll('img');
        imgs.forEach((img) => {
          const src = img.getAttribute('src');
          if (src && !src.startsWith('data:') && !src.startsWith(window.location.origin)) {
            // proxy through https://images.weserv.nl to bypass CORS
            const safeURL = `https://images.weserv.nl/?url=${encodeURIComponent(src)}&w=800&output=png`;
            img.setAttribute('src', safeURL);
          }
        });
      },
    });

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const pageWidth = w;
    const pageHeight = h;
    let y = 0;

    // 📄 Multi-page handling
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d')!;

    while (y < imgHeight) {
      const sliceHeight = Math.min(imgHeight - y, Math.round((imgWidth / pageWidth) * pageHeight));
      tmpCanvas.width = imgWidth;
      tmpCanvas.height = sliceHeight;
      tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
      tmpCtx.drawImage(canvas, 0, y, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);
      const pageData = tmpCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(pageData, 'JPEG', 0, 0, pageWidth, (sliceHeight * pageWidth) / imgWidth);
      y += sliceHeight;
      if (y < imgHeight) pdf.addPage();
    }

    // 💾 Save file
    pdf.save(`dashboard_report_${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`);
    toast.success('✅ PDF exported successfully!');
  } catch (err) {
    console.error('❌ downloadPDF failed:', err);
    toast.error('PDF export failed (CORS-protected images skipped)');
  }
}, [reportRef]);



  // ---------------- Field definitions for ModalForm ----------------
  const fieldDefs: Record<string, (initial?: Row) => FieldDef[]> = {
    enterprises: () => [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'industry', label: 'Industry', type: 'text' },
      { key: 'country', label: 'Country', type: 'text' },
      { key: 'image_url', label: 'Image URL', type: 'text' },
    ],
    vehicles: () => [
      { key: 'name', label: 'Vehicle Name', type: 'text' },
      { key: 'vin', label: 'VIN', type: 'text' },
      { key: 'type', label: 'Type', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: [{ label: 'Active', value: 'Active' }, { label: 'Idle', value: 'Idle' }, { label: 'Maintenance', value: 'Maintenance' }] },
      { key: 'image_url', label: 'Image URL', type: 'text' },
    ],
    assets: () => [
      { key: 'name', label: 'Asset Name', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'quantity', label: 'Quantity', type: 'number' },
    ],
    users: () => [
      { key: 'fullname', label: 'Full Name', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'role', label: 'Role', type: 'text' },
    ],
  };

  // ---------------- Rendering ----------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-black text-gray-100 p-6">
      <Toaster position="top-right" richColors />

      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold">SE</div>
          <div>
            <div className="text-2xl font-bold">Smart Enterprise — Modernization Control</div>
            <div className="text-sm text-gray-400">Real-time • Multi-tenant • Enterprise-grade</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-2 bg-white/5 rounded p-2">
            <div className="px-3 py-2 bg-indigo-600 rounded text-white text-sm">Enterprises: {topCounts.enterprises}</div>
            <div className="px-3 py-2 bg-sky-600 rounded text-white text-sm">Vehicles: {topCounts.vehicles}</div>
            <div className="px-3 py-2 bg-emerald-600 rounded text-white text-sm">Assets: {topCounts.assets}</div>
            <div className="px-3 py-2 bg-violet-600 rounded text-white text-sm">Users: {topCounts.users}</div>
          </div>

          <div className="flex items-center bg-slate-800 rounded-lg px-3 py-2 gap-2">
            <FaSearch className="text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent outline-none text-gray-200 w-64" />
            {search ? <button onClick={() => setSearch('')} className="text-gray-300"><FaTimes/></button> : null}
          </div>

          <button onClick={() => setFiltersOpen(s => !s)} className="p-2 bg-white/5 rounded text-gray-200"><FaFilter/></button>
        </div>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} className="bg-white/5 rounded p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Enterprise</div>
                <select className="bg-slate-800 p-2 rounded w-full" value={selectedEnterprise} onChange={(e)=> setSelectedEnterprise(e.target.value as any)}>
                  <option value="all">All Enterprises</option>
                  {enterprises.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                </select>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">Vehicle Status</div>
                <select className="bg-slate-800 p-2 rounded w-full" value={vehicleStatusFilter} onChange={(e)=> setVehicleStatusFilter(e.target.value as any)}>
                  <option value="all">All</option>
                  <option value="Active">Active</option>
                  <option value="Idle">Idle</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">Asset Status</div>
                <select className="bg-slate-800 p-2 rounded w-full" value={assetStatusFilter} onChange={(e)=> setAssetStatusFilter(e.target.value as any)}>
                  <option value="all">All</option>
                  <option value="Active">Active</option>
                  <option value="defective">defective</option>
                  <option value="replaced">replaced</option>
                </select>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-1">User Role</div>
                <select className="bg-slate-800 p-2 rounded w-full" value={userRoleFilter} onChange={(e)=> setUserRoleFilter(e.target.value as any)}>
                  <option value="all">All</option>
                  {[...new Set(users.map(u=>u.role))].filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main report area (captured for PDF) */}
      <div ref={reportRef} className="space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard title="Enterprises" value={topCounts.enterprises} icon={<FaIndustry/>} color="bg-gradient-to-br from-indigo-600 to-purple-600" />
          <StatCard title="Vehicles" value={topCounts.vehicles} icon={<FaCar/>} color="bg-gradient-to-br from-sky-600 to-indigo-600" />
          <StatCard title="Assets" value={topCounts.assets} icon={<FaDatabase/>} color="bg-gradient-to-br from-emerald-600 to-lime-600" />
          <StatCard title="Users" value={topCounts.users} icon={<FaUsers/>} color="bg-gradient-to-br from-violet-600 to-purple-700" />
          <StatCard title="Telemetry" value={topCounts.telemetry} icon={<FaChartLine/>} color="bg-gradient-to-br from-rose-600 to-pink-600" />
          <StatCard title="Analytics" value={topCounts.analytics} icon={<FaChartLine/>} color="bg-gradient-to-br from-yellow-500 to-orange-500" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white/5 rounded p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold">Speed Trend</div>
              <div className="text-xs text-gray-400">Avg {avgSpeed} km/h</div>
            </div>
            <div className="h-56">
              <Line
                data={{
                  datasets: [{
                    label: 'Speed',
                    data: filteredTelemetry.slice(0,200).reverse().map(t => ({ x: (typeof t.timestamp==='number')?t.timestamp:(t.timestamp?.seconds?t.timestamp.seconds*1000:Date.now()), y: Number(t.speed ?? 0) })),
                    borderColor: '#60a5fa',
                    backgroundColor: 'rgba(96,165,250,0.12)',
                    fill: true, tension:0.3
                  }]
                }}
                options={lineOptions}
              />
            </div>
          </div>

          <div className="bg-white/5 rounded p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold">Battery Overview</div>
              <div className="text-xs text-gray-400">Avg {avgBattery}%</div>
            </div>
            <div className="h-56">
              <Bar
                data={{
                  labels: filteredTelemetry.slice(0,100).reverse().map(t => new Date((typeof t.timestamp==='number')?t.timestamp:(t.timestamp?.seconds?t.timestamp.seconds*1000:Date.now())).toLocaleTimeString()),
                  datasets: [{ label: 'Battery', data: filteredTelemetry.slice(0,100).reverse().map(t => Number(t.batteryLevel ?? t.battery_level ?? 0)), backgroundColor: '#34d399' }]
                }}
                options={barOptions}
              />
            </div>
          </div>

          <div className="bg-white/5 rounded p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="font-semibold">Temperature</div>
              <div className="text-xs text-gray-400">Realtime</div>
            </div>
            <div className="h-56">
              <Line
                data={{
                  datasets: [{
                    label: 'Temperature',
                    data: filteredTelemetry.slice(0,200).reverse().map(t => ({ x: (typeof t.timestamp==='number')?t.timestamp:(t.timestamp?.seconds?t.timestamp.seconds*1000:Date.now()), y: Number(t.temperature ?? t.temp ?? 0) })),
                    borderColor: '#fb7185',
                    backgroundColor: 'rgba(251,113,133,0.08)',
                    fill: true, tension:0.3
                  }]
                }}
                options={lineOptions}
              />
            </div>
          </div>
        </div>

        {/* Mixed analytics row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white/5 rounded p-4">
            <div className="font-semibold mb-2">Asset Status</div>
            <div className="h-40">
              <Doughnut
                data={{
                  labels: Object.keys(assetStatusCounts),
                  datasets: [{ data: Object.values(assetStatusCounts), backgroundColor: ['#34d399','#f59e0b','#f97316','#60a5fa','#e11d48'] }]
                }}
                options={doughnutOptions}
              />
            </div>
          </div>

          <div className="bg-white/5 rounded p-4">
            <div className="font-semibold mb-2">Fleet Health Radar</div>
            <div className="h-40">
              <Radar data={{ labels: vehicleHealthRadarData.labels, datasets: [{ label: 'Fleet', data: vehicleHealthRadarData.values, backgroundColor: 'rgba(99,102,241,0.15)', borderColor:'#6366f1' }] }} options={radarOptions} />
            </div>
          </div>

          <div className="bg-white/5 rounded p-4">
            <div className="font-semibold mb-2">Speed Bubbles</div>
            <div className="h-40">
              <Bubble data={bubbleData} options={bubbleOptions} />
            </div>
          </div>

          <div className="bg-white/5 rounded p-4">
            <div className="font-semibold mb-2">Telemetry Heat by Hour</div>
            <div className="grid grid-cols-6 gap-1 h-40 overflow-hidden rounded">
              {(() => {
                const counts = new Array(24).fill(0);
                filteredTelemetry.forEach(t => {
                  const ts = (typeof t.timestamp === 'number') ? t.timestamp : (t.timestamp?.seconds ? t.timestamp.seconds * 1000 : Date.now());
                  const h = new Date(ts).getHours();
                  counts[h] = (counts[h] || 0) + 1;
                });
                const max = Math.max(1, ...counts);
                return counts.map((c, idx) => {
                  const alpha = 0.12 + (c / max) * 0.78;
                  const bg = `rgba(59,130,246,${Math.min(0.95, alpha)})`;
                  return (
                    <div key={idx} className="flex flex-col items-center justify-center text-xs text-white rounded" style={{ background: bg }}>
                      <div className="font-semibold">{idx}:00</div>
                      <div className="text-sm">{c}</div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>

        {/* Vehicles section (paginated grid) */}
        <div className="bg-white/5 rounded p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="font-semibold text-lg">Vehicles</div>
            <div className="flex items-center gap-2">
              <button onClick={() => openCreate('vehicles')} className="bg-indigo-600 px-3 py-2 rounded flex items-center gap-2"><FaPlus/> Add Vehicle</button>
              <button onClick={downloadPDF} className="bg-blue-600 px-3 py-2 rounded flex items-center gap-2"><FaDownload/> Download PDF</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedVehicles.map(v => (
              <div key={v.id} className="bg-slate-800 rounded-lg p-3 flex flex-col items-center text-center border border-white/5">
                {v.image_url ? (
                  <img src={v.image_url} alt={v.name || v.vin || v.id} className="w-36 h-44 object-cover rounded mb-3" />
                ) : (
                  <div className="w-36 h-44 bg-slate-700 rounded mb-3 flex items-center justify-center text-gray-400">No Image</div>
                )}
                <div className="font-semibold">{v.name || v.vin || 'Unnamed'}</div>
                <div className="text-xs text-gray-400">{v.type ?? 'Vehicle'}</div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => openEdit('vehicles', v)} className="px-2 py-1 rounded bg-indigo-600">Edit</button>
                  <button onClick={() => handleDelete('vehicles', v.id)} className="px-2 py-1 rounded bg-rose-600">Delete</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-300">Showing {((vehiclePage-1)*vehiclesPerPage)+1} - {Math.min(vehiclePage*vehiclesPerPage, filteredVehicles.length)} of {filteredVehicles.length}</div>
            <div className="flex items-center gap-2">
              <button disabled={vehiclePage <= 1} onClick={() => setVehiclePage(p => Math.max(1, p-1))} className="px-3 py-1 rounded bg-white/5 disabled:opacity-40">Prev</button>
              <div className="text-sm">Page {vehiclePage} / {totalVehiclePages}</div>
              <button disabled={vehiclePage >= totalVehiclePages} onClick={() => setVehiclePage(p => Math.min(totalVehiclePages, p+1))} className="px-3 py-1 rounded bg-white/5 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>

        {/* Enterprises, Users, Assets columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Enterprises */}
          <div className="bg-white/5 rounded p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold">Enterprises</div>
              <div className="text-xs text-gray-400">{enterprises.length} total</div>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
              {enterprises.map(en => (
                <div key={en.id} className="flex items-center gap-3 bg-slate-800 rounded p-2">
                  <div className="w-12 h-12 rounded overflow-hidden bg-slate-700 flex items-center justify-center">
                    {en.image_url ? <img src={en.image_url} alt={en.name} className="w-full h-full object-cover"/> : <div className="text-sm text-gray-400">No</div>}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{en.name}</div>
                    <div className="text-xs text-gray-400">{en.industry ?? en.country}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit('enterprises', en)} className="text-blue-300 p-1"><FaEdit/></button>
                    <button onClick={() => handleDelete('enterprises', en.id)} className="text-rose-400 p-1"><FaTrash/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Users */}
          <div className="bg-white/5 rounded p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold">Users</div>
              <div className="text-xs text-gray-400">{users.length} total</div>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
              {filteredUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 bg-slate-800 rounded p-2">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium">{(u.fullname || u.name || 'U').slice(0,1)}</div>
                  <div className="flex-1">
                    <div className="font-medium">{u.fullname || u.name || u.email}</div>
                    <div className="text-xs text-gray-400">{u.role ?? '—'} • {u.email ?? ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit('users', u)} className="text-blue-300 p-1"><FaEdit/></button>
                    <button onClick={() => handleDelete('users', u.id)} className="text-rose-400 p-1"><FaTrash/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assets */}
          <div className="bg-white/5 rounded p-4">
            <div className="flex justify-between items-center mb-3">
              <div className="font-semibold">Assets</div>
              <div className="text-xs text-gray-400">{assets.length} total</div>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
              {filteredAssets.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-slate-800 rounded p-2">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-gray-400">{a.category ?? ''}</div>
                  </div>
                  <div className="text-sm text-gray-300">{a.status ?? '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div> {/* reportRef area end */}

      {/* ModalForm */}
      <AnimatePresence>
        {modal && (
          <ModalForm
            key={modalKey}
            title={`${modal.action === 'create' ? 'Create' : 'Edit'} ${modal.collection}`}
            fields={fieldDefs[modal.collection]?.(modal.data) || []}
            initialData={modal.data ?? {}}
            open={true}
            onClose={() => setModal(null)}
            onSubmit={async (data) => {
              if (modal.action === 'edit') {
                await handleCreateOrUpdate(modal.collection, 'update', { id: modal.data?.id, ...data });
              } else {
                await handleCreateOrUpdate(modal.collection, 'create', data);
              }
              setModal(null);
            }}
            submitLabel={modal.action === 'create' ? 'Create' : 'Save'}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Small UI components ---------------- */

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color?: string }) {
  return (
    <div className="bg-white/5 rounded p-4 flex items-center gap-3 border border-white/5">
      <div className={`p-3 rounded text-white ${color || 'bg-indigo-600'}`}>{icon}</div>
      <div>
        <div className="text-xs text-gray-400">{title}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </div>
  );
}
