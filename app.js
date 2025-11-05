/* Krathong Online v1.0 - ไว้อาลัย */
const storageKey = 'krathong_kub_state_modern';
let state = JSON.parse(localStorage.getItem(storageKey) || JSON.stringify({totalBurned:0,totalFees:0,totalTx:0,history:[]}));

const parts = document.querySelectorAll('.part');
const canvas = document.getElementById('canvas');
const floatBtn = document.getElementById('floatBtn');
const krathongList = document.getElementById('krathongList');
const totalBurnedEl = document.getElementById('totalBurned');
const totalFeesEl = document.getElementById('totalFees');
const totalTxEl = document.getElementById('totalTx');

const connectBtn = document.getElementById('connectBtn');
const addrEl = document.getElementById('addr');
const balanceEl = document.getElementById('balance');

const amountInput = document.getElementById('amountInput') || document.getElementById('amount');
const wishInput = document.getElementById('wishInput') || document.getElementById('wish');
const pairInput = document.getElementById('pairInput') || document.getElementById('pair');

// Drag & Drop
parts.forEach(p=>{
  p.draggable=true;
  p.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', p.src); });
});
function dragOverHandler(e){ e.preventDefault(); }
function dropHandler(e){
  e.preventDefault();
  const src = e.dataTransfer.getData('text/plain');
  placePart(src,e.offsetX,e.offsetY);
}
function placePart(src,x,y){
  const el=document.createElement('img');
  el.src=src; el.className='placed';
  el.style.left=x+'px'; el.style.top=y+'px';
  el.style.width='80px'; el.style.height='80px';
  el.draggable=true;

  let isDown=false, offset={x:0,y:0};
  el.addEventListener('pointerdown',ev=>{isDown=true; offset.x=ev.offsetX; offset.y=ev.offsetY; el.setPointerCapture(ev.pointerId); });
  el.addEventListener('pointermove',ev=>{ if(!isDown) return; el.style.left=(ev.clientX-offset.x)+'px'; el.style.top=(ev.clientY-offset.y)+'px'; });
  el.addEventListener('pointerup',()=>isDown=false);
  el.addEventListener('dblclick',()=>el.remove());
  canvas.appendChild(el);
}

// MetaMask Connect
let provider, signer;
async function connectWallet(){
  if(!window.ethereum){ alert('ติดตั้ง MetaMask ก่อน'); return; }
  provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  addrEl.innerText = accounts[0];
  const bal = await provider.getBalance(accounts[0]);
  balanceEl.innerText = 'Balance: ' + ethers.formatEther(bal) + ' KUB';
}
connectBtn.addEventListener('click', connectWallet);

// Float Krathong
floatBtn.addEventListener('click', ()=>{
  const partsPlaced = Array.from(canvas.querySelectorAll('.placed')).map(p=>p.src.split('/').pop());
  const amt = parseFloat(amountInput.value) || 0.1;
  const wish = wishInput.value || '';
  const pair = pairInput.value || '';
  const entry = {time:new Date().toISOString(), parts:partsPlaced, amount:amt, wish,pair};
  state.history.unshift(entry);
  state.totalTx = state.history.length;
  state.totalBurned += amt*0.9; // สมมติ 10% เป็น fee
  state.totalFees += amt*0.1;
  localStorage.setItem(storageKey,JSON.stringify(state));
  renderKrathongs();
  canvas.innerHTML='<p class="canvasHint">ลากชิ้นส่วนมาวางที่นี่</p>';
  amountInput.value='0.3275';
  wishInput.value='';
});

// Render Krathongs
function renderKrathongs(){
  krathongList.innerHTML='';
  state.history.forEach(h=>{
    const div=document.createElement('div'); div.className='krathong-item';
    div.innerHTML=`<strong>${h.amount} KUB</strong> - ${h.wish||'(ไม่มีคำอธิษฐาน)'}<br/><small>${new Date(h.time).toLocaleString()}</small>`;
    krathongList.appendChild(div);
  });
  totalBurnedEl.innerText=state.totalBurned.toFixed(4);
  totalFeesEl.innerText=state.totalFees.toFixed(4);
  totalTxEl.innerText=state.totalTx;
}
renderKrathongs();

// Reset Canvas
document.getElementById('resetCanvas').addEventListener('click', ()=>{
  canvas.innerHTML='<p class="canvasHint">ลากชิ้นส่วนมาวางที่นี่</p>';
});
