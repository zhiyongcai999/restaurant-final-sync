const SUPABASE_URL = 'const SUPABASE_URL = 'https://uqijorymsxivkdhmnyf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LSK_ODw36B9f8LN27-kUNw_LKYfytfm‘;

const cloud = (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_KEY && !SUPABASE_KEY.includes('PASTE_'))
  ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const today = new Date().toISOString().slice(0,10);
['viewDate','incomeDate','expenseDate','wageDate','filterStart','filterEnd'].forEach(id=>document.getElementById(id).value=today);
document.getElementById('yearInput').value = new Date().getFullYear();

let incomes = {};
let expenses = [];
let wages = [];

const cats = {
  '采购':['肉类','蔬菜','海鲜','米面粮油','调料','饮料','酒水','包装用品','清洁用品','中央厨房','其他采购'],
  '租金/固定':['房租','水费','电费','煤气','保险','会计','网络电话','其他固定'],
  '维修':['冰箱维修','油烟机维修','POS维修','厨房设备','水电维修','机器保养','其他维修'],
  '平台费用':['Uber佣金','DoorDash佣金','熊猫佣金','平台广告','退款/优惠','其他平台'],
  '工资外支出':['临时工','员工餐','员工补贴','培训','其他'],
  '其他':['交通','杂费','设备购买','清洁','证照费用','其他']
};

function setExpenseOptions(){ expenseCategory.innerHTML = cats[expenseType.value].map(x=>`<option>${x}</option>`).join(''); expenseName.value = expenseCategory.value; }
expenseCategory.addEventListener('change',()=>expenseName.value=expenseCategory.value);
setExpenseOptions();

function go(id, el){ document.querySelectorAll('.page').forEach(p=>p.classList.remove('active')); document.getElementById(id).classList.add('active'); document.querySelectorAll('.nav').forEach(n=>n.classList.remove('active')); el.classList.add('active'); renderAll(); }
function money(n){ return '$' + (Number(n)||0).toFixed(2); }
function pct(n){ return ((Number(n)||0)*100).toFixed(1) + '%'; }
function parseDate(s){ const p=s.split('-').map(Number); return new Date(p[0],p[1]-1,p[2]); }
function dateStr(d){ return d.toISOString().slice(0,10); }
function incomeTotal(x){ return (x.cash||0)+(x.card||0)+(x.scan_pay||0)+(x.uber||0)+(x.doordash||0)+(x.panda||0); }
function startOfWeek(d){ const x=new Date(d); const day=x.getDay(); const diff=(day===0?-6:1-day); x.setDate(x.getDate()+diff); return x; }
function endOfWeek(d){ const s=startOfWeek(d); const e=new Date(s); e.setDate(s.getDate()+6); return e; }
function inRange(date,s,e){ return date>=dateStr(s)&&date<=dateStr(e); }
function sameMonth(date,dt){ const d=parseDate(date); return d.getFullYear()===dt.getFullYear() && d.getMonth()===dt.getMonth(); }

function saveLocal(){ localStorage.setItem('pro_incomes', JSON.stringify(incomes)); localStorage.setItem('pro_expenses', JSON.stringify(expenses)); localStorage.setItem('pro_wages', JSON.stringify(wages)); }
function loadLocal(){ incomes = JSON.parse(localStorage.getItem('pro_incomes') || '{}'); expenses = JSON.parse(localStorage.getItem('pro_expenses') || '[]'); wages = JSON.parse(localStorage.getItem('pro_wages') || '[]'); }

async function loadCloud(){
  if(!cloud){ loadLocal(); renderAll(); return; }
  const { data, error } = await cloud.from('restaurant_data').select('*').eq('id','main').maybeSingle();
  if(error){ console.log(error); loadLocal(); renderAll(); return; }
  if(data){ incomes = data.incomes || {}; expenses = data.expenses || []; wages = data.wages || []; saveLocal(); } else { loadLocal(); }
  renderAll();
}

async function saveCloud(){
  saveLocal();
  if(!cloud) return;
  const payload = { id:'main', incomes, expenses, wages, updated_at:new Date().toISOString() };
  const { error } = await cloud.from('restaurant_data').upsert(payload);
  if(error){ console.log(error); alert('云端保存失败：请检查 Supabase key / restaurant_data 表 / RLS 权限'); }
}

