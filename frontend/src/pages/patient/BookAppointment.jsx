import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import { Calendar as CalendarIcon, User, Stethoscope, CheckCircle, ArrowLeft, ArrowRight } from 'lucide-react';

const BookAppointment = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ department: '', doctor: '', date: '', slot: '' });

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-6">Book New Appointment</h1>
        <div className="flex justify-between items-center relative before:absolute before:inset-0 before:top-1/2 before:-translate-y-1/2 before:h-0.5 before:bg-slate-800 before:z-0">
          {[1,2,3,4].map(num => (
            <div key={num} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-slate-950 ${step >= num ? 'bg-cyan-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
              {num}
            </div>
          ))}
        </div>
      </div>

      <Card className="p-6 md:p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Select Department</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'].map(dept => (
                <div key={dept} onClick={() => setFormData({...formData, department: dept})} className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-colors ${formData.department === dept ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  <Stethoscope className="w-8 h-8" />
                  <span className="font-medium">{dept}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Select Doctor</h2>
            <div className="space-y-4">
              {['Dr. Smith', 'Dr. Jones'].map(doc => (
                <div key={doc} onClick={() => setFormData({...formData, doctor: doc})} className={`cursor-pointer p-4 rounded-xl border flex items-center gap-4 transition-colors ${formData.doctor === doc ? 'bg-cyan-500/20 border-cyan-500' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}>
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center"><User className="w-6 h-6 text-slate-400" /></div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">{doc}</h4>
                    <p className="text-slate-400 text-sm">{formData.department}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Select Date & Time</h2>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Date</label>
              <input type="date" className="w-full md:w-1/2 p-3 bg-slate-900 border border-slate-700 rounded-lg text-white" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            {formData.date && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Time Slot</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {['09:00', '09:30', '10:00', '11:30'].map(slot => (
                    <button key={slot} onClick={() => setFormData({...formData, slot})} className={`p-2 rounded-lg text-sm border font-medium transition-colors ${formData.slot === slot ? 'bg-cyan-500 text-white border-cyan-500' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'}`}>{slot}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Confirm Appointment</h2>
            <div className="bg-slate-900 p-6 rounded-xl inline-block text-left space-y-3 border border-slate-800">
              <p><span className="text-slate-400 w-24 inline-block">Department:</span> <span className="text-white font-medium">{formData.department}</span></p>
              <p><span className="text-slate-400 w-24 inline-block">Doctor:</span> <span className="text-white font-medium">{formData.doctor}</span></p>
              <p><span className="text-slate-400 w-24 inline-block">Date & Time:</span> <span className="text-white font-medium">{formData.date} at {formData.slot}</span></p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between pt-6 border-t border-slate-800">
          <Button variant="outline" onClick={prevStep} disabled={step === 1}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
          {step < 4 ? (
            <Button onClick={nextStep}>Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
          ) : (
            <Button variant="primary">Confirm Booking</Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default BookAppointment;
