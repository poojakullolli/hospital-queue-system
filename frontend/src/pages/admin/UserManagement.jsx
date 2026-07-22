import React from 'react';
import Badge from '../../components/common/Badge';

const UserManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <input type="text" placeholder="Search users..." className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 outline-none" />
      </div>
      
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            <tr>
              <td className="px-6 py-4 text-white font-medium">John Doe</td>
              <td className="px-6 py-4 text-slate-400">john@example.com</td>
              <td className="px-6 py-4"><Badge variant="info">Patient</Badge></td>
              <td className="px-6 py-4"><Badge variant="success">Active</Badge></td>
              <td className="px-6 py-4 text-cyan-400 cursor-pointer hover:text-cyan-300">Edit</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
