import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Users,
} from 'lucide-react';
import actorsService from '../../services/actorsService';

const TAB_ROLES = 'roles';
const TAB_PERMISSIONS = 'permissions';

function normalizeInput(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export default function ActorsManagementPage() {
  const [activeTab, setActiveTab] = useState(TAB_ROLES);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [roleForm, setRoleForm] = useState({
    roleCode: '',
    roleName: '',
    description: '',
    isActive: true,
    isSystemRole: false,
    permissionIds: [],
  });

  const [selectedPermissionId, setSelectedPermissionId] = useState(null);
  const [permissionForm, setPermissionForm] = useState({
    permCode: '',
    permName: '',
    module: '',
    action: '',
    description: '',
    isActive: true,
  });

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || null,
    [roles, selectedRoleId],
  );

  const selectedPermission = useMemo(
    () => permissions.find((perm) => perm.id === selectedPermissionId) || null,
    [permissions, selectedPermissionId],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const [rolesRes, permsRes] = await Promise.all([
        actorsService.getRoles(),
        actorsService.getPermissions(),
      ]);
      setRoles(rolesRes?.data?.roles || []);
      setPermissions(permsRes?.data?.permissions || []);
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to load actor data.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedRole) {
      return;
    }

    setRoleForm({
      roleCode: selectedRole.roleCode || '',
      roleName: selectedRole.roleName || '',
      description: selectedRole.description || '',
      isActive: selectedRole.isActive,
      isSystemRole: selectedRole.isSystemRole,
      permissionIds: (selectedRole.permissions || []).map((perm) => perm.id),
    });
  }, [selectedRole]);

  useEffect(() => {
    if (!selectedPermission) {
      return;
    }

    setPermissionForm({
      permCode: selectedPermission.permCode || '',
      permName: selectedPermission.permName || '',
      module: selectedPermission.module || '',
      action: selectedPermission.action || '',
      description: selectedPermission.description || '',
      isActive: selectedPermission.isActive !== false,
    });
  }, [selectedPermission]);

  function handleNewRole() {
    setSelectedRoleId(null);
    setRoleForm({
      roleCode: '',
      roleName: '',
      description: '',
      isActive: true,
      isSystemRole: false,
      permissionIds: [],
    });
    setSuccessMessage('');
    setErrorMessage('');
  }

  function handleRolePermissionToggle(permissionId) {
    setRoleForm((prev) => {
      const hasPermission = prev.permissionIds.includes(permissionId);
      return {
        ...prev,
        permissionIds: hasPermission
          ? prev.permissionIds.filter((id) => id !== permissionId)
          : [...prev.permissionIds, permissionId],
      };
    });
  }

  async function handleSaveRole(event) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        roleCode: normalizeInput(roleForm.roleCode),
        roleName: normalizeInput(roleForm.roleName),
        description: normalizeInput(roleForm.description),
        isActive: Boolean(roleForm.isActive),
        isSystemRole: Boolean(roleForm.isSystemRole),
        permissionIds: roleForm.permissionIds,
      };

      if (selectedRoleId) {
        await actorsService.updateRole(selectedRoleId, payload);
        setSuccessMessage('Role updated successfully.');
      } else {
        await actorsService.createRole(payload);
        setSuccessMessage('Role created successfully.');
      }

      await loadData();
    } catch (err) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to save role.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewPermission() {
    setSelectedPermissionId(null);
    setPermissionForm({
      permCode: '',
      permName: '',
      module: '',
      action: '',
      description: '',
      isActive: true,
    });
    setSuccessMessage('');
    setErrorMessage('');
  }

  async function handleSavePermission(event) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const payload = {
        permCode: normalizeInput(permissionForm.permCode),
        permName: normalizeInput(permissionForm.permName),
        module: normalizeInput(permissionForm.module),
        action: normalizeInput(permissionForm.action),
        description: normalizeInput(permissionForm.description),
        isActive: Boolean(permissionForm.isActive),
      };

      if (selectedPermissionId) {
        await actorsService.updatePermission(selectedPermissionId, payload);
        setSuccessMessage('Permission updated successfully.');
      } else {
        await actorsService.createPermission(payload);
        setSuccessMessage('Permission created successfully.');
      }

      await loadData();
    } catch (err) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Failed to save permission.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Actors Management</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage roles, permissions, and access rules for the school system
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </header>

        <div className="flex flex-wrap gap-3">
          <TabButton
            icon={Shield}
            label="Roles"
            isActive={activeTab === TAB_ROLES}
            onClick={() => setActiveTab(TAB_ROLES)}
          />
          <TabButton
            icon={KeyRound}
            label="Permissions"
            isActive={activeTab === TAB_PERMISSIONS}
            onClick={() => setActiveTab(TAB_PERMISSIONS)}
          />
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        {activeTab === TAB_ROLES ? (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1.5fr]">
            <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Roles</h2>
                <button
                  type="button"
                  onClick={handleNewRole}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  New role
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading roles...
                  </div>
                ) : null}

                {!isLoading && roles.length === 0 ? (
                  <p className="text-sm text-slate-500">No roles yet. Create one to begin.</p>
                ) : null}

                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`flex w-full flex-col gap-2 rounded-xl border px-4 py-3 text-left transition ${
                      selectedRoleId === role.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-slate-900">{role.roleName}</span>
                      </div>
                      {role.isSystemRole ? (
                        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                          System
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500">
                      {role.roleCode} - {role.permissions?.length || 0} permissions
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedRoleId ? 'Update role' : 'Create role'}
                </h2>
                {selectedRoleId ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Layers className="h-4 w-4" />
                    Role ID: {selectedRoleId}
                  </div>
                ) : null}
              </div>

              <form onSubmit={handleSaveRole} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    label="Role code"
                    value={roleForm.roleCode}
                    onChange={(value) => setRoleForm((prev) => ({ ...prev, roleCode: value }))}
                    disabled={selectedRole?.isSystemRole}
                  />
                  <InputField
                    label="Role name"
                    value={roleForm.roleName}
                    onChange={(value) => setRoleForm((prev) => ({ ...prev, roleName: value }))}
                  />
                </div>

                <InputField
                  label="Description"
                  value={roleForm.description}
                  onChange={(value) => setRoleForm((prev) => ({ ...prev, description: value }))}
                />

                <div className="flex flex-wrap gap-4">
                  <ToggleField
                    label="Active"
                    checked={roleForm.isActive}
                    onChange={(checked) => setRoleForm((prev) => ({ ...prev, isActive: checked }))}
                  />
                  <ToggleField
                    label="System role"
                    checked={roleForm.isSystemRole}
                    onChange={(checked) => setRoleForm((prev) => ({ ...prev, isSystemRole: checked }))}
                    disabled={selectedRole?.isSystemRole}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Permissions</p>
                    <span className="text-xs text-slate-500">
                      {roleForm.permissionIds.length} selected
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {permissions.map((permission) => (
                      <label
                        key={permission.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                          roleForm.permissionIds.includes(permission.id)
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={roleForm.permissionIds.includes(permission.id)}
                          onChange={() => handleRolePermissionToggle(permission.id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600/40"
                        />
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {permission.permName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {permission.module}:{permission.action}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {selectedRoleId ? 'Update role' : 'Create role'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1.5fr]">
            <div className="rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Permissions</h2>
                <button
                  type="button"
                  onClick={handleNewPermission}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  New permission
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading permissions...
                  </div>
                ) : null}

                {!isLoading && permissions.length === 0 ? (
                  <p className="text-sm text-slate-500">No permissions yet.</p>
                ) : null}

                {permissions.map((permission) => (
                  <button
                    key={permission.id}
                    type="button"
                    onClick={() => setSelectedPermissionId(permission.id)}
                    className={`flex w-full flex-col gap-2 rounded-xl border px-4 py-3 text-left transition ${
                      selectedPermissionId === permission.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-slate-900">{permission.permName}</span>
                      </div>
                      {permission.isActive !== false ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500">
                      {permission.module}:{permission.action} - {permission.permCode}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedPermissionId ? 'Update permission' : 'Create permission'}
                </h2>
                {selectedPermissionId ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <KeyRound className="h-4 w-4" />
                    Permission ID: {selectedPermissionId}
                  </div>
                ) : null}
              </div>

              <form onSubmit={handleSavePermission} className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    label="Permission code"
                    value={permissionForm.permCode}
                    onChange={(value) => setPermissionForm((prev) => ({ ...prev, permCode: value }))}
                    disabled={Boolean(selectedPermissionId)}
                  />
                  <InputField
                    label="Permission name"
                    value={permissionForm.permName}
                    onChange={(value) => setPermissionForm((prev) => ({ ...prev, permName: value }))}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    label="Module"
                    value={permissionForm.module}
                    onChange={(value) => setPermissionForm((prev) => ({ ...prev, module: value }))}
                  />
                  <InputField
                    label="Action"
                    value={permissionForm.action}
                    onChange={(value) => setPermissionForm((prev) => ({ ...prev, action: value }))}
                  />
                </div>

                <InputField
                  label="Description"
                  value={permissionForm.description}
                  onChange={(value) => setPermissionForm((prev) => ({ ...prev, description: value }))}
                />

                <ToggleField
                  label="Active"
                  checked={permissionForm.isActive}
                  onChange={(checked) => setPermissionForm((prev) => ({ ...prev, isActive: checked }))}
                />

                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {selectedPermissionId ? 'Update permission' : 'Create permission'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ icon: Icon, label, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        isActive
          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
          : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function InputField({ label, value, onChange, disabled }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100"
      />
    </label>
  );
}

function ToggleField({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600/40 disabled:opacity-60"
      />
      {label}
    </label>
  );
}
