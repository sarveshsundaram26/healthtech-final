import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import type { Database } from '../types/supabase';

type Vital = Database['public']['Tables']['vitals']['Row'];

interface VitalsChartProps {
  data: Vital[];
  selectedVital?: 'all' | 'heart_rate' | 'blood_pressure' | 'weight';
  selectedRecordId?: string | null;
}

export default function VitalsChart({ data, selectedVital = 'all', selectedRecordId = null }: VitalsChartProps) {
  const sortedData = [...data].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const formattedData = sortedData.map(item => ({
    ...item,
    date: format(new Date(item.created_at), 'MMM dd, HH:mm'),
    isSelected: item.id === selectedRecordId,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4 py-1">
              <span className="text-sm font-medium" style={{ color: entry.stroke }}>{entry.name}:</span>
              <span className="text-sm font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload, dataKey: _dataKey, stroke } = props;
    const isSelected = payload.isSelected;
    
    if (isSelected) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={8} fill={stroke} stroke="#1e293b" strokeWidth={3} opacity={1} />
          <circle cx={cx} cy={cy} r={12} fill="none" stroke={stroke} strokeWidth={2} opacity={0.5}>
            <animate attributeName="r" from="12" to="16" dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
          </circle>
        </g>
      );
    }
    
    return <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="#1e293b" strokeWidth={2} />;
  };

  const showHeartRate = selectedVital === 'all' || selectedVital === 'heart_rate';
  const showBloodPressure = selectedVital === 'all' || selectedVital === 'blood_pressure';
  const showWeight = selectedVital === 'all' || selectedVital === 'weight';

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          <defs>
            <linearGradient id="colorHeart" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorBP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            formatter={(value) => <span className="text-slate-300 text-xs font-bold px-2">{value}</span>}
          />
          {showHeartRate && (
            <Line 
              type="monotone" 
              dataKey="heart_rate" 
              stroke="#f43f5e" 
              strokeWidth={4}
              dot={<CustomDot />}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name="Heart Rate" 
              animationDuration={1500}
            />
          )}
          {showBloodPressure && (
            <>
              <Line 
                type="monotone" 
                dataKey="systolic_bp" 
                stroke="#3b82f6" 
                strokeWidth={4}
                dot={<CustomDot />}
                activeDot={{ r: 6, strokeWidth: 0 }}
                name="Systolic BP" 
                animationDuration={1500}
              />
              <Line 
                type="monotone" 
                dataKey="diastolic_bp" 
                stroke="#60a5fa" 
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={<CustomDot />}
                activeDot={{ r: 5, strokeWidth: 0 }}
                name="Diastolic BP" 
                animationDuration={1500}
              />
            </>
          )}
          {showWeight && (
            <Line 
              type="monotone" 
              dataKey="weight" 
              stroke="#14b8a6" 
              strokeWidth={4}
              dot={<CustomDot />}
              activeDot={{ r: 6, strokeWidth: 0 }}
              name="Weight" 
              animationDuration={1500}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
