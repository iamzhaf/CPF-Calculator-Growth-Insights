import { useState, useEffect, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar } from "lucide-react";
import { getCPFAllocation, getInterestRates } from "./utils/utils";
import NivoSankeyChart from "./components/nivoSankeyChart";
import NivoBarChart from "./components/nivoBarChart";
import "./App.css";

// ------------------------------------------------------
// Helper: interest on contributions (base interest only)
// ------------------------------------------------------
const getContribInterestAccrual = (annualContribution, annualRate) => {
  const MONTHS_IN_YEAR = 12;
  const accruedInterest =
    (annualContribution * annualRate * (5.5 / MONTHS_IN_YEAR)) / 100;
  return parseFloat(accruedInterest);
};

// ------------------------------------------------------
// Helper: compute extra interest for OA, SA, MA together
// ------------------------------------------------------
const computeExtraInterest = (age, oaBal, saBal, maBal) => {
  let extraOA = 0;
  let extraSA = 0;
  let extraMA = 0;

  const totalBal = oaBal + saBal + maBal;
  if (totalBal <= 0) return { extraOA, extraSA, extraMA };

  // -------- Age < 55: +1% on first 60k combined, OA capped at 20k --------
  if (age < 55) {
    let remainingCap = Math.min(totalBal, 60000);

    // OA gets up to 20k of the 1%-eligible pool
    const oaEligible = Math.min(oaBal, 20000, remainingCap);
    remainingCap -= oaEligible;

    // SA then MA share the rest of the 60k pool
    const saEligible = Math.min(saBal, remainingCap);
    remainingCap -= saEligible;

    const maEligible = Math.min(maBal, remainingCap);

    extraOA = oaEligible * 0.01;
    extraSA = saEligible * 0.01;
    extraMA = maEligible * 0.01;

    return { extraOA, extraSA, extraMA };
  }

  // -------- Age >= 55: +2% on first 30k, +1% on next 30k, OA extra capped at 20k --------
  let tier2Remaining = Math.min(totalBal, 30000); // 2% tier
  let tier1Remaining = Math.min(
    Math.max(totalBal - tier2Remaining, 0),
    30000
  ); // 1% tier

  let oaCap = Math.min(oaBal, 20000); // OA can only get extra on 20k

  // Allocate 2% tier (order: SA -> MA -> OA)
  const sa2Eligible = Math.min(saBal, tier2Remaining);
  tier2Remaining -= sa2Eligible;

  const ma2Eligible = Math.min(maBal, tier2Remaining);
  tier2Remaining -= ma2Eligible;

  const oa2Eligible = Math.min(oaCap, tier2Remaining);
  tier2Remaining -= oa2Eligible;
  oaCap -= oa2Eligible;

  // Allocate 1% tier (order: SA -> MA -> OA)
  const sa1Eligible = Math.min(saBal - sa2Eligible, tier1Remaining);
  tier1Remaining -= sa1Eligible;

  const ma1Eligible = Math.min(maBal - ma2Eligible, tier1Remaining);
  tier1Remaining -= ma1Eligible;

  const oa1Eligible = Math.min(oaCap, tier1Remaining);
  tier1Remaining -= oa1Eligible;
  oaCap -= oa1Eligible;

  extraSA = sa2Eligible * 0.02 + sa1Eligible * 0.01;
  extraMA = ma2Eligible * 0.02 + ma1Eligible * 0.01;
  extraOA = oa2Eligible * 0.02 + oa1Eligible * 0.01;

  return { extraOA, extraSA, extraMA };
};

