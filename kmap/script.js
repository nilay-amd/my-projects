let numVars = 4;
let cellValues = [];

// K-map Gray-code order and colors used for displaying groups
const gray1 = [0, 1];
const gray2 = [0, 1, 3, 2];
const grayLabels1 = ['0', '1'];
const grayLabels2 = ['00', '01', '11', '10'];
const dotColors = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

// Initializes the K-map with the required number of cells
function init() {
  const totalCells = Math.pow(2, numVars);
  cellValues = new Array(totalCells).fill('');
  renderAll();
}

// Changes the number of variables and rebuilds the K-map
function changeVariables(val) {
  numVars = parseInt(val);
  init();
}

// Changes a cell through: empty → 1 → 0 → X → empty
function toggleCell(idx) {
  if (cellValues[idx] === '') cellValues[idx] = '1';
  else if (cellValues[idx] === '1') cellValues[idx] = '0';
  else if (cellValues[idx] === '0') cellValues[idx] = 'X';
  else cellValues[idx] = '';
  renderAll();
}

// Fills all K-map cells with the selected value
function fillAll(val) {
  cellValues.fill(val);
  renderAll();
}
// For chaange in literals,
function getHeaderLabels(numVars, mode) {
  let v = ['A', 'B', 'C', 'D'].slice(0, numVars);
  if (numVars === 4) {
    if (mode === 'sop') {
      return {
        row: [`${v[0]}'${v[1]}'`, `${v[0]}'${v[1]}`, `${v[0]}${v[1]}`, `${v[0]}${v[1]}''`.replace("''","'")],
        col: [`${v[2]}'${v[3]}'`, `${v[2]}'${v[3]}`, `${v[2]}${v[3]}`, `${v[2]}${v[3]}''`.replace("''","'")]
      };
    } else if (mode === 'pos') {
      return {
        row: [`${v[0]} + ${v[1]}`, `${v[0]} + ${v[1]}'`, `${v[0]}' + ${v[1]}'`, `${v[0]}' + ${v[1]}`],
        col: [`${v[2]} + ${v[3]}`, `${v[2]} + ${v[3]}'`, `${v[2]}' + ${v[3]}'`, `${v[2]}' + ${v[3]}`]
      };
    }
  } else if (numVars === 3) {
    if (mode === 'sop') {
      return {
        row: [`${v[0]}'`, `${v[0]}`],
        col: [`${v[1]}'${v[2]}'`, `${v[1]}'${v[2]}`, `${v[1]}${v[2]}`, `${v[1]}${v[2]}'`]
      };
    } else if (mode === 'pos') {
      return {
        row: [`${v[0]}`, `${v[0]}'`],
        col: [`${v[1]} + ${v[2]}`, `${v[1]} + ${v[2]}'`, `${v[1]}' + ${v[2]}'`, `${v[1]}' + ${v[2]}`]
      };
    }
  }
  // Default binary fallback
  return {
    row: numVars === 2 ? ['0', '1'] : (numVars === 3 ? ['0', '1'] : ['00', '01', '11', '10']),
    col: numVars === 2 ? ['0', '1'] : ['00', '01', '11', '10']
  };
}
// Takes minterms from the SOP/POS input boxes and updates the K-map
function applyMatrix(mode) {
  const inputId = mode === 'SOP' ? 'sopInput' : 'posInput';
  const inputVal = document.getElementById(inputId).value.trim();
  const totalCells = Math.pow(2, numVars);
  
  cellValues.fill('');
  if (inputVal) {
    inputVal.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 0 && n < totalCells)
      .forEach(idx => {
        cellValues[idx] = mode === 'SOP' ? '1' : '0';
      });
  }

  renderAll();
}

// Refreshes every part of the interface after a change
function renderAll() {
  const sopGroups = solveKMap('SOP');
  const posGroups = solveKMap('POS');
  renderGrid(sopGroups);
  renderTruthTable();
  renderResults(sopGroups, posGroups);
}

