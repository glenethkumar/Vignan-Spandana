import React, { useState } from 'react';
import {
  Users,
  Building,
  GraduationCap,
  Plus,
  Trash2,
  CheckCircle,
  Shield,
  Edit2,
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Tabs } from '../../components/common/Tabs';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { useClasses, useAuth, DEMO_USERS } from '../../data/api';
import { User, Department } from '../../data/types';

export const UsersClassesPage: React.FC = () => {
  const { classes, departments } = useClasses();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'classes'>('users');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptName, setNewDeptName] = useState('');

  return (
    <div className="w-full flex flex-col gap-8 max-w-5xl text-left animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-hairline">
        <div>
          <span className="text-[11px] font-bold tracking-eyebrow uppercase text-brand">
            Administration
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink tracking-tight mt-1">
            Users & Academic Classes
          </h1>
          <p className="mt-1 text-sm text-muted font-normal">
            Configure faculty permissions, department structures, and class sections.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          {activeTab === 'users' ? 'Add staff member' : 'Add department'}
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'users', label: 'Staff & Roles', count: DEMO_USERS.length },
          { id: 'classes', label: 'Departments & Sections', count: departments.length },
        ]}
        activeTab={activeTab}
        onChange={(t) => setActiveTab(t as any)}
      />

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-card border border-hairline shadow-soft overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F5F6F8] border-b border-hairline text-muted uppercase font-bold text-[10px]">
              <tr>
                <th className="py-3 px-4">Staff Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {DEMO_USERS.map((user: User) => (
                <tr key={user.email} className="hover:bg-page transition-colors">
                  <td className="py-3 px-4 font-bold text-ink">{user.fullName || user.username}</td>
                  <td className="py-3 px-4 text-muted">{user.email}</td>
                  <td className="py-3 px-4">
                    <Badge variant={user.role === 'admin' ? 'brand' : 'neutral'}>
                      {user.role.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 font-semibold text-text-main">
                    {user.department || 'All Departments'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Badge variant="success" dot>
                      Active
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {departments.map((dept: Department) => (
            <div
              key={dept.code}
              className="p-6 bg-white rounded-card border border-hairline shadow-soft flex flex-col justify-between min-h-[160px]"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-bold text-xl text-ink">
                    {dept.code}
                  </span>
                  <Badge variant="neutral">Years 1–4</Badge>
                </div>
                <p className="text-xs text-muted font-medium">{dept.name}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between text-xs text-muted">
                <span>Sections A–F</span>
                <span className="text-brand font-semibold hover:underline cursor-pointer">
                  Manage sections →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={activeTab === 'users' ? 'Provision Staff Account' : 'Register Department'}
        subtitle="Specify institutional details below"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddModal(false)}>Save record</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4 text-xs">
          <Input
            label={activeTab === 'users' ? 'Staff Full Name' : 'Department Code (e.g. AIDS)'}
            placeholder={activeTab === 'users' ? 'Dr. John Doe' : 'CSE-AI'}
            value={newDeptCode}
            onChange={(e) => setNewDeptCode(e.target.value)}
          />
          <Input
            label={activeTab === 'users' ? 'Staff Email' : 'Department Full Name'}
            placeholder={activeTab === 'users' ? 'staff@viit.ac.in' : 'Artificial Intelligence'}
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
