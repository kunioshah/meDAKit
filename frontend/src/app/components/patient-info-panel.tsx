/**
 * @file patient-info-panel.tsx
 * @description Slide-in right panel for viewing and editing persistent patient
 * information (sex, age, medications, allergies, medical history). Pre-populates
 * from the patient's info.json on open. Saves changes via PATCH
 * /api/patients/:id, updating the JSON file directly. Shows "Saved!" feedback
 * on success. Requires patientId to enable saving.
 */
import { useEffect, useState } from 'react';
import { X, User, AlertCircle, Pill, FileText } from 'lucide-react';

interface PatientInfo {
  sex?: string;
  age?: string;
  medications?: string;
  allergies?: string;
  medical_history?: string;
}

interface PatientInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: string;
  patientInfo?: PatientInfo;
}

export function PatientInfoPanel({ isOpen, onClose, patientId, patientInfo }: PatientInfoPanelProps) {
  const [formData, setFormData] = useState({
    sex: '',
    age: '',
    medications: '',
    allergies: '',
    medical_history: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Populate form when patient info is provided
  useEffect(() => {
    if (patientInfo) {
      setFormData({
        sex: patientInfo.sex ?? '',
        age: patientInfo.age ?? '',
        medications: patientInfo.medications ?? '',
        allergies: patientInfo.allergies ?? '',
        medical_history: patientInfo.medical_history ?? '',
      });
    }
  }, [patientInfo]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;
    setSaving(true);
    try {
      await fetch(`/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl">Patient Information</h2>
            <button onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="sex" className="flex items-center gap-2 text-black mb-2">
                <User className="w-4 h-4 text-[#7ed957]" />
                Sex
              </label>
              <input id="sex" name="sex" type="text" value={formData.sex} onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7ed957] focus:border-transparent transition-shadow"
                placeholder="Enter patient sex" />
            </div>

            <div>
              <label htmlFor="age" className="flex items-center gap-2 text-black mb-2">
                <User className="w-4 h-4 text-[#7ed957]" />
                Age
              </label>
              <input id="age" name="age" type="text" value={formData.age} onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7ed957] focus:border-transparent transition-shadow"
                placeholder="Enter age" />
            </div>

            <div>
              <label htmlFor="medications" className="flex items-center gap-2 text-black mb-2">
                <Pill className="w-4 h-4 text-[#7ed957]" />
                Current Medications
              </label>
              <textarea id="medications" name="medications" value={formData.medications} onChange={handleChange} rows={3}
                className="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7ed957] focus:border-transparent transition-shadow resize-none"
                placeholder="List any medications..." />
            </div>

            <div>
              <label htmlFor="allergies" className="flex items-center gap-2 text-black mb-2">
                <AlertCircle className="w-4 h-4 text-[#7ed957]" />
                Known Allergies
              </label>
              <input id="allergies" name="allergies" type="text" value={formData.allergies} onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7ed957] focus:border-transparent transition-shadow"
                placeholder="List any known allergies..." />
            </div>

            <div>
              <label htmlFor="medical_history" className="flex items-center gap-2 text-black mb-2">
                <FileText className="w-4 h-4 text-[#7ed957]" />
                Medical History
              </label>
              <textarea id="medical_history" name="medical_history" value={formData.medical_history} onChange={handleChange} rows={4}
                className="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7ed957] focus:border-transparent transition-shadow resize-none"
                placeholder="Any relevant medical history..." />
            </div>

            <button type="submit" disabled={saving || !patientId}
              className="w-full bg-[#7ed957] hover:bg-[#6ec847] disabled:opacity-50 text-black px-6 py-3 rounded-lg transition-colors font-semibold">
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Information'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