// Builds the visual K-map grid using Gray-code ordering
function renderGrid(groups) {
  const gridWrapper = document.getElementById('gridWrapper');
  gridWrapper.innerHTML = '';

  // Select row/column order and labels according to variable count
  let rowGray = numVars === 2 ? gray1 : (numVars === 3 ? gray1 : gray2);
  let colGray = numVars === 2 ? gray1 : gray2;
  let labelMode = document.getElementById('labelMode') ? document.getElementById('labelMode').value : 'binary';
  let customLabels = getHeaderLabels(numVars, labelMode);
  let rowLabels = customLabels.row;
  let colLabels = customLabels.col;
  // Decide which variables belong to the rows and columns
  let rowVarLabel = numVars === 2 ? 'A' : (numVars === 3 ? 'A' : 'AB');
  let colVarLabel = numVars === 2 ? 'B' : (numVars === 3 ? 'BC' : 'CD');

  let table = document.createElement('table');
  table.className = "kmap-grid";

  let thead = document.createElement('thead');
  let headerRow = document.createElement('tr');
  let cornerCell = document.createElement('th');
  cornerCell.innerHTML = `<div style="text-align:right">${colVarLabel}</div><div style="text-align:left">${rowVarLabel}</div>`;
  headerRow.appendChild(cornerCell);

  // Add Gray-code labels across the top
  colLabels.forEach(lbl => {
    let th = document.createElement('th');
    th.textContent = lbl;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  let tbody = document.createElement('tbody');

  // Create each row and calculate the corresponding minterm index
  rowGray.forEach((rVal, rIdx) => {
    let tr = document.createElement('tr');
    let rowHeader = document.createElement('th');
    rowHeader.textContent = rowLabels[rIdx];
    tr.appendChild(rowHeader);

    colGray.forEach((cVal, cIdx) => {
      let cellIndex = 0;

      if (numVars === 2) cellIndex = (rVal << 1) | cVal;
      else if (numVars === 3) cellIndex = (rVal << 2) | cVal;
      else cellIndex = (rVal << 2) | cVal;

      let val = cellValues[cellIndex];
      let td = document.createElement('td');

      // Clicking a K-map cell changes its value
      td.onclick = () => toggleCell(cellIndex);

      // Check whether this cell belongs to one of the minimized groups
      let matchedGroupIdx = groups.findIndex(g => g.cells.includes(cellIndex));
      let bgClass = matchedGroupIdx !== -1 ? `bg-g${matchedGroupIdx % 4}` : '';

      // Give different colors to 1, 0, X and empty cells
      let valColor = val === '1'
        ? 'color:#4f46e5'
        : (val === '0'
          ? 'color:#059669'
          : (val === 'X'
            ? 'color:#d97706'
            : 'color:#cbd5e1'));

      td.innerHTML = `
        <div class="cell-box ${bgClass}">
          <span class="cell-val" style="${valColor}">${val}</span>
          <span class="cell-idx">${cellIndex}</span>
        </div>
      `;

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  gridWrapper.appendChild(table);
}

// Builds the truth table from the current K-map values
function renderTruthTable() {
  const tHead = document.getElementById('tableHead');
  const tBody = document.getElementById('tableBody');

  tHead.innerHTML = '';
  tBody.innerHTML = '';

  // Select only the variables currently being used
  let varNames = ['A', 'B', 'C', 'D'].slice(0, numVars);

  let headRow = document.createElement('tr');

  ['IDX', varNames.join(''), 'OUT', 'STATE'].forEach(text => {
    let th = document.createElement('th');
    th.textContent = text;
    headRow.appendChild(th);
  });

  tHead.appendChild(headRow);

  const totalRows = Math.pow(2, numVars);

  // Create one truth-table row for every possible input combination
  for (let i = 0; i < totalRows; i++) {
    let tr = document.createElement('tr');

    // Clicking a truth-table row changes the same K-map cell
    tr.onclick = () => toggleCell(i);

    // Convert the index into its binary representation
    let binStr = i.toString(2).padStart(numVars, '0');
    let val = cellValues[i];

    let tdIdx = document.createElement('td');
    tdIdx.textContent = i;
    tr.appendChild(tdIdx);

    let tdBits = document.createElement('td');
    tdBits.textContent = binStr;
    tr.appendChild(tdBits);

    let tdVal = document.createElement('td');
    tdVal.style.fontWeight = 'bold';
    tdVal.style.color = val === '1'
      ? '#4f46e5'
      : (val === '0'
        ? '#059669'
        : (val === 'X'
          ? '#d97706'
          : '#94a3b8'));

    tdVal.textContent = val === '' ? '—' : val;
    tr.appendChild(tdVal);

    // Show m for minterm, M for maxterm and d for don't-care
    let tdState = document.createElement('td');

    if (val === '1') tdState.textContent = `m${i}`;
    else if (val === '0') tdState.textContent = `M${i}`;
    else if (val === 'X') tdState.textContent = `d${i}`;
    else tdState.textContent = '—';

    tr.appendChild(tdState);
    tBody.appendChild(tr);
  }
}

// Main K-map minimization function for both SOP and POS
function solveKMap(mode) {
  let targetVal = mode === 'SOP' ? '1' : '0';
  let activeIndices = [];
  let dontCares = [];

  // Separate required terms and don't-care terms
  cellValues.forEach((val, idx) => {
    if (val === targetVal) activeIndices.push(idx);
    if (val === 'X') dontCares.push(idx);
  });

  // No required terms means no groups are needed
  if (activeIndices.length === 0) return [];

  // Don't-cares can also participate in group formation
  let allMinterms = [...activeIndices, ...dontCares];

  // Generate all possible prime implicants
  let primeImplicants = getPrimeImplicants(allMinterms, numVars);

  // Keep only prime implicants that cover at least one required term
  let validPIs = primeImplicants.filter(pi => 
    pi.minterms.some(m => activeIndices.includes(m))
  );

  if (validPIs.length === 0) return [];

  // Select the implicants needed to cover all required terms
  let selectedPIs = selectMinimalCover(validPIs, activeIndices);

  // Convert selected implicants into groups used by the UI
  return selectedPIs.map((pi, idx) => ({
    id: idx,
    cells: pi.minterms
      .filter(m => activeIndices.includes(m) || dontCares.includes(m))
      .sort((a, b) => a - b),
    expression: piToExpression(pi.bits, mode)
  }));
}

// Generates prime implicants by repeatedly combining terms
function getPrimeImplicants(minterms, nVars) {
  // Convert each minterm into binary form
  let terms = minterms.map(m => ({
    minterms: [m],
    bits: m.toString(2).padStart(nVars, '0'),
    covered: false
  }));

  let primeImplicants = [];
  let currentTable = terms;

  // Keep combining terms until no more combinations are possible
  while (currentTable.length > 0) {
    let nextTable = [];
    let marked = new Set();

    // Compare every pair of terms
    for (let i = 0; i < currentTable.length; i++) {
      for (let j = i + 1; j < currentTable.length; j++) {
        let t1 = currentTable[i];
        let t2 = currentTable[j];

        let diffIdx = -1;
        let diffCount = 0;

        // Find how many bit positions are different
        for (let b = 0; b < t1.bits.length; b++) {
          if (t1.bits[b] !== t2.bits[b]) {
            diffCount++;
            diffIdx = b;
          }
        }

        // Terms differing in exactly one position can be combined
        if (diffCount === 1) {
          t1.covered = true;
          t2.covered = true;

          // Replace the differing bit with '-' to represent a removed variable
          let newBits =
            t1.bits.substring(0, diffIdx) +
            '-' +
            t1.bits.substring(diffIdx + 1);

          let combinedMinterms = Array.from(
            new Set([...t1.minterms, ...t2.minterms])
          ).sort((a, b) => a - b);

          // Avoid adding the same combined implicant twice
          if (!nextTable.some(t => t.bits === newBits)) {
            nextTable.push({
              minterms: combinedMinterms,
              bits: newBits,
              covered: false
            });
          }
        }
      }
    }

    // Terms that could not be combined become prime implicants
    currentTable.forEach(t => {
      if (!t.covered) {
        if (!primeImplicants.some(pi => pi.bits === t.bits)) {
          primeImplicants.push(t);
        }
      }
    });

    currentTable = nextTable;
  }

  return primeImplicants;
}

// Selects the implicants needed to cover all required minterms
function selectMinimalCover(pis, requiredMinterms) {
  let uncovered = new Set(requiredMinterms);
  let selected = [];

  // Prefer implicants that cover more required minterms
  let sortedPIs = [...pis].sort((a, b) => {
    let covA = a.minterms.filter(m => requiredMinterms.includes(m)).length;
    let covB = b.minterms.filter(m => requiredMinterms.includes(m)).length;

    return covB - covA || b.minterms.length - a.minterms.length;
  });

  // Essential prime implicants are selected first
  requiredMinterms.forEach(m => {
    let coveringPIs = sortedPIs.filter(pi => pi.minterms.includes(m));

    if (coveringPIs.length === 1) {
      let pi = coveringPIs[0];

      if (!selected.includes(pi)) {
        selected.push(pi);

        pi.minterms.forEach(min => uncovered.delete(min));
      }
    }
  });

  // Cover any remaining minterms using the best available implicants
  while (uncovered.size > 0) {
    let bestPI = null;
    let maxCovered = 0;

    sortedPIs.forEach(pi => {
      if (!selected.includes(pi)) {
        let count = pi.minterms.filter(m => uncovered.has(m)).length;

        if (count > maxCovered) {
          maxCovered = count;
          bestPI = pi;
        }
      }
    });

    if (bestPI) {
      selected.push(bestPI);
      bestPI.minterms.forEach(m => uncovered.delete(m));
    } else {
      break;
    }
  }

  return selected;
}

// Converts a binary implicant into a readable SOP or POS expression
function piToExpression(bits, mode) {
  let varNames = ['A', 'B', 'C', 'D'].slice(0, numVars);
  let term = '';

  // Read each bit and decide whether the variable stays in the term
  for (let i = 0; i < bits.length; i++) {
    let bit = bits[i];
    let varName = varNames[i];

    if (bit === '1') {
      if (mode === 'SOP') term += varName;
      else term += varName + "'";
    } 
    else if (bit === '0') {
      if (mode === 'SOP') term += varName + "'";
      else term += varName;
    }
    // '-' means the variable is eliminated from the expression
  }

  // POS terms use brackets and + between variables
  if (mode === 'POS') {
    term = term.match(/[A-D]'?/g).join(' + ');
    return term ? `(${term})` : '1';
  }

  return term || '1';
}

// Displays final SOP/POS expressions and the groups used to create them
function renderResults(sopGroups, posGroups) {
  const sopRes = document.getElementById('sopResult');
  const posRes = document.getElementById('posResult');
  const sopInput = document.getElementById('sopInput');
  const posInput = document.getElementById('posInput');
  const sopGroupList = document.getElementById('sopGroupList');
  const posGroupList = document.getElementById('posGroupList');

  // Collect all cells currently marked as 1 or 0
  let sopOnes = cellValues
    .map((v, i) => v === '1' ? i : null)
    .filter(v => v !== null);

  let posZeros = cellValues
    .map((v, i) => v === '0' ? i : null)
    .filter(v => v !== null);

  // Keep the input boxes synchronized with the K-map
  if (document.activeElement !== sopInput) {
    sopInput.value = sopOnes.join(', ');
  }

  if (document.activeElement !== posInput) {
    posInput.value = posZeros.join(', ');
  }

  // Display the final minimized SOP and POS expressions
  sopRes.textContent = sopGroups.length
    ? "Y = " + sopGroups.map(g => g.expression).join(" + ")
    : "Y = 0";

  posRes.textContent = posGroups.length
    ? "Y = " + posGroups.map(g => g.expression).join(" · ")
    : "Y = 1";

  // Create the visible SOP group rows
  sopGroupList.innerHTML = sopGroups.map((g, idx) => {
    let cellStr = g.cells.map(c => `m${c}`).join('·');
    let color = dotColors[idx % dotColors.length];

    return `
      <div class="group-row font-mono">
        <div>
          <span class="group-dot" style="background:${color}"></span>
          <b>g${idx+1}</b> &nbsp; ${cellStr}
        </div>
        <div>&rarr; <b>${g.expression}</b></div>
      </div>
    `;
  }).join('') || '<div style="font-size:11px; color:#94a3b8">No SOP groups</div>';

  // Create the visible POS group rows
  posGroupList.innerHTML = posGroups.map((g, idx) => {
    let cellStr = g.cells.map(c => `M${c}`).join('·');

    return `
      <div class="group-row font-mono">
        <div><b>h${idx+1}</b> &nbsp; ${cellStr}</div>
        <div>&rarr; <b>${g.expression}</b></div>
      </div>
    `;
  }).join('') || '<div style="font-size:11px; color:#94a3b8">No POS groups</div>';
}

// Start the application when the HTML page finishes loading
window.onload = init;