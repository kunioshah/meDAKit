/**
 * @file LandingPage.tsx
 * @description Laptop patient grid page (/patients). Displays all patients as
 * cards sorted by most recently updated. Supports live search by name or ID.
 * Each card links directly to that patient's session page. Provides modals for
 * creating new patients (with optional patient info fields) and editing existing
 * ones (name, severity, injuries, and all patient info fields). Patients can
 * also be deleted via a confirmation dialog.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { X, Pencil, Trash2, Search } from 'lucide-react';
import { Header } from './components/header';
import { PlusBackground } from './components/plus-background';

interface Patient {
  id: string;
  name: string;
  severity?: string;
  injuries?: string;
  sex?: string;
  age?: string;
  medications?: string;
  allergies?: string;
  medical_history?: string;
  last_updated?: string;
  created_at?: string;
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

function severityColor(severity?: string) {
  if (!severity) return 'text-gray-700';
  const s = severity.toLowerCase();
  if (s === 'critical' || s === 'severe' || s === 'bad') return 'text-red-600';
  if (s === 'moderate') return 'text-orange-500';
  return 'text-gray-700';
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // New patient modal
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInfo, setNewInfo] = useState({ sex: '', age: '', medications: '', allergies: '', medical_history: '' });
  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState('');

  // Edit modal
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({ name: '', severity: '', injuries: '', sex: '', age: '', medications: '', allergies: '', medical_history: '' });
  const [editSaving, setEditSaving] = useState(false);

  const loadPatients = () => {
    fetch('/api/patients')
      .then(r => r.json())
      .then(d => setPatients(d.patients ?? []))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPatients(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/patients/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, last_updated: new Date().toISOString(), ...newInfo }),
      });
      if (res.ok) {
        setNewName('');
        setNewInfo({ sex: '', age: '', medications: '', allergies: '', medical_history: '' });
        setNewOpen(false);
        loadPatients();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatient) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/patients/${editPatient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditPatient(null);
        loadPatients();
      }
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this patient? This cannot be undone.')) return;
    await fetch(`/api/patients/${id}`, { method: 'DELETE' });
    loadPatients();
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] relative flex flex-col">
      <PlusBackground />
      <div className="relative z-10 flex flex-col flex-1">
        <Header logoOnly />

        <main className="flex-1 max-w-[1100px] mx-auto w-full px-6 py-8">
          {/* Search + Add row */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by ID or name"
                className="w-full pl-10 pr-4 py-3 bg-white/60 backdrop-blur-sm rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow"
              />
            </div>
            <button onClick={() => setNewOpen(true)}
              className="bg-[#7ed957] hover:bg-[#6ec847] text-white font-semibold px-8 py-3 rounded-full transition-colors whitespace-nowrap">
              + New Patient
            </button>
          </div>

          {loading ? (
            <p className="text-gray-400 text-center mt-20">Loading patients…</p>
          ) : patients.length === 0 ? (
            <p className="text-gray-400 text-center mt-20">No patients on record yet.</p>
          ) : (() => {
            const filtered = patients.filter(p => {
              if (!query.trim()) return true;
              const q = query.trim().toLowerCase();
              return (p.name ?? '').toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
            });
            return filtered.length === 0 ? (
              <p className="text-gray-400 text-center mt-20">No patients match your search.</p>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(p => (
                <div key={p.id} className="relative group h-full">
                  <button
                    onClick={() => navigate(`/patient/${p.id}/session`)}
                    className="w-full h-full bg-white/60 backdrop-blur-sm rounded-[24px] p-8 text-left hover:bg-white/80 transition-colors shadow-sm"
                  >
                    <div className="flex items-baseline gap-3 mb-3">
                      <h2 className={`font-normal text-black ${
                        (p.name ?? p.id).length <= 15 ? 'text-3xl' :
                        (p.name ?? p.id).length <= 22 ? 'text-2xl' :
                        (p.name ?? p.id).length <= 30 ? 'text-xl' : 'text-lg'
                      }`}>{p.name ?? p.id}</h2>
                      <span className="text-sm text-gray-400 shrink-0">#{p.id}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm text-gray-700">
                        Last Updated: {formatDate(p.last_updated ?? p.created_at)}
                      </p>
                      {p.severity && (
                        <p className={`text-sm ${severityColor(p.severity)}`}>
                          Severity Level: {p.severity}
                        </p>
                      )}
                      {p.injuries && (
                        <p className="text-sm text-gray-700">Injuries: {p.injuries}</p>
                      )}
                    </div>
                  </button>

                  {/* Edit / Delete buttons */}
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => { e.stopPropagation(); setEditPatient(p); setEditForm({ name: p.name ?? '', severity: p.severity ?? '', injuries: p.injuries ?? '', sex: p.sex ?? '', age: p.age ?? '', medications: p.medications ?? '', allergies: p.allergies ?? '', medical_history: p.medical_history ?? '' }); }}
                      className="w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-colors"
                      aria-label="Edit patient"
                    >
                      <Pencil className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={e => handleDelete(e, p.id)}
                      className="w-8 h-8 bg-white/80 hover:bg-gray-100 rounded-full flex items-center justify-center shadow-sm transition-colors"
                      aria-label="Delete patient"
                    >
                      <Trash2 className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            );
          })()}
        </main>
      </div>

      {/* New Patient Modal */}
      {newOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setNewOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <h2 className="text-xl font-semibold">New Patient</h2>
                <button onClick={() => setNewOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">
                    Patient Name <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow"
                    placeholder="e.g. John Smith" />
                </div>

                <details open className="group">
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 list-none flex items-center justify-between select-none">
                    Patient Information
                    <span className="text-gray-400 group-open:rotate-180 transition-transform inline-block">▾</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1.5">Sex</label>
                        <input type="text" value={newInfo.sex}
                          onChange={e => setNewInfo(f => ({ ...f, sex: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow"
                          placeholder="e.g. Male" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1.5">Age</label>
                        <input type="text" value={newInfo.age}
                          onChange={e => setNewInfo(f => ({ ...f, age: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow"
                          placeholder="e.g. 34" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">Medications</label>
                      <textarea rows={2} value={newInfo.medications}
                        onChange={e => setNewInfo(f => ({ ...f, medications: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow resize-none"
                        placeholder="e.g. Aspirin, Lisinopril" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">Known Allergies</label>
                      <input type="text" value={newInfo.allergies}
                        onChange={e => setNewInfo(f => ({ ...f, allergies: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow"
                        placeholder="e.g. Penicillin, Peanuts" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">Medical History</label>
                      <textarea rows={3} value={newInfo.medical_history}
                        onChange={e => setNewInfo(f => ({ ...f, medical_history: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow resize-none"
                        placeholder="e.g. Hypertension, Type 2 Diabetes" />
                    </div>
                  </div>
                </details>

                <button type="submit" disabled={saving || !newName.trim()}
                  className="w-full bg-[#7ed957] hover:bg-[#6ec847] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors">
                  {saving ? 'Creating…' : 'Create Patient'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Edit Patient Modal */}
      {editPatient && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setEditPatient(null)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <h2 className="text-xl font-semibold">Edit Patient</h2>
                <button onClick={() => setEditPatient(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Patient Name</label>
                  <input type="text" required value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Severity Level</label>
                  <input type="text" value={editForm.severity}
                    onChange={e => setEditForm(f => ({ ...f, severity: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow"
                    placeholder="e.g. Mild, Moderate, Severe" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Injuries / Notes</label>
                  <textarea rows={3} value={editForm.injuries}
                    onChange={e => setEditForm(f => ({ ...f, injuries: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow resize-none"
                    placeholder="e.g. Fractured leg, dislocated shoulder" />
                </div>

                <details open className="group">
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800 list-none flex items-center justify-between select-none">
                    Patient Information
                    <span className="text-gray-400 group-open:rotate-180 transition-transform inline-block">▾</span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1.5">Sex</label>
                        <input type="text" value={editForm.sex}
                          onChange={e => setEditForm(f => ({ ...f, sex: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow"
                          placeholder="e.g. Male" />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1.5">Age</label>
                        <input type="text" value={editForm.age}
                          onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow"
                          placeholder="e.g. 34" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">Medications</label>
                      <textarea rows={2} value={editForm.medications}
                        onChange={e => setEditForm(f => ({ ...f, medications: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow resize-none"
                        placeholder="e.g. Aspirin, Lisinopril" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">Known Allergies</label>
                      <input type="text" value={editForm.allergies}
                        onChange={e => setEditForm(f => ({ ...f, allergies: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow"
                        placeholder="e.g. Penicillin, Peanuts" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1.5">Medical History</label>
                      <textarea rows={3} value={editForm.medical_history}
                        onChange={e => setEditForm(f => ({ ...f, medical_history: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow resize-none"
                        placeholder="e.g. Hypertension, Type 2 Diabetes" />
                    </div>
                  </div>
                </details>

                <button type="submit" disabled={editSaving}
                  className="w-full bg-[#7ed957] hover:bg-[#6ec847] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
