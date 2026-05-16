// cloud-debug-2
const SUPABASE_URL = 'https://uqijorymsxivkdhmnyf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LSK_ODw36B9f8LN27-kUNw_LKYfytfm';
const TABLE = 'restaurant_data';
const ROW_ID = 'main';

let incomes = {};
let expenses = [];
let wages = [];
const today = new Date().toISOString().slice(0,10);

function $(id){return document.getElementById(id)}
function money(n){return '$'+(Number(n)||0).toFixed(2)}
function headers(){return {apikey:SUPABASE_KEY, Authorization:'Bearer '+SUPABASE_KEY, 'Content-Type':'application/json', Prefer:'return=representation'}}
function api(q=''){return `${SUPABASE_URL}/rest/v1/${TABLE}${q}`}

function status(cls,msg){$('cloudStatus').className='status '+cls;$('cloudStatus').textContent=msg}

async function loadCloud(manual=false){
  try{
    const r = await fetch(api(`?id=eq.${ROW_ID}&select=*`), {headers:headers()});
    const t = await r.text();
    if(!r.ok) throw new Error(t);
    const rows = JSON.parse(t);
    if(rows.length){
      incomes = rows[0].incomes || {};
      expenses = rows[0].expenses || [];
      wages = rows[0].wages || [];
    }else{
      await saveCloud();
    }
    status('ok', '云端连接成功。最后刷新：' + new Date().toLocaleTimeString());
    renderAll();
    if(manual) alert('已从云端刷新');
  }catch(e){
    status('err', '云端读取失败：\n' + e.message);
    alert('云端读取失败：\n' + e.message);
  }
}

async function saveCloud(){
  const body = JSON.stringify({id:ROW_ID, incomes, expenses, wages, updated_at:new Date().toISOString()});
  const r = await fetch(api(), {method:'POST', headers:{...headers(), Prefer:'resolution=merge-duplicates,return=representation'}, body});
  const t = await r.text();
  if(!r.ok) throw new Error(t);
  status('ok', '已保存到云端：' + new Date().toLocaleTimeString());
}

function initDates(){
  ['viewDate','incomeDate','expenseDate','wageDate'].forEach(id=>{if($(id)) $(id).value=today});
}
function go(id,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  $(id).classList.add('active');
  document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active'));
  el.classList.add('active');
  renderAll();
}
function totalIncome(x){return (x.cash||0)+(x.card||0)+(x.scan_pay||0)+(x.uber||0)+(x.doordash||0)+(x.panda||0)}
function calcDay(d){
  const inc = incomes[d] || {};
  const revenue = totalIncome(inc);
  const exp = expenses.filter(x=>x.date===d).reduce((s,x)=>s+(+x.amount||0),0);
  const wage = wages.filter(x=>x.date===d).reduce((s,x)=>s+(+x.amount||0),0);
  return {inc,revenue,expense:exp+wage,profit:revenue-exp-wage,orders:(inc.dinein_orders||0)+(inc.delivery_orders||0)}
}
function renderAll(){
  const d = $('viewDate')?.value || today;
  const day = calcDay(d);
  $('dayRevenue').textContent=money(day.revenue);
  $('dayExpense').textContent=money(day.expense);
  $('dayProfit').textContent=money(day.profit);
  $('dayProfitBox').className='stat '+(day.profit>=0?'good':'bad');
  $('cashNet').textContent=money((day.inc.cash||0)-day.expense);
  $('dayOrders').textContent=day.orders;
  $('avgOrder').textContent=money(day.orders?day.revenue/day.orders:0);
  $('dayCash').textContent=money(day.inc.cash);
  $('dayCard').textContent=money(day.inc.card);
  $('dayScan').textContent=money(day.inc.scan_pay);
  $('dayUber').textContent=money(day.inc.uber);
  $('dayDoorDash').textContent=money(day.inc.doordash);
  $('dayPanda').textContent=money(day.inc.panda);
  renderHistory();
}
async function saveIncome(){
  const d=$('incomeDate').value;
  incomes[d]={date:d,cash:+$('cash').value||0,card:+$('card').value||0,scan_pay:+$('scanPay').value||0,uber:+$('uber').value||0,doordash:+$('doordash').value||0,panda:+$('panda').value||0,dinein_orders:+$('dineinOrders').value||0,delivery_orders:+$('deliveryOrders').value||0,note:$('incomeNote').value||''};
  try{await saveCloud();renderAll();alert('收入已保存到云端')}catch(e){alert('保存失败：\n'+e.message)}
}
async function saveExpense(){
  expenses.push({id:Date.now(),date:$('expenseDate').value,type:$('expenseType').value,name:$('expenseName').value,amount:+$('expenseAmount').value||0,pay_method:$('expensePay').value,note:$('expenseNote').value||''});
  try{await saveCloud();renderAll();alert('支出已保存到云端')}catch(e){alert('保存失败：\n'+e.message)}
}
async function saveWage(){
  wages.push({id:Date.now(),date:$('wageDate').value,employee:$('employee').value,role:$('role').value,amount:+$('wageAmount').value||0,hours:+$('hours').value||0,rate:+$('rate').value||0});
  try{await saveCloud();renderAll();alert('工资已保存到云端')}catch(e){alert('保存失败：\n'+e.message)}
}
function renderHistory(){
  $('incomeTable').innerHTML = Object.keys(incomes).sort().map(d=>{const x=incomes[d];return `<tr><td>${d}</td><td>${money(x.cash)}</td><td>${money(x.card)}</td><td>${money(x.scan_pay)}</td><td>${money(totalIncome(x))}</td></tr>`}).join('');
  $('expenseTable').innerHTML = expenses.map(x=>`<tr><td>${x.date}</td><td>${x.type}</td><td>${x.name}</td><td>${money(x.amount)}</td></tr>`).join('');
  $('wageTable').innerHTML = wages.map(x=>`<tr><td>${x.date}</td><td>${x.employee}</td><td>${money(x.amount)}</td></tr>`).join('');
}
initDates();
loadCloud();
