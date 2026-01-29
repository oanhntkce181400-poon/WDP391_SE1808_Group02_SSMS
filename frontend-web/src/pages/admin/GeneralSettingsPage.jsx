import { useState, useEffect } from 'react';
import settingsService from '../../services/settingsService';

const GeneralSettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolCode: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    website: '',
    description: '',
    primaryColor: '',
    secondaryColor: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await settingsService.getSettings();
      const data = response.data || response;
      if (data.success) {
        setSettings(data.data);
        setFormData({
          schoolName: data.data.schoolName || '',
          schoolCode: data.data.schoolCode || '',
          contactEmail: data.data.contactEmail || '',
          contactPhone: data.data.contactPhone || '',
          address: data.data.address || '',
          website: data.data.website || '',
          description: data.data.description || '',
        });
        if (data.data.logoUrl) {
          setLogoPreview(data.data.logoUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess('');
    try {
      const response = await settingsService.updateSettings(formData, logoFile);
      const data = response.data || response;
      if (data.success) {
        setSettings(data.data);
        setLogoFile(null);
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">General Settings</h1>

      {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>}
      {success && <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">{success}</div>}

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Logo Section */}
        <div className="border-b pb-6">
          <h2 className="text-xl font-semibold mb-4">School Logo</h2>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 bg-gray-100 rounded border flex items-center justify-center">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-gray-400 text-center text-sm">No logo</div>
              )}
            </div>
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="mb-2"
              />
              <p className="text-sm text-gray-500">Upload PNG, JPG, or other image formats</p>
            </div>
          </div>
        </div>

        {/* School Info Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">School Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">School Name</label>
              <input
                type="text"
                name="schoolName"
                value={formData.schoolName}
                onChange={handleInputChange}
                className="w-full border px-3 py-2 rounded"
                placeholder="e.g., School of Engineering"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">School Code</label>
              <input
                type="text"
                name="schoolCode"
                value={formData.schoolCode}
                onChange={handleInputChange}
                className="w-full border px-3 py-2 rounded"
                placeholder="e.g., SE"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                className="w-full border px-3 py-2 rounded"
                placeholder="contact@school.edu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                className="w-full border px-3 py-2 rounded"
                placeholder="(123) 456-7890"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Address</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full border px-3 py-2 rounded"
                placeholder="123 Main St, City, State"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Website</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                className="w-full border px-3 py-2 rounded"
                placeholder="https://school.edu"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className="w-full border px-3 py-2 rounded"
                placeholder="School description..."
              />
            </div>
          </div>
        </div>

        {/* Colors Section
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Theme Colors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="primaryColor"
                  value={formData.primaryColor}
                  onChange={handleInputChange}
                  className="h-10 w-20 border rounded cursor-pointer"
                />
                <input
                  type="text"
                  name="primaryColor"
                  value={formData.primaryColor}
                  onChange={handleInputChange}
                  className="flex-1 border px-3 py-2 rounded font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={handleInputChange}
                  className="h-10 w-20 border rounded cursor-pointer"
                />
                <input
                  type="text"
                  name="secondaryColor"
                  value={formData.secondaryColor}
                  onChange={handleInputChange}
                  className="flex-1 border px-3 py-2 rounded font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div> */}

        {/* Save Button */}
        <div className="flex justify-end gap-2 pt-6 border-t">
          <button
            onClick={() => fetchSettings()}
            className="px-6 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettingsPage;
