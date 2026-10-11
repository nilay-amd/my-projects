const appState = {
demoMode: false,
hardwareConnected: false,
gasPpm: null,
temperature: null,
flameDetected: false,
humidity: null,
wifiRssi: null,
buzzerSilenced: false,
audioCtx: null,
timeLabels: ['-7m', '-6m', '-5m', '-4m', '-3m', '-2m', '-1m', 'Now'],
tempHistory: [null, null, null, null, null, null, null, null]
};
const firebaseConfig={
apiKey:"AIzaSyCiIPiNDzWU8471xVh9-cjDaYig7aMyhU0",
authDomain:"iot-fire-gas-alert-system.firebaseapp.com",
databaseURL:"https://iot-fire-gas-alert-system-default-rtdb.asia-southeast1.firebasedatabase.app",
projectId:"iot-fire-gas-alert-system",
storageBucket:"iot-fire-gas-alert-system.firebasestorage.app",
messagingSenderId:"47973903036",
appId:"1:47973903036:web:6b2849da0bededa032feb9"
};
firebase.initializeApp(firebaseConfig);
const db=firebase.database();
const sensorRef=db.ref("projectDyson");
const connectionRef=db.ref(".info/connected");

function clamp(val,min,max){
return Math.min(Math.max(val,min),max);
}

function calculateGasPoints(gasPpm){
if(gasPpm===null||gasPpm===undefined)return 0;
return Math.round(clamp((gasPpm-250)/(1250-250),0,1)*40);
}

function calculateTempPoints(temp){
if(temp===null||temp===undefined)return 0;
return Math.round(clamp((temp-25)/(50-25),0,1)*30);
}

function calculateFlamePoints(flameDetected){
return flameDetected?100:0;
}

function computeRiskFusion(){
if(!appState.hardwareConnected&&!appState.demoMode){
return{
score:null,
gasPoints:null,
tempPoints:null,
flamePoints:null,
level:'OFFLINE',
statusReason:'System is offline. Awaiting telemetry.',
hazardFlags:{
isFlameHazard:false,
isHighGasHazard:false,
isHighTempHazard:false,
isDualHazard:false,
isDualSevereCombo:false
}
};
}
const gasPoints=calculateGasPoints(appState.gasPpm);
const tempPoints=calculateTempPoints(appState.temperature);
const flamePoints=calculateFlamePoints(appState.flameDetected);
const totalScore=gasPoints+tempPoints+flamePoints;
const isFlameHazard=Boolean(appState.flameDetected);
const isHighGasHazard=appState.gasPpm>=700;
const isSevereGasLeak=appState.gasPpm>=1000;
const isHighTempHazard=appState.temperature>=42;
const isSevereHeat=appState.temperature>=46;
const isDualHazard=appState.gasPpm>=500&&appState.temperature>=36;
const isDualSevereCombo=isSevereGasLeak&&isSevereHeat;
let level='SAFE';
let statusReason='All parameters within baseline limits.';

if(isFlameHazard){
level='CRITICAL';
statusReason=`Immediate CRITICAL condition: Direct flame detected (+100 pts). Ambient temp is actual DHT22 reading (${appState.temperature.toFixed(1)}°C).`;
}else if(totalScore>=90){
level='CRITICAL';
statusReason=`CRITICAL condition: Multi-sensor risk score reached ${totalScore} / 170 pts (>= 90 threshold).`;
}else if(isDualSevereCombo){
level='CRITICAL';
statusReason=`CRITICAL escalation: Co-occurring severe combustible gas (${appState.gasPpm} PPM) and extreme thermal heat (${appState.temperature.toFixed(1)}°C).`;
}else if(totalScore>=50||isHighGasHazard||isHighTempHazard||isDualHazard){
level='WARNING';
let triggers=[];
if(totalScore>=50)triggers.push(`Risk score ${totalScore}/170 pts`);
if(isHighGasHazard)triggers.push(`Single-sensor Gas Hazard override (${appState.gasPpm} PPM, +${gasPoints}p)`);
if(isHighTempHazard)triggers.push(`Single-sensor Thermal Hazard override (${appState.temperature.toFixed(1)}°C, +${tempPoints}p)`);
if(isDualHazard&&!isHighGasHazard&&!isHighTempHazard)triggers.push(`Multi-sensor combination (${appState.gasPpm} PPM gas + ${appState.temperature.toFixed(1)}°C temp)`);
statusReason=`WARNING condition: ${triggers.join(' | ')}. Never masked as SAFE.`;
}else{
level='SAFE';
statusReason=`SAFE condition: Multi-sensor score ${totalScore}/170 pts. No individual or combination hazard indicators detected.`;
}

return{
score:totalScore,
gasPoints,
tempPoints,
flamePoints,
level,
statusReason,
hazardFlags:{
isFlameHazard,
isHighGasHazard,
isHighTempHazard,
isDualHazard,
isDualSevereCombo
}
};
}

