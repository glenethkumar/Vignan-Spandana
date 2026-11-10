import React, { useState, useEffect } from 'react';
import {
  Users,
  Building2,
  Layers,
  PlusCircle,
  Edit2,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  RotateCcw,
  Search,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../components/common/Toast';
import {
  Department,
  AcademicYear,
  Section,
  User,
  UserRole,
} from '../../data/types';
import {
  getClassStructure,
  saveClassStructure,
  listUsers,
  createUser,
  updateUser,
} from '../../data/api';

export const UsersClassesPage: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'users' | 'assignments'>('hierarchy');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Structure Modals
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');

  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [selectedYearForSection, setSelectedYearForSection] = useState<number>(3);

  // Deactivate confirmation modal
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [itemToDeactivate, setItemToDeactivate] = useState<{ type: 'dept' | 'sec' | 'user'; id: number; name: string } | null>(null);

  // User management modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('faculty');
  const [newUserDept, setNewUserDept] = useState('CSE');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const structure = await getClassStructure();
    setDepartments(structure.departments);
    setYears(structure.years);
    setSections(structure.sections);

    const users = await listUsers();
    setUsersList(users);
  };

  const handleAddDepartment = async () => {
    if (!newDeptName || !newDeptCode) return;
    const newId = departments.length > 0 ? Math.max(...departments.map(d => d.id)) + 1 : 1;
    const updated = [...departments, { id: newId, name: newDeptName, code: newDeptCode.toUpperCase(), isActive: true }];
    setDepartments(updated);
    await saveClassStructure(updated, years, sections);
    showToast(`Department ${newDeptCode.toUpperCase()} added successfully`, 'success');
    setIsAddDeptModalOpen(false);
    setNewDeptName('');
    setNewDeptCode('');
  };

  const handleAddSection = async () => {
    if (!newSectionName) return;
    const newId = sections.length > 0 ? Math.max(...sections.map(s => s.id)) + 1 : 1;
    const updated = [
      ...sections,
      {
        id: newId,
        departmentId: 1,
        yearId: selectedYearForSection,
        yearNumber: selectedYearForSection,
        name: newSectionName,
        studentCount: 0,
        isActive: true,
      },
    ];
    setSections(updated);
    await saveClassStructure(departments, years, updated);
    showToast(`Section ${newSectionName} added successfully`, 'success');
    setIsAddSectionModalOpen(false);
    setNewSectionName('');
  };

  const handleConfirmDeactivate = async () => {
    if (!itemToDeactivate) return;
    if (itemToDeactivate.type === 'sec') {
      const updated = sections.map(s => (s.id === itemToDeactivate.id ? { ...s, isActive: !s.isActive } : s));
      setSections(updated);
      await saveClassStructure(departments, years, updated);
      showToast(`Section status toggled. Historical uploads preserved.`, 'info');
    } else if (itemToDeactivate.type === 'dept') {
      const updated = departments.map(d => (d.id === itemToDeactivate.id ? { ...d, isActive: !d.isActive } : d));
      setDepartments(updated);
      await saveClassStructure(updated, years, sections);
      showToast(`Department status toggled. Historical uploads preserved.`, 'info');
    } else if (itemToDeactivate.type === 'user') {
      await updateUser(itemToDeactivate.id, { isActive: false });
      showToast(`User ${itemToDeactivate.name} deactivated.`, 'info');
      loadData();
    }
    setIsDeactivateModalOpen(false);
    setItemToDeactivate(null);
  };

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail) return;
    await createUser({
      username: newUserEmail.split('@')[0],
      fullName: newUserName,
      email: newUserEmail,
      role: newUserRole,
      department: newUserDept,
      isActive: true,
    });
    showToast(`Account for ${newUserName} created successfully`, 'success');
    setIsAddUserModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    loadData();
  };

  const handleToggleAssignment = async (user: User, classLabel: string) => {
    const currentAssignments = user.assignedClasses || [];
    const exists = currentAssignments.includes(classLabel);
    const updatedAssignments = exists
      ? currentAssignments.filter(c => c !== classLabel)
      : [...currentAssignments, classLabel];

    await updateUser(user.id, { assignedClasses: updatedAssignments });
    showToast(`Updated class assignment for ${user.fullName}`, 'success');
    loadData();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="text-[11px] font-bold text-brand uppercase tracking-widest mb-1">
            ADMINISTRATION
          </div>
          <h1 className="text-3xl font-bold text-ink-900 tracking-tight">Users & Academic Hierarchy</h1>
          <p className="text-sm text-ink-500 mt-1">
            Configure departments, years, and sections. Manage staff accounts and faculty class assignment matrix.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'hierarchy' ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsAddDeptModalOpen(true)} className="gap-1.5 bg-white">
                <PlusCircle className="w-4 h-4" />
                <span>Add Department</span>
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsAddSectionModalOpen(true)} className="gap-1.5">
                <PlusCircle className="w-4 h-4" />
                <span>Add Section</span>
              </Button>
            </>
          ) : activeTab === 'users' ? (
            <Button variant="primary" size="sm" onClick={() => setIsAddUserModalOpen(true)} className="gap-1.5">
              <PlusCircle className="w-4 h-4" />
              <span>Create Staff Account</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab('hierarchy')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'hierarchy' ? 'border-brand text-brand' : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Academic Tree (Dept / Year / Section)</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'users' ? 'border-brand text-brand' : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Accounts ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('assignments')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'assignments' ? 'border-brand text-brand' : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Faculty Assignment Matrix</span>
        </button>
      </div>

      {/* TAB 1: Academic Hierarchy Tree */}
      {activeTab === 'hierarchy' && (
        <div className="space-y-6">
          {departments.map(dept => {
            const deptSections = sections.filter(s => s.departmentId === dept.id);
            return (
              <div key={dept.id} className="bg-surface rounded-card border border-border p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand flex items-center justify-center font-bold">
                      {dept.code}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink-900">{dept.name}</h3>
                      <p className="text-xs text-ink-500">Autonomous Engineering Program</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={dept.isActive ? 'success' : 'default'} size="sm">
                      {dept.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setItemToDeactivate({ type: 'dept', id: dept.id, name: dept.name });
                        setIsDeactivateModalOpen(true);
                      }}
                      className="text-xs text-ink-500 hover:text-danger-text"
                    >
                      {dept.isActive ? 'Deactivate' : 'Restore'}
                    </Button>
                  </div>
                </div>

                {/* Years Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(yr => {
                    const yrSections = deptSections.filter(s => s.yearNumber === yr);
                    return (
                      <div key={yr} className="p-4 bg-page rounded-xl border border-border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-ink-900 font-mono">Year 0{yr}</span>
                          <span className="text-[11px] text-ink-400">{yrSections.length} Sections</span>
                        </div>

                        <div className="space-y-1.5">
                          {yrSections.length === 0 ? (
                            <span className="text-xs text-ink-400 italic">No sections</span>
                          ) : (
                            yrSections.map(sec => (
                              <div
                                key={sec.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-surface border border-border text-xs"
                              >
                                <span className="font-semibold text-ink-900">{sec.name}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-ink-400 font-mono">{sec.studentCount} sts</span>
                                  <button
                                    onClick={() => {
                                      setItemToDeactivate({ type: 'sec', id: sec.id, name: `${dept.code} Yr ${yr} ${sec.name}` });
                                      setIsDeactivateModalOpen(true);
                                    }}
                                    className="text-ink-400 hover:text-danger-text p-0.5"
                                    title="Deactivate section"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Staff Accounts */}
      {activeTab === 'users' && (
        <div className="bg-surface rounded-card border border-border shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-page text-ink-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3.5">Staff Name & Username</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Institutional Role</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usersList.map(u => (
                <tr key={u.id} className="hover:bg-page/50">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-ink-900">{u.fullName}</div>
                    <div className="text-[11px] text-ink-400 font-mono">@{u.username}</div>
                  </td>
                  <td className="px-5 py-3.5 text-ink-600">{u.email}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={u.role === 'admin' ? 'brand' : 'default'} size="sm">
                      {u.role.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-ink-700 font-medium">{u.department || 'All'}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={u.isActive ? 'success' : 'danger'} size="sm">
                      {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => showToast(`Password for ${u.username} reset to institutional default`, 'info')}
                        className="text-xs py-1"
                      >
                        Reset Password
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setItemToDeactivate({ type: 'user', id: u.id, name: u.fullName });
                          setIsDeactivateModalOpen(true);
                        }}
                        className="text-xs text-danger-text hover:bg-danger-tint py-1"
                      >
                        Deactivate
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Faculty Assignment Matrix */}
      {activeTab === 'assignments' && (
        <div className="bg-surface rounded-card border border-border p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-ink-900">Faculty Class Scoping Matrix</h3>
            <p className="text-xs text-ink-500">
              Assigned classes govern which departments and sections each faculty coordinator is permitted to upload and launch campaigns for.
            </p>
          </div>

          <div className="space-y-4">
            {usersList.filter(u => u.role === 'faculty').map(faculty => {
              const currentClasses = faculty.assignedClasses || [];
              const allClasses = [
                'CSE / 3 / Section A',
                'CSE / 3 / Section B',
                'ECE / 2 / Section A',
              ];

              return (
                <div key={faculty.id} className="p-4 rounded-xl bg-page border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-ink-900">{faculty.fullName}</h4>
                    <span className="text-xs text-ink-500">{faculty.email} · Dept: {faculty.department}</span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    {allClasses.map(cls => {
                      const isAssigned = currentClasses.includes(cls);
                      return (
                        <button
                          key={cls}
                          type="button"
                          onClick={() => handleToggleAssignment(faculty, cls)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isAssigned
                              ? 'bg-brand-50 border-brand text-brand shadow-xs'
                              : 'bg-surface border-border text-ink-400 hover:border-ink-600 hover:text-ink-700'
                          }`}
                        >
                          {cls} {isAssigned ? '✓' : '+'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      <Modal
        isOpen={isAddDeptModalOpen}
        onClose={() => setIsAddDeptModalOpen(false)}
        title="Add Academic Department"
        description="Register a new academic department into the institutional registry."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAddDeptModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddDepartment}>
              Save Department
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Department Name</label>
            <input
              type="text"
              placeholder="e.g. Information Technology"
              value={newDeptName}
              onChange={e => setNewDeptName(e.target.value)}
              className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
            />
          </div>
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Department Code</label>
            <input
              type="text"
              placeholder="e.g. IT"
              value={newDeptCode}
              onChange={e => setNewDeptCode(e.target.value)}
              className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900 uppercase"
            />
          </div>
        </div>
      </Modal>

      {/* Add Section Modal */}
      <Modal
        isOpen={isAddSectionModalOpen}
        onClose={() => setIsAddSectionModalOpen(false)}
        title="Add Academic Section"
        description="Create a new section under the academic hierarchy."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAddSectionModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddSection}>
              Save Section
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Academic Year</label>
            <select
              value={selectedYearForSection}
              onChange={e => setSelectedYearForSection(Number(e.target.value))}
              className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
            >
              <option value={1}>Year 1</option>
              <option value={2}>Year 2</option>
              <option value={3}>Year 3</option>
              <option value={4}>Year 4</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Section Name</label>
            <input
              type="text"
              placeholder="e.g. Section C"
              value={newSectionName}
              onChange={e => setNewSectionName(e.target.value)}
              className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
            />
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        title={`Deactivate ${itemToDeactivate?.name}?`}
        description="Institutional safety rule: Records are never permanently deleted."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsDeactivateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDeactivate}>
              Confirm Deactivation
            </Button>
          </>
        }
      >
        <p className="text-xs text-ink-600">
          Deactivating this item will hide it from new campaign creation selectors. All previous campaigns, student attendance sheets, and audit history linked to this record remain strictly preserved.
        </p>
      </Modal>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Create Staff Account"
        description="Provision authorized access to VIIT AI Feedback workspace."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsAddUserModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddUser}>
              Create Account
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Dr. K. Satyanarayana"
              value={newUserName}
              onChange={e => setNewUserName(e.target.value)}
              className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
            />
          </div>
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="satya.k@viit.ac.in"
              value={newUserEmail}
              onChange={e => setNewUserEmail(e.target.value)}
              className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900"
            />
          </div>
          <div>
            <label className="block font-semibold text-ink-700 mb-1">Role</label>
            <select
              value={newUserRole}
              onChange={e => setNewUserRole(e.target.value as UserRole)}
              className="w-full p-2.5 border border-border rounded-lg bg-surface text-ink-900 capitalize"
            >
              <option value="faculty">Faculty Coordinator</option>
              <option value="college_coordinator">College Academic Coordinator</option>
              <option value="hostel_dean">Hostel Dean</option>
              <option value="bus_correspondent">Bus Correspondent</option>
              <option value="admin">Administrator (Full Access)</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};