export default function CPFCalculator() {
  // ---------------------------
  // CORE INPUTS
  // ---------------------------
  const [birthDate, setBirthDate] = useState(null);
  const [age, setAge] = useState(null);
  const [salary, setSalary] = useState(4000); // Default salary
  const [years, setYears] = useState(1);

  // Starting balances for each account
  const [startOaBalance, setStartOaBalance] = useState(0);
  const [startSaBalance, setStartSaBalance] = useState(0);
  const [startMaBalance, setStartMaBalance] = useState(0);

  // Monthly CPF contribution split (OA, SA, MA) — just for display if you want it
  const [cpfContribution, setCpfContribution] = useState({
    oa: 0,
    sa: 0,
    ma: 0,
  });

  // Wizard page: 1 = Inputs, 2 = Output
  const [page, setPage] = useState(1);

  // ---------------------------
  // AGE CALCULATION
  // ---------------------------
  const calculateAge = (date) => {
    if (!date) {
      setAge(null);
      return;
    }

    const birth = new Date(date);
    const today = new Date();

    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    setAge({ years, months, days });
  };

  const handleDateChange = (date) => {
    setBirthDate(date);
    calculateAge(date);
  };

  // ---------------------------
  // CPF MONTHLY LOGIC (display)
  // ---------------------------
  const cpf_contribution = (salary, age) => {
    const alloc = getCPFAllocation(age.years);

    if (!alloc) {
      console.warn("getCPFAllocation returned undefined for age:", age.years);
      return;
    }

    setCpfContribution({
      oa: alloc.oa * salary,
      sa: alloc.sa * salary,
      ma: alloc.ma * salary,
    });
  };

  useEffect(() => {
    if (age && salary > 0) {
      cpf_contribution(salary, age);
    } else {
      setCpfContribution({ oa: 0, sa: 0, ma: 0 });
    }
  }, [age, salary]);

  // ---------------------------
  // PROJECTIONS (UNIFIED useMemo)
  // ---------------------------
  const {
    totalOaProjected,
    totalSaProjected,
    totalMaProjected,
    totalCpfProjected,
    totalEmployeeContrib,
    totalEmployerContrib,
    totalInterestProjected,
    sankeyData,
    Employee_Contrib_Rate_Overall,
    Employer_Contrib_Rate_Overall,
    oaBarData,
    saBarData,
    maBarData,
  } = useMemo(() => {
    if (!age || salary <= 0 || years <= 0) {
      return {
        totalOaProjected: 0,
        totalSaProjected: 0,
        totalMaProjected: 0,
        totalCpfProjected: 0,
        totalEmployeeContrib: 0,
        totalEmployerContrib: 0,
        totalInterestProjected: 0,
        sankeyData: { nodes: [], links: [] },
        Employee_Contrib_Rate_Overall: 0,
        Employer_Contrib_Rate_Overall: 0,
        oaBarData: [],
        saBarData: [],
        maBarData: [],
      };
    }

    const { oaRate, saRate, maRate } = getInterestRates();

    // Overall employee/employer contribution rates (simplified)
    const getEmployeeRate = (ageYears) => (ageYears < 55 ? 0.2 : 0.05);
    const getEmployerRate = (ageYears) => (ageYears < 55 ? 0.17 : 0.05);

    const Employee_Contrib_Rate_Overall = getEmployeeRate(age.years);
    const Employer_Contrib_Rate_Overall = getEmployerRate(age.years);
    const totalContribRate =
      Employee_Contrib_Rate_Overall + Employer_Contrib_Rate_Overall;

    // Allocation ratios for the *current* age (for Sankey & splits)
    const allocationRatios = getCPFAllocation(age.years);
    if (!allocationRatios) {
      return {
        totalOaProjected: 0,
        totalSaProjected: 0,
        totalMaProjected: 0,
        totalCpfProjected: 0,
        totalEmployeeContrib: 0,
        totalEmployerContrib: 0,
        totalInterestProjected: 0,
        sankeyData: { nodes: [], links: [] },
        Employee_Contrib_Rate_Overall: 0,
        Employer_Contrib_Rate_Overall: 0,
        oaBarData: [],
        saBarData: [],
        maBarData: [],
      };
    }

    // Split contribution rates (employee vs employer) per account (for Sankey)
    const oaEmployeeRate =
      allocationRatios.oa *
      (Employee_Contrib_Rate_Overall / totalContribRate || 0);
    const saEmployeeRate =
      allocationRatios.sa *
      (Employee_Contrib_Rate_Overall / totalContribRate || 0);
    const maEmployeeRate =
      allocationRatios.ma *
      (Employee_Contrib_Rate_Overall / totalContribRate || 0);

    const oaEmployerRate =
      allocationRatios.oa *
      (Employer_Contrib_Rate_Overall / totalContribRate || 0);
    const saEmployerRate =
      allocationRatios.sa *
      (Employer_Contrib_Rate_Overall / totalContribRate || 0);
    const maEmployerRate =
      allocationRatios.ma *
      (Employer_Contrib_Rate_Overall / totalContribRate || 0);

    // --- 3. MAIN PROJECTION: simulate OA, SA, MA together for N years ---
    let oaBal = startOaBalance;
    let saBal = startSaBalance;
    let maBal = startMaBalance;

    let totalOaInterest = 0;
    let totalSaInterest = 0;
    let totalMaInterest = 0;

    const yearlySnapshots = [];

    for (let year = 0; year < years; year++) {
      const currentAge = age.years + year;

      const yearAlloc = getCPFAllocation(currentAge);
      if (!yearAlloc) break;

      const cappedSalary = Math.min(salary, 7400);
      const annualTotalContrib = cappedSalary * totalContribRate * 12;

      // Split contributions into OA / SA / MA for this year
      const annualOAContrib = annualTotalContrib * yearAlloc.oa;
      const annualSAContrib = annualTotalContrib * yearAlloc.sa;
      const annualMAContrib = annualTotalContrib * yearAlloc.ma;

      // Base interest (principal + contributions) for each account
      const oaBaseInterest =
        oaBal * (oaRate / 100) +
        getContribInterestAccrual(annualOAContrib, oaRate);

      const saBaseInterest =
        saBal * (saRate / 100) +
        getContribInterestAccrual(annualSAContrib, saRate);

      const maBaseInterest =
        maBal * (maRate / 100) +
        getContribInterestAccrual(annualMAContrib, maRate);

      // Extra interest based on combined balances
      const { extraOA, extraSA, extraMA } = computeExtraInterest(
        currentAge,
        oaBal,
        saBal,
        maBal
      );

      const oaInterestThisYear = oaBaseInterest + extraOA;
      const saInterestThisYear = saBaseInterest + extraSA;
      const maInterestThisYear = maBaseInterest + extraMA;

      // Update balances
      oaBal += annualOAContrib + oaInterestThisYear;
      saBal += annualSAContrib + saInterestThisYear;
      maBal += annualMAContrib + maInterestThisYear;

      // Accumulate interest totals
      totalOaInterest += oaInterestThisYear;
      totalSaInterest += saInterestThisYear;
      totalMaInterest += maInterestThisYear;

      // Save snapshot after this year for charting
      yearlySnapshots.push({
        yearIndex: year + 1,
        age: currentAge,
        oaBal,
        saBal,
        maBal,
      });
    }

    const totalOa = oaBal;
    const totalSa = saBal;
    const totalMa = maBal;
    const totalCpfProjected = totalOa + totalSa + totalMa;

    // --- 4. CONTRIBUTION TOTALS ---
    const totalEmployeeContrib =
      Employee_Contrib_Rate_Overall * salary * 12 * years;
    const totalEmployerContrib =
      Employer_Contrib_Rate_Overall * salary * 12 * years;
    const totalCombineContrib = totalEmployeeContrib + totalEmployerContrib;

    // Total interest (for Sankey interest source)
    const totalInterestProjected =
      totalOaInterest + totalSaInterest + totalMaInterest;

    // Contribution-only allocation by account (approx, using current allocationRatios)
    const allocToOA = totalCombineContrib * allocationRatios.oa;
    const allocToSA = totalCombineContrib * allocationRatios.sa;
    const allocToMA = totalCombineContrib * allocationRatios.ma;


    // Total starting balances
    const totalStartBal = startOaBalance + startSaBalance + startMaBalance;

    // --- 5. SANKEY DATA ---
    const sankeyData = {
      nodes: [
        // Stage 1:
        { id: "Employee Contribution" },
        { id: "Employer Contribution" },
        { id: "Total Interest" },
        { id: "Starting CPF Balance" },

        // Stage 2:
        { id: "Total Contribution" },

        // Stage 3:
        { id: "OA" },
        { id: "SA" },
        { id: "MA" },
      ],
      links: [
        // Flow from Employee/Employer -> Total Contribution
        {
          source: "Employee Contribution",
          target: "Total Contribution",
          value: totalEmployeeContrib,
        },
        {
          source: "Employer Contribution",
          target: "Total Contribution",
          value: totalEmployerContrib,
        },

        // Total Contribution -> OA/SA/MA (principal flows)
        {
          source: "Total Contribution",
          target: "OA",
          value: allocToOA,
        },
        {
          source: "Total Contribution",
          target: "SA",
          value: allocToSA,
        },
        {
          source: "Total Contribution",
          target: "MA",
          value: allocToMA,
        },


        // Total Starting CPF Balance -> OA/SA/MA
        {
          source: "Starting CPF Balance",
          target: "OA",
          value: startOaBalance,
        },
        {
          source: "Starting CPF Balance",
          target: "SA",
          value: startSaBalance,
        },
        {
          source: "Starting CPF Balance",
          target: "MA",
          value: startMaBalance,
        },

        // Interest -> OA/SA/MA
        {
          source: "Total Interest",
          target: "OA",
          value: totalOaInterest,
        },
        {
          source: "Total Interest",
          target: "SA",
          value: totalSaInterest,
        },
        {
          source: "Total Interest",
          target: "MA",
          value: totalMaInterest,
        },

      ],
    };

    // --- 6. BAR CHART DATA: OA, SA, MA growth over time ---
    const oaBarData = yearlySnapshots.map((snap) => ({
      id: `Age ${snap.age}`,
      amount: snap.oaBal,
    }));

    const saBarData = yearlySnapshots.map((snap) => ({
      id: `Age ${snap.age}`,
      amount: snap.saBal,
    }));

    const maBarData = yearlySnapshots.map((snap) => ({
      id: `Age ${snap.age}`,
      amount: snap.maBal,
    }));

    return {
      totalOaProjected: totalOa,
      totalSaProjected: totalSa,
      totalMaProjected: totalMa,
      totalCpfProjected,
      totalEmployeeContrib,
      totalEmployerContrib,
      totalInterestProjected,
      Employee_Contrib_Rate_Overall,
      Employer_Contrib_Rate_Overall,
      sankeyData,
      oaBarData,
      saBarData,
      maBarData,
    };
  }, [age, salary, years, startOaBalance, startSaBalance, startMaBalance]);

  // Currency formatting
  const formatCurrency = (value) =>
    value.toLocaleString("en-SG", {
      style: "currency",
      currency: "SGD",
      maximumFractionDigits: 0,
    });

  const canGoNext = age && salary > 0 && years > 0;

  // ---------------------------
  // PAGE 1: INPUTS
  // ---------------------------
  const renderPage1 = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 w-full max-w-md">
      <div className="text-center mb-6">
        <h2 className="font-semibold text-slate-900 text-xl mb-1">
          CPF Inputs
        </h2>
        <p className="text-xs text-slate-500">
          Set your age, salary, and starting balances to project CPF growth.
        </p>
      </div>

      {/* Birth Date */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Birth date
        </label>
        <div className="relative">
          <DatePicker
            selected={birthDate}
            onChange={handleDateChange}
            maxDate={new Date()}
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            dateFormat="MMMM d, yyyy"
            placeholderText="Select your birth date"
            className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg 
                       focus:ring-2 focus:ring-emerald-500 focus:border-transparent 
                       outline-none text-sm text-slate-900 bg-slate-50"
            wrapperClassName="w-full"
          />
          <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        {age && (
          <p className="mt-1 text-[11px] text-slate-500">
            Age: {age.years} years {age.months} months
          </p>
        )}
      </div>

      {/* Salary */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Monthly salary (SGD)
        </label>
        <div className="relative">
          <input
            type="number"
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg 
                       focus:ring-2 focus:ring-emerald-500 focus:border-transparent 
                       outline-none text-sm text-slate-900 bg-slate-50"
            placeholder="e.g. 4,000"
          />
        </div>
        {Employee_Contrib_Rate_Overall > 0 && (
          <p className="mt-1 text-[11px] text-slate-500">
            Employee: {(Employee_Contrib_Rate_Overall * 100).toFixed(1)}% ·
            Employer: {(Employer_Contrib_Rate_Overall * 100).toFixed(1)}%
          </p>
        )}
      </div>

      {/* Years */}
      <div className="mb-5">
        <label className="block text-xs font-medium text-slate-600 mb-2">
          Years to project
        </label>
        <div className="relative">
          <input
            type="number"
            min={1}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg 
                       focus:ring-2 focus:ring-emerald-500 focus:border-transparent 
                       outline-none text-sm text-slate-900 bg-slate-50"
            placeholder="e.g. 10"
          />
        </div>
        {totalEmployeeContrib > 0 && (
          <p className="mt-1 text-[11px] text-slate-500">
            Total contributions over {years} year
            {years > 1 ? "s" : ""}:{" "}
            {formatCurrency(totalEmployeeContrib + totalEmployerContrib)}
          </p>
        )}
      </div>

      {/* Starting Balances */}
      <h3 className="font-medium text-slate-700 text-xs mb-3 border-t border-slate-100 pt-4">
        Starting CPF balances
      </h3>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {/* OA Start Balance */}
        <div className="col-span-1">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            OA
          </label>
          <input
            type="number"
            value={startOaBalance}
            onChange={(e) => setStartOaBalance(Number(e.target.value))}
            className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 bg-slate-50"
          />
        </div>
        {/* SA Start Balance */}
        <div className="col-span-1">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            SA
          </label>
          <input
            type="number"
            value={startSaBalance}
            onChange={(e) => setStartSaBalance(Number(e.target.value))}
            className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 bg-slate-50"
          />
        </div>
        {/* MA Start Balance */}
        <div className="col-span-1">
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            MA
          </label>
          <input
            type="number"
            value={startMaBalance}
            onChange={(e) => setStartMaBalance(Number(e.target.value))}
            className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs text-slate-900 bg-slate-50"
          />
        </div>
      </div>

      {/* Next Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setPage(2)}
          disabled={!canGoNext}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition
            ${
              canGoNext
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
        >
          View projection
        </button>
      </div>
    </div>
  );

  // ---------------------------
  // PAGE 2: OUTPUT
  // ---------------------------
  const renderPage2 = () => {
    const totalContribCombined = totalEmployeeContrib + totalEmployerContrib;
    const interestShareOfFinal =
      totalCpfProjected > 0
        ? (totalInterestProjected / totalCpfProjected) * 100
        : 0;
    const interestVsContribShare =
      totalContribCombined + totalInterestProjected > 0
        ? (totalInterestProjected /
            (totalContribCombined + totalInterestProjected)) *
          100
        : 0;

    return (
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">
        {/* Header / Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setPage(1)}
            className="text-xs hover:text-slate-700 px-2 py-2 rounded-lg"
          >
            ⇦ Adjust inputs
          </button>
        </div>


    {/* Sankey Chart */}
        {totalCpfProjected > 0 ? (
          <div className="p-4 mb-6">

            <h2 className="text-3xl font-bold text-emerald-900 mb-5">
              Contribution & Interest Flows Into Your CPF OA, SA & MA
            </h2>

        <p className="text-md md:text-sm text-slate-600 mb-4">
          Projected total CPF balance after{" "}
          <span className="font-bold text-2xl">{years}</span> 
          <strong> year{years > 1 ? "s" : ""}</strong> based on provided inputs{": "}
        </p>

          <div className="flex flex-col justify-center gap-4 p-3">

          {/* OA, SA, MA Cards with + signs */}
          <div className="flex items-center justify-center gap-4 mx-auto mb-8">

            {/* OA Card */}
            <div className="flex-1 max-w-[220px] bg-white shadow-md rounded-lg p-4 border-t-4 border-[#0f397e] text-center">
              <p className="text-sm text-slate-500 font-medium mb-1">Ordinary Account (OA)</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalOaProjected)}
              </p>
            </div>

            {/* + */}
            <span className="text-3xl font-bold text-slate-400">+</span>

            {/* SA Card */}
            <div className="flex-1 max-w-[220px] bg-white shadow-md rounded-lg p-4 border-t-4 border-[#14c087] text-center">
              <p className="text-sm text-slate-500 font-medium mb-1">Special Account (SA)</p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(totalSaProjected)}
              </p>
            </div>

            {/* + */}
            <span className="text-3xl font-bold text-slate-400">+</span>

            {/* MA Card */}
            <div className="flex-1 max-w-[220px] bg-white shadow-md rounded-lg p-4 border-t-4 border-[#f59e0b] text-center">
              <p className="text-sm text-slate-500 font-medium mb-1">MediSave Account (MA)</p>
              <p className="text-2xl font-bold text-amber-600">
                {formatCurrency(totalMaProjected)}
              </p>
            </div>

            {/* = */}
            <span className="text-3xl font-bold text-slate-400">=</span>

            {/* Total Card */}
            <div className="flex-1 max-w-[220px] p-4 text-center">
              <p className="text-sm text-slate-500 font-medium mb-1">Total CPF Balance</p>
                <span className="text-3xl font-bold text-emerald-900 ml-1 bg-green-800 text-white px-2 rounded-xl">
            {formatCurrency(totalCpfProjected)}
          </span>
            </div>

          </div>

              <NivoSankeyChart
                data={sankeyData}
                totalContrib={totalContribCombined}
                totalInterest={totalInterestProjected}
              />
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-slate-500 mt-8">
            Fill in valid inputs on Page 1 to see the CPF flow visualization.
          </p>
        )}

       {/* Narrative block – focus on contributions & retirement */}
      {totalCpfProjected > 0 && (
        <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50/40  p-4 mb-6">
          <h2 className="text-3xl font-bold text-emerald-900 mb-5">
            How your CPF contributions support future retirement?
          </h2>

          <p className="text-md text-emerald-900 mb-1">
            Over{" "}
            <span className="font-semibold">
              {years} year{years > 1 ? "s" : ""}
            </span>
            , you and your employer contributed{" "}
            <span className="font-bold text-3xl bg-emerald-800 text-white px-1 rounded-xl">
              {formatCurrency(totalContribCombined)}
            </span>
            {" "}into CPF from your monthly salary of{" "}
            <span className="font-bold text-md">
              {formatCurrency(salary)}
            </span>
          </p>

          <br/>

          <p className="text-md text-emerald-900 mb-1">
            On top of that, you earned {" "}
            <span className="font-bold text-3xl bg-emerald-800 text-white px-1 rounded-xl">
              {formatCurrency(totalInterestProjected)}
            </span>{" "}
            in interest. This interest helps your CPF savings/retirement grow.
          </p>

          <br/>

          <p className="text-md text-emerald-900 mb-1">
            About{" "}
            <span className="font-semibold text-3xl bg-emerald-800 text-white px-1 rounded-xl">
              {interestShareOfFinal.toFixed(0)}%
            </span>{" "}
            of your total CPF balance comes from interest through
            consistent monthly contributions from you and your employer.
          </p>

          <br/>

          <p className="text-xl text-emerald-900 bg-emerald-800 text-white p-2 rounded-xl">
            <strong>What this means?</strong>
            <span className="text-xl"> <br/>
            <strong>Maintaining steady earnings, contributing early and regularly</strong> and <strong>giving your CPF time to compound</strong> are three of the most powerful drivers of building a stronger and more secure future and retirement savings for you.
            </span>
          </p>

          <br/>
        </div>
      )}

        {/* Bar charts: growth over time */}
        {oaBarData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-3">
              <h4 className="text-3xl font-bold text-emerald-900 mb-5">
                Ordinary Account (OA) Growth
              </h4>
              <NivoBarChart data={oaBarData} color="#0f397eff" />
            </div>
            <div className="p-3">
              <h4 className="text-3xl font-bold text-emerald-900 mb-5">
                Special Account (SA) Growth
              </h4>
              <NivoBarChart data={saBarData} color="#14c087ff" />
            </div>
            <div className="p-3">
              <h4 className="text-3xl font-bold text-emerald-900 mb-5">
                Medisave Account (MA) Growth
              </h4>
              <NivoBarChart data={maBarData} color="#f59e0b" />
            </div>
          </div>
        )}

      </div>
    );
  };

  // ---------------------------
  // MAIN RENDER
  // ---------------------------
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
    {/* FIXED TOP BAR: NAVBAR + DISCLAIMER */}
    <div className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      {/* NAVBAR */}
      <header className="w-full">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand */}
          {/* <div className="flex items-center gap-2">
            <div className="h-12 w-14 bg-red-900 text-white rounded-full flex items-center justify-center text-xs font-bold">
              Finwise
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">
                
              </span>
            </div>
          </div> */}

          {/* Simple nav (placeholder for future sections) */}
          {/* <nav className="hidden md:flex items-center gap-5 text-xs text-slate-500">
            <button className="px-2 py-1 rounded-full bg-slate-900 text-slate-50">
              CPF simulator
            </button>
            <button className="hover:text-slate-700">
              Mortgage (coming soon)
            </button>
            <button className="hover:text-slate-700">Insights</button>
          </nav> */}
        </div>
      </header>

      {/* DISCLAIMER BAR (just under navbar) */}
      <div className="w-full bg-red-100 border-t border-red-200">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <p className="text-[11px] md:text-xs text-slate-900">
            <strong>Disclaimer:</strong> This CPF growth calculator is intended for educational and information purposes only. It is not a financial advisor and should not be used as a substitute for professional financial advice.
          </p>
        </div>
      </div>
    </div>

    {/* CONTENT */}
    {/* 👇 push content down so it's not hidden behind fixed header+disclaimer */}
    <main className="flex-1 w-full pt-28 md:pt-28">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 flex flex-col gap-6">
        {/* Page heading */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-col gap-1 items-center">
            <h1 className="text-2xl md:text-2xl font-bold text-slate-900 tracking-tight">
              CPF Growth Calculator
            </h1>
            <p className="mt-1 text-xs md:text-sm text-slate-500 max-w-xl">
              Understand how your CPF grows over time with consistent
              salary/earnings contributions.
            </p>
          </div>
          {age && (
            <div className="flex flex-row md:flex-col items-center justify-center text-right text-[18px] text-slate-900 gap-2">
              <p>
                Your current age:{" "}
                <span className="font-bold text-slate-900">
                  {age.years} years
                </span>
              </p>
              <p>
                Monthly salary:{" "}
                <span className="font-bold text-slate-900">
                  {formatCurrency(salary)}
                </span>
              </p>
            </div>
          )}
        </section>

        {/* Main card area */}
        <section className="flex justify-center">
          {page === 1 ? renderPage1() : renderPage2()}
        </section>
      </div>
    </main>

    <footer>
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 flex flex-col gap-6">
        <p className="text-md text-slate-500">
          © {new Date().getFullYear()} CPF Growth Calculator Developed by Muhammad Zhafran Bahaman. All rights reserved.
        </p>
      </div>
    </footer>

      {/* Custom Styles for DatePicker */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .react-datepicker {
          font-family: inherit;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.08);
        }

        .react-datepicker__header {
          background-color: #f8fafc;
          border-bottom: none;
          border-radius: 12px 12px 0 0;
          padding-top: 12px;
        }

        .react-datepicker__current-month,
        .react-datepicker__day-name {
          color: #0f172a;
          font-size: 11px;
        }

        .react-datepicker__day--selected,
        .react-datepicker__day--keyboard-selected {
          background-color: #059669;
          border-radius: 8px;
          color: white;
        }

        .react-datepicker__day:hover {
          background-color: #d1fae5;
          border-radius: 8px;
        }

        .react-datepicker__day--disabled {
          color: #cbd5f5;
        }

        .react-datepicker__triangle {
          display: none;
        }
      `}</style>
    </div>
  );
}
