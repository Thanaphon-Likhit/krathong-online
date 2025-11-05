/* Krathong KUB - frontend logic (static site)
   - ผู้ใช้ต้องมี MetaMask และ RPC ของเครือข่าย KUB (testnet/mainnet)
   - เก็บสรุปยอดใน localStorage สำหรับการทดสอบ
*/

const config = {
  defaultAmount: '0.3275',
  burnAddress: '0x000000000000000000000000000000000000dEaD',
  creatorAddress: '',
  feePercent: 2, // percent
  decimals: 18
};

const storageKey = 'krathong_kub_state_v1';
let state = JSON.parse(localStorage.getItem(storageKey) || JSON.stringify({totalDonated:0,totalBurned:0,totalFees:0,history:[]}));

/* Utils */
const toWei = (amountStr)=>{
  const decimals = config.decimals;
  const [intPart, fracPart=''] = String(amountStr).split('.');
  const frac = (fracPart + '0'.repeat(decimals)).slice(0,decimals);
  const wei = BigInt(intPart || '0') * (10n**BigInt(decimals)) + BigInt(frac || '0');
  return wei.toString();
};
const fromWei = (weiStr)=>{
  const d = config.decimals; const w = BigInt(weiStr);
  const int = w / (10n**BigInt(d));
  const frac = w % (10n**BigInt(d));
  const fracStr = frac.toString().padStart(d,'0').replace(/0+$/,'');
  return fracStr ? `${int.toString()}.${fracStr}` : int.toString();
};

/* DOM */
const connectBtn = document.getElementById('connectBtn');
const networkSelect = document.getElementById('networkSelect');
const amountInput = document.getElementById('amountInput');
const wishInput = document.getElementById('wishInput');
const pairInput = document.getElementById('pairInput');
const creatorAddressInput = document.getElementById('creatorAddress');
const feePercentInput = document.getElementById('feePercent');
const previewBtn = document.getElementById('previewBtn');
const burnBtn = document.getElementById('burnBtn');
const txStatus = document.getElementById('txStatus');
const totalDonatedEl = document.getElementById('totalDonated');
const totalBurnedEl = document.getElementById('totalBurned');
const totalFeesEl = document.getElementById('totalFees');
const historyEl = document.getElementById('history');

const parts = document.querySelectorAll('.part');
parts.forEach(p=>{p.draggable=true; p.addEventListener('dragstart',(e)=>{e.dataTransfer.setData('text/plain',p.dataset.part)})});

function dragOverHandler(e){e.preventDefault()}
function dropHandler(e){e.preventDefault(); const part = e.dataTransfer.getData('text/plain'); placePart(part,e.clientX,e.clientY)}

function placePart(part,x,y){
  const canvas = document.getElementById('canvas');
  const rect = canvas.getBoundingClientRect();
  const el = document.createElement('div');
  el.className='placed';
  el.textContent = part;
  el.style.left = (x-rect.left-40) + 'px';
  el.style.top = (y-rect.top-20) + 'px';
  el.draggable = true;

  // move by pointer
  let isDown=false, offset={x:0,y:0};
  el.addEventListener('pointerdown',(ev)=>{isDown=true; offset.x = ev.offsetX; offset.y = ev.offsetY; el.setPointerCapture(ev.pointerId)});
  el.addEventListener('pointermove',(ev)=>{if(!isDown) return; const r = canvas.getBoundingClientRect(); el.style.left = (ev.clientX - r.left - offset.x) + 'px'; el.style.top = (ev.clientY - r.top - offset.y) + 'px'});
  el.addEventListener('pointerup',(ev)=>{isDown=false});
  el.addEventListener('dblclick', ()=> el.remove());
  canvas.appendChild(el);
}

/* preview */
previewBtn.addEventListener('click',()=>{
  const canvas = document.getElementById('canvas');
  const parts = Array.from(canvas.querySelectorAll('.placed')).map(p=>p.textContent);
  alert('กระทงประกอบด้วย: ' + (parts.length?parts.join(', '):'(ว่าง)') + '\nคำอธิษฐาน: '+ wishInput.value + '\nจำนวน: '+ amountInput.value + ' KUB');
});

/* connect */
async function connect(){
  if(!window.ethereum){txStatus.textContent='MetaMask ไม่ถูกติดตั้ง';return}
  try{
    const accounts = await ethereum.request({method:'eth_requestAccounts'});
    txStatus.textContent = 'เชื่อมต่อ: '+ accounts[0];
  }catch(e){
    txStatus.textContent = 'ยกเลิกการเชื่อมต่อ';
  }
}
connectBtn.addEventListener('click',connect);