let tempChart=null;

function initTemperatureChart(){
const ctx=document.getElementById('tempLineChart').getContext('2d');
tempChart=new Chart(ctx,{
type:'line',
data:{
labels:appState.timeLabels,
datasets:[{
label:'DHT22 Temperature (°C)',
data:appState.tempHistory,
borderColor:'#38bdf8',
borderWidth:2.4,
pointBackgroundColor:'#0284c7',
pointBorderColor:'#ffffff',
pointBorderWidth:2,
pointRadius:4,
pointHoverRadius:6,
tension:0.38,
fill:false,
spanGaps:true
}]
},
options:{
responsive:true,
maintainAspectRatio:false,
animation:{duration:300},
plugins:{
legend:{display:false},
tooltip:{
callbacks:{
label:(ctx)=>(ctx.parsed.y!==null?`${ctx.parsed.y.toFixed(1)} °C`:'No reading')
}
}
},
scales:{
y:{
min:25,
max:50,
ticks:{
stepSize:5,
callback:(val)=>val.toFixed(0)+'°C',
font:{size:10},
color:'#94a3b8'
},
grid:{color:'#f1f5f9'}
},
x:{
ticks:{
font:{size:10},
color:'#94a3b8'
},
grid:{display:false}
}
}
}
});
}

function updateTrendData(newTemp){
if(!tempChart)return;
appState.tempHistory.shift();
appState.tempHistory.push(newTemp!==null?parseFloat(newTemp.toFixed(1)):null);
tempChart.data.datasets[0].data=appState.tempHistory;
const validTemps=appState.tempHistory.filter(t=>t!==null);
if(validTemps.length>0){
const minVal=Math.min(...validTemps);
const maxVal=Math.max(...validTemps);
tempChart.options.scales.y.min=minVal<25?Math.floor(minVal-2):25;
tempChart.options.scales.y.max=maxVal>48?Math.ceil(maxVal+2):50;
}else{
tempChart.options.scales.y.min=25;
tempChart.options.scales.y.max=50;
}
tempChart.update('none');
}

function updateGaugeDisplay(score){
const needle=document.getElementById('svg-gauge-needle');
const centerScore=document.getElementById('svg-center-score');
if(score===null||score===undefined){
centerScore.textContent='--';
needle.style.transform='rotate(-90deg)';
return;
}
centerScore.textContent=score;
const clamped=clamp(score,0,170);
const angleDeg=-90+(clamped/170)*180;
needle.style.transform=`rotate(${angleDeg.toFixed(1)}deg)`;
}

