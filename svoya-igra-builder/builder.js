"use strict";
(function(){
const $=id=>document.getElementById(id);
const STORE="svoya-builder-project-v2";
// Compact workflow
const initial=()=>({title:"Своя игра — Экономика",topicsCount:5,questionsCount:25,teamsCount:3,password:"20062611",subject:"",source:"",difficulty:"постепенно усложняющиеся",apiUrl:"https://svoya-game-ai-builder.masterofluck112-apps.workers.dev",categories:Array.from({length:5},(_,i)=>({name:"Тема "+(i+1),qs:Array.from({length:5},()=>["",""])}))});
let state=initial();
try{let loaded=JSON.parse(localStorage.getItem(STORE)||"null");if(loaded&&typeof loaded==="object"&&Array.isArray(loaded.categories))state=Object.assign(initial(),loaded);if(state.password==="2611")state.password="20062611"}catch(e){}
let generating=false;
const values=["title","password","topicsCount","questionsCount","teamsCount","subject","source","difficulty","apiUrl"];
function cap(x,min,max){return Math.min(max,Math.max(min,Number(x)||min))}
function save(){localStorage.setItem(STORE,JSON.stringify(state))}
function pair(x){return Array.isArray(x)?[String(x[0]||""),String(x[1]||"")]:["",""]}
function normalize(){
state.topicsCount=cap(state.topicsCount,1,12);
state.questionsCount=cap(state.questionsCount,1,120);
state.teamsCount=cap(state.teamsCount,1,10);
if(!Array.isArray(state.categories))state.categories=[];
while(state.categories.length<state.topicsCount)state.categories.push({name:"Тема "+(state.categories.length+1),qs:[]});
state.categories=state.categories.slice(0,state.topicsCount);
let levels=Math.ceil(state.questionsCount/state.topicsCount);
state.categories.forEach((cat,i)=>{
if(typeof cat.name!=="string")cat.name="Тема "+(i+1);
if(!Array.isArray(cat.qs))cat.qs=[];
while(cat.qs.length<levels)cat.qs.push(["",""]);
cat.qs=cat.qs.slice(0,levels).map(pair);
});
}
function valid(){return state.questionsCount%state.topicsCount===0&&state.questionsCount/state.topicsCount<=20}
function notice(id,text,type){const x=$(id);x.textContent=text;x.className="status "+({err:"error",ok:"success",note:"info"}[type]||"info")}
function distribution(){
const d=$("distribution"),s=$("suggestion"),n=state.topicsCount,q=state.questionsCount; s.replaceChildren();
if(valid()){d.className="distribution";d.textContent=n+" тем × "+(q/n)+" вопросов = "+q+" всего. Баллы: 100, 200, …, "+(q/n*100)+". Команд: "+state.teamsCount+".";return}
d.className="distribution warn";d.textContent="⚠ "+q+" вопросов нельзя поровну разделить на "+n+" тем. Выбери подходящее количество:";
const down=Math.floor(q/n)*n,up=Math.ceil(q/n)*n;
Array.from(new Set([down,up])).filter(v=>v>=n&&v<=120&&v/n<=20).forEach(v=>{const btn=document.createElement("button");btn.textContent=v+" всего ("+(v/n)+" в теме)";btn.type="button";btn.onclick=()=>{state.questionsCount=v;normalize();$("questionsCount").value=v;save();refresh()};s.append(btn)});
}
function renderTopics(){
const host=$("topicList");host.replaceChildren();$("topicsHint").textContent=state.topicsCount+" шт.";
state.categories.forEach((cat,i)=>{
const item=document.createElement("div");item.className="topic";
const n=document.createElement("span");n.className="num";n.textContent=i+1;
const inp=document.createElement("input");inp.className="control";inp.value=cat.name;inp.maxLength=100;inp.placeholder="Название темы "+(i+1);inp.setAttribute("aria-label","Название темы "+(i+1));
inp.addEventListener("input",()=>{cat.name=inp.value;save();const h=document.getElementById("heading-"+i);if(h)h.textContent=cat.name||"Тема "+(i+1)});
const small=document.createElement("small");small.className="info";small.textContent="Вопросов: "+cat.qs.length;
item.append(n,inp);host.append(item);
});
}
function textarea(label,value,onchange,cls){
const lab=document.createElement("label");lab.textContent=label;
const t=document.createElement("textarea");t.value=value;t.className="control";t.rows=cls?2:3;t.addEventListener("input",()=>onchange(t.value));
return [lab,t];
}
function renderEditor(){
const host=$("editor");const opened=new Set([...host.querySelectorAll("details[open]")].map(d=>d.dataset.index));host.replaceChildren();
if(!valid()){host.textContent="Сначала выбери количество вопросов, которое делится на число тем.";return}
state.categories.forEach((cat,i)=>{
const panel=document.createElement("details");panel.className="q-group";panel.dataset.index=String(i);panel.open=opened.has(String(i));const head=document.createElement("summary");
const h=document.createElement("h3");h.id="heading-"+i;h.className="qname";h.textContent=cat.name||"Тема "+(i+1);
const meta=document.createElement("span");meta.className="qcount";meta.textContent=cat.qs.filter(q=>q[0].trim()&&q[1].trim()).length+" / "+cat.qs.length;head.append(h,meta);panel.append(head);
const grid=document.createElement("div");grid.className="q-body";
cat.qs.forEach((pair,j)=>{
const card=document.createElement("div");card.className="q-card";
const top=document.createElement("div");top.className="q-head";
const num=document.createElement("span");num.textContent="ВОПРОС "+(j+1);
const pts=document.createElement("span");pts.textContent=(j+1)*100+" баллов";top.append(num,pts);card.append(top);
for(const [label,value,k,cl] of [["Текст вопроса",pair[0],0,""],["Правильный ответ",pair[1],1,"answer-input"]]){
const parts=textarea(label,value,v=>{cat.qs[j][k]=v;save();updateReview();meta.textContent=cat.qs.filter(q=>q[0].trim()&&q[1].trim()).length+" / "+cat.qs.length},cl);card.append(...parts)
}
grid.append(card);
});
panel.append(grid);host.append(panel);
});
updateReview();
}
function refresh(){normalize();distribution();renderTopics();renderEditor();save()}
values.forEach(id=>{
const el=$(id);if(el){el.value=state[id];if(id==="password")return;el.addEventListener("change",()=>{state[id]=el.type==="number"?Number(el.value):el.value;refresh()});if(el.type!=="number")el.addEventListener("input",()=>{state[id]=el.value;save()})}
});
refresh();

const LAYOUT_KEY="svoya-builder-layout";
function setLayout(mode){
if(!["auto","phone","laptop"].includes(mode))mode="auto";
document.documentElement.dataset.layout=mode;
document.querySelectorAll("[data-layout]").forEach(btn=>btn.classList.toggle("active",btn.dataset.layout===mode));
try{localStorage.setItem(LAYOUT_KEY,mode)}catch(e){}
}
document.querySelectorAll("[data-layout]").forEach(btn=>btn.onclick=()=>setLayout(btn.dataset.layout));
setLayout(localStorage.getItem(LAYOUT_KEY)||"auto");

let cloudUnlocked=false,cloudBusy=false;
function openCloud(){
cloudUnlocked=false;
$("cloudModal").hidden=false;
$("cloudPassword").value="";
$("newGamePassword").value="";
$("cloudError").textContent="";
$("cloudAuthStage").hidden=false;
$("cloudNewStage").hidden=true;
$("cloudSubmit").textContent="Подтвердить";
$("cloudDescription").textContent="Введи облачный пароль, чтобы изменить пароль ответов.";
$("cloudPassword").focus();
}
function closeCloud(){
if(cloudBusy)return;
$("cloudModal").hidden=true;
cloudUnlocked=false;
$("cloudPassword").value="";
$("newGamePassword").value="";
}
$("changePassword").onclick=openCloud;
$("cloudClose").onclick=closeCloud;
$("cloudModal").addEventListener("click",e=>{if(e.target===$("cloudModal"))closeCloud()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("cloudModal").hidden)closeCloud()});
$("cloudForm").onsubmit=async e=>{
e.preventDefault();
if(cloudBusy)return;
$("cloudError").textContent="";
if(cloudUnlocked){
const next=$("newGamePassword").value.trim();
if(!next||next.length>40){$("cloudError").textContent="Пароль должен содержать от 1 до 40 символов.";return}
state.password=next;
$("password").value=next;
save();
closeCloud();
notice("status","Пароль для ответов изменён. Он будет включён в новые файлы index.html.","ok");
return;
}
const password=$("cloudPassword").value;
if(!password){$("cloudError").textContent="Введи облачный пароль.";return}
let base=String(state.apiUrl||"").trim().replace(/\/+$/,"");
if(!base)base=location.origin;
const url=base.endsWith("/api/generate")?base.replace(/\/api\/generate$/,"/api/verify-cloud-password"):base+"/api/verify-cloud-password";
cloudBusy=true;$("cloudSubmit").disabled=true;
try{
const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
let response;
try{response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password}),cache:"no-store",signal:controller.signal})}finally{clearTimeout(timer)}
let data;
if(response.status===404||response.status===503){
  if(password!=="21"){$("cloudError").textContent="Неверный пароль подтверждения.";return}
  data={ok:true,local:true};
}else{
  data=await response.json();
  if(!response.ok||data.ok!==true){$("cloudError").textContent=data.error||"Неверный облачный пароль.";return}
}
cloudUnlocked=true;
$("cloudAuthStage").hidden=true;$("cloudNewStage").hidden=false;
$("cloudSubmit").textContent="Сохранить пароль";
$("cloudDescription").textContent=data.local?"Локальное подтверждение: облачная проверка ещё не подключена. Укажи новый пароль.":"Облачный пароль принят. Укажи новый пароль.";
$("newGamePassword").value=state.password;
$("newGamePassword").focus();
}catch(err){$("cloudError").textContent=err.name==="AbortError"?"Сервер долго не отвечает.":"Не удалось проверить пароль в облаке."}
finally{cloudBusy=false;$("cloudSubmit").disabled=false}
};