async function saveIncome(){
  const d = incomeDate.value;
  incomes[d] = { date:d, cash:+cash.value||0, card:+card.value||0, scan_pay:+scanPay.value||0, uber:+uber.value||0, doordash:+doordash.value||0, panda:+panda.value||0, dinein_orders:+dineinOrders.value||0, delivery_orders:+deliveryOrders.value||0, note:incomeNote.value||'', updated_at:new Date().toISOString() };
  await saveCloud();
  ['cash','card','scanPay','uber','doordash','panda','dineinOrders','deliveryOrders','incomeNote'].forEach(id=>document.getElementById(id).value='');
  renderAll(); alert('收入已保存');
}

async function saveExpense(){
  expenses.push({ id: Date.now() + '_' + Math.random().toString(16).slice(2), date:expenseDate.value, type:expenseType.value, category:expenseCategory.value, name:expenseName.value || expenseCategory.value, supplier:expenseSupplier.value || '', amount:+expenseAmount.value||0, pay_method:expensePay.value, is_fixed:isFixed.value==='是', is_daily_split:isDailySplit.value==='是', note:expenseNote.value||'', created_at:new Date().toISOString() });
  await saveCloud();
  ['expenseName','expenseSupplier','expenseAmount','expenseNote'].forEach(id=>document.getElementById(id).value='');
  renderAll(); alert('支出已保存');
}

function calcWage(){ wageAmount.value = ((+hours.value||0)*(+rate.value||0)).toFixed(2); }

async function saveWage(){
  wages.push({ id: Date.now() + '_' + Math.random().toString(16).slice(2), date:wageDate.value, employee:employee.value || '', role:role.value, hours:+hours.value||0, rate:+rate.value||0, amount:+wageAmount.value||0, pay_method:wagePay.value, note:wageNote.value||'', created_at:new Date().toISOString() });
  await saveCloud();
  ['employee','hours','rate','wageAmount','wageNote'].forEach(id=>document.getElementById(id).value='');
  renderAll(); alert('工资已保存');
}

function calcPeriod(filterFn){
  let revenue=0,cashVal=0,cardVal=0,scanVal=0,uberVal=0,doorVal=0,pandaVal=0,orders=0,purchase=0,wage=0,fixed=0,repair=0,platform=0,other=0,cashPaid=0,lossDays=0,days=0;
  Object.keys(incomes).forEach(d=>{ if(filterFn(d)){ const x=incomes[d]; const r=incomeTotal(x); revenue+=r; cashVal+=x.cash||0; cardVal+=x.card||0; scanVal+=x.scan_pay||0; uberVal+=x.uber||0; doorVal+=x.doordash||0; pandaVal+=x.panda||0; orders+=(x.dinein_orders||0)+(x.delivery_orders||0); if(r>0)days++; }});
  expenses.forEach(x=>{ if(filterFn(x.date)){ if(x.type==='采购')purchase+=x.amount; else if(x.type==='租金/固定')fixed+=x.amount; else if(x.type==='维修')repair+=x.amount; else if(x.type==='平台费用')platform+=x.amount; else other+=x.amount; if(x.pay_method==='现金')cashPaid+=x.amount; }});
  wages.forEach(x=>{ if(filterFn(x.date)){ wage+=x.amount; if(x.pay_method==='现金')cashPaid+=x.amount; }});
  Object.keys(incomes).forEach(d=>{ if(filterFn(d)){ const r=incomeTotal(incomes[d]); const e=expenses.filter(v=>v.date===d).reduce((s,v)=>s+v.amount,0); const w=wages.filter(v=>v.date===d).reduce((s,v)=>s+v.amount,0); if(r-(e+w)<0)lossDays++; }});
  const expense=purchase+wage+fixed+repair+platform+other;
  return {revenue,cashVal,cardVal,scanVal,uberVal,doorVal,pandaVal,orders,purchase,wage,fixed,repair,platform,other,expense,profit:revenue-expense,cashPaid,cashNet:cashVal-cashPaid,lossDays,days};
}