/* network select helper */
networkSelect.addEventListener('change', async (e)=>{
  const sel = e.target.value;
  if(sel === 'testnet'){
    alert('กรุณาใส่ RPC ของ KUB testnet ใน MetaMask โดยใช้เมนู Add Custom RPC หรือใส่ในการตั้งค่าในหน้าเว็บ (ฟีเจอร์ยังเป็นตัวอย่าง)');
  }else if(sel === 'mainnet'){
    alert('เตือน: เปลี่ยนเป็น mainnet จะต้องแน่ใจว่า RPC ถูกต้องและเป็นเครือข่ายจริง');
  }
});

/* burn flow: send fee to creator, then remaining to burn address
   fee calculation uses basis points to allow decimals (feePercent may be decimal).
*/
async function burnFlow(){
  if(!window.ethereum){txStatus.textContent='ต้องมี MetaMask ก่อน';return}
  const accounts = await ethereum.request({method:'eth_requestAccounts'});
  const from = accounts[0];
  const amount = amountInput.value || config.defaultAmount;
  const feePercent = Number(feePercentInput.value || config.feePercent);
  const creatorAddr = creatorAddressInput.value || config.creatorAddress;
  if(!creatorAddr){alert('กรุณาใส่ Creator Address เพื่อรับค่าธรรมเนียม'); return}

  // compute wei amounts
  const amountWei = BigInt(toWei(amount));

  // feePercent may be decimal; convert to basis points (1% = 100 bps)
  const feeBps = BigInt(Math.round(feePercent * 100)); // e.g., 2% -> 200 bps
  const feeWei = (amountWei * feeBps) / 10000n; // because bps/10000 = percent/100
  const burnWei = amountWei - feeWei;

  txStatus.textContent = 'เริ่มกระบวนการ... MetaMask จะเปิดหน้าต่างสำหรับการชำระ';

  try{
    // 1) ส่งค่าธรรมเนียมไป Creator (ถ้า feeWei > 0)
    if(feeWei > 0n){
      const tx1 = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: creatorAddr,
          value: '0x' + feeWei.toString(16)
        }]
      });
      txStatus.textContent = 'ส่งค่าธรรมเนียมแล้ว (tx: '+tx1+')';
    } else {
      txStatus.textContent = 'ไม่มีค่าธรรมเนียม (0)';
    }

    // 2) ส่งส่วนที่เหลือไปยัง burn address
    if(burnWei > 0n){
      const tx2 = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: config.burnAddress,
          value: '0x' + burnWei.toString(16)
        }]
      });
      txStatus.textContent = 'ส่งไปเผาเรียบร้อย (tx: '+tx2+')';
    } else {
      txStatus.textContent = 'ไม่มียอดที่ต้องเผา (0)';
    }

    // Update local state (numbers shown as decimals)
    const amtNum = Number(amount);
    const feeNum = Number(fromWei(feeWei.toString()));
    const burnNum = Number(fromWei(burnWei.toString()));

    state.totalDonated = +(state.totalDonated + amtNum);
    state.totalFees = +(state.totalFees + feeNum);
    state.totalBurned = +(state.totalBurned + burnNum);

    const entry = {time: new Date().toISOString(), from, amount:amtNum, fee:feeNum, burnt:burnNum, wish: wishInput.value, pair: pairInput.value};
    state.history.unshift(entry);
    localStorage.setItem(storageKey, JSON.stringify(state));
    renderState();

  }catch(err){
    console.error(err);
    txStatus.textContent = 'เกิดข้อผิดพลาด: ' + (err.message || err);
  }
}

burnBtn.addEventListener('click',burnFlow);

function renderState(){
  totalDonatedEl.textContent = Number(state.totalDonated).toFixed(6);
  totalBurnedEl.textContent = Number(state.totalBurned).toFixed(6);
  totalFeesEl.textContent = Number(state.totalFees).toFixed(6);
  historyEl.innerHTML = '';
  for(const h of state.history){
    const d = document.createElement('div'); d.className='item';
    d.innerHTML = `<strong>${h.amount} KUB</strong> — ${h.wish||'(ไม่มีคำอธิษฐาน)'}<br/><small>${new Date(h.time).toLocaleString()}</small>`;
    historyEl.appendChild(d);
  }
}

/* Init */
amountInput.value = config.defaultAmount;
renderState();

document.getElementById('resetCanvas').addEventListener('click', ()=>{document.getElementById('canvas').innerHTML='<p class="canvasHint">ลากชิ้นส่วนมาวางที่นี่เพื่อประกอบกระทง</p>'});
creatorAddressInput.addEventListener('change', ()=>{config.creatorAddress = creatorAddressInput.value});
feePercentInput.addEventListener('change', ()=>{config.feePercent = Number(feePercentInput.value)});
