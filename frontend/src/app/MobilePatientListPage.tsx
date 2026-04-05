import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, Pencil, Trash2, X } from 'lucide-react';
import { Header } from './components/header';
import { PlusBackground } from './components/plus-background';

interface Patient {
  id: string;
  name: string;
  severity?: string;
  injuries?: string;
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

export default function MobilePatientListPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  // New patient modal
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInfo, setNewInfo] = useState({ sex: '', age: '', medications: '', allergies: '', medical_history: '' });
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({ name: '', severity: '', injuries: '' });
  const [editSaving, setEditSaving] = useState(false);

  const loadPatients = () => {
    fetch('/api/patients')
      .then(r => r.json())
      .then(d => setPatients(d.patients ?? []))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadPatients(); }, []);

  const filtered = patients.filter(p => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (p.name ?? '').toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

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
    } finally { setSaving(false); }
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
      if (res.ok) { setEditPatient(null); loadPatients(); }
    } finally { setEditSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this patient? This cannot be undone.')) return;
    await fetch(`/api/patients/${id}`, { method: 'DELETE' });
    loadPatients();
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] relative flex flex-col">
      <PlusBackground />
      <div className="relative z-10 flex flex-col flex-1">
        <Header logoOnly />

        <main className="flex-1 px-4 pt-2 pb-8 flex flex-col gap-4">
          {/* Add button */}
          <button
            onClick={() => setNewOpen(true)}
            className="w-full bg-[#7ed957] hover:bg-[#6ec847] text-white font-semibold py-3.5 rounded-full transition-colors text-base"
          >
            + New Patient
          </button>

          {/* Search bar */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by ID or name"
              className="flex-1 bg-white/60 backdrop-blur-sm px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7ed957] transition-shadow"
            />
            <button className="w-12 h-12 bg-white/60 backdrop-blur-sm hover:bg-white/80 rounded-2xl flex items-center justify-center transition-colors shrink-0">
              <Search className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Patient list */}
          {loading ? (
            <p className="text-gray-400 text-center mt-10">Loading patients…</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-400 text-center mt-10">
              {query ? 'No patients match your search.' : 'No patients on record yet.'}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map(p => (
                <div key={p.id} className="bg-white/60 backdrop-blur-sm rounded-[24px] shadow-sm overflow-hidden">
                  {/* Clickable card body */}
                  <button
                    onClick={() => navigate(`/mobile/patient/${p.id}`)}
                    className="w-full px-6 pt-6 pb-4 text-left hover:bg-white/40 transition-colors"
                  >
                    <div className="flex items-baseline gap-2 mb-2">
                      <h2 className={`font-normal text-black ${
                        (p.name ?? p.id).length <= 15 ? 'text-3xl' :
                        (p.name ?? p.id).length <= 22 ? 'text-2xl' :
                        (p.name ?? p.id).length <= 30 ? 'text-xl' : 'text-lg'
                      }`}>{p.name ?? p.id}</h2>
                      <span className="text-sm text-gray-400 shrink-0">#{p.id}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
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

                  {/* Divider */}
                  <div className="border-t border-gray-200 mx-4" />

                  {/* Edit / Delete row */}
                  <div className="flex items-center gap-4 px-6 py-3">
                    <button
                      onClick={() => {
                        setEditPatient(p);
                        setEditForm({ name: p.name ?? '', severity: p.severity ?? '', injuries: p.injuries ?? '' });
                      }}
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors py-1"
                    >
                      <Pencil className="w-5 h-5" />
                      <span className="text-sm font-medium">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors py-1"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* New Patient Modal */}
      {newOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setNewOpen(false)} />
          <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <h2 className="text-xl font-semibold">New Patient</h2>
                <button onClick={() => setNewOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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
          <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <h2 className="text-xl font-semibold">Edit Patient</h2>
                <button onClick={() => setEditPatient(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEdit} className="p-6 space-y-4">
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
