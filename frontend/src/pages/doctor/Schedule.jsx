import React from 'react';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const Schedule = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white">Manage Schedule</h1>
      
      <Card className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Working Days</h3>
          <div className="flex flex-wrap gap-3">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <label key={day} className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-500">
                <input type="checkbox" defaultChecked={day !== 'Sun'} className="text-cyan-500 rounded bg-slate-800 border-slate-600 focus:ring-cyan-500" />
                <span className="text-slate-300">{day}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Input label="Start Time" type="time" defaultValue="09:00" />
          <Input label="End Time" type="time" defaultValue="17:00" />
          <Select label="Consultation Duration" options={[
            {value: '15', label: '15 Minutes'},
            {value: '20', label: '20 Minutes'},
            {value: '30', label: '30 Minutes'},
          ]} defaultValue="20" />
          <Input label="Consultation Fee (₹)" type="number" defaultValue="500" />
        </div>

        <div className="pt-6 border-t border-slate-800 text-right">
          <Button variant="primary">Save Schedule Settings</Button>
        </div>
      </Card>
    </div>
  );
};

export default Schedule;