function refreshDashboard(){
const risk=computeRiskFusion();
const isOnline=appState.hardwareConnected||appState.demoMode;
const statusPill=document.getElementById('hardware-status-pill');
const statusPillText=document.getElementById('status-pill-text');
const syncClock=document.getElementById('sync-clock');
const demoBadge=document.getElementById('demo-mode-badge');
const demoLabel=document.getElementById('demo-mode-label');

if(appState.demoMode){
if(demoBadge)demoBadge.classList.add('active');
if(demoLabel)demoLabel.textContent='ON';
statusPill.className='status-pill pill-demo';
statusPillText.textContent='DEMO MODE';
syncClock.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}).toLowerCase();
}else if(appState.hardwareConnected){
if(demoBadge)demoBadge.classList.remove('active');
if(demoLabel)demoLabel.textContent='OFF';
statusPill.className='status-pill pill-online';
statusPillText.textContent='ONLINE';
syncClock.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}).toLowerCase();
}else{
if(demoBadge)demoBadge.classList.remove('active');
if(demoLabel)demoLabel.textContent='OFF';
statusPill.className='status-pill pill-offline';
statusPillText.textContent='OFFLINE';
syncClock.textContent='Offline';
}

const heroBox=document.getElementById('hero-status-card');
const statusHeading=document.getElementById('current-status-heading');
const statusDetail=document.getElementById('current-status-detail');
const scoreCounter=document.getElementById('score-counter');
const dangerBanner=document.getElementById('danger-banner');
const dangerBannerText=document.getElementById('danger-banner-text');

if(!isOnline){
heroBox.className='hero-status-box theme-offline';
statusHeading.textContent='OFFLINE';
statusDetail.textContent='System is offline. No live telemetry received from ESP32 / Firebase. Turn Demo Mode ON below to test scenarios.';
scoreCounter.textContent='--';
dangerBanner.classList.remove('visible');
}else{
scoreCounter.textContent=risk.score;
statusHeading.textContent=risk.level;
statusDetail.textContent=risk.statusReason;
if(risk.level==='SAFE'){
heroBox.className='hero-status-box theme-safe';
dangerBanner.classList.remove('visible');
}else if(risk.level==='WARNING'){
heroBox.className='hero-status-box theme-warn';
dangerBanner.classList.remove('visible');
}else{
heroBox.className='hero-status-box theme-crit';
if(appState.flameDetected){
dangerBannerText.textContent=`🚨 EMERGENCY: Direct flame detected (+100 pts)! Temperature is actual DHT22 reading: ${appState.temperature.toFixed(1)}°C. Evacuate area!`;
}else if(risk.hazardFlags.isDualSevereCombo){
dangerBannerText.textContent=`🚨 CRITICAL EMERGENCY: Co-occurring extreme gas leak (${appState.gasPpm} PPM) and severe heat (${appState.temperature.toFixed(1)}°C)! Siren active!`;
}else{
dangerBannerText.textContent=`🚨 CRITICAL HAZARD: Overall risk score reached ${risk.score} / 170 pts! Local alarm active & phone notification sent.`;
}
dangerBanner.classList.add('visible');
}
}
// Dynamic Alert Center Updates
const alertMsgBox = document.getElementById('alert-msg-box');
const alertMsgTitle = document.getElementById('alert-msg-title');
const alertMsgDesc = document.getElementById('alert-msg-desc');
const alertClockTime = document.getElementById('alert-clock-time');

if (alertClockTime) {
  alertClockTime.textContent = isOnline ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }).toLowerCase() : 'Offline';
}

if (alertMsgBox && alertMsgTitle && alertMsgDesc) {
  if (!isOnline) {
    alertMsgBox.className = 'alert-status-banner';
    alertMsgTitle.textContent = 'System is offline';
    alertMsgDesc.textContent = 'Waiting for telemetry from ESP32 & Firebase. Turn Demo Mode ON below to test scenarios.';
  } else if (risk.level === 'SAFE') {
    alertMsgBox.className = 'alert-status-banner state-safe';
    alertMsgTitle.textContent = 'System Operational & Normal';
    alertMsgDesc.textContent = risk.statusReason;
  } else if (risk.level === 'WARNING') {
    alertMsgBox.className = 'alert-status-banner state-warning';
    alertMsgTitle.textContent = 'Warning Condition Detected';
    alertMsgDesc.textContent = risk.statusReason;
  } else {
    alertMsgBox.className = 'alert-status-banner state-critical';
    alertMsgTitle.textContent = 'CRITICAL EMERGENCY ALERT';
    alertMsgDesc.textContent = risk.statusReason;
  }
}
const cardGas=document.getElementById('card-sensor-gas');
const gasMain=document.getElementById('gas-reading-main');
const gasSub=document.getElementById('gas-reading-sub');
const gasPts=document.getElementById('gas-points-tag');

