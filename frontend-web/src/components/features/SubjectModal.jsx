// Subject Modal Component - Popup form for Create/Edit Subject (Tasks #XX)
// 3-Step Process: 1. Select Faculty, 2. Enter Info, 3. Select Majors
import { useState, useEffect, useRef } from 'react';
import closeIcon from '../../assets/close.png';
import facultyService from '../../services/facultyService';
import majorService from '../../services/majorService';

export default function SubjectModal({ isOpen, onClose, onSubmit, subject, loading }) {
  const [faculties, setFaculties] = useState([]);
  const [majors, setMajors] = useState([]);
  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [loadingMajors, setLoadingMajors] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Faculty (single selection)
  const [selectedFaculty, setSelectedFaculty] = useState('');
  
  // Step 2: Subject Info
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    credits: '',
    description: '',
  });

  // Step 3: Major requirements (multiple selection with required/optional)
  const [majorRequirements, setMajorRequirements] = useState([]);

  const [errors, setErrors] = useState({});
  const [isFacultyDropdownOpen, setIsFacultyDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchMajors = async () => {
      if (!isOpen) return;
      try {
        setLoadingMajors(true);
        const res = await majorService.getMajors({ isActive: true });
        setMajors(res.data?.data || []);
      } catch (e) {
        console.error('Error fetching majors:', e);
        setMajors([]);
      } finally {
        setLoadingMajors(false);
      }
    };

    fetchMajors();
  }, [isOpen]);

  // Fetch faculties and majors on modal open
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      
      // Fetch faculties
      try {
        setLoadingFaculties(true);
        const facRes = await facultyService.getFaculties({ isActive: true });
        setFaculties(facRes.data?.data || []);
      } catch (e) {
        console.error('Error fetching faculties:', e);
        setFaculties([]);
      } finally {
        setLoadingFaculties(false);
      }

      // Fetch all majors (will be filtered by selected faculty in Step 3)
      try {
        setLoadingMajors(true);
        const majorRes = await majorService.getMajors({ isActive: true });
        setMajors(majorRes.data?.data || []);
      } catch (e) {
        console.error('Error fetching majors:', e);
        setMajors([]);
      } finally {
        setLoadingMajors(false);
      }
    };

    fetchData();
  }, [isOpen]);

  const facultyCodeToName = new Map(
    (faculties || []).map((f) => [String(f.facultyCode || '').trim(), String(f.facultyName || '').trim()])
  );

  const majorCodeToName = new Map(
    (majors || []).map((m) => [String(m.majorCode || '').trim(), String(m.majorName || '').trim()])
  );

  // Get majors filtered by selected faculty
  const getMajorsByFaculty = (facultyCode) => {
    if (!facultyCode || !majors.length) return [];
    // majors have faculty field which is an ObjectId, we need to find matching faculty
    return majors.filter(m => {
      // Check if major's faculty matches the selected faculty
      const majorFacultyId = m.faculty?._id || m.faculty;
      const selectedFac = faculties.find(f => f.facultyCode === facultyCode);
      return selectedFac && String(majorFacultyId) === String(selectedFac._id);
    });
  };

  // Get available majors for Step 3 (filtered by selected faculty)
  const availableMajorsForStep3 = selectedFaculty ? getMajorsByFaculty(selectedFaculty) : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsFacultyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Populate form when editing existing subject
  useEffect(() => {
    if (subject) {
      // Step 1: Faculty
      setSelectedFaculty(subject.managedByFaculty || subject.facultyCode || '');
      
      // Step 2: Subject Info
      setFormData({
        code: subject.code || subject.subjectCode || '',
        name: subject.name || subject.subjectName || '',
        credits: subject.credits || '',
        description: subject.description || '',
      });

      // Step 3: Major requirements
      const existingRequirements = subject.majorRequirements || [];
      if (existingRequirements.length > 0) {
        setMajorRequirements(existingRequirements);
      } else if (subject.majorCodes && subject.majorCodes.length > 0) {
        // Backward compatibility: convert majorCodes to majorRequirements
        const requirements = (subject.majorCodes || []).map(code => ({
          majorCode: code,
          isRequired: subject.isCommon || false
        }));
        setMajorRequirements(requirements);
      } else {
        setMajorRequirements([]);
      }
    } else {
      // Reset form for new subject
      setSelectedFaculty('');
      setFormData({
        code: '',
        name: '',
        credits: '',
        description: '',
      });
      setMajorRequirements([]);
    }
    setErrors({});
    setIsFacultyDropdownOpen(false);
    setCurrentStep(1);
  }, [subject, isOpen]);

  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      // Validate faculty selection
      if (!selectedFaculty.trim()) {
        newErrors.selectedFaculty = 'Vui lòng chọn khoa';
      }
    } else if (step === 2) {
      // Validate subject info
      if (!formData.code.trim()) {
        newErrors.code = 'Mã môn học là bắt buộc';
      }
      if (!formData.name.trim()) {
        newErrors.name = 'Tên môn học là bắt buộc';
      }
      if (!formData.credits || formData.credits < 1) {
        newErrors.credits = 'Số tín chỉ phải lớn hơn 0';
      }
    } else if (step === 3) {
      // Validate major requirements - at least one major should be selected if available majors exist
      const availableMajors = selectedFaculty ? getMajorsByFaculty(selectedFaculty) : [];
      if (availableMajors.length > 0 && majorRequirements.length === 0) {
        newErrors.majorRequirements = 'Vui lòng chọn ít nhất một chuyên ngành';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
    setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate all steps before submitting
    const step1Valid = validateStep(1);
    const step2Valid = validateStep(2);
    const step3Valid = validateStep(3);
    
    if (step1Valid && step2Valid && step3Valid) {
      // Transform data for backend
      const submitData = {
        // Step 1: Faculty
        managedByFaculty: selectedFaculty,
        facultyCode: selectedFaculty,
        // Step 2: Subject Info
        code: formData.code,
        name: formData.name,
        credits: parseInt(formData.credits, 10),
        description: formData.description,
        // Step 3: Major Requirements
        majorRequirements: majorRequirements,
      };
      onSubmit(submitData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle faculty selection (Step 1)
  const handleFacultySelect = (facultyCode) => {
    setSelectedFaculty(facultyCode);
    // Clear major requirements when faculty changes
    setMajorRequirements([]);
    if (errors.selectedFaculty) {
      setErrors((prev) => ({ ...prev, selectedFaculty: '' }));
    }
  };

  // Handle major requirement toggle (Step 3)
  const handleMajorToggle = (majorCode) => {
    setMajorRequirements(prev => {
      const exists = prev.find(m => m.majorCode === majorCode);
      if (exists) {
        // Remove if already exists
        return prev.filter(m => m.majorCode !== majorCode);
      } else {
        // Add new with default as required
        return [...prev, { majorCode, isRequired: true }];
      }
    });
  };

  // Handle required/optional toggle (Step 3)
  const handleRequiredToggle = (majorCode) => {
    setMajorRequirements(prev => 
      prev.map(m => 
        m.majorCode === majorCode 
          ? { ...m, isRequired: !m.isRequired }
          : m
      )
    );
  };

  // Check if a major is selected
  const isMajorSelected = (majorCode) => {
    return majorRequirements.some(m => m.majorCode === majorCode);
  };

  // Check if a major is required
  const isMajorRequired = (majorCode) => {
    const major = majorRequirements.find(m => m.majorCode === majorCode);
    return major ? major.isRequired : true;
  };

  if (!isOpen) return null;

  const isEditing = !!subject;

  // Step indicator
  const steps = [
    { num: 1, label: 'Chọn khoa' },
    { num: 2, label: 'Thông tin môn' },
    { num: 3, label: 'Chuyên ngành' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEditing ? 'Chỉnh sửa môn học' : 'Tạo môn học mới'}
          </h3>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
            onClick={onClose}
          >
            <img src={closeIcon} alt="Đóng" className="w-6 h-6" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      currentStep > step.num
                        ? 'bg-green-500 text-white'
                        : currentStep === step.num
                        ? 'bg-[#1A237E] text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {currentStep > step.num ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      step.num
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${currentStep === step.num ? 'text-[#1A237E] dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${currentStep > step.num ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Body - Multi-step Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 flex flex-col gap-5 max-h-[60vh] overflow-y-auto">
            
            {/* Step 1: Select Faculty */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2">
                    Bước 1: Chọn Khoa
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Môn học thuộc quản lý của một khoa. Chọn khoa quản lý môn học này.
                  </p>
                </div>

                <div className="flex flex-col gap-2 relative" ref={dropdownRef}>
                  <label className="text-sm font-bold text-slate-700 dark:text-white">
                    Khoa <span className="text-red-500">*</span>
                  </label>
                  <div
                    className={`form-input rounded-lg border ${
                      errors.selectedFaculty
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-slate-200 dark:border-slate-700'
                    } dark:bg-slate-800 focus-within:border-[#1A237E] focus-within:ring-[#1A237E] w-full text-sm cursor-pointer flex items-center justify-between`}
                    onClick={() => setIsFacultyDropdownOpen(!isFacultyDropdownOpen)}
                  >
                    <span className="truncate">
                      {selectedFaculty
                        ? facultyCodeToName.get(String(selectedFaculty).trim()) || selectedFaculty
                        : 'Chọn khoa...'}
                    </span>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${isFacultyDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Dropdown Options */}
                  {isFacultyDropdownOpen && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {loadingFaculties ? (
                        <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-300">Đang tải danh sách khoa...</div>
                      ) : faculties.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-300">Không có dữ liệu khoa</div>
                      ) : (
                        faculties.map((f) => {
                          const code = String(f.facultyCode || '').trim();
                          const name = String(f.facultyName || '').trim();
                          if (!code) return null;
                          return (
                            <div
                              key={code}
                              className={`px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 ${
                                selectedFaculty === code ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                              }`}
                              onClick={() => {
                                handleFacultySelect(code);
                                setIsFacultyDropdownOpen(false);
                              }}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                selectedFaculty === code
                                  ? 'border-[#1A237E] bg-[#1A237E]'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {selectedFaculty === code && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{name || code}</span>
                                {f.shortName && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">{f.shortName}</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                  {errors.selectedFaculty && <p className="text-xs text-red-500">{errors.selectedFaculty}</p>}
                </div>
              </div>
            )}

            {/* Step 2: Enter Subject Info */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2">
                    Bước 2: Nhập thông tin môn học
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Nhập mã, tên, số tín chỉ và mô tả cho môn học.
                  </p>
                </div>

                {/* Subject Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="name">
                    Tên môn học <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={`form-input rounded-lg border ${
                      errors.name
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                        : 'border-slate-200 dark:border-slate-700'
                    } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                    id="name"
                    name="name"
                    placeholder="Ví dụ: Lập trình di động"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                  />
                  {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
                </div>

                {/* Grid for Code and Credits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="code">
                      Mã môn học <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`form-input rounded-lg border ${
                        errors.code
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-slate-200 dark:border-slate-700'
                      } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                      id="code"
                      name="code"
                      placeholder="Ví dụ: CS305"
                      type="text"
                      value={formData.code}
                      onChange={handleChange}
                    />
                    {errors.code && <p className="text-xs text-red-500">{errors.code}</p>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="credits">
                      Số tín chỉ <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`form-input rounded-lg border ${
                        errors.credits
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-slate-200 dark:border-slate-700'
                      } dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm`}
                      id="credits"
                      name="credits"
                      placeholder="3"
                      type="number"
                      min="1"
                      max="15"
                      value={formData.credits}
                      onChange={handleChange}
                    />
                    {errors.credits && <p className="text-xs text-red-500">{errors.credits}</p>}
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-white" htmlFor="description">
                    Mô tả
                  </label>
                  <textarea
                    className="form-input rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 focus:border-[#1A237E] focus:ring-[#1A237E] w-full text-sm resize-none"
                    id="description"
                    name="description"
                    placeholder="Nhập mô tả môn học (tùy chọn)"
                    rows="3"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Select Majors */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200 mb-2">
                    Bước 3: Chọn chuyên ngành áp dụng
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Chọn các chuyên ngành thuộc khoa <strong>{facultyCodeToName.get(selectedFaculty) || selectedFaculty}</strong> mà môn học này được áp dụng và chỉ định bắt buộc hoặc tự chọn.
                  </p>
                </div>

                {!selectedFaculty ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <p className="text-sm">Vui lòng chọn khoa trước ở Bước 1.</p>
                  </div>
                ) : availableMajorsForStep3.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                    <p className="text-sm">Không có chuyên ngành nào thuộc khoa {facultyCodeToName.get(selectedFaculty) || selectedFaculty}.</p>
                    <p className="text-xs mt-1">Môn học chỉ thuộc về khoa đã chọn.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                    {availableMajorsForStep3.map((m) => {
                      const code = String(m.majorCode || '').trim();
                      const name = String(m.majorName || '').trim();
                      const isSelected = isMajorSelected(code);
                      const isRequired = isMajorRequired(code);
                      
                      return (
                        <div
                          key={code}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isSelected 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' 
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                          }`}
                        >
                          <label className="flex items-center gap-3 cursor-pointer flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleMajorToggle(code)}
                              className="w-4 h-4 text-[#1A237E] border-slate-300 rounded focus:ring-[#1A237E]"
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {name || code}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {m.shortName || code}
                              </span>
                            </div>
                          </label>
                          
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleRequiredToggle(code)}
                                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                                  isRequired
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800'
                                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800'
                                }`}
                              >
                                {isRequired ? 'Bắt buộc' : 'Tự chọn'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {majorRequirements.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                      Đã chọn ({majorRequirements.length} chuyên ngành):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {majorRequirements.map((req) => (
                        <span
                          key={req.majorCode}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
                            req.isRequired
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {majorCodeToName.get(req.majorCode) || req.majorCode}
                          <span className="text-xs opacity-70">
                            ({req.isRequired ? 'Bắt buộc' : 'Tự chọn'})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {errors.majorRequirements && (
                  <p className="text-xs text-red-500 mt-2">{errors.majorRequirements}</p>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-between gap-3">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white text-sm font-bold hover:bg-white dark:hover:bg-slate-700 transition-all"
                  onClick={handlePrevStep}
                >
                  Quay lại
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white text-sm font-bold hover:bg-white dark:hover:bg-slate-700 transition-all"
                onClick={onClose}
                disabled={loading}
              >
                Hủy bỏ
              </button>
              {currentStep < 3 ? (
                <button
                  type="button"
                  className="px-6 py-2.5 rounded-lg bg-[#1A237E] text-white text-sm font-bold hover:bg-[#0D147A] transition-all shadow-md"
                  onClick={handleNextStep}
                >
                  Tiếp theo
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-[#1A237E] text-white text-sm font-bold hover:bg-[#0D147A] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={loading}
                >
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  )}
                  {isEditing ? 'Cập nhật' : 'Tạo mới'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

