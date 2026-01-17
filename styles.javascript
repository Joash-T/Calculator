// Quick Calculator Demo
// Features: basic arithmetic, parentheses, operator precedence, keyboard support, history.

// -- UI elements
const displayEl = document.getElementById('display');
const historyList = document.getElementById('history-list');
const buttons = Array.from(document.querySelectorAll('.btn'));
const clearBtn = document.getElementById('clear');
const backBtn = document.getElementById('backspace');
const equalsBtn = document.getElementById('equals');
const clearHistoryBtn = document.getElementById('clear-history');

let expr = ''; // current expression string
let history = [];

// Utility: render display nicely
function renderDisplay(text){
  displayEl.textContent = String(text).slice(0, 100);
}

// Append token to expression (for clicks and keyboard)
function appendToken(t){
  // Replace visually-friendly × and ÷ with internal operators
  if(t === '×') t = '*';
  if(t === '÷') t = '/';
  expr += t;
  renderDisplay(expr || '0');
}

// Clear
function clearAll(){
  expr = '';
  renderDisplay('0');
}

// Backspace
function backspace(){
  expr = expr.slice(0, -1);
  renderDisplay(expr || '0');
}

// Push result to history UI
function pushHistory(e, r){
  const li = document.createElement('li');
  const exprSpan = document.createElement('span');
  exprSpan.className = 'expr';
  exprSpan.textContent = e;
  const resSpan = document.createElement('span');
  resSpan.className = 'res';
  resSpan.textContent = r;
  li.appendChild(exprSpan);
  li.appendChild(resSpan);
  historyList.prepend(li);
}

// Clear history
clearHistoryBtn.addEventListener('click', () => {
  history = [];
  historyList.innerHTML = '';
});

// Button click wiring
buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.value;
    if(!v) return;
    if(v === '=') {
      evaluateAndShow();
    } else if (btn.id === 'clear') {
      clearAll();
    } else if (btn.id === 'backspace') {
      backspace();
    } else {
      appendToken(v);
    }
  });
});

// Keyboard support
window.addEventListener('keydown', (ev) => {
  const key = ev.key;
  if(/[0-9]/.test(key)) {
    appendToken(key);
    ev.preventDefault();
    return;
  }
  if(key === '.' ) { appendToken('.'); ev.preventDefault(); return; }
  if(key === '+' || key === '-' || key === '*' || key === '/') { appendToken(key); ev.preventDefault(); return; }
  if(key === 'Enter' || key === '=') { evaluateAndShow(); ev.preventDefault(); return; }
  if(key === 'Backspace') { backspace(); ev.preventDefault(); return; }
  if(key === 'Escape') { clearAll(); ev.preventDefault(); return; }
  if(key === '(' || key === ')') { appendToken(key); ev.preventDefault(); return; }
  // Accept 'x' or 'X' as multiply
  if(key.toLowerCase() === 'x'){ appendToken('*'); ev.preventDefault(); return; }
  // Accept '%'
  if(key === '%'){ appendToken('%'); ev.preventDefault(); return; }
});

// Expression evaluation using shunting-yard (no eval)
function evaluateExpression(input) {
  try {
    // Tokenize
    const tokens = [];
    for (let i = 0; i < input.length; ) {
      const ch = input[i];
      if (ch === ' ') { i++; continue; }
      // number (support leading negative sign attached to number)
      if (/[0-9.]/.test(ch) || (ch === '-' && (i === 0 || /[+\-*/%(]/.test(input[i-1])))) {
        let j = i + 1;
        while (j < input.length && /[0-9.]/.test(input[j])) j++;
        const numStr = input.slice(i, j);
        if (numStr.split('.').length > 2) return { error: 'Invalid number' };
        tokens.push({ type: 'number', value: parseFloat(numStr) });
        i = j;
        continue;
      }
      if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%') {
        tokens.push({ type: 'op', value: ch });
        i++;
        continue;
      }
      if (ch === '(' || ch === ')') {
        tokens.push({ type: 'paren', value: ch });
        i++;
        continue;
      }
      // unknown char
      return { error: 'Unexpected character' };
    }

    // Shunting-yard -> RPN
    const outQueue = [];
    const opStack = [];
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };
    const leftAssoc = { '+': true, '-': true, '*': true, '/': true, '%': true };

    for (const tok of tokens) {
      if (tok.type === 'number') {
        outQueue.push(tok);
      } else if (tok.type === 'op') {
        while (opStack.length) {
          const top = opStack[opStack.length - 1];
          if (top.type === 'op' &&
              ((leftAssoc[tok.value] && precedence[tok.value] <= precedence[top.value]) ||
               (!leftAssoc[tok.value] && precedence[tok.value] < precedence[top.value]))) {
            outQueue.push(opStack.pop());
          } else break;
        }
        opStack.push(tok);
      } else if (tok.type === 'paren') {
        if (tok.value === '(') opStack.push(tok);
        else {
          // pop until '('
          let found = false;
          while (opStack.length) {
            const t = opStack.pop();
            if (t.type === 'paren' && t.value === '(') { found = true; break; }
            outQueue.push(t);
          }
          if (!found) return { error: 'Mismatched parentheses' };
        }
      }
    }

    while (opStack.length) {
      const t = opStack.pop();
      if (t.type === 'paren') return { error: 'Mismatched parentheses' };
      outQueue.push(t);
    }

    // Evaluate RPN
    const evalStack = [];
    for (const t of outQueue) {
      if (t.type === 'number') evalStack.push(t.value);
      else if (t.type === 'op') {
        if (evalStack.length < 2) return { error: 'Invalid expression' };
        const b = evalStack.pop();
        const a = evalStack.pop();
        let res;
        switch (t.value) {
          case '+': res = a + b; break;
          case '-': res = a - b; break;
          case '*': res = a * b; break;
          case '/':
            if (b === 0) return { error: 'Division by zero' };
            res = a / b; break;
          case '%':
            if (b === 0) return { error: 'Division by zero' };
            res = a % b; break;
          default: return { error: 'Unknown operator' };
        }
        evalStack.push(res);
      }
    }

    if (evalStack.length !== 1) return { error: 'Invalid expression' };
    let result = evalStack[0];
    // Format result: trim long floats
    if (!Number.isInteger(result)) result = parseFloat(result.toFixed(12));
    return { result };
  } catch (err) {
    return { error: 'Error evaluating' };
  }
}

function evaluateAndShow(){
  if (!expr.trim()) return;
  const original = expr;
  // Normalize visually-friendly div/mul signs if any
  const normalized = expr.replace(/×/g, '*').replace(/÷/g, '/');
  const { result, error } = evaluateExpression(normalized);
  if (error) {
    renderDisplay('Error');
  } else {
    renderDisplay(result);
    pushHistory(original, result);
    history.unshift({ expr: original, res: result });
    expr = String(result); // allow chaining
  }
}

// Initialize
clearAll();