if(!isOnline){
cardGas.classList.remove('has-alert');
gasMain.textContent='-- PPM';
gasSub.className='sensor-substatus offline';
gasSub.textContent='Offline';
if(gasPts)gasPts.textContent='';
}else{
gasMain.textContent=`${appState.gasPpm} PPM`;
if(gasPts)gasPts.textContent='';
if(risk.hazardFlags.isHighGasHazard){
cardGas.classList.add('has-alert');
gasSub.className='sensor-substatus danger';
gasSub.textContent='High gas level';
}else{
cardGas.classList.remove('has-alert');
gasSub.className='sensor-substatus safe';
gasSub.textContent='Normal';
}
}

const cardTemp=document.getElementById('card-sensor-temp');
const tempMain=document.getElementById('temp-reading-main');
const tempSub=document.getElementById('temp-reading-sub');
const tempPts=document.getElementById('temp-points-tag');

if(!isOnline){
cardTemp.classList.remove('has-alert');
tempMain.textContent='-- °C';
tempSub.className='sensor-substatus offline';
tempSub.textContent='Offline';
if(tempPts)tempPts.textContent='';
}else{
tempMain.textContent = appState.temperature !== null ? `${appState.temperature.toFixed(1)} °C` : '-- °C';
if(tempPts)tempPts.textContent='';
if(risk.hazardFlags.isHighTempHazard){
cardTemp.classList.add('has-alert');
tempSub.className='sensor-substatus danger';
tempSub.textContent='High temperature';
}else{
cardTemp.classList.remove('has-alert');
tempSub.className='sensor-substatus safe';
tempSub.textContent='Normal';
}
}

const flameCard=document.getElementById('card-sensor-flame');
const flameMain=document.getElementById('flame-reading-main');
const flameSub=document.getElementById('flame-reading-sub');

if(!isOnline){
flameCard.classList.remove('has-alert');
flameMain.textContent='--';
flameSub.className='sensor-substatus offline';
flameSub.textContent='Offline';
}else if(appState.flameDetected){
flameCard.classList.add('has-alert');
flameMain.textContent='DETECTED';
flameSub.className='sensor-substatus danger';
flameSub.textContent='Immediate hazard';
}else{
flameCard.classList.remove('has-alert');
flameMain.textContent='CLEAR';
flameSub.className='sensor-substatus safe';
flameSub.textContent='No flame detected';
}

const riskScoreEl=document.getElementById('risk-score');
if(riskScoreEl)riskScoreEl.textContent=isOnline?risk.score:'--';
updateGaugeDisplay(risk.score);

const humidityEl=document.getElementById('humidity-value');
if(humidityEl)humidityEl.textContent=isOnline&&appState.humidity!==null?`${appState.humidity.toFixed(1)}%`:'--';

const wifiEl=document.getElementById('wifi-rssi');
if(wifiEl)wifiEl.textContent=isOnline&&appState.wifiRssi!==null?`${appState.wifiRssi} dBm`:'--';

const buzzerDot=document.getElementById('buzzer-dot');
const buzzerWord=document.getElementById('buzzer-status-word');
const buzzerSubDesc=document.getElementById('buzzer-sub-desc');
const buzzerToggleBtn=document.getElementById('btn-sound-toggle');

