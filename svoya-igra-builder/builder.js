"use strict";
(function(){
const $=id=>document.getElementById(id);
const STORE="svoya-builder-project-v2";
const initial=()=>({title:"Своя игра — Экономика",topicsCount:5,questionsCount:25,teamsCount:3,password:"2611",subject:"",source:"",difficulty:"постепенно усложняющиеся",apiUrl:"",categories:Array.from({length:5},(_,i)=>({name:"Тема "+(i+1),qs:Array.from({length:5},()=>["",""])}))});
let state=initial();
try{let loaded=JSON.parse(localStorage.getItem(STORE)||"null");if(loaded&&typeof loaded==="object"&&Array.isArray(loaded.categories))state=Object.assign(initial(),loaded)}catch(e){}
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
function notice(id,text,type){const x=$(id);x.textContent=text;x.className="status "+(type||"note")}
function distribution(){
const d=$("distribution"),s=$("suggestion"),n=state.topicsCount,q=state.questionsCount; s.replaceChildren();
if(valid()){d.className="num-preview valid";d.textContent=n+" тем × "+(q/n)+" вопросов = "+q+" всего. Баллы: 100, 200, …, "+(q/n*100)+". Команд: "+state.teamsCount+".";return}
d.className="num-preview";d.textContent="⚠ "+q+" вопросов нельзя поровну разделить на "+n+" тем. Выбери подходящее количество:";
const down=Math.floor(q/n)*n,up=Math.ceil(q/n)*n;
Array.from(new Set([down,up])).filter(v=>v>=n&&v<=120&&v/n<=20).forEach(v=>{const btn=document.createElement("button");btn.textContent=v+" всего ("+(v/n)+" в теме)";btn.type="button";btn.onclick=()=>{state.questionsCount=v;normalize();$("questionsCount").value=v;save();refresh()};s.append(btn)});
}
function renderTopics(){
const host=$("topicList");host.replaceChildren();
state.categories.forEach((cat,i)=>{
const item=document.createElement("div");item.className="topic-item";
const n=document.createElement("span");n.className="topic-index";n.textContent="КАТЕГОРИЯ "+(i+1);
const inp=document.createElement("input");inp.className="input";inp.value=cat.name;inp.maxLength=100;inp.placeholder="Название темы "+(i+1);inp.setAttribute("aria-label","Название темы "+(i+1));
inp.addEventListener("input",()=>{cat.name=inp.value;save();const h=document.getElementById("heading-"+i);if(h)h.textContent=cat.name||"Тема "+(i+1)});
const small=document.createElement("small");small.className="info";small.textContent="Вопросов: "+cat.qs.length;
item.append(n,inp,small);host.append(item);
});
}
function textarea(label,value,onchange,cls){
const lab=document.createElement("label");lab.textContent=label;
const t=document.createElement("textarea");t.value=value;t.className=cls||"";t.addEventListener("input",()=>onchange(t.value));
return [lab,t];
}
function renderEditor(){
const host=$("editor");host.replaceChildren();
if(!valid()){host.textContent="Сначала выбери количество вопросов, которое делится на число тем.";host.className="help";return}host.className="";
state.categories.forEach((cat,i)=>{
const head=document.createElement("div");head.className="section-head";
const h=document.createElement("h3");h.id="heading-"+i;h.textContent=cat.name||"Тема "+(i+1);
const meta=document.createElement("span");meta.className="editor-meta";meta.textContent=cat.qs.length+" вопросов · "+(cat.qs.length*100)+" макс. баллов";head.append(h,meta);host.append(head);
const grid=document.createElement("div");grid.className="question-grid";
cat.qs.forEach((pair,j)=>{
const card=document.createElement("div");card.className="question-card";
const top=document.createElement("div");top.className="question-top";
const num=document.createElement("span");num.textContent="ВОПРОС "+(j+1);
const pts=document.createElement("span");pts.textContent=(j+1)*100+" баллов";top.append(num,pts);card.append(top);
for(const [label,value,k,cl] of [["Текст вопроса",pair[0],0,""],["Правильный ответ",pair[1],1,"answer-input"]]){
const parts=textarea(label,value,v=>{cat.qs[j][k]=v;save()},cl);card.append(...parts)
}
grid.append(card);
});
host.append(grid);
});
}
function refresh(){normalize();distribution();renderTopics();renderEditor();save()}
values.forEach(id=>{
const el=$(id);if(el){el.value=state[id];el.addEventListener("change",()=>{state[id]=el.type==="number"?Number(el.value):el.value;refresh()});if(el.type!=="number")el.addEventListener("input",()=>{state[id]=el.value;save()})}
});
refresh();
$("clearAll").onclick=()=>{if(!confirm("Удалить все настройки и вопросы этого проекта?"))return;localStorage.removeItem(STORE);location.reload()};
$("empty").onclick=()=>{if(!valid()){notice("status","Сначала исправь количество вопросов.","err");return}renderEditor();notice("status","Поля готовы. Заполняй вопросы и ответы.","ok")};
$("clearQuestions").onclick=()=>{if(!confirm("Удалить все введённые вопросы и ответы?"))return;state.categories.forEach(c=>c.qs.forEach(q=>{q[0]="";q[1]=""}));renderEditor();save();notice("status","Вопросы удалены.","ok")};
$("demo").onclick=()=>{
if(!valid()){notice("status","Сначала выбери число вопросов, кратное числу тем.","err");return}
if(state.categories.some(c=>c.qs.some(q=>q[0]||q[1]))&&!confirm("Заменить текущие вопросы демонстрационными?"))return;
state.categories.forEach(cat=>cat.qs.forEach((q,i)=>{q[0]="Пример для темы «"+(cat.name||"Без названия")+"»: сформулируйте вопрос уровня "+(i+1)+".";q[1]="Введите правильный ответ для этого уровня."}));renderEditor();save();notice("status","Добавлены шаблоны-примеры, не сгенерированные ИИ. Замени их перед игрой.","note")
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
async function generate(){
if(generating)return;if(!valid()){notice("status","Исправь распределение вопросов перед генерацией.","err");return}
if(state.categories.some(c=>c.qs.some(q=>q[0]||q[1]))&&!confirm("ИИ заменит все заполненные вопросы. Продолжить?"))return;
let url;try{url=endpoint()}catch(e){notice("status",e.message,"err");return}
generating=true;$("generate").disabled=true;
let done=0,total=state.questionsCount;
notice("status","ИИ работает: создание вопросов…","note");
try{
for(let ci=0;ci<state.categories.length;ci++){
const cat=state.categories[ci];const n=cat.qs.length;
for(let start=0;start<n;start+=5){
const count=Math.min(5,n-start);
notice("status","ИИ: «"+(cat.name||"Тема "+(ci+1))+"», вопросы "+(start+1)+"–"+(start+count)+" из "+n+". Всего готово "+done+"/"+total+".","note");
const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),75000);
let response;
try{response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:cat.name||"Тема "+(ci+1),subject:state.subject,difficulty:state.difficulty,number:count,offset:start,source:state.source.slice(0,9000),avoid:cat.qs.slice(0,start).map(x=>x[0]).filter(Boolean)}),signal:controller.signal})}finally{clearTimeout(timer)}
let data;try{data=await response.json()}catch(e){throw Error("ИИ-сервер вернул не JSON (HTTP "+response.status+").")}
if(!response.ok)throw Error(data.error||"Сервер ИИ: HTTP "+response.status);
if(!Array.isArray(data.items)||data.items.length<count)throw Error("ИИ вернул меньше вопросов, чем ожидалось. Попробуй ещё раз.");
data.items.slice(0,count).forEach((item,k)=>{if(typeof item.question!=="string"||typeof item.answer!=="string")throw Error("Неправильный формат ответа ИИ.");cat.qs[start+k]=[item.question,item.answer]});
done+=count;save();renderEditor();
}
}
notice("status","Готово! ИИ подготовил "+done+" вопросов. Проверь их, затем скачай HTML.","ok");
}catch(e){notice("status","ИИ остановился после "+done+" вопросов: "+(e.name==="AbortError"?"превышено время ожидания ответа.":e.message)+" Проверь адрес сервера и попробуй снова. Уже созданные вопросы сохранены.","err")}
finally{generating=false;$("generate").disabled=false}
}
$("generate").onclick=generate;
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
$("jsonImport").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>3000000)throw Error("Слишком большой файл JSON.");const json=JSON.parse(await f.text());if(!json||!Array.isArray(json.categories))throw Error("Это не проект «Своя игра».");state=Object.assign(initial(),json);normalize();values.forEach(id=>$(id).value=state[id]);refresh();notice("exportStatus","Проект импортирован.","ok")}catch(err){notice("exportStatus",err.message,"err")}e.target.value=""});
})();
