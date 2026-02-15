import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Database } from '../types/supabase';
import { User, ChevronRight, Activity, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function PatientList() {
  const [patients, setPatients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();

  useEffect(() => {
    const fetchPatients = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .eq('role', 'patient');

      if (error) {
        console.error('Error fetching patients:', error);
      } else {
        setPatients((data as unknown as Profile[]) || []);
      }
      setLoading(false);
    };

    fetchPatients();
  }, []);

  const filteredPatients = patients.filter(p => 
    (p.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <div className="space-y-4">
       {[1,2,3].map(i => (
          <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />
       ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
        <input
          type="text"
          placeholder={t('search_patients')}
          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredPatients.length === 0 ? (
            <div className="text-center py-10 bg-white/5 rounded-3xl border border-dashed border-white/10">
               <User className="h-10 w-10 text-slate-700 mx-auto mb-3" />
               <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">{t('no_patients_found')}</p>
            </div>
        ) : (
            filteredPatients.map((patient) => (
              <div 
                key={patient.id} 
                className="group bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/20 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer"
              >
                  <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-slate-400 group-hover:from-blue-600 group-hover:to-cyan-500 group-hover:text-white transition-all shadow-lg">
                          <User className="h-6 w-6" />
                      </div>
                      <div>
                          <h4 className="text-base font-bold text-white group-hover:text-blue-400 transition-colors">
                              {patient.full_name || t('anonymous_patient')}
                          </h4>
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                @{patient.username || 'unknown'}
                             </span>
                             <div className="h-1 w-1 rounded-full bg-slate-700" />
                             <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                 <Activity className="h-3 w-3 mr-1" />
                                 {t('active')}
                             </div>
                          </div>
                      </div>
                  </div>
                  <div className="flex items-center">
                     <div className="h-8 px-3 bg-white/5 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors mr-4">
                        {t('view_profile')}
                     </div>
                     <ChevronRight className="h-5 w-5 text-slate-700 group-hover:text-blue-400 transition-colors transform group-hover:translate-x-1" />
                  </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
