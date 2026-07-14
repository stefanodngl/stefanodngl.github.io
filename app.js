// CHANGE THESE VALUES
const SHEET_ID="1LIR1_l3FAy_RPFQ5wlnRXkMWkHWgYagk";
const GID="1536666859";
// Google Sheet columns expected: bank, interest_6, interest_12, interest_24, interest_36, interest_48, interest_60, deposit_min, deposit_max, stamp
const SHEET_URL =
`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
let chart;let bankData=[];
function parseCSV(t){const r=t.trim().split("\n");const h=r[0].split(",");return r.slice(1).map(x=>{const v=x.split(",");let o={};h.forEach((a,i)=>o[a.trim()]=(v[i]||"").trim());return o;});}
async function loadData(){try{const r=await fetch(SHEET_URL);bankData=parseCSV(await r.text());populateBanks();updateChart();}catch(e){console.log(e);}}
function populateBanks(){const s=document.getElementById('bankSelector');s.innerHTML='';bankData.forEach(b=>{const o=document.createElement('option');o.value=b.bank;o.textContent=b.bank;s.appendChild(o);});for(let i=0;i<Math.min(5,s.options.length);i++)s.options[i].selected=true;}
function stampRate(v){return String(v).toLowerCase()==='client'?0.002:0;}
function netInterest(amount,rate,months,stamp){const gross=(amount*rate)*(months/12);return gross-(gross*0.26)-(amount*stampRate(stamp));}
function getRate(bank,m){return Number(bank['interest_'+m]||0);}
function calc(bank,amount,m){let r=getRate(bank,m);if(r>0)return netInterest(amount,r,m,bank.stamp);return null;}
function updateChart(){const amount=Number(document.getElementById('amount').value||50000);const selected=[...document.getElementById('bankSelector').selectedOptions].map(o=>o.value);const periods=[...document.querySelectorAll('.period-checkbox:checked')].map(x=>Number(x.value));const datasets=[];selected.slice(0,5).forEach((name,i)=>{const b=bankData.find(x=>x.bank===name);if(!b)return;datasets.push({label:name,data:periods.map(p=>calc(b,amount,p)),backgroundColor:['#8FD694','#7DBA84','#77AD78','#6F8F72','#504B43'][i]});});if(chart)chart.destroy();chart=new Chart(document.getElementById('yieldChart'),{type:'bar',data:{labels:periods.map(p=>p==6?'6 months':(p/12)+' years'),datasets},options:{responsive:true}});}
document.addEventListener('change',updateChart);document.addEventListener('input',updateChart);loadData();