const storageKey='krathong_kub_state';
let state=JSON.parse(localStorage.getItem(storageKey)||JSON.stringify({totalBurned:0,totalFees:0,totalTx:0,history:[]}));

const parts=document.querySelectorAll('.part');
const canvas=document.getElementById('canvas');
const floatBtn=document.getElementById('floatBtn');
const krathongList=document.getElementById('krathongList');
const totalBurnedEl=document.getElementById('totalBurned');
const totalFeesEl=document.getElementById('totalFees');
const totalTxEl=document.getElementById('totalTx');

const connectBtn=document.getElementById('connectBtn');
const addrEl=document.getElementById('addr');
const balanceEl=document.getElementById('balance');

const amountInput=document.getElementById('amountInput')||document.getElementById('amount');
const wishInput=document.getElementById('wishInput')||document.getElementById('wish');
const pairInput=document.getElementById('pairInput')||document.getElementById('pair');

const networkSelect=document.getElementById('networkSelect');

let provider, signer;

// Drag & Drop
parts.forEach(p=>{p.draggable=true;p.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',p.src));});
function dragOverHandler(e){e.preventDefault();}
function dropHandler(e){e.preventDefault();placePart(e.dataTransfer.getData('text/plain'),e.offsetX,e.offsetY);}
function placePart(src,x,y){
  const el=document.createElement('img');
  el.src=src; el.className='placed';
  el.style.left=x+'px'; el.style.top=y+'px';
  el.style.width='60px'; el.style.height='60px';
  el.draggable=true;
  let isDown=false,offset={x:0,y:0};
  el.addEventListener('pointerdown',ev=>{isDown=true;offset.x=ev.offsetX;offset.y=ev.offsetY;el.setPointerCapture(ev.pointerId);});
  el.addEventListener('pointermove',ev=>{if(!isDown)return;el.style.left=(ev.clientX-offset.x)+'px';el.style.top=(ev.clientY-offset.y)+'px';});
  el.addEventListener('pointerup',()=>isDown=false);
  el.addEventListener('dblclick',()=>el.remove());
  canvas.appendChild(el);
}

// Connect MetaMask
async function connectWallet(){
  if(!window.ethereum){ alert('ติดตั้ง MetaMask ก่อน'); return; }
  provider=new ethers.BrowserProvider(window.ethereum);
  const accounts=await provider.send("eth_requestAccounts",[]);
  signer=await provider.getSigner();
  addrEl.innerText=accounts[0];
  const bal=await provider.getBalance(accounts[0]);
  balanceEl.innerText='Balance: '+ethers.formatEther(bal)+' KUB';
}
connectBtn.addEventListener('click',connectWallet);

// Float Krathong (simulate burn & fee)
floatBtn.addEventListener('click',()=>{
 