function renderAll(){
  const d=viewDate.value || today; const dt=parseDate(d); const ws=startOfWeek(dt), we=endOfWeek(dt);
  const day=calcPeriod(x=>x===d), week=calcPeriod(x=>inRange(x,ws,we)), month=calcPeriod(x=>sameMonth(x,dt));
  dayRevenue.textContent=money(day.revenue); dayProfit.textContent=money(day.profit); dayExpense.textContent=money(day.expense); dayProfitBox.className='stat '+(day.profit>=0?'good':'bad'); cashNet.textContent=money(day.cashNet); dayOrders.textContent=day.orders; avgOrder.textContent=money(day.orders?day.revenue/day.orders:0);
  dayCash.textContent=money(day.cashVal); dayCard.textContent=money(day.cardVal); dayScan.textContent=money(day.scanVal); dayUber.textContent=money(day.uberVal); dayDoorDash.textContent=money(day.doorVal); dayPanda.textContent=money(day.pandaVal);
  weekRevenue.textContent=money(week.revenue); weekProfit.textContent=money(week.profit); weekProfitBox.className='stat '+(week.profit>=0?'good':'bad'); weekPurchase.textContent=money(week.purchase); weekWage.textContent=money(week.wage); weekFixed.textContent=money(week.fixed); weekOther.textContent=money(week.repair+week.platform+week.other); weekJudgement.textContent=week.revenue===0?'暂无周数据。':(week.profit>=0?'✅ 本周盈利。':'❌ 本周亏损，需要检查采购、工资和租金/固定支出。');
  monthRevenue.textContent=money(month.revenue); monthProfit.textContent=money(month.profit); monthProfitBox.className='stat '+(month.profit>=0?'good':'bad'); monthPurchase.textContent=money(month.purchase); monthWage.textContent=money(month.wage); monthFixed.textContent=money(month.fixed); lossDays.textContent=month.lossDays; const pr=month.revenue?month.purchase/month.revenue:0, wr=month.revenue?month.wage/month.revenue:0; monthJudgement.textContent=month.revenue===0?'暂无月数据。':(month.profit>=0?`✅ 本月盈利。采购占比 ${pct(pr)}，工资占比 ${pct(wr)}。`:`❌ 本月亏损。采购占比 ${pct(pr)}，工资占比 ${pct(wr)}。`);
  renderHistory(); renderYearlyWeeks();
}

function renderHistory(){
  const s=filterStart.value||'1900-01-01', e=filterEnd.value||'2999-12-31';
  incomeTable.innerHTML=Object.keys(incomes).sort().filter(d=>d>=s&&d<=e).map(d=>{ const x=incomes[d], delivery=(x.uber||0)+(x.doordash||0)+(x.panda||0), orders=(x.dinein_orders||0)+(x.delivery_orders||0); return `<tr><td>${d}</td><td>${money(x.cash)}</td><td>${money(x.card)}</td><td>${money(x.scan_pay)}</td><td>${money(delivery)}</td><td>${orders}</td><td>${money(incomeTotal(x))}</td></tr>`; }).join('');
  expenseTable.innerHTML=expenses.filter(x=>x.date>=s&&x.date<=e).sort((a,b)=>a.date.localeCompare(b.date)).map(x=>`<tr><td>${x.date}</td><td>${x.type}</td><td>${x.name||x.category}</td><td>${x.supplier||''}</td><td>${money(x.amount)}</td><td>${x.pay_method||''}</td><td>${x.note||''}</td></tr>`).join('');
  wageTable.innerHTML=wages.filter(x=>x.date>=s&&x.date<=e).sort((a,b)=>a.date.localeCompare(b.date)).map(x=>`<tr><td>${x.date}</td><td>${x.employee}</td><td>${x.role||''}</td><td>${x.hours}</td><td>${money(x.rate)}</td><td>${money(x.amount)}</td><td>${x.pay_method||''}</td></tr>`).join('');
}

function renderYearlyWeeks(){
  const year=+yearInput.value||new Date().getFullYear(); let firstMonday=startOfWeek(new Date(year,0,1)); let rows='', yearProfitTotal=0, lossWeekCount=0;
  for(let i=0;i<54;i++){ const s=new Date(firstMonday); s.setDate(firstMonday.getDate()+i*7); const e=new Date(s); e.setDate(s.getDate()+6); if(s.getFullYear()>year&&i>0)break; if(e.getFullYear()<year)continue; const data=calcPeriod(x=>inRange(x,s,e)); const hasData=data.revenue>0||data.expense>0; const cls=hasData?(data.profit>=0?'week-good':'week-bad'):'week-empty'; const status=hasData?(data.profit>=0?'盈利':'亏损'):'无数据'; if(hasData){ yearProfitTotal+=data.profit; if(data.profit<0)lossWeekCount++; } rows+=`<tr class="${cls}"><td>第${i+1}周</td><td>${dateStr(s)} 至 ${dateStr(e)}</td><td>${money(data.revenue)}</td><td>${money(data.expense)}</td><td class="${data.profit>=0?'profit-plus':'profit-minus'}">${money(data.profit)}</td><td>${status}</td></tr>`; }
  yearWeekTable.innerHTML=rows; yearProfit.textContent=money(yearProfitTotal); lossWeeks.textContent=lossWeekCount;
}

loadCloud();
