import { useState } from 'react';
import { X, User, AlertCircle, Pill, FileText } from 'lucide-react';

interface PatientInfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PatientInfoPanel({ isOpen, onClose }: PatientInfoPanelProps) {
  const [formData, setFormData] = useState({
    sex: '',
    age: '',
    medications: '',
    allergies: '',
    medicalHistory: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle patient info submission
    console.log('Patient info submitted:', formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl">Patient Information</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Sex */}
            <div>
              <label htmlFor="sex" className="flex items-center gap-2 text-black mb-2">
                <User className="w-4 h-4 text-[#7ed957]" />
                Sex
              </label>
              <input
                id="sex"
                name="sex"
                type="text"
                value={formData.sex}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7ed957] focus:border-transparent transition-shadow"
                placeholder="Enter patient sex"
              />
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" className="flex items-center gap-2 text-black mb-2">
                <User className="w-4 h-4 text-[#7ed957]" />
                Age
              </label>
              <input
                id="age"
                name="age"
                type="text"
                value={formData.age}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7ed957] focus:border-transparent transition-shadow"
                placeholder="Enter age"
              />
            </div>

            {/* Current Medications */}
            <div>
              <label htmlFor="medications" className="flex items-center gap-2 text-black mb-2">
                <Pill className="w-4 h-4 text-[#7ed957]" />
                Current Medications
              </label>
              <textarea
                id="medications"
                name="medications"
                value={formData.medications}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7ed957] focus:border-transparent transition-shadow resize-none"
                placeholder="List any medications..."
              />
            </div>

            {/* Allergies */}
            <div>
              <label htmlFor="allergies" className="flex items-center gap-2 text-black mb-2">
                <AlertCircle className="w-4 h-4 text-[#7ed957]" />
                Known Allergies
              </label>
              <input
                id="allergies"
                name="allergies"
                type="text"
                value={formData.allergies}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7ed957] focus:border-transparent transition-shadow"
                placeholder="List any known allergies..."
              />
            </div>

            {/* Medical History */}
            <div>
              <label htmlFor="medicalHistory" className="flex items-center gap-2 text-black mb-2">
                <FileText className="w-4 h-4 text-[#7ed957]" />
                Medical History
              </label>
              <textarea
                id="medicalHistory"
                name="medicalHistory"
                value={formData.medicalHistory}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 bg-gray-100 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#7ed957] focus:border-transparent transition-shadow resize-none"
                placeholder="Any relevant medical history..."
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#7ed957] hover:bg-[#6ec847] text-black px-6 py-3 rounded-lg transition-colors"
            >
              Save Information
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
