/**
 * Cloudflare Worker: website assets from GitHub + Workers AI quiz generation.
 * Bindings: AI (Workers AI), QUIZ_LIMITER (Rate Limiting).
 */
const UPSTREAM="https://raw.githubusercontent.com/nurislombek006-pixel/gpt/main/svoya-igra-builder/";
const ALLOWED=new Set(["https://nurislombek006-pixel.github.io"]);
function reply(data,status=200,origin=""){
  const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
  if(origin){headers["access-control-allow-origin"]=origin;headers["vary"]="Origin"}
  return new Response(JSON.stringify(data),{status,headers});
}
function extract(text){
  if(text&&typeof text==="object")return text;
  if(typeof text!=="string")throw new Error("Пустой ответ ИИ.");
  const clean=text.trim().replace(/^\x60+\s*json\s*/i,"").replace(/\x60+$/g,"").trim();
  try{return JSON.parse(clean)}catch(e){}
  const start=clean.indexOf("{"),end=clean.lastIndexOf("}");
  if(start>=0&&end>start)return JSON.parse(clean.slice(start,end+1));
  throw new Error("ИИ не вернул корректный JSON.");
}

async function callGemini(env,system,user,expected){
  const schema={
    type:"OBJECT",
    properties:{
      items:{type:"ARRAY",items:{type:"OBJECT",
        properties:{question:{type:"STRING"},answer:{type:"STRING"}},
        required:["question","answer"]}}
    },
    required:["items"]
  };
  const response=await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    {method:"POST",headers:{"content-type":"application/json","x-goog-api-key":env.GEMINI_API_KEY},
      body:JSON.stringify({
        contents:[{role:"user",parts:[{text:system+"\n\n"+user+"\n\nКоличество вопросов: "+expected}]}],
        generationConfig:{temperature:0.35,maxOutputTokens:2048,responseMimeType:"application/json",responseSchema:schema}
      })}
  );
  if(!response.ok)throw new Error("Gemini API HTTP "+response.status);
  const payload=await response.json();
  const text=payload?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
  return extract(text);
}

