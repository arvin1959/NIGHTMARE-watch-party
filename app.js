const socket = io();
const $ = id => document.getElementById(id);
let currentRoom = "", isHost = false, currentVideo = "";
const toast = msg => { $("toast").textContent=msg; $("toast").classList.add("show"); setTimeout(()=>$("toast").classList.remove("show"),2600); };
socket.on("connect", () => $("connection").textContent="متصل به سرور");
socket.on("disconnect", () => $("connection").textContent="ارتباط قطع شد");
function showRoom(code, url) {
  currentRoom=code; currentVideo=url||"";
  $("landing").classList.add("hidden"); $("watch").classList.remove("hidden");
  $("roomLabel").textContent=code; $("chatLog").innerHTML='<div class="system-msg">به اتاق خوش آمدی. مراقب پشت سرت باش...</div>';
  renderVideo(currentVideo);
}
function renderVideo(url) {
  const stage=$("videoStage"); stage.innerHTML="";
  if(!url){stage.innerHTML='<div class="screen-placeholder"><span class="eye">◉</span><h3>صفحه‌ی نمایش آماده است</h3><p>میزبان هنوز لینکی وارد نکرده است.</p></div>';return;}
  try {
    const parsed=new URL(url);
    if(!["http:","https:"].includes(parsed.protocol)) throw Error();
    const frame=document.createElement("iframe"); frame.src=parsed.href;
    frame.allow="autoplay; fullscreen; picture-in-picture"; frame.allowFullscreen=true;
    frame.referrerPolicy="strict-origin-when-cross-origin"; stage.appendChild(frame);
  } catch { stage.innerHTML='<div class="screen-placeholder"><h3>لینک معتبر نیست</h3><p>یک آدرس کامل با https:// وارد کن.</p></div>'; }
}
$("createBtn").onclick=()=>{
  const nickname=$("createName").value.trim()||"میزبان";
  const videoUrl=$("videoUrl").value.trim();
  socket.emit("room:create",{nickname,videoUrl},r=>{if(!r?.ok)return toast("ساخت اتاق انجام نشد.");showRoom(r.code,r.videoUrl);});
};
$("joinBtn").onclick=()=>{
  const nickname=$("joinName").value.trim()||"مهمان", code=$("roomCode").value.trim();
  if(!code)return toast("کد اتاق را وارد کن.");
  socket.emit("room:join",{nickname,code},r=>{if(!r?.ok)return toast(r?.error||"ورود ممکن نشد.");showRoom(r.code,r.videoUrl);});
};
socket.on("room:role",r=>{isHost=!!r.isHost;$("hostLabel").textContent=isHost?"تو میزبان این اتاقی":"مهمان اتاق";});
socket.on("presence:update",members=>{$("memberCount").textContent=members.length+" نفر";$("memberList").innerHTML="";members.forEach(m=>{const el=document.createElement("span");el.className="member"+(m.isHost?" host":"");el.textContent=m.nickname;$("memberList").appendChild(el);});});
function addMessage(m){const el=document.createElement("div");el.className="message";const b=document.createElement("b");b.textContent=m.nickname;const span=document.createElement("span");span.textContent=m.body;el.append(b,span);$("chatLog").appendChild(el);$("chatLog").scrollTop=$("chatLog").scrollHeight;}
socket.on("chat:history",items=>items.forEach(addMessage));socket.on("chat:message",addMessage);
$("chatForm").onsubmit=e=>{e.preventDefault();const input=$("chatInput");if(input.value.trim()){socket.emit("chat:send",input.value);input.value="";}};
function reaction(emoji){socket.emit("reaction:send",emoji);spawnReaction(emoji);}
document.querySelectorAll("[data-emoji]").forEach(b=>b.onclick=()=>reaction(b.dataset.emoji));
socket.on("reaction:new",r=>spawnReaction(r.emoji));
function spawnReaction(emoji){const el=document.createElement("span");el.className="float-reaction";el.textContent=emoji;el.style.left=(10+Math.random()*80)+"%";$("reactionLayer").appendChild(el);setTimeout(()=>el.remove(),2600);}
$("copyInvite").onclick=async()=>{try{await navigator.clipboard.writeText(currentRoom);toast("کد دعوت کپی شد: "+currentRoom);}catch{toast("کد اتاق: "+currentRoom);}};
$("leaveBtn").onclick=()=>{location.reload();};
$("langBtn").onclick=()=>toast("نسخه‌ی فعلی رابط فارسی است؛ پوسته‌ی انگلیسی هنوز اضافه نشده.");
