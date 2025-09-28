import React, { useState } from 'react';
import './bills.css';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const monthlyData = [
  { month: 'Jan 2024', electricity: 145.5, gas: 89.2, total: 234.7 },
  { month: 'Feb 2024', electricity: 132.8, gas: 95.4, total: 228.2 },
  { month: 'Mar 2024', electricity: 128.9, gas: 78.6, total: 207.5 },
  { month: 'Apr 2024', electricity: 118.4, gas: 65.3, total: 183.7 },
  { month: 'May 2024', electricity: 125.6, gas: 58.9, total: 184.5 },
  { month: 'Jun 2024', electricity: 165.8, gas: 45.2, total: 211.0 },
  { month: 'Jul 2024', electricity: 189.3, gas: 42.1, total: 231.4 },
  { month: 'Aug 2024', electricity: 195.7, gas: 38.5, total: 234.2 },
  { month: 'Sep 2024', electricity: 172.4, gas: 41.8, total: 214.2 },
  { month: 'Oct 2024', electricity: 158.9, gas: 67.9, total: 226.8 },
  { month: 'Nov 2024', electricity: 142.3, gas: 85.4, total: 227.7 },
  { month: 'Dec 2024', electricity: 156.8, gas: 98.7, total: 255.5 },
];

const pieData = [
  { name: 'Electricity', value: 1932.4, color: '#3b82f6' },
  { name: 'Gas', value: 807.0, color: '#f59e0b' },
];

export default function BillsAnalytics({ onBack }) {
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedPeriod, setSelectedPeriod] = useState('12months');

  const currentMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  const electricityChange = ((currentMonth.electricity - previousMonth.electricity) / previousMonth.electricity) * 100;
  const gasChange = ((currentMonth.gas - previousMonth.gas) / previousMonth.gas) * 100;
  const totalChange = ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100;

  const yearlyTotals = {
    electricity: monthlyData.reduce((sum, month) => sum + month.electricity, 0),
    gas: monthlyData.reduce((sum, month) => sum + month.gas, 0),
    total: monthlyData.reduce((sum, month) => sum + month.total, 0),
  };

  const averageMonthly = {
    electricity: yearlyTotals.electricity / 12,
    gas: yearlyTotals.gas / 12,
    total: yearlyTotals.total / 12,
  };

  return (
    <div className="bills-bg">
      <header className="bills-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {onBack && <button className="bills-back" onClick={onBack}>Back</button>}
          <span className="bills-title">Bills Analytics</span>
        </div>
      </header>
      <main className="bills-main">
        {/* Overview */}
        <div className="bills-section">
          <div className="bills-cards">
            <div className="bills-card electricity">
              <div className="bills-card-title">Electricity Bill</div>
              <div className="bills-card-value">£{currentMonth.electricity.toFixed(2)}</div>
              <div className="bills-card-change">
                {electricityChange > 0 ? '▲' : electricityChange < 0 ? '▼' : '-'}
                <span>{Math.abs(electricityChange).toFixed(1)}% from last month</span>
              </div>
            </div>
            <div className="bills-card gas">
              <div className="bills-card-title">Gas Bill</div>
              <div className="bills-card-value">£{currentMonth.gas.toFixed(2)}</div>
              <div className="bills-card-change">
                {gasChange > 0 ? '▲' : gasChange < 0 ? '▼' : '-'}
                <span>{Math.abs(gasChange).toFixed(1)}% from last month</span>
              </div>
            </div>
            <div className="bills-card total">
              <div className="bills-card-title">Total Bill</div>
              <div className="bills-card-value">£{currentMonth.total.toFixed(2)}</div>
              <div className="bills-card-change">
                {totalChange > 0 ? '▲' : totalChange < 0 ? '▼' : '-'}
                <span>{Math.abs(totalChange).toFixed(1)}% from last month</span>
              </div>
            </div>
          </div>
          <div className="bills-summary">
            <div>Yearly Totals: Electricity £{yearlyTotals.electricity.toFixed(2)}, Gas £{yearlyTotals.gas.toFixed(2)}, Total £{yearlyTotals.total.toFixed(2)}</div>
            <div>Monthly Averages: Electricity £{averageMonthly.electricity.toFixed(2)}, Gas £{averageMonthly.gas.toFixed(2)}, Total £{averageMonthly.total.toFixed(2)}</div>
          </div>
        </div>
        {/* Trends */}
        <div className="bills-section">
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value, name) => [`${name}: £${value.toFixed(2)}`]} />
                <Line type="monotone" dataKey="electricity" stroke="#3b82f6" strokeWidth={2} name="Electricity" />
                <Line type="monotone" dataKey="gas" stroke="#f59e0b" strokeWidth={2} name="Gas" />
                <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} name="Total" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* Breakdown */}
        <div className="bills-section">
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-£{index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${name}: £${value.toFixed(2)}`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </div>
  );
}
