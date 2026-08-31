// ============================================================
// TulipFleet PortXL Demo Simulator — sim-portxl.js
// KARAR-3a · Payload sözleşmesi: docs/DEMO-SIM-MQTT-SPEC.md
// (fleet_tracker_v5_0_4.ino satır 2166-2170, 2374-2394 birebir)
// Kullanım:  MQTT_PASS='<EMQX sifresi>' node sim-portxl.js
// Ortam degiskenleri: MQTT_URL (vars: mqtts://mqtt.tulipfleet.com:8883)
//                     TICK_MS (vars: 4000)
// ============================================================
const mqtt = require("mqtt");

const MQTT_URL = process.env.MQTT_URL || "mqtts://mqtt.tulipfleet.com:8883";
const MQTT_USER = process.env.MQTT_USER || "fleet_esp32";
const MQTT_PASS = process.env.MQTT_PASS;
const TICK_MS = parseInt(process.env.TICK_MS || "4000", 10);
if (!MQTT_PASS) { console.error("MQTT_PASS env eksik"); process.exit(1); }

// Rotalar: seed görevleriyle uyumlu (RDM-1001..1006 waypoint koordinatları)
// Araçlar rota sonunda geri döner (ping-pong) — demo boyunca sürekli hareket
const FLEET = [
  { id: "a1b2c3d40001", name: "43-BXK-1 ECT->Botlek", speedKmh: 70, route: [
    [51.9536,4.0555],[51.9440,4.1050],[51.9300,4.1600],[51.9120,4.2150],[51.8980,4.2560],[51.8850,4.2870]]},
  { id: "a1b2c3d40002", name: "56-BNT-2 Waalhaven->Euromax", speedKmh: 75, route: [
    [51.8880,4.4350],[51.8950,4.3700],[51.9050,4.3000],[51.9200,4.2200],[51.9400,4.1500],[51.9575,4.0958]]},
  { id: "a1b2c3d40003", name: "78-BZL-3 Botlek->Pernis", speedKmh: 55, route: [
    [51.8850,4.2870],[51.8845,4.3200],[51.8855,4.3550],[51.8865,4.3830]]},
  { id: "a1b2c3d40004", name: "12-TFE-4 ZE Centrum", speedKmh: 40, route: [
    [51.8880,4.4350],[51.8990,4.4500],[51.9100,4.4650],[51.9225,4.4792]]},
  { id: "a1b2c3d40005", name: "34-TFE-5 ZE Kralingen", speedKmh: 40, route: [
    [51.8880,4.4350],[51.9000,4.4600],[51.9130,4.4900],[51.9260,4.5120]]},
];

const R = 6371000;
const toRad = d => d*Math.PI/180, toDeg = r => r*180/Math.PI;
function dist(a,b){const dLat=toRad(b[0]-a[0]),dLng=toRad(b[1]-a[1]);
  const h=Math.sin(dLat/2)**2+Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));}
function bearing(a,b){const y=Math.sin(toRad(b[1]-a[1]))*Math.cos(toRad(b[0]));
  const x=Math.cos(toRad(a[0]))*Math.sin(toRad(b[0]))-Math.sin(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.cos(toRad(b[1]-a[1]));
  return (toDeg(Math.atan2(y,x))+360)%360;}
function interp(a,b,f){return [a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f];}
const ts = () => new Date().toISOString().replace(/\.\d{3}Z$/,"Z"); // firmware: %Y-%m-%dT%H:%M:%SZ

class Sim {
  constructor(cfg){ Object.assign(this,cfg);
    this.seg=0; this.frac=0; this.dir=1; this.start=Date.now();
    this.client = mqtt.connect(MQTT_URL,{username:MQTT_USER,password:MQTT_PASS,
      clientId:"sim_"+this.id, rejectUnauthorized:false, reconnectPeriod:3000});
    this.client.on("connect",()=>console.log(`[${this.name}] MQTT bagli`));
    this.client.on("error",e=>console.error(`[${this.name}] MQTT hata:`,e.message));
  }
  step(){
    const a=this.route[this.seg], b=this.route[this.seg+this.dir];
    const segLen=dist(a,b);
    const stepM=(this.speedKmh/3.6)*(TICK_MS/1000)*(0.9+Math.random()*0.2);
    this.frac+=stepM/segLen;
    let pos, hdg=bearing(this.dir>0?a:b, this.dir>0?b:a);
    if(this.frac>=1){ this.seg+=this.dir; this.frac=0;
      if(this.seg<=0){this.seg=0;this.dir=1;}
      if(this.seg>=this.route.length-1){this.seg=this.route.length-1;this.dir=-1;}
      pos=this.route[this.seg];
    } else pos=interp(a,b,this.dir>0?this.frac:1-this.frac);
    return {pos,hdg};
  }
  publishLocation(){
    const {pos,hdg}=this.step();
    const payload={ device_id:this.id, timestamp:ts(),
      latitude:+pos[0].toFixed(6), longitude:+pos[1].toFixed(6),
      speed:+(this.speedKmh*(0.9+Math.random()*0.2)).toFixed(1),
      heading:+hdg.toFixed(1), altitude:+(2+Math.random()*3).toFixed(1),
      satellites:8+Math.floor(Math.random()*5), hdop:+(0.8+Math.random()*0.8).toFixed(1),
      wifi_rssi:-45-Math.floor(Math.random()*25), fw_version:"5.0.4",
      accel_x:+(Math.random()*0.06-0.03).toFixed(3),
      accel_y:+(Math.random()*0.06-0.03).toFixed(3),
      accel_z:+(9.75+Math.random()*0.1).toFixed(2) };
    this.client.publish(`fleet/device/${this.id}/location`, JSON.stringify(payload));
  }
  publishHeartbeat(){
    this.client.publish(`fleet/device/${this.id}/heartbeat`, JSON.stringify({
      device_id:this.id, timestamp:ts(), uptime:Math.floor((Date.now()-this.start)/1000)}));
  }
}

const sims = FLEET.map(c=>new Sim(c));
setInterval(()=>sims.forEach(s=>{ if(s.client.connected) s.publishLocation(); }), TICK_MS);
setInterval(()=>sims.forEach(s=>{ if(s.client.connected) s.publishHeartbeat(); }), 60000);
setInterval(()=>console.log(`[sim] ${ts()} 5 arac aktif, tick=${TICK_MS}ms`), 30000);
console.log(`PortXL simulator basladi -> ${MQTT_URL}, ${FLEET.length} arac, tick ${TICK_MS}ms`);