if(appState.buzzerSilenced){
buzzerDot.className='buzzer-dot silenced';
buzzerWord.textContent='Silenced';
buzzerSubDesc.textContent='Buzzer muted by dashboard control';
buzzerToggleBtn.textContent='Enable Buzzer';
buzzerToggleBtn.className='btn-action btn-enable';
}else if(risk.level==='CRITICAL'&&isOnline){
buzzerDot.className='buzzer-dot danger';
buzzerWord.textContent='WARNING';
buzzerSubDesc.textContent='High frequency piezo siren active on ESP32 GPIO 23';
}else{
buzzerDot.className=isOnline?'buzzer-dot active':'buzzer-dot';
buzzerWord.textContent=isOnline?'Active':'Armed';
buzzerSubDesc.textContent='Local piezo alarm is ready on GPIO 23';
}
buzzerToggleBtn.textContent='Silence Buzzer';
buzzerToggleBtn.className='btn-action btn-silence';

const oledSync=document.getElementById('oled-disp-sync');
const oledTemp=document.getElementById('oled-disp-temp');
const oledGas=document.getElementById('oled-disp-gas');
const oledFlame=document.getElementById('oled-disp-flame');
const oledStatus=document.getElementById('oled-disp-status');

if(!isOnline){
oledSync.textContent='[OFFLINE]';
oledTemp.textContent='-- °C';
oledGas.textContent='-- PPM';
oledFlame.textContent='--';
oledStatus.textContent='OFFLINE';
}else{
oledSync.textContent=`[${risk.level}]`;
oledTemp.textContent=`${appState.temperature.toFixed(1)}°C`;
oledGas.textContent=`${appState.gasPpm} PPM`;
oledFlame.textContent=appState.flameDetected?'YES':'NO';
oledStatus.textContent=risk.level;
}

const telMcu=document.getElementById('telemetry-mcu');
const telMcuSub=document.getElementById('telemetry-mcu-sub');
const telWifi=document.getElementById('telemetry-wifi-rssi');
const telWifiSub=document.getElementById('telemetry-wifi-sub');
const telLeds=document.getElementById('telemetry-leds');

if(telMcu){
if(!isOnline){
telMcu.textContent='ESP32 DevKit v1';
if(telMcuSub)telMcuSub.textContent='Offline (No Data)';
if(telWifi)telWifi.textContent='Offline';
if(telWifiSub)telWifiSub.textContent='Awaiting connection';
if(telLeds)telLeds.textContent='Offline';
}else if(appState.demoMode){
telMcu.textContent='ESP32 (Simulated)';
if(telMcuSub)telMcuSub.textContent='Demo Mode Active';
if(telWifi)telWifi.textContent='Demo Wi-Fi';
if(telWifiSub)telWifiSub.textContent='RSSI: -54 dBm (Test)';
if(telLeds)telLeds.textContent=risk.level==='SAFE'?'🟢 GRN ON / 🔴 RED OFF':(risk.level==='WARNING'?'🟡 GRN BLINK / 🔴 RED OFF':'🟢 GRN OFF / 🔴 RED STROBE');
}else{
telMcu.textContent='ESP32-WROOM-32';
if(telMcuSub)telMcuSub.textContent='Hardware Node Online';
if(telWifi)telWifi.textContent=`${appState.wifiRssi||-54} dBm`;
if(telWifiSub)telWifiSub.textContent='Firebase Connected';
if(telLeds)telLeds.textContent=risk.level==='SAFE'?'🟢 GRN ON / 🔴 RED OFF':(risk.level==='WARNING'?'🟡 GRN BLINK / 🔴 RED OFF':'🟢 GRN OFF / 🔴 RED STROBE');
}
}

const sliderGas=document.getElementById('slider-gas-ctrl');
const sliderGasNum=document.getElementById('slider-gas-num');
const sliderTemp=document.getElementById('slider-temp-ctrl');
const sliderTempNum=document.getElementById('slider-temp-num');
const sliderFlame=document.getElementById('slider-flame-ctrl');
const sliderFlameNum=document.getElementById('slider-flame-num');