export default {
  async fetch(req,env){
    const url=new URL(req.url),path=url.pathname;
    const origin=req.headers.get("origin")||"";
    const trusted=origin===""||origin===url.origin||ALLOWED.has(origin);
    if(path==="/health")return reply({ok:true,ai:!!env.AI},200,trusted?origin:"");

    if(path==="/api/verify-cloud-password"){
      if(!trusted)return reply({error:"Недопустимый источник."},403);
      if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":origin||url.origin,"access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"Content-Type","access-control-max-age":"600","vary":"Origin"}});
      if(req.method!=="POST")return reply({error:"Только POST."},405,origin);
      if(!env.CLOUD_PASSWORD)return reply({error:"Облачный пароль ещё не настроен на сервере."},503,origin||url.origin);
      try{
        const ip=req.headers.get("cf-connecting-ip")||"anonymous";
        if(env.QUIZ_LIMITER){
          const individual=await env.QUIZ_LIMITER.limit({key:"password:"+ip});
          if(!individual.success)return reply({error:"Слишком много попыток. Попробуй позднее."},429,origin||url.origin);
          const common=await env.QUIZ_LIMITER.limit({key:"password-global"});
          if(!common.success)return reply({error:"Слишком много проверок. Попробуй позднее."},429,origin||url.origin);
        }
        const raw=await req.text();
        if(raw.length>1000)return reply({error:"Запрос слишком большой."},413,origin||url.origin);
        const submitted=String(JSON.parse(raw)?.password??"");
        const secret=String(env.CLOUD_PASSWORD);
        const a=new TextEncoder().encode(submitted),b=new TextEncoder().encode(secret);
        let difference=a.length^b.length;
        for(let i=0;i<Math.max(a.length,b.length);i++)difference|=(a[i]||0)^(b[i]||0);
        const ok=difference===0&&submitted.length>0;
        return reply(ok?{ok:true}:{ok:false,error:"Неверный облачный пароль."},ok?200:401,origin||url.origin);
      }catch(e){return reply({error:"Не удалось проверить пароль."},400,origin||url.origin)}
    }
    if(path==="/api/generate"){
      if(req.method==="OPTIONS"){
        if(!trusted)return new Response(null,{status:403});
        return new Response(null,{status:204,headers:{"access-control-allow-origin":origin||url.origin,"access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"Content-Type","access-control-max-age":"600","vary":"Origin"}});
      }
      if(req.method!=="POST")return reply({error:"Используй POST."},405,trusted?origin:"");
      if(!trusted)return reply({error:"Этот источник не разрешён."},403);
      if(!env.AI)return reply({error:"На сервере не подключён Workers AI binding."},503,origin);
      if(Number(req.headers.get("content-length")||0)>25000)return reply({error:"Слишком большой запрос."},413,origin);
      try{
        const key=req.headers.get("cf-connecting-ip")||"anonymous";
        if(env.QUIZ_LIMITER){
          const rl=await env.QUIZ_LIMITER.limit({key:"user:"+key});
          if(!rl.success)return reply({error:"Слишком много запросов за минуту. Попробуй немного позже."},429,origin);
          const rg=await env.QUIZ_LIMITER.limit({key:"global"});
          if(!rg.success)return reply({error:"ИИ временно занят. Попробуй позже."},429,origin);
        }
        const p=await req.json();
        if(!p||typeof p!=="object")return reply({error:"Неверный формат."},400,origin);
        const number=Number(p.number);
        if(!Number.isInteger(number)||number<1||number>5)return reply({error:"Можно создавать от 1 до 5 вопросов за запрос."},400,origin);
        const category=String(p.category||"").slice(0,130).trim();
        if(!category)return reply({error:"Не указана тема."},400,origin);
        const subject=String(p.subject||"").slice(0,240);
        const source=String(p.source||"").slice(0,6500);
        const difficulty=String(p.difficulty||"постепенно усложняющиеся").slice(0,50);
        const offset=Math.max(0,Math.min(25,Number(p.offset)||0));
        const avoid=Array.isArray(p.avoid)?p.avoid.slice(0,12).map(v=>String(v).slice(0,180)):[];
        const system=[
          "Ты методист и автор интеллектуальной викторины «Своя игра» для университета.",
          "Ответь ТОЛЬКО JSON объектом: {\"items\":[{\"question\":\"...\",\"answer\":\"...\"}]} без markdown.",
          "Количество элементов обязано совпадать с запросом. Пиши по-русски, без вариантов ответа.",
          "Вопросы должны быть разными, ясными, пригодными для устного ответа. Ответы точные и короткие.",
          "Уровни усложняются от вопроса 100 до 1000 баллов. Не повторы.",
          "Если есть исходный материал, используй только факты из него, не придумывай отсутствующие данные и даты.",
          "Если информации из текста недостаточно, составляй вопросы по остальным содержащимся фактам и избегай спорных цифр."
        ].join(" ");
        const user=JSON.stringify({category,subject,difficulty,number,first_level:offset+1,source:source||"(материал не приложен, используй общие знания)",avoid});
        let parsed,model="Cloudflare Llama 3.1 8B";
        if(env.GEMINI_API_KEY){
          try{
            parsed=await callGemini(env,system,user,number);
            model="Gemini 3.5 Flash-Lite";
          }catch(e){
            // The free Gemini quota may be unavailable. Keep the quiz usable.
            console.warn("Gemini unavailable; using Cloudflare AI",String(e).slice(0,100));
          }
        }
        if(!parsed){
          const result=await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8",{
            messages:[{role:"system",content:system},{role:"user",content:user}],
            max_tokens:1850,temperature:0.35,top_p:0.9
          });
          parsed=extract(result?.response??result);
        }
        let items=Array.isArray(parsed.items)?parsed.items:[];
        items=items.map(x=>({question:String(x.question||"").trim().slice(0,350),answer:String(x.answer||"").trim().slice(0,450)})).filter(x=>x.question&&x.answer);
        if(items.length<number){
          // The 8B model sometimes generates one item even when asked for five.
          // Preserve existing items, generate each missing item and return partial
          // results instead of failing the whole client request.
          const oneSystem='Ты автор игры «Своя игра». Верни ровно ОДИН новый вопрос на русском. Только JSON: {"items":[{"question":"...","answer":"..."}]}';
          for(let missing=items.length;missing<number;missing++){
            let added=false;
            for(let retry=0;retry<3&&!added;retry++){
              try{
                const followup=JSON.stringify({category,subject,difficulty,source:source||"общие знания",level:offset+missing+1,avoid:[...avoid,...items.map(v=>v.question)].slice(-20),number:1});
                const extra=await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8",{
                  messages:[{role:"system",content:oneSystem},{role:"user",content:followup}],
                  max_tokens:700,temperature:0.24,top_p:0.9
                });
                const parsedOne=extract(extra?.response??extra);
                const rawOne=Array.isArray(parsedOne.items)?parsedOne.items[0]:parsedOne;
                const question=String(rawOne?.question||"").trim().slice(0,350);
                const answer=String(rawOne?.answer||"").trim().slice(0,450);
                if(question&&answer&&!items.some(q=>q.question.toLowerCase()===question.toLowerCase())){
                  items.push({question,answer});added=true;
                }
              }catch(e){/* Another inference attempt can recover malformed model output. */}
            }
            if(!added)break;
          }
        }
        return reply({items:items.slice(0,number),partial:items.length<number,model},200,origin||url.origin);
      }catch(e){return reply({error:e instanceof SyntaxError?"Некорректный JSON запроса.":"Ошибка генерации: "+String(e?.message||e).slice(0,150)},502,origin||url.origin)}
    }
    if(req.method!=="GET"&&req.method!=="HEAD")return new Response("Method not allowed",{status:405});
    const name=path==="/"||path==="/index.html"?"index.html":path.slice(1);
    if(!["index.html","builder.js","game.html"].includes(name))return new Response("Not found",{status:404});
    try{
      const response=await fetch(UPSTREAM+name,{cf:{cacheTtl:60,cacheEverything:true}});
      if(!response.ok)return new Response("Не удалось загрузить конструктор из GitHub.",{status:502,headers:{"content-type":"text/plain; charset=utf-8"}});
      const ctype=name.endsWith(".js")?"application/javascript; charset=utf-8":"text/html; charset=utf-8";
      return new Response(req.method==="HEAD"?null:response.body,{headers:{"content-type":ctype,"x-content-type-options":"nosniff","cache-control":"public, max-age=60","content-security-policy":"frame-ancestors 'none'"}});
    }catch(e){return new Response("Сайт временно недоступен.",{status:502})}
  }
};
