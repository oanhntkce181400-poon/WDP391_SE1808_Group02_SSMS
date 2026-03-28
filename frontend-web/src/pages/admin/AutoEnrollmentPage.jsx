import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import semesterService from "../../services/semesterService";
import curriculumService from "../../services/curriculumService";
import classService from "../../services/classService";
import autoEnrollmentService from "../../services/autoEnrollmentService";
import enrollmentSnapshotService from "../../services/enrollmentSnapshotService";
import {
  collectUniqueEnrolledSubjectCodes,
  formatEnrollmentLogDetail,
} from "../../utils/formatEnrollmentLogDetail";

/** Chuẩn hóa ngày từ API (ISO / Date). */
function dateOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Hai khoảng [aStart,aEnd] và [bStart,bEnd] có giao nhau (cùng ngày biên tính là giao). */
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  const aS = dateOrNull(aStart);
  const aE = dateOrNull(aEnd);
  const bS = dateOrNull(bStart);
  const bE = dateOrNull(bEnd);
  if (!aS || !aE || !bS || !bE) return false;
  return aS <= bE && bS <= aE;
}

function instKey(inst) {
  return String(inst?.id ?? inst?._id ?? "");
}

function curriculumRowOrder(cs) {
  const o = Number(cs?.semesterOrder ?? cs?.id);
  return Number.isInteger(o) && o >= 1 ? o : null;
}

/**
 * Nhãn năm học kiểu "2025-2026" từ một ngày (kỳ 1 thường bắt đầu ~tháng 9; kỳ 2 ~đầu năm sau).
 * Dùng UTC để khớp dữ liệu ISO từ API.
 */
function academicYearLabelFromDate(d) {
  const dt = dateOrNull(d);
  if (!dt) return null;
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  if (m >= 9) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

/**
 * Năm bắt đầu (số đầu của cặp năm học HK1) để suy ra targetAy theo thứ tự kỳ.
 * Chỉ tin ngày của HK1; không lấy ngẫu nhiên HK khác (tránh lệch cả khung).
 * Khung kiểu "Khóa 26 / K##_SE": năm đầu trong tên thường là cohort → HK1 thường là năm học trước đó (K26: 2026–2030 → HK1 ≈ 2025-2026).
 * Khung kiểu "2022–2026" trong academicYear: khoảng gần với niên khóa → HK1 ≈ bắt đầu từ năm thứ nhất.
 */
function inferBaseAcademicStartYear(curriculum, sortedRows) {
  const hk1 =
    sortedRows.find((r) => curriculumRowOrder(r) === 1) ?? sortedRows[0];
  if (hk1?.startDate) {
    const ay = academicYearLabelFromDate(hk1.startDate);
    if (ay) {
      const y0 = Number(ay.split("-")[0]);
      if (Number.isInteger(y0)) return y0;
    }
  }

  const text = [curriculum?.name, curriculum?.code, curriculum?.academicYear]
    .filter(Boolean)
    .join(" ");
  const range = text.match(/(\d{4})\s*[–-]\s*(\d{4})/);
  if (range) {
    const yStart = Number(range[1]);
    const yEnd = Number(range[2]);
    const cohortStyle =
      /K\d+_SE|Khóa\s*\d+|Khóa\s*SE/i.test(text) ||
      /K\d+_SE_\d+/i.test(String(curriculum?.code || ""));
    if (cohortStyle && yEnd > yStart) {
      return yStart - 1;
    }
    return yStart;
  }

  const years = text.match(/20\d{2}/g);
  if (years && years.length) {
    return Math.min(...years.map(Number)) - 1;
  }
  return null;
}

/** Hai HK liên tiếp thường cùng một cặp năm học (HK1+2 → 2025-2026 / 2026-2027 theo lịch seed K26). */
function expectedAcademicYearFromOrder(baseStartYear, order) {
  const y = baseStartYear + Math.floor((order - 1) / 2);
  return `${y}-${y + 1}`;
}

/** Chọn một HK hệ thống “đẹp” nhất trong danh sách ứng viên. */
function pickBestInstitutionalSemester(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const canonicalCodeRe = /^\d{4}-\d{4}_\d+$/;
  const scored = candidates.map((s) => {
    const code = String(s.code || "");
    let sc = 0;
    if (canonicalCodeRe.test(code)) sc += 200;
    if (s.isCurrent) sc += 50;
    sc -= Math.min(String(code).length, 80);
    return { s, sc };
  });
  scored.sort((a, b) => b.sc - a.sc);
  return scored[0].s;
}

/**
 * Mỗi dòng kỳ trong khung CT → đúng một HK hệ thống (tối đa = số kỳ trong khung).
 * Không gom “mọi HK chồng ngày với bất kỳ kỳ nào” (tránh list 12+ mục khi khung chỉ có 9 kỳ).
 * - Có start/end trên dòng khung: ưu tiên chồng lấn ngày với đúng dòng đó.
 * - Luôi hẹp theo academicYear của HK hệ thống (từ ngày dòng khung hoặc từ năm bắt đầu khung)
 *   để mỗi khung cohort khác nhau không dùng chung bộ HK 2025–2030.
 * Mỗi HK hệ thống chỉ gán một lần (tránh trùng hai slot).
 */
/**
 * @returns {Array<{ cs: object, inst: object }>}
 */
function mapInstitutionalSemestersToCurriculumSlots(
  instSemesters,
  curriculumSemRows,
  curriculum,
) {
  if (!Array.isArray(instSemesters) || instSemesters.length === 0) return [];
  if (!Array.isArray(curriculumSemRows) || curriculumSemRows.length === 0) {
    return [];
  }

  const sortedRows = [...curriculumSemRows].sort((a, b) => {
    const ao = curriculumRowOrder(a) ?? 9999;
    const bo = curriculumRowOrder(b) ?? 9999;
    return ao - bo;
  });

  const baseY = inferBaseAcademicStartYear(curriculum, sortedRows);

  const used = new Set();
  const result = [];

  for (const cs of sortedRows) {
    const order = curriculumRowOrder(cs);
    if (order == null) continue;

    const pool = instSemesters.filter((inst) => !used.has(instKey(inst)));

    const targetAy =
      (cs.startDate ? academicYearLabelFromDate(cs.startDate) : null) ??
      (baseY != null ? expectedAcademicYearFromOrder(baseY, order) : null);

    const poolScoped = targetAy
      ? pool.filter((inst) => String(inst.academicYear || "").trim() === targetAy)
      : pool;

    let chosen = null;
    if (cs.startDate && cs.endDate) {
      const byOverlap = pool.filter((inst) =>
        rangesOverlap(
          inst.startDate,
          inst.endDate,
          cs.startDate,
          cs.endDate,
        ),
      );
      chosen = pickBestInstitutionalSemester(byOverlap);
    }
    if (!chosen) {
      const byNum = poolScoped.filter((inst) => Number(inst.semesterNum) === order);
      chosen = pickBestInstitutionalSemester(byNum);
    }
    if (!chosen && targetAy) {
      const byNumLoose = pool.filter(
        (inst) => Number(inst.semesterNum) === order,
      );
      chosen = pickBestInstitutionalSemester(byNumLoose);
    }

    if (chosen) {
      used.add(instKey(chosen));
      result.push({ cs, inst: chosen });
    }
  }

  return result;
}

function semesterOptionId(inst) {
  return String(inst?.id ?? inst?._id ?? "");
}

/** Một dòng dropdown = đúng một kỳ trong khung + HK hệ thống đã map (nhãn theo khung CT). */
function buildSemesterOptionsFromCurriculum(
  instSemesters,
  curriculumSemRows,
  curriculum,
) {
  const pairs = mapInstitutionalSemestersToCurriculumSlots(
    instSemesters,
    curriculumSemRows,
    curriculum,
  );
  return pairs.map(({ cs, inst }, idx) => {
    const id = semesterOptionId(inst);
    const slotName = String(cs?.name || "").trim() || `Học kỳ ${curriculumRowOrder(cs)}`;
    const instLabel = [inst.name, inst.code].filter(Boolean).join(" — ");
    return {
      ...inst,
      id,
      curriculumSlotName: slotName,
      curriculumSemesterOrder: curriculumRowOrder(cs),
      optionLabel: `${slotName} → ${instLabel}`,
      optionKey: `${id}-${curriculumRowOrder(cs) ?? idx}`,
    };
  });
}

/**
 * Gộp các HK hệ thống trùng logic (cùng academicYear + semesterNum) — DB thường có 2 dòng
 * (VD: code 2029-2030_8 và HK8-2029-2030). Khung CT chỉ có 9 kỳ nên UI chỉ cần 9 lựa chọn.
 * Ưu tiên bản ghi có code chuẩn dạng YYYY-YYYY_n.
 */
function dedupeInstitutionalSemesters(semesters) {
  if (!Array.isArray(semesters) || semesters.length <= 1) return semesters;

  const canonicalCodeRe = /^\d{4}-\d{4}_\d+$/;

  function pickScore(s) {
    const code = String(s.code || "");
    let sc = 0;
    if (canonicalCodeRe.test(code)) sc += 200;
    if (s.isCurrent) sc += 50;
    sc -= Math.min(String(code).length, 80);
    return sc;
  }

  const byKey = new Map();
  for (const s of semesters) {
    const num = Number(s.semesterNum);
    if (!Number.isInteger(num) || num < 1) continue;
    const yr = String(s.academicYear ?? "").trim() || "_";
    const key = `${yr}|${num}`;
    const prev = byKey.get(key);
    if (!prev || pickScore(s) > pickScore(prev)) {
      byKey.set(key, s);
    }
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const ay = String(a.academicYear || "").localeCompare(
      String(b.academicYear || ""),
    );
    if (ay !== 0) return ay;
    return Number(a.semesterNum) - Number(b.semesterNum);
  });
}