sliderGas.disabled=!appState.demoMode;
sliderTemp.disabled=!appState.demoMode;
sliderFlame.disabled=!appState.demoMode;

if(!appState.demoMode&&!appState.hardwareConnected){
sliderGasNum.textContent='-- PPM (-- / 40 pts)';
sliderTempNum.textContent='-- °C (-- / 30 pts)';
sliderFlameNum.textContent='Offline';
sliderFlameNum.style.color='#64748b';
}else{
sliderGasNum.textContent=`${appState.gasPpm} PPM (${risk.gasPoints} / 40 pts)`;
sliderGas.value=appState.gasPpm;
sliderTempNum.textContent=`${appState.temperature.toFixed(1)} °C (${risk.tempPoints} / 30 pts)`;
sliderTemp.value=appState.temperature.toFixed(1);
sliderFlame.checked=appState.flameDetected;
if(appState.flameDetected){
sliderFlameNum.textContent='Active Flame (+100 pts)';
sliderFlameNum.style.color='#ef4444';
}else{
sliderFlameNum.textContent='Clear (0 pts)';
sliderFlameNum.style.color='#10b981';
}
}

if(isOnline&&risk.level==='CRITICAL'&&!appState.buzzerSilenced){
playSynthesizedTone('CRITICAL_PULSE');
}
}

function setDemoMode(enable){
appState.demoMode=enable;
document.getElementById('demo-mode-toggle').checked=enable;

if(enable){
if(appState.gasPpm===null)appState.gasPpm=280;
if(appState.temperature===null)appState.temperature=27.4;
appState.flameDetected=false;
appState.tempHistory=[27.2,27.1,27.5,27.4,27.6,27.4,27.4,27.4];
if(tempChart){
tempChart.data.datasets[0].data=appState.tempHistory;
tempChart.update('none');
}
}else{
if(!appState.hardwareConnected){
appState.gasPpm=null;
appState.temperature=null;
appState.flameDetected=false;
appState.tempHistory=[null,null,null,null,null,null,null,null];
if(tempChart){
tempChart.data.datasets[0].data=appState.tempHistory;
tempChart.update('none');
}
}
}
refreshDashboard();
}

function applyDemoPreset(presetName){
if(!appState.demoMode)setDemoMode(true);

switch(presetName){
case 'SAFE':
appState.gasPpm=280;
appState.temperature=27.4;
appState.flameDetected=false;
break;
case 'GAS_WARNING':
appState.gasPpm=950;
appState.temperature=25;
appState.flameDetected=false;
break;
case 'COMBO_WARNING':
appState.gasPpm=600;
appState.temperature=38;
appState.flameDetected=false;
break;
case 'CRITICAL_FLAME':
appState.gasPpm=280;
appState.temperature=27.4;
appState.flameDetected=true;
break;
case 'CRITICAL_COMBO':
appState.gasPpm=1150;
appState.temperature=48;
appState.flameDetected=false;
break;
}
updateTrendData(appState.temperature);
refreshDashboard();
}

function getAudioEngine(){
if(!appState.audioCtx){
const AudioContext=window.AudioContext||window.webkitAudioContext;
appState.audioCtx=new AudioContext();
}
if(appState.audioCtx.state==='suspended')appState.audioCtx.resume();
return appState.audioCtx;
}

let lastToneStamp=0;

function playSynthesizedTone(type='TEST'){
const now=Date.now();
if(now-lastToneStamp<600)return;
lastToneStamp=now;

try{
const ctx=getAudioEngine();
const osc=ctx.createOscillator();
const gain=ctx.createGain();
osc.connect(gain);
gain.connect(ctx.destination);

if(type==='TEST'){
osc.type='square';
osc.frequency.setValueAtTime(2400,ctx.currentTime);
osc.frequency.setValueAtTime(2800,ctx.currentTime+0.1);
gain.gain.setValueAtTime(0.12,ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.22);
osc.start(ctx.currentTime);
osc.stop(ctx.currentTime+0.22);
}else if(type==='CRITICAL_PULSE'){
osc.type='sawtooth';
osc.frequency.setValueAtTime(2200,ctx.currentTime);
gain.gain.setValueAtTime(0.15,ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.01,ctx.currentTime+0.3);
osc.start(ctx.currentTime);
osc.stop(ctx.currentTime+0.3);
}
}catch(err){
console.log('AudioContext ready after user interaction');
}
}

