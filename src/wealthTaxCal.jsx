import React, { useState, useEffect } from 'react';
import './App.css';
import { range } from './utils/utils';
import NivoBarChart from './components/nivoBarChart';

function App() {
  // Initial state for average billionaire wealth (in Billions USD)
  const [avgWealth, setAvgWealth] = useState(60); 
  // New state for the number of billionaires
  const [numBillionaires, setNumBillionaires] = useState(2781); 
  const [selectedTaxRate, setSelectedTaxRate] = useState("2.5");


  // data for nivo bar chart
  const [nivoBarChartData, setNivoBarChartData] = useState([
    { id: "Total Wealth", amount: 0 },
    { id: "Tax Revenue", amount: 0 },
  ]);
  
  // Two distinct outputs: Total Wealth and Tax Revenue
  const [totalWealthOutput, setTotalWealthOutput] = useState("0");
  const [taxRevenueOutput, setTaxRevenueOutput] = useState("0");

  useEffect(() => {
    
    const currentAvgWealth = parseFloat(avgWealth) || 0;
    const currentNumBillionaires = parseInt(numBillionaires) || 0;
    const taxRate = parseFloat(selectedTaxRate) || 0;

    const multiplier = currentNumBillionaires;

    let calculatedTotalWealth = currentAvgWealth * multiplier; 
    
    let calculatedTaxRevenue = calculatedTotalWealth * (taxRate / 100);

    setNivoBarChartData([
      { id: "Total Wealth", amount: calculatedTotalWealth },
      { id: "Tax Revenue", amount: calculatedTaxRevenue },
    ]);


    // number formatting

    const formatBillionUSD = (num) => {
      if (num >= 1000) { // if number is >= 1000, then scale down to trillions (1 trillion = 1k billion)
        const trillions = num / 1000;
        return new Intl.NumberFormat('en-US', { 
            minimumFractionDigits: 1, 
            maximumFractionDigits: 2 
        }).format(trillions) + " T";
      }
      
      return new Intl.NumberFormat('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
      }).format(num) + " B";
    };

    setTotalWealthOutput(formatBillionUSD(calculatedTotalWealth));

    setTaxRevenueOutput(formatBillionUSD(calculatedTaxRevenue));
    
  }, [avgWealth, numBillionaires, selectedTaxRate]); // Recalculate on any state change

  return (
    <div className='flex flex-col gap-3'>

      <h1>Global Wealth Tax Calculator</h1>

      <div className='flex flex-col rounded-lg gap-4 justify-evenly items-center w-full p-1'>
        
        {/* --- INPUTS --- */}
        <div className='flex flex-row gap-4'>
          <div className='flex flex-col gap-1'>
            <label>Avg. Wealth per Billionaire (in $B)</label>
            <input 
              className='rounded-lg bg-slate-100 shadow-lg hover:bg-slate-200 text-black px-2'
              type="number"
              value={avgWealth}
              onChange={(e) => setAvgWealth(e.target.value)} 
            />
          </div>

          <div className='flex flex-col gap-1'>
            <label>No. of Billionaires</label>
            <input 
              className='rounded-lg bg-slate-100 shadow-lg hover:bg-slate-200 text-black px-2'
              type="number"
              value={numBillionaires}
              onChange={(e) => setNumBillionaires(e.target.value)} 
            />
          </div>

          <div className='flex flex-col gap-1'>
            <label>Annual Tax Rate</label>
            <select 
              value={selectedTaxRate}
              onChange={(e) => setSelectedTaxRate(e.target.value)}
              className='rounded-lg bg-slate-100 shadow-lg hover:bg-slate-200 text-black p-1'
            >
              {range(2, 6, 0.5).map((rate) => (
                <option key={rate} value={rate}>{rate}%</option>
              ))}
            </select>
          </div>

        </div>

        <hr className='w-full border-slate-700'/>
    
      </div>

      {/* --- OUTPUTS --- */}

      <div className='flex flex-row gap-10 justify-evenly items-center w-full p-1'>
        
        <div className='flex flex-col items-center'>
            <h2 className='text-1xl font-bold'>Total Accumulated Wealth</h2>
            <h1 className='text-5xl text-green-600 font-bold'>$ {totalWealthOutput}</h1>
        </div>

        <div className='flex flex-col items-center'>
            <h2 className='text-1xl font-bold'>Annual Tax Revenue Collected</h2>
            <h1 className='text-5xl text-green-600 font-bold'>$ {taxRevenueOutput}</h1>
        </div>

      </div>

      <NivoBarChart 
      data={nivoBarChartData}
      />

    </div>
  );
}

export default App;