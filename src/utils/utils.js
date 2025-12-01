 

 // range function 
 function range(start, end, step = 1) {
    const range = [];
    for (let i = start; i < end; i+=step) {
        range.push(i);
    }
    return range;
}

// CPF allocation by age
function getCPFAllocation(age) {
  if (age <= 35)
    return { oa: 0.6217, sa: 0.1621, ma: 0.2162 };

  if (age <= 45)
    return { oa: 0.5677, sa: 0.1891, ma: 0.2432 };

  if (age <= 50)
    return { oa: 0.5136, sa: 0.2162, ma: 0.2837 };

  if (age <= 55)
    return { oa: 0.4055, sa: 0.3108, ma: 0.2837 };

  if (age <= 60)
    return { oa: 0.3694, sa: 0.3076, ma: 0.3230 };

  if (age <= 65)
    return { oa: 0.149, sa: 0.4042, ma: 0.4468 };

    if (age <= 70)
    return { oa: 0.0607, sa: 0.3031, ma: 0.6363 };

  return { oa: 0.08, sa: 0.08, ma: 0.84 };
}

// Interest rates
function getInterestRates() {
  return {
    oaRate: 2.5,
    saRate: 4.0,
    maRate: 4.0,
  };
}

export { range, getCPFAllocation, getInterestRates };