export default function AutoEnrollmentPage() {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  /** Mặc định true: «Chạy» chỉ mô phỏng — ghi ClassEnrollment/waitlist khi bấm «Ghi enrollment vào CSDL». */
  const [dryRun, setDryRun] = useState(true);
  const [limit, setLimit] = useState("");
  const [majorCodesInput, setMajorCodesInput] = useState("");
  const [onlyStudentsWithoutEnrollments, setOnlyStudentsWithoutEnrollments] =
    useState(false);
  const [
    excludeStudentsAlreadyAssignedInSemester,
    setExcludeStudentsAlreadyAssignedInSemester,
  ] = useState(true);
  // enrollmentMode: 'normal' = theo khung CT, 'retake' = theo system semester dropdown
  const [enrollmentMode, setEnrollmentMode] = useState("normal");
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState("");
  const [loadingCurriculums, setLoadingCurriculums] = useState(false);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [curriculumSemRows, setCurriculumSemRows] = useState([]);
  const [loadingCurriculumSemesters, setLoadingCurriculumSemesters] =
    useState(false);
  // Class group filter for auto-enrollment
  const [classGroups, setClassGroups] = useState([]);
  const [selectedClassGroup, setSelectedClassGroup] = useState("");
  const [loadingClassGroups, setLoadingClassGroups] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [snapshotTitle, setSnapshotTitle] = useState("");
  const [snapshotNote, setSnapshotNote] = useState("");
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [snapshotMessage, setSnapshotMessage] = useState("");
  /** Hiển thị kết quả summary sau Live run (phân biệt với error) */
  const [liveRunMessage, setLiveRunMessage] = useState("");
  /** Khi lưu snapshot (sau Live): cập nhật maxCapacity các ClassSection cùng nhóm + HK */
  const [applyMaxCapacityOnSnapshot, setApplyMaxCapacityOnSnapshot] =
    useState(true);

  /** Xếp lớp thủ công: danh sách SV + chọn + ghi danh vào lớp có sẵn trong nhóm */
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [eligibleMeta, setEligibleMeta] = useState(null);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState({});
  const [assignMessage, setAssignMessage] = useState("");
  const [assignError, setAssignError] = useState("");

  // ── Trạng thái xếp lớp ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("enrollment"); // "enrollment" | "status"
  const [statusSemester, setStatusSemester] = useState(""); // semesterId
  const [statusSemesterInfo, setStatusSemesterInfo] = useState(null);
  const [statusClassGroup, setStatusClassGroup] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] = useState(null); // { enrolled: [], waitlisted: [], summary: {} }
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [deletingEnrollments, setDeletingEnrollments] = useState(false);
  const [deletingWaitlists, setDeletingWaitlists] = useState(false);
  const [promotingId, setPromotingId] = useState(null); // waitlistId đang promote
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" }); // { type: "success"|"error", text }
  const [statusCurriculumId, setStatusCurriculumId] = useState("");
  const [statusCurriculumSemRows, setStatusCurriculumSemRows] = useState([]);
  const [loadingStatusCurriculumSemesters, setLoadingStatusCurriculumSemesters] =
    useState(false);

  useEffect(() => {
    const loadSemesters = async () => {
      setLoadingSemesters(true);
      try {
        const response = await semesterService.getAll({ limit: 200, page: 1 });
        const data = response?.data?.data || [];
        setSemesters(data);

        const current = data.find((item) => item.isCurrent);
        if (current) {
          setSelectedSemesterId(current.id);
        } else if (data.length > 0) {
          setSelectedSemesterId(data[0].id);
        }
      } catch (err) {
        setError("Failed to load semesters");
      } finally {
        setLoadingSemesters(false);
      }
    };

    loadSemesters();
  }, []);

  useEffect(() => {
    const loadCurriculums = async () => {
      setLoadingCurriculums(true);
      try {
        const response = await curriculumService.getCurriculums({
          limit: 500,
          page: 1,
        });
        const raw = response?.data?.data || [];
        const active = raw.filter((c) => c.status === "active");
        setCurriculums(active);
      } catch {
        setCurriculums([]);
      } finally {
        setLoadingCurriculums(false);
      }
    };

    loadCurriculums();
  }, []);

  useEffect(() => {
    if (!statusCurriculumId) {
      setStatusCurriculumSemRows([]);
      return;
    }
    let cancelled = false;
    setStatusCurriculumSemRows([]);
    setLoadingStatusCurriculumSemesters(true);
    curriculumService
      .getSemesters(statusCurriculumId)
      .then((res) => {
        if (!cancelled) {
          setStatusCurriculumSemRows(res?.data?.data || []);
        }
      })
      .catch(() => {
        if (!cancelled) setStatusCurriculumSemRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingStatusCurriculumSemesters(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusCurriculumId]);

  useEffect(() => {
    if (enrollmentMode !== "normal" || !selectedCurriculumId) {
      setCurriculumSemRows([]);
      return;
    }
    let cancelled = false;
    setCurriculumSemRows([]);
    setLoadingCurriculumSemesters(true);
    curriculumService
      .getSemesters(selectedCurriculumId)
      .then((res) => {
        if (!cancelled) {
          setCurriculumSemRows(res?.data?.data || []);
        }
      })
      .catch(() => {
        if (!cancelled) setCurriculumSemRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCurriculumSemesters(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enrollmentMode, selectedCurriculumId]);

  // Load classGroups khi đổi HK hoặc khung CT (tab Chạy).
  // Lưu ý: ClassSection.academicYear thường là niên khóa khung CT (vd 2026-2030),
  // còn Semester.academicYear của HK hệ thống có thể là 2025-2026 → lọc sai sẽ ra 0 nhóm.
  useEffect(() => {
    if (activeTab !== "enrollment") return;
    const selectedSem = semesters.find(
      (s) => String(s.id) === String(selectedSemesterId),
    );
    if (!selectedSem) {
      setClassGroups([]);
      return;
    }
    const cur = curriculums.find(
      (c) => String(c._id || c.id) === String(selectedCurriculumId),
    );
    const academicYearForGroups =
      selectedCurriculumId && cur?.academicYear
        ? cur.academicYear
        : selectedSem.academicYear;

    let cancelled = false;
    setLoadingClassGroups(true);
    setClassGroups([]);
    setSelectedClassGroup("");
    classService
      .getClassGroups({
        semester: selectedSem.semesterNum,
        academicYear: academicYearForGroups,
        ...(selectedCurriculumId
          ? { curriculumId: selectedCurriculumId }
          : {}),
      })
      .then((res) => {
        if (!cancelled) setClassGroups(res?.data?.data || []);
      })
      .catch(() => {
        if (!cancelled) setClassGroups([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingClassGroups(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedSemesterId, semesters, selectedCurriculumId, curriculums]);

  // Cùng logic nhóm lớp cho tab Trạng thái (HK + khung CT trên tab đó).
  useEffect(() => {
    if (activeTab !== "status") return;
    const selectedSem = semesters.find(
      (s) => String(s.id) === String(statusSemester),
    );
    if (!selectedSem) {
      setClassGroups([]);
      return;
    }
    const cur = curriculums.find(
      (c) => String(c._id || c.id) === String(statusCurriculumId),
    );
    const academicYearForGroups =
      statusCurriculumId && cur?.academicYear
        ? cur.academicYear
        : selectedSem.academicYear;

    let cancelled = false;
    setLoadingClassGroups(true);
    setClassGroups([]);
    setStatusClassGroup("");
    classService
      .getClassGroups({
        semester: selectedSem.semesterNum,
        academicYear: academicYearForGroups,
        ...(statusCurriculumId ? { curriculumId: statusCurriculumId } : {}),
      })
      .then((res) => {
        if (!cancelled) setClassGroups(res?.data?.data || []);
      })
      .catch(() => {
        if (!cancelled) setClassGroups([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingClassGroups(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, statusSemester, semesters, statusCurriculumId, curriculums]);

  const selectedCurriculum = useMemo(
    () =>
      curriculums.find((c) => String(c._id || c.id) === selectedCurriculumId),
    [curriculums, selectedCurriculumId],
  );

  const statusSelectedCurriculum = useMemo(
    () =>
      curriculums.find(
        (c) => String(c._id || c.id) === String(statusCurriculumId),
      ),
    [curriculums, statusCurriculumId],
  );

  const statusSemesterOptions = useMemo(() => {
    if (!statusCurriculumId) {
      return dedupeInstitutionalSemesters(semesters).map((s) => {
        const id = semesterOptionId(s);
        return {
          ...s,
          id,
          optionKey: `${id}_${s.academicYear}`,
          curriculumSemesterOrder: undefined,
          curriculumSlotName: undefined,
          optionLabel: undefined,
        };
      });
    }
    if (loadingStatusCurriculumSemesters) {
      return [];
    }
    if (!statusCurriculumSemRows.length) {
      return [];
    }
    return buildSemesterOptionsFromCurriculum(
      semesters,
      statusCurriculumSemRows,
      statusSelectedCurriculum,
    );
  }, [
    semesters,
    statusCurriculumId,
    statusCurriculumSemRows,
    statusSelectedCurriculum,
    loadingStatusCurriculumSemesters,
  ]);

  useEffect(() => {
    if (!statusSemesterOptions.length) return;
    const valid = statusSemesterOptions.some(
      (s) => String(s.id) === String(statusSemester),
    );
    if (valid) return;
    const current = semesters.find((item) => item.isCurrent);
    const nextId =
      current &&
      statusSemesterOptions.some((s) => String(s.id) === String(current.id))
        ? semesterOptionId(current)
        : statusSemesterOptions[0].id;
    setStatusSemester(nextId);
  }, [statusSemesterOptions, semesters]);

  const semesterOptions = useMemo(() => {
    if (enrollmentMode === "retake") {
      return dedupeInstitutionalSemesters(semesters);
    }
    if (!selectedCurriculumId) {
      return dedupeInstitutionalSemesters(semesters);
    }
    if (loadingCurriculumSemesters) {
      return [];
    }
    if (curriculumSemRows.length === 0) {
      return [];
    }
    return buildSemesterOptionsFromCurriculum(
      semesters,
      curriculumSemRows,
      selectedCurriculum,
    );
  }, [
    enrollmentMode,
    semesters,
    selectedCurriculumId,
    selectedCurriculum,
    curriculumSemRows,
    loadingCurriculumSemesters,
  ]);

  useEffect(() => {
    if (!semesterOptions.length) return;
    const stillValid = semesterOptions.some((s) => s.id === selectedSemesterId);
    if (stillValid) return;
    const current = semesters.find((item) => item.isCurrent);
    const nextId =
      current && semesterOptions.some((s) => s.id === current.id)
        ? current.id
        : semesterOptions[0].id;
    setSelectedSemesterId(nextId);
  }, [semesterOptions, semesters, selectedSemesterId]);

  const selectedSemester = useMemo(
    () =>
      semesterOptions.find((item) => item.id === selectedSemesterId) ||
      semesters.find((item) => item.id === selectedSemesterId),
    [semesterOptions, semesters, selectedSemesterId],
  );

  const buildTriggerPayload = (dryRunFlag, opts = {}) => {
    const selectedCodes = Array.isArray(opts.selectedStudentCodes)
      ? opts.selectedStudentCodes
          .map((c) => String(c || "").trim().toUpperCase())
          .filter(Boolean)
      : [];
    const selectedOnly = selectedCodes.length > 0;
    return {
      dryRun: dryRunFlag === true,
      limit: selectedOnly ? undefined : limit ? Number(limit) : undefined,
      majorCodes: majorCodesInput
        .split(/[\s,;\n]+/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
      ...(selectedOnly ? { studentCodes: selectedCodes } : {}),
      onlyStudentsWithoutEnrollments,
      excludeStudentsAlreadyAssignedInSemester,
      mode: enrollmentMode,
      curriculumId: selectedCurriculumId || undefined,
      classGroup: selectedClassGroup || undefined,
    };
  };

  /** Cùng filter với trigger nhưng không gửi limit — server trả về đủ SV để chọn tay. */
  const buildEligiblePayload = () => {
    const cso = selectedSemester?.curriculumSemesterOrder;
    return {
      majorCodes: majorCodesInput
        .split(/[\s,;\n]+/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
      onlyStudentsWithoutEnrollments,
      excludeStudentsAlreadyAssignedInSemester,
      mode: enrollmentMode,
      curriculumId: selectedCurriculumId || undefined,
      classGroup: selectedClassGroup || undefined,
      curriculumSemesterOrder:
        cso != null && Number(cso) >= 1 ? Number(cso) : undefined,
    };
  };

  const handleLoadEligibleStudents = async () => {
    if (!selectedSemesterId) return;
    setLoadingEligible(true);
    setAssignError("");
    setAssignMessage("");
    try {
      const response = await autoEnrollmentService.listEligibleStudents(
        selectedSemesterId,
        buildEligiblePayload(),
      );
      const data = response?.data?.data;
      const list = data?.students || [];
      setEligibleStudents(list);
      setEligibleMeta(data?.filters || null);
      const next = {};
      list.forEach((s) => {
        next[String(s._id)] = false;
      });
      setSelectedStudentIds(next);
      const excludedSub =
        data?.filters?.excludedAlreadyEnrolledInSubject ?? 0;
      const tmplCode = data?.filters?.templateClassCodeForList;
      if (list.length === 0) {
        setAssignMessage(
          excludedSub > 0
            ? `Không còn sinh viên hiển thị sau khi loại ${excludedSub} SV đã có môn trong học kỳ này (theo lớp mẫu${tmplCode ? ` ${tmplCode}` : ""}).`
            : "Không có sinh viên nào khớp bộ lọc hiện tại.",
        );
      } else if (excludedSub > 0) {
        setAssignMessage(
          `Đã ẩn ${excludedSub} sinh viên đã học môn của lớp mẫu trong kỳ này${tmplCode ? ` (${tmplCode})` : ""} — chỉ còn SV chưa ghi danh môn đó.`,
        );
      }
    } catch (err) {
      setEligibleStudents([]);
      setEligibleMeta(null);
      setAssignError(
        err?.response?.data?.message || "Không tải được danh sách sinh viên",
      );
    } finally {
      setLoadingEligible(false);
    }
  };

  const handleToggleStudent = (id) => {
    const key = String(id);
    setSelectedStudentIds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAllEligible = (checked) => {
    setSelectedStudentIds((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = checked;
      });
      return next;
    });
  };

  const handleRun = async () => {
    if (!selectedSemesterId) return;

    setRunning(true);
    setError("");

    try {
      const response = await autoEnrollmentService.trigger(
        selectedSemesterId,
        buildTriggerPayload(dryRun),
      );
      setResult(response?.data?.data || null);
      setSnapshotMessage("");
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to trigger auto enrollment",
      );
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  /**
   * Ghi ClassEnrollment vào các lớp đã có trong nhóm — không tạo ClassSection.
   * @param {boolean} dryRunFlag - true = không ghi DB → sĩ số trên trang lớp không đổi.
   */
  const runSelectedIntoExistingSections = async (dryRunFlag) => {
    if (!selectedSemesterId) return;
    if (!selectedClassGroup) {
      setAssignError(
        'Chọn «Nhóm lớp học phần» — hệ thống mới biết pool các lớp sẵn có để tăng sĩ số.',
      );
      return;
    }
    const codes = eligibleStudents
      .filter((s) => selectedStudentIds[String(s._id)])
      .map((s) => String(s.studentCode || "").trim().toUpperCase())
      .filter(Boolean);
    if (codes.length === 0) {
      setAssignError("Chọn ít nhất một sinh viên trong bảng.");
      return;
    }
    setAssignError("");
    setRunning(true);
    setError("");

    try {
      const response = await autoEnrollmentService.trigger(
        selectedSemesterId,
        buildTriggerPayload(dryRunFlag === true, { selectedStudentCodes: codes }),
      );
      const summary = response?.data?.data?.summary;
      const totalEnrolled = summary?.totalEnrollments || 0;
      const totalWaitlisted = summary?.waitlisted || 0;
      const totalSkipped = (summary?.duplicates || 0) + (summary?.studentsNoActionNeeded || 0);
      setResult(response?.data?.data || null);
      setSnapshotMessage("");

      if (dryRunFlag) {
        setAssignMessage(
          `Xem trước: ${codes.length} SV — mô phỏng sẽ ghi: ~${totalEnrolled} enrollment, ~${totalWaitlisted} waitlist, ~${totalSkipped} skip. Không ghi CSDL.`,
        );
      } else if (totalEnrolled > 0) {
        setAssignMessage(
          `Đã ghi CSDL: ${totalEnrolled} enrollment (sĩ số tăng), ${totalWaitlisted} waitlist. Tải lại trang «Nhóm lớp học phần» để xem.`,
        );
      } else if (totalWaitlisted > 0) {
        setAssignMessage(
          `Chưa có enrollment mới: ${totalWaitlisted} sinh viên đã được đưa vào waitlist (lớp đầy hoặc không khớp HK/nhóm). Không tăng sĩ số. Kiểm tra log chi tiết phía dưới.`,
        );
      } else {
        setAssignMessage(
          `Đã xử lý ${codes.length} SV nhưng không tạo enrollment — xem log chi tiết phía dưới (Enrolled / Skipped / Errors) để biết lý do.`,
        );
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to trigger auto enrollment",
      );
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  const handlePreviewSelectedIntoExistingSections = () =>
    runSelectedIntoExistingSections(true);

  const handleApplySelectedIntoExistingSections = async () => {
    const codes = eligibleStudents
      .filter((s) => selectedStudentIds[String(s._id)])
      .map((s) => String(s.studentCode || "").trim().toUpperCase())
      .filter(Boolean);
    const ok = window.confirm(
      `Ghi thật vào CSDL: gán ${codes.length} sinh viên đã chọn vào các lớp có sẵn trong nhóm «${selectedClassGroup || "?"}»?\n\n` +
        "Sĩ số (currentEnrollment) sẽ tăng sau thao tác này. «Xem trước» không làm bước này.",
    );
    if (!ok) return;
    await runSelectedIntoExistingSections(false);
  };

  /** Bước 2: ghi enrollment/waitlist thật (sau khi đã xem trước với dry run). */
  const handleApplyLive = async () => {
    if (!selectedSemesterId) return;
    const ok = window.confirm(
      "Ghi enrollment và waitlist vào CSDL theo bộ lọc hiện tại trên form?\n\n" +
        "Đảm bảo HK / khung CT / nhóm lớp giống lần xem trước. Thao tác này không thể hoàn tác bằng «Lưu bản log».",
    );
    if (!ok) return;

    setRunning(true);
    setError("");

    try {
      const response = await autoEnrollmentService.trigger(
        selectedSemesterId,
        buildTriggerPayload(false),
      );
      const summary = response?.data?.data?.summary;
      const totalEnrolled = summary?.totalEnrollments || 0;
      const totalWaitlisted = summary?.waitlisted || 0;
      const totalSkipped =
        (summary?.duplicates || 0) + (summary?.studentsNoActionNeeded || 0) +
        (summary?.excludedAlreadyAssignedInSemester || 0);
      setResult(response?.data?.data || null);
      setSnapshotMessage("");

      if (totalEnrolled > 0) {
        setLiveRunMessage(
          totalWaitlisted > 0
            ? `Ghi thành công: ${totalEnrolled} enrollment (sĩ số tăng), ${totalWaitlisted} waitlist.${totalSkipped > 0 ? ` ${totalSkipped} skip.` : ""}`
            : `Ghi thành công: ${totalEnrolled} enrollment — sĩ số các lớp đã tăng.`,
        );
      } else if (totalWaitlisted > 0) {
        setLiveRunMessage(
          `Không tạo enrollment mới: ${totalWaitlisted} sinh viên được đưa vào waitlist (lớp đầy hoặc không khớp HK/nhóm). Xem log chi tiết phía dưới.`,
        );
      } else {
        setLiveRunMessage(
          `Đã xử lý nhưng không có enrollment mới — xem log bên dưới (Enrolled / Skipped / Errors) để biết lý do.`,
        );
      }
    } catch (err) {
      setError(
        err?.response?.data?.message || "Failed to trigger auto enrollment",
      );
      setLiveRunMessage("");
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  const handleSaveSnapshot = async () => {
    if (!result || !selectedSemesterId) return;
    const title = snapshotTitle.trim();
    if (!title) {
      setSnapshotMessage("Nhập tên bản lưu (ví dụ: SE1808-01 HK2).");
      return;
    }
    setSavingSnapshot(true);
    setSnapshotMessage("");
    try {
      await enrollmentSnapshotService.create({
        title,
        description: snapshotNote.trim(),
        semesterId: selectedSemesterId,
        curriculumId: selectedCurriculumId || undefined,
        curriculumCode: selectedCurriculum
          ? [selectedCurriculum.code, selectedCurriculum.name]
              .filter(Boolean)
              .join(" — ")
          : "",
        result,
        applyMaxCapacityToClassSections:
          applyMaxCapacityOnSnapshot && result?.dryRun !== true,
      });
      setSnapshotMessage("Đã lưu. Xem tại mục Lịch sử xếp lớp.");
    } catch (err) {
      setSnapshotMessage(err?.response?.data?.message || "Lưu thất bại.");
    } finally {
      setSavingSnapshot(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Auto Enrollment</h1>
        <p className="mt-1 text-sm text-slate-600">
          Assign active students to class sections for the selected semester.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-medium">Luồng đề xuất:</span> bấm chạy xem trước
          (mặc định không ghi CSDL) → xem cột Enrolled / Skipped → nếu
          đúng thì bấm «Ghi enrollment vào CSDL». «Lưu bản log» chỉ lưu snapshot
          để tra cứu, không gán lớp.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("enrollment")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "enrollment"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Chạy Auto Enrollment
        </button>
        <button
          onClick={() => setActiveTab("status")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "status"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Trạng thái xếp lớp
        </button>
      </div>

      {/* Tab: Chạy Auto Enrollment */}
      {activeTab === "enrollment" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Semester
              </label>
              <select
                value={
                  semesterOptions.some((s) => s.id === selectedSemesterId)
                    ? selectedSemesterId
                    : ""
                }
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                disabled={
                  loadingSemesters ||
                  running ||
                  (enrollmentMode === "normal" &&
                    !!selectedCurriculumId &&
                    loadingCurriculumSemesters)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {semesterOptions.length === 0 ? (
                  <option value="">
                    {enrollmentMode === "normal" && selectedCurriculumId
                      ? loadingCurriculumSemesters
                        ? "Đang tải học kỳ theo khung CT..."
                        : "Không có học kỳ khớp khung (khung chưa có kỳ hoặc chưa map HK hệ thống)."
                      : "Không có học kỳ"}
                  </option>
                ) : (
                  semesterOptions.map((semester) => (
                    <option
                      key={semester.optionKey ?? semester.id}
                      value={semester.id}
                    >
                      {semester.optionLabel ??
                        `${semester.name} (${semester.code})`}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {enrollmentMode === "retake"
                  ? "Danh sách đầy đủ các học kỳ hệ thống (cùng nguồn với Quản lý học kỳ)."
                  : selectedCurriculumId
                    ? "Mỗi kỳ trong khung CT tương ứng một HK hệ thống (ưu tiên trùng khoảng ngày với dòng khung, sau đó theo số kỳ)."
                    : "Tất cả học kỳ hệ thống — chọn một khung CT ở dưới để chỉ còn các kỳ của khung đó."}
              </p>
            </div>

            {/* Enrollment Mode */}
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Chế độ xếp lớp
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="enrollmentMode"
                    value="normal"
                    checked={enrollmentMode === "normal"}
                    onChange={() => setEnrollmentMode("normal")}
                    disabled={running}
                    className="text-indigo-600"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Theo khung CT</span>
                    <span className="ml-1 text-slate-500">
                      (dùng classGroup để match SV với lớp)
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="enrollmentMode"
                    value="retake"
                    checked={enrollmentMode === "retake"}
                    onChange={() => setEnrollmentMode("retake")}
                    disabled={running}
                    className="text-indigo-600"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Học lại / Học vượt</span>
                    <span className="ml-1 text-slate-500">
                      (theo HK được chọn bên trên)
                    </span>
                  </span>
                </label>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {enrollmentMode === "normal"
                  ? "SV sẽ được xếp vào lớp cùng nhóm (classGroup) với SV. Phù hợp cho xếp lớp theo khung chương trình."
                  : "SV sẽ được xếp vào lớp của HK được chọn. Phù hợp cho học lại hoặc học vượt."}
              </p>
            </div>

            {enrollmentMode === "normal" && (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Khung chương trình
                </label>
                <select
                  value={selectedCurriculumId}
                  onChange={(e) => setSelectedCurriculumId(e.target.value)}
                  disabled={running || loadingCurriculums}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">
                    {loadingCurriculums
                      ? "Đang tải..."
                      : "— Tất cả khung đang active —"}
                  </option>
                  {curriculums.map((c) => {
                    const id = String(c._id || c.id);
                    const label =
                      [c.code, c.name].filter(Boolean).join(" — ") || id;
                    return (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Chọn khung → chỉ xét sinh viên thuộc{" "}
                  <span className="font-medium">ngành của khung</span> và{" "}
                  <span className="font-medium">năm nhập học</span> nằm trong khoảng
                  niên khóa trên khung (vd 2018–2023 cho K18), trừ khi SV đã gán đúng{" "}
                  <span className="font-medium">curriculumId</span> của khung này. SV chưa gán
                  khung: cần <span className="font-medium">majorCode</span> đúng ngành.
                </p>
              </div>
            )}

            {/* Class Group filter */}
            {enrollmentMode === "normal" && (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Nhóm lớp học phần
                  {selectedClassGroup && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-teal-100 text-teal-700 text-xs font-medium">
                      {selectedClassGroup}
                    </span>
                  )}
                </label>
                <select
                  value={selectedClassGroup}
                  onChange={(e) => setSelectedClassGroup(e.target.value)}
                  disabled={running || loadingClassGroups}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">
                    {loadingClassGroups
                      ? "Đang tải..."
                      : classGroups.length === 0
                        ? "— Chưa có nhóm nào —"
                        : `— Tất cả nhóm (${classGroups.length}) —`}
                  </option>
                  {classGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Khi chọn nhóm: SV đang có ít nhất một lớp HP{" "}
                  <span className="font-medium">enrolled</span> với{" "}
                  <span className="font-medium">classGroup</span> trùng nhóm đó, hoặc SV{" "}
                  <span className="font-medium">chưa có</span> lớp HP enrolled nào có nhóm
                  (và chưa ghi Lớp SH thủ công trên hồ sơ). Để trống = không lọc theo nhóm.
                </p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Student limit
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                disabled={running}
                placeholder="Leave empty to process all"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                Để trống = không giới hạn số sinh viên khi bấm «Chạy Auto Enrollment» phía
                trên. Nhập số nguyên ≥ 1 = chỉ xử lý tối đa nhiêu SV (theo thứ tự lọc).
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Major codes
              </label>
              <input
                type="text"
                value={majorCodesInput}
                onChange={(e) => setMajorCodesInput(e.target.value)}
                disabled={running}
                placeholder={
                  enrollmentMode === "normal" && selectedCurriculumId
                    ? "SE"
                    : "SE, AI, CE…"
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">
                {enrollmentMode === "normal" && selectedCurriculumId
                  ? "Tùy chọn — để trống = chạy tất cả ngành trong khung. Nhập mã để thu hẹp còn mã đó (phải nằm trong khung đã chọn)."
                  : "Bắt buộc khi không chọn khung — cách nhau bằng dấu phẩy hoặc khoảng trắng."}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div style={{ display: "none" }}>
            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  disabled={running}
                />
                Chỉ xem trước (dry run — không ghi ClassEnrollment / waitlist)
              </span>
              {!dryRun && (
                <span className="ml-6 text-xs text-amber-800">
                  Đang tắt dry run: mỗi lần bấm nút chạy bên dưới sẽ ghi thật vào
                  CSDL.
                </span>
              )}
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={onlyStudentsWithoutEnrollments}
                onChange={(e) =>
                  setOnlyStudentsWithoutEnrollments(e.target.checked)
                }
                disabled={running}
              />
              Chỉ sinh viên chưa hoàn thành kỳ hiện tại
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={excludeStudentsAlreadyAssignedInSemester}
                  onChange={(e) =>
                    setExcludeStudentsAlreadyAssignedInSemester(e.target.checked)
                  }
                  disabled={running}
                />
                Bỏ qua SV đã có lớp trong HK hệ thống đang chọn (tránh trùng)
              </span>
              {onlyStudentsWithoutEnrollments && (
                <span className="ml-6 text-xs text-slate-500">
                  Khi đã tick &quot;chưa hoàn thành kỳ&quot; phía trên, tùy chọn này được bỏ qua
                  trên server để vẫn xếp thêm môn cho SV đã có một phần lớp trong HK.
                </span>
              )}
            </label>
          </div>

            <div className="hidden flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRun}
                disabled={
                  !selectedSemesterId ||
                  running ||
                  semesterOptions.length === 0 ||
                  !semesterOptions.some((s) => s.id === selectedSemesterId)
                }
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running
                  ? "Đang chạy..."
                  : dryRun
                    ? "Chạy xem trước (không ghi CSDL)"
                    : "Chạy và ghi ngay vào CSDL"}
              </button>
              <p className="max-w-xl text-xs text-slate-600">
                <span className="font-medium text-slate-700">Chỉ ghi danh (ClassEnrollment)</span> vào
                các lớp học phần đã tồn tại —{" "}
                <span className="font-medium">không tạo</span> ClassSection mới. Khi đã chọn{" "}
                <span className="font-medium">Nhóm lớp học phần</span>, hệ thống gán SV vào{" "}
                <span className="font-medium">mọi môn</span> có lớp mở (Published/Scheduled) trong nhóm đó
                (ví dụ 2 lớp → 2 môn → 2 enrollment).
              </p>
            </div>
          </div>
        </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Xếp lớp thủ công
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Dùng đúng bộ lọc phía trên (học kỳ, khung CT, nhóm lớp, checkbox…).{" "}
              <span className="font-medium">Student limit</span> chỉ áp cho nút «Chạy Auto Enrollment» phía trên
              (toàn bộ SV khớp lọc). Danh sách dưới đây là toàn bộ sau lọc (không cắt theo limit).{" "}
              <span className="font-medium text-emerald-800">
                Để tăng sĩ số thật trên CSDL
              </span>
              , chọn SV rồi bấm{" "}
              <span className="font-medium">«Ghi vào CSDL — tăng sĩ số lớp»</span> trong khối
              xanh lá (nút «Xem trước» không làm sĩ số đổi).
            </p>
            <p className="mt-2 text-xs text-amber-900/90 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5">
              <span className="font-medium">Lọc nhóm</span> khớp với cột Lớp SH ở Quản lý
              sinh viên: dựa trên <span className="font-medium">nhóm (classGroup)</span>{" "}
              trên các lớp học phần đang <span className="font-medium">enrolled</span> (và
              cùng quy tắc &quot;chưa có nhóm&quot; như form). SV đã có enrollment với nhóm
              khác sẽ không vào danh sách khi chọn nhóm không trùng. Muốn xem rộng: để trống
              dropdown nhóm lớp. Khi đã chọn nhóm + HK map khung CT, danh sách còn{" "}
              <span className="font-medium">ẩn SV đã có môn đó trong kỳ</span> (đã enrolled/
              completed lớp cùng môn + kỳ như lớp mẫu trong nhóm) để chỉ còn người chưa tham
              gia môn đó.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLoadEligibleStudents}
                disabled={
                  loadingEligible ||
                  !selectedSemesterId ||
                  semesterOptions.length === 0 ||
                  !semesterOptions.some((s) => s.id === selectedSemesterId)
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingEligible ? "Đang tải…" : "Xem tất cả sinh viên (sau lọc)"}
              </button>
            </div>

            {eligibleStudents.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
                  <span>
                    <span className="font-medium">{eligibleStudents.length}</span>{" "}
                    sinh viên
                    {eligibleMeta?.curriculumEnrollmentYearRange != null && (
                      <span className="ml-2 text-xs text-slate-500">
                        (niên khóa SV:{" "}
                        {typeof eligibleMeta.curriculumEnrollmentYearRange ===
                        "object" &&
                        eligibleMeta.curriculumEnrollmentYearRange != null &&
                        "startYear" in eligibleMeta.curriculumEnrollmentYearRange
                          ? `${eligibleMeta.curriculumEnrollmentYearRange.startYear}–${eligibleMeta.curriculumEnrollmentYearRange.endYear}`
                          : String(eligibleMeta.curriculumEnrollmentYearRange)}
                        )
                      </span>
                    )}
                  </span>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={
                        eligibleStudents.length > 0 &&
                        eligibleStudents.every(
                          (s) => selectedStudentIds[String(s._id)],
                        )
                      }
                      onChange={(e) =>
                        handleSelectAllEligible(e.target.checked)
                      }
                    />
                    Chọn tất cả
                  </label>
                </div>

                <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="w-10 px-2 py-2 text-left" />
                        <th className="px-2 py-2 text-left font-semibold text-slate-700">
                          Mã SV
                        </th>
                        <th className="px-2 py-2 text-left font-semibold text-slate-700">
                          Họ tên
                        </th>
                        <th className="px-2 py-2 text-left font-semibold text-slate-700">
                          Ngành
                        </th>
                        <th className="px-2 py-2 text-left font-semibold text-slate-700">
                          Khóa
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {eligibleStudents.map((s) => (
                        <tr key={String(s._id)} className="hover:bg-slate-50">
                          <td className="px-2 py-1.5">
                            <input
                              type="checkbox"
                              checked={!!selectedStudentIds[String(s._id)]}
                              onChange={() => handleToggleStudent(s._id)}
                            />
                          </td>
                          <td className="px-2 py-1.5 font-mono text-xs">
                            {s.studentCode}
                          </td>
                          <td className="px-2 py-1.5">{s.fullName}</td>
                          <td className="px-2 py-1.5">{s.majorCode ?? "—"}</td>
                          <td className="px-2 py-1.5">
                            {s.enrollmentYear ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50/90 p-3 space-y-2">
                  <p className="text-xs font-semibold text-emerald-950">
                    Ghi danh vào các lớp học phần đã có trong nhóm (không tạo lớp mới)
                  </p>
                  <p className="text-xs text-emerald-900/90 leading-relaxed">
                    <span className="font-medium">Xem trước</span> chỉ mô phỏng kết quả —{" "}
                    <span className="font-medium">không ghi ClassEnrollment</span>, nên sĩ số
                    trên trang lớp / nhóm học phần{" "}
                    <span className="font-medium">sẽ không tăng</span>. Để sĩ số tăng, bấm nút{" "}
                    <span className="font-medium">«Ghi vào CSDL…»</span> bên dưới (hoặc tắt «Chỉ
                    xem trước» phía trên rồi dùng «Chạy Auto Enrollment» / «Ghi enrollment vào
                    CSDL»).
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePreviewSelectedIntoExistingSections}
                      disabled={
                        running ||
                        !selectedSemesterId ||
                        !selectedClassGroup ||
                        !eligibleStudents.some(
                          (s) => selectedStudentIds[String(s._id)],
                        ) ||
                        semesterOptions.length === 0 ||
                        !semesterOptions.some((s) => s.id === selectedSemesterId)
                      }
                      className="rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {running ? "Đang chạy…" : "Xem trước (không đổi sĩ số)"}
                    </button>
                    <button
                      type="button"
                      onClick={handleApplySelectedIntoExistingSections}
                      disabled={
                        running ||
                        !selectedSemesterId ||
                        !selectedClassGroup ||
                        !eligibleStudents.some(
                          (s) => selectedStudentIds[String(s._id)],
                        ) ||
                        semesterOptions.length === 0 ||
                        !semesterOptions.some((s) => s.id === selectedSemesterId)
                      }
                      className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {running ? "Đang chạy…" : "Ghi vào CSDL — tăng sĩ số lớp"}
                    </button>
                  </div>
                </div>

                {assignError && (
                  <p className="text-sm text-red-600">{assignError}</p>
                )}
                {assignMessage && (
                  <p className="text-sm text-emerald-800">{assignMessage}</p>
                )}
              </div>
            )}
          </div>

          {selectedSemester && (
            <p className="mt-3 text-xs text-slate-500">
              Selected:{" "}
              {selectedSemester.optionLabel ??
                `${selectedSemester.name} - Semester ${selectedSemester.semesterNum} - ${selectedSemester.academicYear}`}
              {enrollmentMode === "normal" && selectedCurriculum && (
                <>
                  {" "}
                  · Khung CT:{" "}
                  {[selectedCurriculum.code, selectedCurriculum.name]
                    .filter(Boolean)
                    .join(" — ")}
                </>
              )}
            </p>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Tab: Trạng thái xếp lớp */}
      {activeTab === "status" && (
        <EnrollmentStatusTab
          semesters={semesters}
          curriculums={curriculums}
          loadingCurriculums={loadingCurriculums}
          classGroups={classGroups}
          statusCurriculumId={statusCurriculumId}
          setStatusCurriculumId={setStatusCurriculumId}
          statusSemesterOptions={statusSemesterOptions}
          loadingStatusCurriculumSemesters={loadingStatusCurriculumSemesters}
          statusSemester={statusSemester}
          setStatusSemester={setStatusSemester}
          setStatusSemesterInfo={setStatusSemesterInfo}
          statusClassGroup={statusClassGroup}
          setStatusClassGroup={setStatusClassGroup}
          enrollmentStatus={enrollmentStatus}
          setEnrollmentStatus={setEnrollmentStatus}
          loadingStatus={loadingStatus}
          setLoadingStatus={setLoadingStatus}
          statusError={statusError}
          setStatusError={setStatusError}
          deletingEnrollments={deletingEnrollments}
          setDeletingEnrollments={setDeletingEnrollments}
          deletingWaitlists={deletingWaitlists}
          setDeletingWaitlists={setDeletingWaitlists}
          promotingId={promotingId}
          setPromotingId={setPromotingId}
          actionMessage={actionMessage}
          setActionMessage={setActionMessage}
        />
      )}

      {/* Result sections — always visible when result exists, outside tabs */}
      {result && (
        <div className="mt-6 space-y-4">
          {result.dryRun ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Đây là xem trước — chưa ghi vào CSDL</p>
              <p className="mt-1 text-amber-900">
                Cột Enrolled / Waitlisted / Skipped phản ánh kết quả mô phỏng. Nếu
                muốn tạo ClassEnrollment và waitlist thật, bấm nút bên dưới (dùng
                đúng bộ lọc hiện tại trên form).
              </p>
              <button
                type="button"
                onClick={handleApplyLive}
                disabled={running}
                className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running ? "Đang ghi..." : "Ghi enrollment vào CSDL (Live)"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <p className="font-semibold">Lần chạy này đã ghi vào CSDL (Live)</p>
              {liveRunMessage ? (
                <p className="mt-1 font-medium text-emerald-800">{liveRunMessage}</p>
              ) : (
                <p className="mt-1 text-emerald-900">
                  Enrollment và waitlist (nếu có) đã được lưu. Bản «Lưu bản log»
                  phía dưới chỉ là snapshot tra cứu, không phải bước gán lớp.
                </p>
              )}
            </div>
          )}
          {/* Lưu kết quả form */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Lưu bản log (snapshot)
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Lưu vào Lịch sử xếp lớp kèm{" "}
              <span className="font-medium text-slate-800">
                nhóm lớp (classGroup)
              </span>{" "}
              lấy từ ClassSection trong log — hỗ trợ điểm danh theo lớp. Không tạo
              ClassEnrollment mới (đã có sau bước Live). Có thể đồng bộ{" "}
              <span className="font-medium text-slate-800">sĩ số tối đa</span>{" "}
              (Student limit) lên các ClassSection cùng nhóm và HK hệ thống.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Tên bản lưu *
                </label>
                <input
                  value={snapshotTitle}
                  onChange={(e) => setSnapshotTitle(e.target.value)}
                  disabled={savingSnapshot}
                  placeholder="VD: SE1808-01 — HK2 2025-2026"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Ghi chú (tuỳ chọn)
                </label>
                <textarea
                  value={snapshotNote}
                  onChange={(e) => setSnapshotNote(e.target.value)}
                  disabled={savingSnapshot}
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={applyMaxCapacityOnSnapshot}
                onChange={(e) => setApplyMaxCapacityOnSnapshot(e.target.checked)}
                disabled={savingSnapshot || result?.dryRun === true}
                className="mt-0.5"
              />
              <span>
                Áp dụng{" "}
                <span className="font-medium text-slate-800">Student limit</span>{" "}
                làm{" "}
                <span className="font-medium text-slate-800">maxCapacity</span>{" "}
                cho mọi ClassSection cùng{" "}
                <span className="font-medium text-slate-800">classGroup</span> và
                học kỳ hệ thống đang chọn (không giảm dưới sĩ số hiện có).
                {result?.dryRun === true ? (
                  <span className="block text-xs text-amber-700">
                    Tắt dry run và chạy Live trước khi lưu nếu muốn đồng bộ sĩ số.
                  </span>
                ) : null}
              </span>
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveSnapshot}
                disabled={savingSnapshot}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingSnapshot ? "Đang lưu..." : "Lưu bản log"}
              </button>
              <Link
                to="/admin/enrollment-snapshots"
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Mở lịch sử đã lưu →
              </Link>
            </div>
            {snapshotMessage && (
              <p className="mt-3 text-sm text-slate-600">{snapshotMessage}</p>
            )}
          </div>

          {/* Execution Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Execution Summary
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryItem
                label="Students"
                value={result.summary?.totalStudents || 0}
              />
              <SummaryItem
                label="Candidate Students"
                value={result.summary?.candidateStudents || 0}
              />
              <SummaryItem
                label="Skipped (already in this HK)"
                value={result.summary?.excludedAlreadyAssignedInSemester || 0}
              />
              <SummaryItem
                label="Enrollments"
                value={result.summary?.totalEnrollments || 0}
              />
              <SummaryItem
                label="Waitlisted"
                value={result.summary?.waitlisted || 0}
              />
              <SummaryItem
                label="Duplicates"
                value={result.summary?.duplicates || 0}
              />
              <SummaryItem label="Failed" value={result.summary?.failed || 0} />
              <SummaryItem
                label="Processed"
                value={result.summary?.processedStudents || 0}
              />
              <SummaryItem
                label="Error Students"
                value={result.summary?.studentsWithErrors || 0}
              />
              <SummaryItem
                label="Runtime"
                value={`${result.durationMs || 0} ms`}
              />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Mode: {result.dryRun ? "Dry run" : "Live run"}
            </p>
            {result.filters && (
              <p className="mt-1 text-xs text-slate-500">
                Filters: {JSON.stringify(result.filters)}
              </p>
            )}
          </div>

          {/* Preflight */}
          {result.preflight && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Preflight</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryItem
                  label="Active Curriculums"
                  value={result.preflight.activeCurriculumCount || 0}
                />
                <SummaryItem
                  label="Open Classes"
                  value={result.preflight.openClassSectionCount || 0}
                />
                <SummaryItem
                  label="Missing Enrollment Year"
                  value={result.preflight.studentsMissingEnrollmentYear || 0}
                />
                <SummaryItem
                  label="Excluded (already assigned in HK)"
                  value={
                    result.preflight.excludedAlreadyAssignedInSemester || 0
                  }
                />
              </div>

              {(result.preflight.warnings || []).length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="text-sm font-semibold text-amber-800">
                    Warnings
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-amber-700">
                    {(result.preflight.warnings || []).map((warning) => (
                      <li key={warning}>- {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <JsonBlock
                  title="No Curriculum By Major"
                  value={
                    result.preflight.studentsWithoutCurriculumByMajor || {}
                  }
                />
                <JsonBlock
                  title="No Curriculum By Reason"
                  value={
                    result.preflight.studentsWithoutCurriculumByReason || {}
                  }
                />
              </div>
            </div>
          )}

          {/* Học phần xuất hiện */}
          {(() => {
            const codes = collectUniqueEnrolledSubjectCodes(result.logs);
            if (codes.length === 0) return null;
            return (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-800">
                  Học phần xuất hiện trong lần chạy ({codes.length})
                </p>
                <p className="mt-1 break-words text-slate-600">
                  {codes.join(", ")}
                </p>
              </div>
            );
          })()}

          {/* Execution Logs */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Execution Logs</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Student
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Enrolled
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Waitlisted
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Skipped
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Errors
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Chi tiết (mã môn)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(result.logs || []).map((row) => {
                    const detail = formatEnrollmentLogDetail(row);

                    return (
                      <tr
                        key={row.studentId}
                        className="border-b border-slate-100 align-top"
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-900">
                            {row.fullName || "-"}
                          </div>
                          <div className="break-all text-xs text-slate-600">
                            {row.email || "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {row.studentCode || "-"}
                          </div>
                          {row.curriculumSemesterOrder && (
                            <div className="text-xs text-slate-400">
                              Curriculum semester {row.curriculumSemesterOrder}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-green-700">
                          {row.enrolled?.length || 0}
                        </td>
                        <td className="px-3 py-2 text-amber-700">
                          {row.waitlisted?.length || 0}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {row.skipped?.length || 0}
                        </td>
                        <td className="px-3 py-2 text-red-700">
                          {row.errors?.length || 0}
                        </td>
                        <td className="max-w-[280px] px-3 py-2 text-xs break-words text-slate-600">
                          {detail}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── EnrollmentStatusTab ───────────────────────────────────────────────────────────
function EnrollmentStatusTab({
  semesters,
  curriculums,
  loadingCurriculums,
  classGroups,
  statusCurriculumId,
  setStatusCurriculumId,
  statusSemesterOptions,
  loadingStatusCurriculumSemesters,
  statusSemester,
  setStatusSemester,
  setStatusSemesterInfo,
  statusClassGroup,
  setStatusClassGroup,
  enrollmentStatus,
  setEnrollmentStatus,
  loadingStatus,
  setLoadingStatus,
  statusError,
  setStatusError,
  deletingEnrollments,
  setDeletingEnrollments,
  deletingWaitlists,
  setDeletingWaitlists,
  promotingId,
  setPromotingId,
  actionMessage,
  setActionMessage,
}) {
  const selectedSem =
    statusSemesterOptions.find((s) => String(s.id) === String(statusSemester)) ||
    semesters.find((s) => String(s.id) === String(statusSemester));

  const loadStatus = async () => {
    if (!selectedSem) return;
    setLoadingStatus(true);
    setStatusError("");
    setEnrollmentStatus(null);
    setActionMessage({ type: "", text: "" });
    try {
      const csOrder = selectedSem?.curriculumSemesterOrder;
      const res = await autoEnrollmentService.getEnrollmentStatus({
        semesterNum: selectedSem.semesterNum,
        academicYear: selectedSem.academicYear,
        classGroup: statusClassGroup || undefined,
        curriculumId: statusCurriculumId || undefined,
        curriculumSemesterOrder:
          csOrder != null && Number.isFinite(Number(csOrder)) && Number(csOrder) >= 1
            ? Number(csOrder)
            : undefined,
      });
      if (res.data?.success) {
        setEnrollmentStatus(res.data.data);
        setStatusSemesterInfo(selectedSem);
      } else {
        setStatusError(res.data?.message || "Failed to load enrollment status");
      }
    } catch (err) {
      setStatusError(err?.response?.data?.message || err.message || "Unknown error");
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleDeleteEnrollments = async () => {
    if (!selectedSem) return;
    if (!window.confirm(`Xóa enrollment của HK "${selectedSem.name}"${statusClassGroup ? ` (nhóm ${statusClassGroup})` : ""}? Hành động này không thể hoàn tác.`)) return;
    setDeletingEnrollments(true);
    setActionMessage({ type: "", text: "" });
    try {
      const res = await autoEnrollmentService.deleteEnrollments({
        semesterNum: selectedSem.semesterNum,
        academicYear: selectedSem.academicYear,
        classGroup: statusClassGroup || undefined,
      });
      setActionMessage({ type: "success", text: res.data?.message || "Đã xóa enrollment" });
      await loadStatus();
    } catch (err) {
      setActionMessage({ type: "error", text: err?.response?.data?.message || "Xóa thất bại" });
    } finally {
      setDeletingEnrollments(false);
    }
  };

  const handleDeleteWaitlists = async () => {
    if (!selectedSem) return;
    if (!window.confirm(`Xóa waitlist của HK "${selectedSem.name}"${statusClassGroup ? ` (nhóm ${statusClassGroup})` : ""}? Hành động này không thể hoàn tác.`)) return;
    setDeletingWaitlists(true);
    setActionMessage({ type: "", text: "" });
    try {
      const res = await autoEnrollmentService.deleteWaitlists({
        semesterNum: selectedSem.semesterNum,
        academicYear: selectedSem.academicYear,
        classGroup: statusClassGroup || undefined,
      });
      setActionMessage({ type: "success", text: res.data?.message || "Đã xóa waitlist" });
      await loadStatus();
    } catch (err) {
      setActionMessage({ type: "error", text: err?.response?.data?.message || "Xóa thất bại" });
    } finally {
      setDeletingWaitlists(false);
    }
  };

  const handlePromote = async (waitlistId) => {
    if (!window.confirm("Kéo sinh viên từ waitlist lên enrolled (tự tìm lớp trống phù hợp)?")) return;
    setPromotingId(waitlistId);
    setActionMessage({ type: "", text: "" });
    try {
      const res = await autoEnrollmentService.promoteWaitlist(String(waitlistId));
      if (res.data?.success) {
        setActionMessage({ type: "success", text: res.data.message });
        await loadStatus();
      } else {
        setActionMessage({ type: "error", text: res.data?.message || "Promote thất bại" });
      }
    } catch (err) {
      setActionMessage({ type: "error", text: err?.response?.data?.message || err.message || "Promote thất bại" });
    } finally {
      setPromotingId(null);
    }
  };

  const summary = enrollmentStatus?.summary || {};

  const statusFilterHint = [
    statusCurriculumId ? "khung CT đã chọn" : null,
    selectedSem?.curriculumSemesterOrder != null
      ? `kỳ ${selectedSem.curriculumSemesterOrder} trong khung`
      : null,
    statusClassGroup ? `nhóm ${statusClassGroup}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-5">
      {/* Bộ lọc */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          Xem trạng thái xếp lớp
        </h2>
        <p className="mb-4 text-sm text-slate-600">
          Xem sinh viên nào đã <span className="font-medium text-green-700">enrolled</span>, đang{" "}
          <span className="font-medium text-amber-700">waitlisted</span>, hoặc{" "}
          <span className="font-medium text-slate-700">chưa có gì</span> trong học kỳ này —
          trước khi reset hoặc promote. Chọn{" "}
          <span className="font-medium">khung chương trình</span> để lọc giống tab Chạy (kỳ trong
          khung map sang HK hệ thống — cùng nguồn với{" "}
          <Link to="/admin/semesters" className="text-blue-600 underline hover:text-blue-800">
            Quản lý học kỳ
          </Link>
          ).
        </p>
        <div className="mb-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Khung chương trình <span className="font-normal text-slate-400">(tùy chọn)</span>
          </label>
          <select
            value={statusCurriculumId}
            onChange={(e) => {
              setStatusCurriculumId(e.target.value);
              setEnrollmentStatus(null);
              setStatusSemesterInfo(null);
            }}
            disabled={loadingCurriculums}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">
              {loadingCurriculums
                ? "Đang tải..."
                : "— Không lọc theo khung — (tất cả HK hệ thống)"}
            </option>
            {curriculums.map((c) => {
              const id = String(c._id || c.id);
              const label = [c.code, c.name].filter(Boolean).join(" — ") || id;
              return (
                <option key={id} value={id}>
                  {label}
                </option>
              );
            })}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Khi chọn khung: dropdown học kỳ chỉ còn các kỳ của khung (map tới HK hệ thống); kết quả
            lọc thêm theo <span className="font-medium">curriculum</span> trên lớp học phần và{" "}
            <span className="font-medium">kỳ trong khung</span> (curriculumSemesterOrder).
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Học kỳ hệ thống / kỳ trong khung
            </label>
            <select
              value={statusSemester}
              onChange={(e) => {
                setStatusSemester(e.target.value);
                setEnrollmentStatus(null);
                setStatusSemesterInfo(null);
              }}
              disabled={
                !statusSemesterOptions.length ||
                (Boolean(statusCurriculumId) && loadingStatusCurriculumSemesters)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
            >
              {!statusSemesterOptions.length ? (
                <option value="">
                  {statusCurriculumId && loadingStatusCurriculumSemesters
                    ? "Đang tải kỳ theo khung..."
                    : statusCurriculumId
                      ? "Không map được HK cho khung này."
                      : "— Chọn học kỳ —"}
                </option>
              ) : (
                statusSemesterOptions.map((s) => (
                  <option key={s.optionKey ?? s.id} value={s.id}>
                    {s.optionLabel ?? `${s.name} (${s.academicYear})`}
                  </option>
                ))
              )}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {statusCurriculumId
                ? "Mỗi dòng = một kỳ trong khung CT → HK hệ thống tương ứng."
                : "Danh sách HK hệ thống đã gộp trùng (cùng nguồn với trang Quản lý học kỳ)."}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Nhóm lớp <span className="font-normal text-slate-400">(tùy chọn)</span>
            </label>
            <select
              value={statusClassGroup}
              onChange={(e) => {
                setStatusClassGroup(e.target.value);
                setEnrollmentStatus(null);
              }}
              disabled={!statusSemester}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">Tất cả nhóm</option>
              {classGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadStatus}
              disabled={!selectedSem || loadingStatus}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingStatus ? "Đang tải..." : "Xem trạng thái"}
            </button>
          </div>
        </div>
      </div>

      {/* Action message */}
      {actionMessage.text && (
        <div className={`rounded-lg px-4 py-3 text-sm ${
          actionMessage.type === "success"
            ? "border border-green-200 bg-green-50 text-green-800"
            : "border border-red-200 bg-red-50 text-red-800"
        }`}>
          {actionMessage.text}
        </div>
      )}

      {/* Kết quả trạng thái */}
      {statusError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {statusError}
        </div>
      )}

      {enrollmentStatus && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-green-700">
                Đã enrolled
              </div>
              <div className="mt-1 text-2xl font-bold text-green-900">
                {summary.enrolledCount || 0}
              </div>
              <div className="mt-1 text-xs text-green-600">
                {summary.uniqueStudentsEnrolled || 0} sinh viên
              </div>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Đang waitlisted
              </div>
              <div className="mt-1 text-2xl font-bold text-amber-900">
                {summary.waitlistedCount || 0}
              </div>
              <div className="mt-1 text-xs text-amber-600">
                {summary.uniqueStudentsWaitlisted || 0} sinh viên
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Chưa enrolled
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {(summary.uniqueStudentsEnrolled || 0) === 0 && (summary.uniqueStudentsWaitlisted || 0) === 0
                  ? "—"
                  : Math.max(0, ((summary.uniqueStudentsEnrolled || 0) + (summary.uniqueStudentsWaitlisted || 0)) - ((summary.enrolledCount || 0) + (summary.waitlistedCount || 0)) / ((summary.uniqueStudentsEnrolled || 0) + (summary.uniqueStudentsWaitlisted || 0)))}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Cần xếp lớp
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Thao tác
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDeleteEnrollments}
                  disabled={deletingEnrollments || !selectedSem}
                  className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingEnrollments ? "Đang xóa..." : "Xóa Enrollments"}
                </button>
                <button
                  onClick={handleDeleteWaitlists}
                  disabled={deletingWaitlists || !selectedSem}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                >
                  {deletingWaitlists ? "Đang xóa..." : "Xóa Waitlists"}
                </button>
              </div>
            </div>
          </div>

          {/* Bảng Enrolled */}
          {enrollmentStatus.enrolled?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-green-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-green-800">
                  Enrolled ({enrollmentStatus.enrolled.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Mã SV</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Họ tên</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Môn</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Lớp</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Ngày đăng ký</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollmentStatus.enrolled.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{row.studentCode || "-"}</td>
                        <td className="px-3 py-2 text-slate-900">{row.studentName || "-"}</td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-slate-800">{row.subjectCode}</span>
                          <span className="ml-1 text-slate-500">{row.subjectName}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{row.classCode || "-"}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.enrolledAt ? new Date(row.enrolledAt).toLocaleDateString("vi-VN") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bảng Waitlisted */}
          {enrollmentStatus.waitlisted?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-amber-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-amber-800">
                  Waitlisted ({enrollmentStatus.waitlisted.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Mã SV</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Họ tên</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Môn</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">HK đích</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Ngày tạo</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollmentStatus.waitlisted.map((row, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{row.studentCode || "-"}</td>
                        <td className="px-3 py-2 text-slate-900">{row.studentName || "-"}</td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-slate-800">{row.subjectCode}</span>
                          <span className="ml-1 text-slate-500">{row.subjectName}</span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          HK{row.targetSemester} / {row.targetAcademicYear}
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("vi-VN") : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => handlePromote(row.waitlistId)}
                            disabled={promotingId === row.waitlistId}
                            className="rounded-lg border border-blue-300 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                          >
                            {promotingId === row.waitlistId ? "Đang promote..." : "Promote → Enrolled"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {enrollmentStatus.enrolled?.length === 0 && enrollmentStatus.waitlisted?.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-slate-500">
                Chưa có enrollment hoặc waitlist nào cho HK này
                {statusFilterHint ? ` (${statusFilterHint})` : ""}.
              </p>
            </div>
          )}
        </>
      )}

      {!enrollmentStatus && !loadingStatus && !statusError && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            Chọn học kỳ và nhấn "Xem trạng thái" để xem danh sách enrolled / waitlisted.
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function JsonBlock({ title, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