$("empty").onclick=()=>{if(!valid()){notice("status","Сначала исправь количество вопросов.","err");return}renderEditor();goStep(2);notice("editorStatus","Открой тему и введи вопросы.","ok")};
$("clearQuestions").onclick=()=>{if(!confirm("Удалить все введённые вопросы и ответы?"))return;state.categories.forEach(c=>c.qs.forEach(q=>{q[0]="";q[1]=""}));renderEditor();save();notice("editorStatus","Вопросы удалены.","ok")};
$("demo").onclick=()=>{
if(!valid()){notice("status","Сначала выбери число вопросов, кратное числу тем.","err");return}
if(state.categories.some(c=>c.qs.some(q=>q[0]||q[1]))&&!confirm("Заменить текущие вопросы демонстрационными?"))return;
state.categories.forEach(cat=>cat.qs.forEach((q,i)=>{q[0]="Пример для темы «"+(cat.name||"Без названия")+"»: сформулируйте вопрос уровня "+(i+1)+".";q[1]="Введите правильный ответ для этого уровня."}));renderEditor();save();notice("editorStatus","Примеры добавлены — замени текст вопросов.","note")
};
$("file").addEventListener("change",async e=>{
const file=e.target.files[0];if(!file)return;
if(!(/\.(txt|md)$/i.test(file.name))){$("fileName").textContent="Поддерживаются текстовые файлы TXT и MD.";return}
if(file.size>1000000){$("fileName").textContent="Файл больше 1 МБ. Вставь небольшой отрывок.";return}
try{const text=await file.text();state.source=text.slice(0,20000);$("source").value=state.source;save();$("fileName").textContent="Загружен: "+file.name+" ("+text.length+" символов)"}catch(e){$("fileName").textContent="Не удалось открыть файл"}
});
function endpoint(){
let base=(state.apiUrl||"").trim().replace(/\/+$/,"");
if(!base){if(location.protocol==="file:")throw Error("Для ИИ открой опубликованный сайт и подключи Cloudflare Worker.");return "/api/generate"}
if(!/^https?:\/\//i.test(base))throw Error("Укажи URL ИИ-сервера, начинающийся с https://");
return base.endsWith("/api/generate")?base:base+"/api/generate"
}
function aiProgress(done,total,label,active){const box=$("aiProgress");box.hidden=false;const pct=total?Math.round(done/total*100):0;$("aiProgressFill").style.width=pct+"%";$("aiProgressPercent").textContent=pct+"%";$("aiProgressText").textContent=label;box.setAttribute("aria-valuenow",String(pct));box.classList.toggle("running",active);box.classList.toggle("done",done===total);}
async function generate(){
if(generating)return;if(!valid()){notice("status","Исправь распределение вопросов перед генерацией.","err");return}
if(state.categories.some(c=>c.qs.some(q=>q[0]||q[1]))&&!confirm("ИИ заменит все заполненные вопросы. Продолжить?"))return;
let url;try{url=endpoint()}catch(e){notice("editorStatus",e.message,"err");return}
goStep(2);generating=true;$("generate").disabled=true;$("regenerate").disabled=true;
let done=0,total=state.questionsCount;
aiProgress(0,total,"Подготовка вопросов…",true);
notice("editorStatus","ИИ работает: создание вопросов…","note");
try{
for(let ci=0;ci<state.categories.length;ci++){
const cat=state.categories[ci];const n=cat.qs.length;
for(let start=0;start<n;start+=5){
const count=Math.min(5,n-start);
aiProgress(done,total,"ИИ думает · "+cat.name+" · вопросы "+(start+1)+"–"+(start+count),true);
notice("editorStatus","ИИ генерирует вопросы. Создано "+done+" из "+total+".","note");
const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),75000);
let response;
try{response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:cat.name||"Тема "+(ci+1),subject:state.subject,difficulty:state.difficulty,number:count,offset:start,source:state.source.slice(0,9000),avoid:cat.qs.slice(0,start).map(x=>x[0]).filter(Boolean)}),signal:controller.signal})}finally{clearTimeout(timer)}
let data;try{data=await response.json()}catch(e){throw Error("ИИ-сервер вернул не JSON (HTTP "+response.status+").")}
if(!response.ok)throw Error(data.error||"Сервер ИИ: HTTP "+response.status);
if(!Array.isArray(data.items)||data.items.length<count)throw Error("ИИ вернул меньше вопросов, чем ожидалось. Попробуй ещё раз.");
data.items.slice(0,count).forEach((item,k)=>{if(typeof item.question!=="string"||typeof item.answer!=="string")throw Error("Неправильный формат ответа ИИ.");cat.qs[start+k]=[item.question,item.answer]});
done+=count;save();renderEditor();aiProgress(done,total,"Готово "+done+" из "+total+" вопросов",true);
}
}
aiProgress(done,total,"Все вопросы созданы",false);notice("editorStatus","Проверь ответы, затем нажми «Далее».","ok");
}catch(e){aiProgress(done,total,"Остановлено · "+done+" из "+total,false);notice("editorStatus","ИИ остановился после "+done+" вопросов: "+(e.name==="AbortError"?"превышено время ожидания ответа.":e.message)+" Проверь адрес сервера и попробуй снова. Уже созданные вопросы сохранены.","err")}
finally{generating=false;$("generate").disabled=false;$("regenerate").disabled=false}
}
$("generate").onclick=generate;$("regenerate").onclick=generate;
function makeConfig(){
if(!valid())throw Error("Количество вопросов должно делиться на количество тем.");
const cats=state.categories.map((c,i)=>({name:(c.name||"Тема "+(i+1)).trim(),qs:c.qs.map((q,j)=>{if(!q[0].trim()||!q[1].trim())throw Error("Заполни вопрос и ответ: "+(c.name||"Тема "+(i+1))+", "+(j+1)+"00 баллов.");return [q[0].trim(),q[1].trim()]})}));
if(!state.password.trim())throw Error("Укажи пароль ведущего.");
return {id:"g"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),title:state.title.trim()||"Своя игра",password:state.password,teams:state.teamsCount,categories:cats};
}
function safeJson(v){return JSON.stringify(v).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026").replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")}
let template=null;
async function makeHtml(){const cfg=makeConfig();if(!template){const r=await fetch(new URL("game.html",location.href));if(!r.ok)throw Error("Не удалось загрузить игровой шаблон (HTTP "+r.status+").");template=await r.text()}
if(!template.includes("__QUIZ_JSON__"))throw Error("Игровой шаблон повреждён.");return template.replace("__QUIZ_JSON__",safeJson(cfg)).replace("<title>Своя игра</title>","<title>"+cfg.title.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")+"</title>")}
function downloadBlob(data,name,mime){const blob=new Blob([data],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$("download").onclick=async()=>{try{notice("exportStatus","Подготавливаю файл…","note");const html=await makeHtml();downloadBlob(html,"index.html","text/html;charset=utf-8");notice("exportStatus","Готово! Файл index.html скачан. Он полностью автономный.","ok")}catch(e){notice("exportStatus",e.message,"err")}};
$("preview").onclick=async()=>{
const win=window.open("about:blank","_blank");try{const html=await makeHtml();const url=URL.createObjectURL(new Blob([html],{type:"text/html;charset=utf-8"}));if(win)win.location.href=url;else notice("exportStatus","Разреши всплывающие окна в браузере.","err");setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){if(win)win.close();notice("exportStatus",e.message,"err")}
};
$("jsonExport").onclick=()=>{save();downloadBlob(JSON.stringify(state,null,2),"svoya-igra-project.json","application/json;charset=utf-8");notice("exportStatus","Проект JSON сохранён.","ok")};
$("jsonImport").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>3000000)throw Error("Слишком большой файл JSON.");const json=JSON.parse(await f.text());if(!json||!Array.isArray(json.categories))throw Error("Это не проект «Своя игра».");state=Object.assign(initial(),json);normalize();values.forEach(id=>$(id).value=state[id]);refresh();goStep(1);notice("status","Проект импортирован.","ok")}catch(err){notice("exportStatus",err.message,"err")}e.target.value=""});
let activeStep=1;
function updateReview(){
 const total=state.categories.reduce((n,c)=>n+c.qs.length,0),ready=state.categories.reduce((n,c)=>n+c.qs.filter(q=>q[0].trim()&&q[1].trim()).length,0);
 $("reviewCount").textContent=ready+" из "+total+" заполнено";
 $("meterFill").style.width=(total?ready/total*100:0)+"%";
 return ready===total;
}
function goStep(n){
 if(generating&&n!==2)return;
 if(n>1&&!valid()){notice("status","Число вопросов должно делиться на число тем.","err");return}
 if(n===3&&!updateReview()){n=2;notice("editorStatus","Заполни вопросы и ответы.","err")}
 activeStep=n;
 for(let k=1;k<=3;k++)$("step"+k).hidden=k!==n;
 document.querySelectorAll("[data-step]").forEach(b=>b.classList.toggle("active",Number(b.dataset.step)===n));
 if(n===2){renderEditor();updateReview()}
 if(n===3)$("finalSummary").textContent=state.topicsCount+" тем · "+state.questionsCount+" вопросов · "+state.teamsCount+" команд";
 window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>goStep(Number(b.dataset.step)));
$("backSettings").onclick=()=>goStep(1);
$("goExport").onclick=()=>goStep(3);
$("backEditor").onclick=()=>goStep(2);

})();
