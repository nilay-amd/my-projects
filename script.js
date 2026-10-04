
    let numVars = 4;
    let cellValues = [];

    const gray1 = [0, 1];
    const gray2 = [0, 1, 3, 2];
    const grayLabels1 = ['0', '1'];
    const grayLabels2 = ['00', '01', '11', '10'];
    const dotColors = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'];

    function init() {
      const totalCells = Math.pow(2, numVars);
      cellValues = new Array(totalCells).fill('');
      renderAll();
    }

    function changeVariables(val) {
      numVars = parseInt(val);
      init();
    }

    // Cycling: '' -> '1' -> '0' -> 'X' -> ''
    function toggleCell(idx) {
      if (cellValues[idx] === '') cellValues[idx] = '1';
      else if (cellValues[idx] === '1') cellValues[idx] = '0';
      else if (cellValues[idx] === '0') cellValues[idx] = 'X';
      else cellValues[idx] = '';
      renderAll();
    }

    function fillAll(val) {
      cellValues.fill(val);
      renderAll();
    }

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

    function renderAll() {
      const sopGroups = solveKMap('SOP');
      const posGroups = solveKMap('POS');
      renderGrid(sopGroups);
      renderTruthTable();
      renderResults(sopGroups, posGroups);
    }

    function renderGrid(groups) {
      const gridWrapper = document.getElementById('gridWrapper');
      gridWrapper.innerHTML = '';

      let rowGray = numVars === 2 ? gray1 : (numVars === 3 ? gray1 : gray2);
      let colGray = numVars === 2 ? gray1 : gray2;
      let rowLabels = numVars === 2 ? grayLabels1 : (numVars === 3 ? grayLabels1 : grayLabels2);
      let colLabels = numVars === 2 ? grayLabels1 : grayLabels2;

      let rowVarLabel = numVars === 2 ? 'A' : (numVars === 3 ? 'A' : 'AB');
      let colVarLabel = numVars === 2 ? 'B' : (numVars === 3 ? 'BC' : 'CD');

      let table = document.createElement('table');
      table.className = "kmap-grid";

      let thead = document.createElement('thead');
      let headerRow = document.createElement('tr');
      let cornerCell = document.createElement('th');
      cornerCell.innerHTML = `<div style="text-align:right">${colVarLabel}</div><div style="text-align:left">${rowVarLabel}</div>`;
      headerRow.appendChild(cornerCell);

      colLabels.forEach(lbl => {
        let th = document.createElement('th');
        th.textContent = lbl;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      let tbody = document.createElement('tbody');

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
          td.onclick = () => toggleCell(cellIndex);

          let matchedGroupIdx = groups.findIndex(g => g.cells.includes(cellIndex));
          let bgClass = matchedGroupIdx !== -1 ? `bg-g${matchedGroupIdx % 4}` : '';
          let valColor = val === '1' ? 'color:#4f46e5' : (val === '0' ? 'color:#059669' : (val === 'X' ? 'color:#d97706' : 'color:#cbd5e1'));

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

    function renderTruthTable() {
      const tHead = document.getElementById('tableHead');
      const tBody = document.getElementById('tableBody');
      tHead.innerHTML = '';
      tBody.innerHTML = '';

      let varNames = ['A', 'B', 'C', 'D'].slice(0, numVars);
      let headRow = document.createElement('tr');
      ['IDX', varNames.join(''), 'OUT', 'STATE'].forEach(text => {
        let th = document.createElement('th');
        th.textContent = text;
        headRow.appendChild(th);
      });
      tHead.appendChild(headRow);

      const totalRows = Math.pow(2, numVars);
      for (let i = 0; i < totalRows; i++) {
        let tr = document.createElement('tr');
        tr.onclick = () => toggleCell(i);
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
        tdVal.style.color = val === '1' ? '#4f46e5' : (val === '0' ? '#059669' : (val === 'X' ? '#d97706' : '#94a3b8'));
        tdVal.textContent = val === '' ? '—' : val;
        tr.appendChild(tdVal);

        let tdState = document.createElement('td');
        if (val === '1') tdState.textContent = `m${i}`;
        else if (val === '0') tdState.textContent = `M${i}`;
        else if (val === 'X') tdState.textContent = `d${i}`;
        else tdState.textContent = '—';
        tr.appendChild(tdState);

        tBody.appendChild(tr);
      }
    }

    // Rigorous Quine-McCluskey / Petrick's Method Solver for K-Map Minimization
    function solveKMap(mode) {
      let targetVal = mode === 'SOP' ? '1' : '0';
      let activeIndices = [];
      let dontCares = [];

      cellValues.forEach((val, idx) => {
        if (val === targetVal) activeIndices.push(idx);
        if (val === 'X') dontCares.push(idx);
      });

      if (activeIndices.length === 0) return [];

      let allMinterms = [...activeIndices, ...dontCares];
      let primeImplicants = getPrimeImplicants(allMinterms, numVars);

      // Filter prime implicants that cover at least one required minterm
      let validPIs = primeImplicants.filter(pi => 
        pi.minterms.some(m => activeIndices.includes(m))
      );

      if (validPIs.length === 0) return [];

      // Exact covering using Petrick's method / greedy prime implicant selection
      let selectedPIs = selectMinimalCover(validPIs, activeIndices);

      return selectedPIs.map((pi, idx) => ({
        id: idx,
        cells: pi.minterms.filter(m => activeIndices.includes(m) || dontCares.includes(m)).sort((a,b)=>a-b),
        expression: piToExpression(pi.bits, mode)
      }));
    }

    function getPrimeImplicants(minterms, nVars) {
      let terms = minterms.map(m => ({
        minterms: [m],
        bits: m.toString(2).padStart(nVars, '0'),
        covered: false
      }));

      let primeImplicants = [];
      let currentTable = terms;

      while (currentTable.length > 0) {
        let nextTable = [];
        let marked = new Set();

        for (let i = 0; i < currentTable.length; i++) {
          for (let j = i + 1; j < currentTable.length; j++) {
            let t1 = currentTable[i];
            let t2 = currentTable[j];
            let diffIdx = -1;
            let diffCount = 0;

            for (let b = 0; b < t1.bits.length; b++) {
              if (t1.bits[b] !== t2.bits[b]) {
                diffCount++;
                diffIdx = b;
              }
            }

            if (diffCount === 1) {
              t1.covered = true;
              t2.covered = true;
              let newBits = t1.bits.substring(0, diffIdx) + '-' + t1.bits.substring(diffIdx + 1);
              let combinedMinterms = Array.from(new Set([...t1.minterms, ...t2.minterms])).sort((a,b)=>a-b);
              
              if (!nextTable.some(t => t.bits === newBits)) {
                nextTable.push({ minterms: combinedMinterms, bits: newBits, covered: false });
              }
            }
          }
        }

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

    function selectMinimalCover(pis, requiredMinterms) {
      let uncovered = new Set(requiredMinterms);
      let selected = [];

      // Sort by size (largest first) and number of required minterms covered
      let sortedPIs = [...pis].sort((a, b) => {
        let covA = a.minterms.filter(m => requiredMinterms.includes(m)).length;
        let covB = b.minterms.filter(m => requiredMinterms.includes(m)).length;
        return covB - covA || b.minterms.length - a.minterms.length;
      });

      // Essential prime implicant check
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

      // Greedy cover for remaining
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

    function piToExpression(bits, mode) {
      let varNames = ['A', 'B', 'C', 'D'].slice(0, numVars);
      let term = '';

      for (let i = 0; i < bits.length; i++) {
        let bit = bits[i];
        let varName = varNames[i];
        if (bit === '1') {
          if (mode === 'SOP') term += varName;
          else term += varName + "'";
        } else if (bit === '0') {
          if (mode === 'SOP') term += varName + "'";
          else term += varName;
        }
      }

      if (mode === 'POS') {
        term = term.match(/[A-D]'?/g).join(' + ');
        return term ? `(${term})` : '1';
      }

      return term || '1';
    }

    function renderResults(sopGroups, posGroups) {
      const sopRes = document.getElementById('sopResult');
      const posRes = document.getElementById('posResult');
      const sopInput = document.getElementById('sopInput');
      const posInput = document.getElementById('posInput');
      const sopGroupList = document.getElementById('sopGroupList');
      const posGroupList = document.getElementById('posGroupList');

      let sopOnes = cellValues.map((v, i) => v === '1' ? i : null).filter(v => v !== null);
      let posZeros = cellValues.map((v, i) => v === '0' ? i : null).filter(v => v !== null);

      if (document.activeElement !== sopInput) sopInput.value = sopOnes.join(', ');
      if (document.activeElement !== posInput) posInput.value = posZeros.join(', ');

      sopRes.textContent = sopGroups.length ? "Y = " + sopGroups.map(g => g.expression).join(" + ") : "Y = 0";
      posRes.textContent = posGroups.length ? "Y = " + posGroups.map(g => g.expression).join(" · ") : "Y = 1";

      // Render SOP Group Rows
      sopGroupList.innerHTML = sopGroups.map((g, idx) => {
        let cellStr = g.cells.map(c => `m${c}`).join('·');
        let color = dotColors[idx % dotColors.length];
        return `
          <div class="group-row font-mono">
            <div><span class="group-dot" style="background:${color}"></span><b>g${idx+1}</b> &nbsp; ${cellStr}</div>
            <div>&rarr; <b>${g.expression}</b></div>
          </div>
        `;
      }).join('') || '<div style="font-size:11px; color:#94a3b8">No SOP groups</div>';

      // Render POS Group Rows
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

    window.onload = init;