window.updateDashboardFromIoTData=function(payload){
if(!payload||typeof payload!=='object')return;

appState.hardwareConnected=true;
appState.demoMode=false;
document.getElementById('demo-mode-toggle').checked=false;

if(typeof payload.temperature==='number')appState.temperature=payload.temperature;
if(typeof payload.gasPpm==='number')appState.gasPpm=payload.gasPpm;
if(typeof payload.flameDetected==='boolean')appState.flameDetected=payload.flameDetected;
if(typeof payload.humidity==='number')appState.humidity=payload.humidity;
if(typeof payload.wifiRssi==='number')appState.wifiRssi=payload.wifiRssi;
if(typeof payload.buzzerSilenced==='boolean')appState.buzzerSilenced=payload.buzzerSilenced;

updateTrendData(appState.temperature);
refreshDashboard();
};

function initFirebase(){
connectionRef.on("value",snapshot=>{
appState.hardwareConnected=snapshot.val()===true;
if(!appState.hardwareConnected)refreshDashboard();
});

sensorRef.on("value",snapshot=>{
const data=snapshot.val();
console.log("FIREBASE DATA RECEIVED:", data);

if(!data){
appState.gasPpm=null;
appState.temperature=null;
appState.flameDetected=false;
appState.humidity=null;
appState.wifiRssi=null;
refreshDashboard();
return;
}

if(appState.demoMode)return;

const payload={};

if(data.temperature!==undefined)payload.temperature=Number(data.temperature);
if(data.gasPPM!==undefined)payload.gasPpm=Number(data.gasPPM);
if(data.flame!==undefined)payload.flameDetected=Boolean(data.flame);
if(data.humidity!==undefined)payload.humidity=Number(data.humidity);
if(data.wifiRssi!==undefined)payload.wifiRssi=Number(data.wifiRssi);
if(data.buzzerEnabled!==undefined)payload.buzzerSilenced=!Boolean(data.buzzerEnabled);

window.updateDashboardFromIoTData(payload);
});
}

function setupEventListeners(){
document.getElementById('demo-mode-toggle').addEventListener('change',(e)=>{
setDemoMode(e.target.checked);
});

document.getElementById('btn-sound-test').addEventListener('click',()=>{
playSynthesizedTone('TEST');
});

document.getElementById('btn-sound-toggle').addEventListener('click',()=>{
appState.buzzerSilenced=!appState.buzzerSilenced;
refreshDashboard();
});

document.getElementById('slider-gas-ctrl').addEventListener('input',(e)=>{
if(!appState.demoMode)return;
appState.gasPpm=parseInt(e.target.value);
refreshDashboard();
});

document.getElementById('slider-temp-ctrl').addEventListener('input',(e)=>{
if(!appState.demoMode)return;
appState.temperature=parseFloat(e.target.value);
updateTrendData(appState.temperature);
refreshDashboard();
});

document.getElementById('slider-flame-ctrl').addEventListener('change',(e)=>{
if(!appState.demoMode)return;
appState.flameDetected=e.target.checked;
refreshDashboard();
});
}

function toggleIntegrationDrawer(){
const drawer=document.getElementById('integration-drawer');
const arrow=document.getElementById('drawer-arrow');

if(drawer){
drawer.classList.toggle('open');
if(arrow)arrow.textContent=drawer.classList.contains('open')?'▲':'▼';
}
}

window.addEventListener('DOMContentLoaded',()=>{
initTemperatureChart();
setupEventListeners();
initFirebase();
refreshDashboard();
});