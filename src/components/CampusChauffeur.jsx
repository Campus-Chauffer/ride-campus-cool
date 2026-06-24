import { useState, useEffect, useRef } from "react";

const YELLOW = "#FFB800";
const DARK = "#111111";
const WHITE = "#FFFFFF";
const GRAY = "#F2F2F2";
const GRAY2 = "#E0E0E0";
const TEXT_MUTED = "#888";

const getTimeSlot = () => {
  const h = new Date().getHours();
  return h >= 5 && h < 22 ? "day" : "night";
};

const RIDE_OPTIONS = [
  { id:"standard", icon:"🚗", name:"Standard Ride", desc:"Everyday campus rides", dayPrice:13, nightPrice:16 },
  { id:"comfort",  icon:"❄️", name:"Comfort Ride",  desc:"Air-conditioned, smoother trip", dayPrice:15, nightPrice:18 },
];

const CAMPUS_PLACES = [
  { icon:"📚", name:"Balme Library",              category:"Academic",   coords:[5.6512,-0.1869] },
  { icon:"🏛️", name:"Great Hall",                 category:"Landmark",   coords:[5.6502,-0.1862] },
  { icon:"🎓", name:"Faculty of Law",             category:"Department", coords:[5.6490,-0.1880] },
  { icon:"🔬", name:"Science Faculty",            category:"Department", coords:[5.6525,-0.1855] },
  { icon:"💼", name:"UG Business School (UGBS)",  category:"Department", coords:[5.6498,-0.1845] },
  { icon:"🏥", name:"UG Hospital",                category:"Facility",   coords:[5.6535,-0.1900] },
  { icon:"⚽", name:"Athletic Oval",              category:"Sports",     coords:[5.6480,-0.1830] },
  { icon:"🏠", name:"Commonwealth Hall",          category:"Hostel",     coords:[5.6460,-0.1810] },
  { icon:"🏠", name:"Legon Hall",                 category:"Hostel",     coords:[5.6472,-0.1858] },
  { icon:"🏠", name:"Mensah Sarbah Hall",         category:"Hostel",     coords:[5.6455,-0.1870] },
  { icon:"🏠", name:"Akuafo Hall",                category:"Hostel",     coords:[5.6465,-0.1840] },
  { icon:"🏠", name:"Volta Hall",                 category:"Hostel",     coords:[5.6475,-0.1825] },
  { icon:"🏠", name:"International Students Hostel", category:"Hostel", coords:[5.6520,-0.1895] },
  { icon:"🍔", name:"Enam's Place",               category:"Food",       coords:[5.6445,-0.1860] },
  { icon:"🛒", name:"Akornor Market",             category:"Market",     coords:[5.6440,-0.1845] },
  { icon:"☕", name:"Frank Shop",                 category:"Food",       coords:[5.6510,-0.1850] },
  { icon:"🏫", name:"UG Main Administration",     category:"Office",     coords:[5.6505,-0.1875] },
  { icon:"🚌", name:"Legon Interchange",          category:"Transport",  coords:[5.6420,-0.1910] },
  { icon:"📖", name:"Ghana Bookshop",             category:"Shop",       coords:[5.6500,-0.1870] },
  { icon:"🏊", name:"UG Swimming Pool",           category:"Sports",     coords:[5.6488,-0.1820] },
  { icon:"🎓", name:"Noguchi Memorial Institute", category:"Research",   coords:[5.6540,-0.1880] },
  { icon:"🏬", name:"Pentagon Shops",             category:"Market",     coords:[5.6492,-0.1835] },
  { icon:"🏦", name:"Republic Bank UG Branch",    category:"Office",     coords:[5.6508,-0.1862] },
];

const PAST_RIDES = [
  { id:"r1", dest:"Balme Library",         from:"Commonwealth Hall",        date:"Today, 2:30 PM",    price:"GH₵ 13.00", status:"completed",
    driver:{ name:"Kwame Mensah",  rating:4.8, plate:"GR-2341-24", car:"Toyota Corolla",  avatar:"KM" }, duration:"6 min", distance:"1.2 km" },
  { id:"r2", dest:"UG Business School (UGBS)", from:"Legon Hall",           date:"Yesterday, 11:15 AM", price:"GH₵ 13.00", status:"completed",
    driver:{ name:"Ama Boateng",   rating:4.9, plate:"AS-1122-23", car:"Honda Civic",     avatar:"AB" }, duration:"4 min", distance:"0.9 km" },
  { id:"r3", dest:"Athletic Oval",          from:"Mensah Sarbah Hall",       date:"Mon, 4:00 PM",      price:"GH₵ 13.00", status:"cancelled",
    driver:null, duration:"—", distance:"—" },
  { id:"r4", dest:"Enam's Place",           from:"Akuafo Hall",             date:"Sun, 7:45 PM",      price:"GH₵ 16.00", status:"completed",
    driver:{ name:"Kofi Asante",   rating:4.7, plate:"GN-5566-22", car:"Hyundai i10",     avatar:"KA" }, duration:"8 min", distance:"1.8 km" },
  { id:"r5", dest:"UG Hospital",            from:"International Students Hostel", date:"Sat, 9:00 AM", price:"GH₵ 13.00", status:"completed",
    driver:{ name:"Abena Osei",    rating:5.0, plate:"GW-7890-24", car:"Kia Picanto",     avatar:"AO" }, duration:"5 min", distance:"1.0 km" },
];

// ── Driver Data ──────────────────────────────────────────────────────────────
const DRIVER_CHECKLIST_ITEMS = [
  { id:"ac", label:"Air Conditioning (AC)", icon:"❄️" },
  { id:"headlights", label:"Headlights", icon:"💡" },
  { id:"taillights", label:"Tail Lights", icon:"🔴" },
  { id:"indicators", label:"Turn Indicators", icon:"🔶" },
  { id:"seatbelts", label:"Seatbelts (all seats)", icon:"🪢" },
  { id:"wipers", label:"Windshield Wipers", icon:"🌧️" },
  { id:"horn", label:"Horn", icon:"📢" },
  { id:"mirrors", label:"Side Mirrors", icon:"🪞" },
  { id:"brakelights", label:"Brake Lights", icon:"🛑" },
];

const HEATMAP_ZONES = [
  { coords:[5.6502,-0.1862], radius:120, intensity:0.9, label:"Great Hall" },
  { coords:[5.6512,-0.1869], radius:100, intensity:0.8, label:"Balme Library" },
  { coords:[5.6460,-0.1810], radius:90, intensity:0.75, label:"Commonwealth" },
  { coords:[5.6472,-0.1858], radius:80, intensity:0.7, label:"Legon Hall" },
  { coords:[5.6420,-0.1910], radius:110, intensity:0.85, label:"Interchange" },
  { coords:[5.6498,-0.1845], radius:70, intensity:0.6, label:"UGBS" },
];

const DRIVER_PAST_RIDES = [
  { id:"dr1", pickup:"Commonwealth Hall", dest:"Balme Library", date:"Today, 2:30 PM", fare:13, type:"standard", passenger:{name:"Ama Serwaa", rating:4.9, avatar:"AS"} },
  { id:"dr2", pickup:"Legon Hall", dest:"UGBS", date:"Today, 11:15 AM", fare:15, type:"comfort", passenger:{name:"Kofi Mensah", rating:4.7, avatar:"KM"} },
  { id:"dr3", pickup:"Mensah Sarbah Hall", dest:"Athletic Oval", date:"Yesterday, 4:00 PM", fare:13, type:"standard", passenger:{name:"Adwoa Boateng", rating:5.0, avatar:"AB"} },
  { id:"dr4", pickup:"Akuafo Hall", dest:"Enam's Place", date:"Yesterday, 7:45 PM", fare:16, type:"standard", passenger:{name:"Yaw Asante", rating:4.8, avatar:"YA"} },
  { id:"dr5", pickup:"International Students Hostel", dest:"UG Hospital", date:"Mon, 9:00 AM", fare:15, type:"comfort", passenger:{name:"Nana Osei", rating:4.6, avatar:"NO"} },
  { id:"dr6", pickup:"Pentagon Shops", dest:"Great Hall", date:"Mon, 1:30 PM", fare:13, type:"standard", passenger:{name:"Efua Mensah", rating:4.9, avatar:"EM"} },
  { id:"dr7", pickup:"Volta Hall", dest:"Science Faculty", date:"Sun, 10:00 AM", fare:16, type:"standard", passenger:{name:"Kweku Darko", rating:4.5, avatar:"KD"} },
];

const DEMO_CHAT_MESSAGES = [
  { id:1, from:"other", text:"Hi, I'm on my way!", time:"2:31 PM" },
  { id:2, from:"me", text:"Great, I'm at the main gate", time:"2:32 PM" },
  { id:3, from:"other", text:"I'll be there in about 2 minutes", time:"2:32 PM" },
];

const SUPPORT_TOPICS = [
  { icon:"🔑", title:"Account Issues", desc:"Login problems, verification, account recovery", items:["Can't log in","Verification stuck","Reset password","Update phone number"] },
  { icon:"💰", title:"Payments & Fares", desc:"Fare disputes, payment issues, refunds", items:["Incorrect fare charged","Payment didn't go through","Request a refund","Commission dispute"] },
  { icon:"🚗", title:"Ride Issues", desc:"Problems during or after a ride", items:["Driver didn't show up","Wrong route taken","Lost item in vehicle","Ride was cancelled unfairly"] },
  { icon:"🛡️", title:"Safety Concerns", desc:"Report safety incidents", items:["Felt unsafe during ride","Driver behaviour concern","Accident report","Harassment report"] },
  { icon:"📱", title:"App & Technical", desc:"Bugs, crashes, feature requests", items:["App keeps crashing","Map not loading","Notifications not working","Feature suggestion"] },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
html,body{height:100%;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#111;}

/* SPLASH SCREEN */
.splash-screen{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${YELLOW};position:relative;overflow:hidden;}
.splash-logo{font-size:64px;animation:splashPop 0.8s cubic-bezier(0.34,1.56,0.64,1);}
.splash-title{font-family:'Inter',sans-serif;font-size:28px;font-weight:700;color:${DARK};margin-top:14px;animation:splashFadeUp 0.8s ease-out 0.2s both;}
.splash-sub{font-size:13px;color:rgba(0,0,0,0.55);margin-top:6px;animation:splashFadeUp 0.8s ease-out 0.4s both;}
.splash-loader{margin-top:36px;display:flex;gap:6px;animation:splashFadeUp 0.8s ease-out 0.6s both;}
.splash-dot{width:8px;height:8px;background:rgba(0,0,0,0.25);border-radius:50%;animation:dotPulse 1.2s ease-in-out infinite;}
.splash-dot:nth-child(2){animation-delay:0.2s;}
.splash-dot:nth-child(3){animation-delay:0.4s;}
@keyframes splashPop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes splashFadeUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}

/* SCREEN TRANSITIONS */
.screen-transition{animation:screenFadeIn 0.3s ease-out;}
@keyframes screenFadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.screen-slide-left{animation:screenSlideLeft 0.3s ease-out;}
@keyframes screenSlideLeft{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
.screen-slide-right{animation:screenSlideRight 0.3s ease-out;}
@keyframes screenSlideRight{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}

.app-shell{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:14px 10px 22px;gap:12px;background:#1a1a2e;}

.phone-frame{
  position:relative;width:100%;max-width:410px;
  padding:12px;
  background:linear-gradient(145deg,#2a2a2a 0%,#1a1a1a 50%,#0d0d0d 100%);
  border-radius:50px;
  box-shadow:0 40px 80px rgba(0,0,0,0.8),0 0 0 1px rgba(255,255,255,0.08),inset 0 1px 0 rgba(255,255,255,0.1),inset 0 -1px 0 rgba(0,0,0,0.3);
}
.phone-frame::before{
  content:'';position:absolute;top:50%;right:-3px;transform:translateY(-50%);
  width:3px;height:60px;background:linear-gradient(180deg,#333,#1a1a1a,#333);border-radius:0 3px 3px 0;
}
.phone-frame::after{
  content:'';position:absolute;top:28%;left:-3px;
  width:3px;height:30px;background:linear-gradient(180deg,#333,#1a1a1a,#333);border-radius:3px 0 0 3px;
  box-shadow:0 40px 0 0 #222,0 -25px 0 0 #222;
}
.phone-notch{
  position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:50;
  width:126px;height:34px;background:#000;border-radius:0 0 18px 18px;
  display:flex;align-items:center;justify-content:center;gap:8px;
}
.phone-notch::after{
  content:'';width:10px;height:10px;background:radial-gradient(circle,#1a1a3a 40%,#0a0a1a 100%);border-radius:50%;
  box-shadow:inset 0 0 2px rgba(50,50,120,0.5);
}
.phone-shell{
  width:100%;
  height:calc(100dvh - 76px);
  min-height:580px;max-height:844px;
  background:${WHITE};border-radius:40px;overflow:hidden;position:relative;
  display:flex;flex-direction:column;
}
.phone-home-indicator{
  position:absolute;bottom:8px;left:50%;transform:translateX(-50%);z-index:50;
  width:134px;height:5px;background:rgba(0,0,0,0.25);border-radius:100px;
}
.screen{width:100%;height:100%;overflow:hidden;position:relative;display:flex;flex-direction:column;}

/* AUTH */
.auth-screen{background:#F7F7F5;display:flex;flex-direction:column;height:100%;}
.auth-top{padding:44px 26px 18px;flex-shrink:0;}
.auth-top h1{font-family:'Inter',sans-serif;font-size:34px;font-weight:700;color:${DARK};line-height:1.1;letter-spacing:-0.5px;}
.auth-top p{font-size:13px;color:${TEXT_MUTED};margin-top:4px;}

/* ANIMATED TOGGLE - FIXED overflow */
.toggle-row{display:flex;background:#E5E5E5;border-radius:50px;padding:4px;margin-top:16px;width:fit-content;position:relative;overflow:hidden;}
.toggle-slider{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:50px;background:${YELLOW};transition:transform 300ms ease-out;z-index:0;pointer-events:none;}
.toggle-slider.driver{transform:translateX(100%);}
.toggle-slider.passenger{transform:translateX(0%);}
.toggle-btn{padding:7px 22px;border-radius:50px;border:none;font-family:'Inter',sans-serif;font-size:12px;font-weight:500;cursor:pointer;letter-spacing:0.3px;text-transform:uppercase;background:transparent;position:relative;z-index:1;transition:color 300ms ease-out;}
.toggle-btn.active{color:${DARK};}
.toggle-btn.inactive{color:${TEXT_MUTED};}

.auth-card{background:${YELLOW};border-radius:26px 26px 0 0;flex:1;padding:22px 22px 18px;display:flex;flex-direction:column;overflow-y:auto;}
.auth-card h2{font-family:'Inter',sans-serif;font-size:19px;font-weight:600;color:${DARK};margin-bottom:14px;}
.input-row{display:flex;gap:8px;}
.input-row .field{flex:1;}
.field{margin-bottom:9px;}
.field input{width:100%;padding:12px 13px;background:rgba(255,255,255,0.55);border:none;border-radius:11px;font-family:'Inter',sans-serif;font-size:13px;color:${DARK};outline:none;transition:background 0.2s;}
.field input:focus{background:rgba(255,255,255,0.88);}
.field input::placeholder{color:rgba(0,0,0,0.38);}
.btn-primary{width:100%;padding:14px;background:${DARK};color:${WHITE};border:none;border-radius:13px;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;cursor:pointer;margin-top:5px;transition:transform 0.14s,opacity 0.14s;letter-spacing:0;}
.btn-primary:active{transform:scale(0.97);opacity:0.9;}
.btn-secondary{width:100%;padding:14px;background:transparent;color:${DARK};border:2px solid ${DARK};border-radius:13px;font-family:'Inter',sans-serif;font-size:14px;font-weight:600;cursor:pointer;margin-top:7px;}
.auth-footer{margin-top:12px;text-align:center;font-size:13px;color:rgba(0,0,0,0.55);font-weight:500;}
.auth-footer span{color:${DARK};font-weight:700;cursor:pointer;text-decoration:underline;}
.forgot{text-align:center;font-size:12px;color:rgba(0,0,0,0.5);margin-top:7px;cursor:pointer;}

/* OTP */
.otp-screen{background:${YELLOW};height:100%;display:flex;flex-direction:column;align-items:center;padding:50px 26px 34px;position:relative;overflow:hidden;}
.otp-screen::before{content:'';position:absolute;width:240px;height:240px;border-radius:50%;border:2px solid rgba(0,0,0,0.06);top:-66px;right:-66px;}
.otp-back{align-self:flex-start;background:rgba(0,0,0,0.1);border:none;border-radius:11px;padding:8px 13px;cursor:pointer;font-size:16px;margin-bottom:32px;}
.otp-screen h2{font-family:'Inter',sans-serif;font-size:24px;font-weight:700;color:${DARK};text-align:center;}
.otp-screen>p{font-size:13px;color:rgba(0,0,0,0.6);text-align:center;margin-top:9px;line-height:1.5;}
.otp-inputs{display:flex;gap:9px;margin:28px 0 14px;}
.otp-input{width:50px;height:58px;background:rgba(255,255,255,0.6);border:2px solid transparent;border-radius:13px;font-family:'Inter',sans-serif;font-size:25px;font-weight:600;text-align:center;color:${DARK};outline:none;transition:all 0.2s;}
.otp-input:focus{background:${WHITE};border-color:${DARK};}
.resend-text{font-size:13px;color:rgba(0,0,0,0.55);margin-bottom:26px;}
.resend-text span{color:${DARK};font-weight:700;cursor:pointer;}

/* STUDENT ID */
.id-screen{background:${YELLOW};height:100%;display:flex;flex-direction:column;align-items:center;padding:50px 26px 34px;position:relative;overflow:hidden;}
.upload-box{width:100%;background:rgba(255,255,255,0.55);border:2.5px dashed rgba(0,0,0,0.22);border-radius:20px;padding:40px 26px;display:flex;flex-direction:column;align-items:center;gap:9px;cursor:pointer;margin:22px 0;transition:background 0.2s;}
.upload-box:hover{background:rgba(255,255,255,0.75);}

/* ALL SET */
.allset-screen{background:${YELLOW};height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:34px 26px;position:relative;overflow:hidden;}
.allset-circle{width:150px;height:150px;background:rgba(0,0,0,0.12);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:26px;font-size:68px;animation:popIn 0.6s cubic-bezier(0.34,1.56,0.64,1);position:relative;z-index:1;}
@keyframes popIn{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}

/* HOME */
.home-screen{height:100%;display:flex;flex-direction:column;}
.map-container{flex:1;position:relative;overflow:hidden;}
.map-container .leaflet-container{width:100%!important;height:100%!important;}
.map-overlay-btns{position:absolute;top:13px;left:13px;right:13px;display:flex;justify-content:space-between;align-items:center;z-index:900;pointer-events:none;}
.map-overlay-btns>*{pointer-events:all;}
.menu-btn{width:40px;height:40px;background:${WHITE};border-radius:11px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.22);flex-direction:column;gap:4px;padding:10px;}
.menu-line{width:100%;height:2px;background:${DARK};border-radius:2px;}
.map-recenter{width:40px;height:40px;background:${WHITE};border-radius:11px;border:none;cursor:pointer;font-size:16px;box-shadow:0 3px 10px rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;}
.time-badge{position:absolute;bottom:72px;right:13px;z-index:900;background:rgba(17,17,17,0.85);backdrop-filter:blur(6px);color:${WHITE};font-size:11px;font-weight:700;padding:5px 10px;border-radius:10px;display:flex;align-items:center;gap:5px;}
.where-bar{background:${WHITE};border-radius:18px 18px 0 0;padding:13px 14px 5px;box-shadow:0 -5px 20px rgba(0,0,0,0.1);flex-shrink:0;}
.where-input{display:flex;align-items:center;gap:9px;background:${GRAY};border-radius:11px;padding:11px 13px;cursor:pointer;}
.where-input span{font-size:13px;color:${TEXT_MUTED};}
.where-dot{width:8px;height:8px;background:${YELLOW};border-radius:50%;flex-shrink:0;}
.nav-bar{background:${WHITE};display:flex;justify-content:space-around;padding:9px 14px 18px;flex-shrink:0;}
.nav-item{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:4px 10px;border-radius:10px;transition:background 0.18s;}
.nav-item.active{background:rgba(255,184,0,0.12);}
.nav-icon{font-size:20px;}
.nav-label{font-size:10px;font-weight:600;color:${TEXT_MUTED};}
.nav-item.active .nav-label{color:${YELLOW};}

/* SIDE MENU */
.side-menu{position:absolute;inset:0;z-index:9999;}
.menu-backdrop{position:absolute;inset:0;background:rgba(0,0,0,0.42);backdrop-filter:blur(2px);}
.menu-panel{position:absolute;left:0;top:0;bottom:0;width:264px;background:${WHITE};border-radius:0 26px 26px 0;padding:50px 0 26px;display:flex;flex-direction:column;animation:slideIn 0.26s cubic-bezier(0.34,1.2,0.64,1);box-shadow:8px 0 36px rgba(0,0,0,0.2);}
@keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
.menu-profile{padding:0 18px 18px;border-bottom:1px solid ${GRAY2};margin-bottom:9px;display:flex;align-items:center;gap:11px;}
.profile-avatar{width:50px;height:50px;background:${YELLOW};border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;font-size:19px;font-weight:600;color:${DARK};flex-shrink:0;}
.rating-badge{display:flex;align-items:center;gap:4px;background:rgba(255,184,0,0.15);padding:2px 7px;border-radius:18px;width:fit-content;margin-top:4px;}
.rating-badge span{font-size:11px;font-weight:600;color:#A07800;}
.menu-items{flex:1;padding:0 9px;overflow-y:auto;}
.menu-item{display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:11px;cursor:pointer;transition:background 0.14s;margin-bottom:2px;}
.menu-item:hover{background:${GRAY};}
.menu-item-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.menu-footer{padding:13px 18px 0;border-top:1px solid ${GRAY2};}
.logout-btn{display:flex;align-items:center;gap:9px;color:#E53935;font-size:13px;font-weight:600;cursor:pointer;padding:5px 0;}

/* DESTINATION */
.dest-screen{height:100%;display:flex;flex-direction:column;background:${WHITE};}
.dest-header{padding:42px 16px 13px;background:${WHITE};border-bottom:1px solid ${GRAY2};flex-shrink:0;}
.dest-header h2{font-family:'Inter',sans-serif;font-size:19px;font-weight:600;margin-bottom:12px;}
.location-inputs{display:flex;flex-direction:column;gap:5px;}
.loc-input-row{display:flex;align-items:center;gap:8px;background:${GRAY};border-radius:11px;padding:10px 13px;position:relative;}
.loc-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.loc-dot.pickup{background:${YELLOW};}
.loc-dot.dest{background:${DARK};}
.loc-input-row input{flex:1;border:none;background:transparent;font-family:'Inter',sans-serif;font-size:13px;color:${DARK};outline:none;}
.dest-dropdown{position:absolute;top:calc(100% + 5px);left:0;right:0;background:${WHITE};border-radius:14px;box-shadow:0 8px 28px rgba(0,0,0,0.14);z-index:400;max-height:300px;overflow-y:auto;border:1px solid ${GRAY2};}
.dropdown-item{display:flex;align-items:center;gap:9px;padding:10px 13px;cursor:pointer;transition:background 0.13s;border-bottom:1px solid ${GRAY};}
.dropdown-item:last-child{border-bottom:none;}
.dropdown-item:hover{background:${GRAY};}
.dropdown-cat{font-size:10px;color:${TEXT_MUTED};font-weight:600;text-transform:uppercase;letter-spacing:0.4px;margin-top:1px;}
.section-title{font-size:10px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:1px;margin-bottom:9px;}
.dest-content{flex:1;overflow-y:auto;padding:13px 16px;}
.nearby-item{display:flex;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid ${GRAY};cursor:pointer;}
.nearby-item:hover{background:rgba(255,184,0,0.04);margin:0 -4px;padding:9px 4px;border-radius:9px;}
.nearby-icon{width:36px;height:36px;background:${GRAY};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.nearby-info h4{font-size:13px;font-weight:600;color:${DARK};}
.nearby-info p{font-size:11px;color:${TEXT_MUTED};margin-top:1px;}

/* RIDE SELECT */
.ride-screen{height:100%;display:flex;flex-direction:column;}
.ride-sheet{background:${WHITE};border-radius:22px 22px 0 0;padding:14px 16px 26px;flex-shrink:0;}
.sheet-handle{width:34px;height:4px;background:${GRAY2};border-radius:4px;margin:0 auto 14px;}
.ride-sheet h2{font-family:'Inter',sans-serif;font-size:18px;font-weight:600;margin-bottom:5px;}
.price-note{font-size:11px;color:${TEXT_MUTED};margin-bottom:12px;display:flex;align-items:center;gap:4px;}
.ride-option{display:flex;align-items:center;gap:11px;padding:13px;border-radius:13px;cursor:pointer;transition:all 0.18s;border:2px solid transparent;margin-bottom:7px;}
.ride-option.selected{border-color:${YELLOW};background:rgba(255,184,0,0.06);}
.ride-option:not(.selected):hover{background:${GRAY};}
.ride-img{font-size:28px;flex-shrink:0;}
.ride-details{flex:1;}
.ride-details h3{font-size:14px;font-weight:600;color:${DARK};}
.ride-details p{font-size:11px;color:${TEXT_MUTED};margin-top:2px;}
.ride-price{font-family:'Inter',sans-serif;font-size:17px;font-weight:600;color:${DARK};}
.ride-time-badge{background:rgba(255,184,0,0.15);color:#A07800;font-size:10px;font-weight:700;padding:2px 7px;border-radius:7px;margin-top:3px;display:inline-block;}

/* CONFIRM */
.confirm-screen{height:100%;display:flex;flex-direction:column;}
.confirm-sheet{background:${WHITE};border-radius:22px 22px 0 0;padding:14px 16px 26px;overflow-y:auto;flex-shrink:0;}
.confirm-route{display:flex;gap:11px;margin-bottom:14px;padding:13px;background:${GRAY};border-radius:13px;}
.confirm-dots{display:flex;flex-direction:column;align-items:center;padding-top:3px;}
.cdot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.cline{flex:1;width:2px;background:${GRAY2};margin:3px 0;min-height:16px;}
.confirm-addrs{flex:1;display:flex;flex-direction:column;gap:9px;}
.confirm-addr p:first-child{font-size:9px;color:${TEXT_MUTED};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;}
.confirm-addr p:last-child{font-size:13px;font-weight:600;color:${DARK};margin-top:1px;}
.fare-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid ${GRAY2};}
.fare-row span:first-child{font-size:12px;color:${TEXT_MUTED};}
.fare-row span:last-child{font-size:12px;font-weight:600;color:${DARK};}
.fare-total{display:flex;justify-content:space-between;align-items:center;padding:11px 0 14px;}
.fare-total span:first-child{font-family:'Inter',sans-serif;font-size:14px;font-weight:600;}
.fare-total span:last-child{font-family:'Inter',sans-serif;font-size:21px;font-weight:700;color:${YELLOW};}
.payment-row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:${GRAY};border-radius:10px;margin-bottom:12px;cursor:pointer;}

/* FINDING */
.finding-screen{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:${YELLOW};position:relative;overflow:hidden;}
.sonar{position:absolute;width:100px;height:100px;border-radius:50%;border:2px solid rgba(0,0,0,0.12);animation:sonarRing 2s ease-out infinite;}
.sonar:nth-child(2){animation-delay:0.7s;}
.sonar:nth-child(3){animation-delay:1.4s;}
@keyframes sonarRing{0%{transform:scale(1);opacity:0.8}100%{transform:scale(4.5);opacity:0}}
.car-icon-big{font-size:58px;z-index:2;animation:carBounce 1.5s ease-in-out infinite;}
@keyframes carBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.finding-text{margin-top:40px;z-index:2;text-align:center;}
.finding-text h2{font-family:'Inter',sans-serif;font-size:23px;font-weight:700;color:${DARK};}
.finding-text p{font-size:13px;color:rgba(0,0,0,0.55);margin-top:6px;}
.dot-loader{display:flex;gap:5px;justify-content:center;margin-top:12px;}
.dot{width:7px;height:7px;background:rgba(0,0,0,0.3);border-radius:50%;animation:dotPulse 1.2s ease-in-out infinite;}
.dot:nth-child(2){animation-delay:0.2s;}
.dot:nth-child(3){animation-delay:0.4s;}
@keyframes dotPulse{0%,80%,100%{transform:scale(0.7);opacity:0.5}40%{transform:scale(1);opacity:1}}
.cancel-link{position:absolute;bottom:48px;font-size:13px;font-weight:600;color:rgba(0,0,0,0.5);cursor:pointer;text-decoration:underline;z-index:2;}
.found-btn-wrap{position:absolute;bottom:90px;z-index:2;}

/* EN ROUTE */
.enroute-screen{height:100%;display:flex;flex-direction:column;}
.enroute-sheet{background:${WHITE};border-radius:22px 22px 0 0;padding:14px 16px 26px;flex-shrink:0;}
.eta-banner{background:${YELLOW};border-radius:13px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;margin-bottom:13px;}
.eta-banner h3{font-family:'Inter',sans-serif;font-size:14px;font-weight:600;color:${DARK};}
.eta-banner p{font-size:11px;color:rgba(0,0,0,0.6);}
.eta-time{font-family:'Inter',sans-serif;font-size:28px;font-weight:700;color:${DARK};}
.driver-card{display:flex;align-items:center;gap:11px;padding:13px;background:${GRAY};border-radius:13px;margin-bottom:11px;}
.driver-avatar{width:46px;height:46px;background:${YELLOW};border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;color:${DARK};flex-shrink:0;}
.driver-info h4{font-size:14px;font-weight:700;color:${DARK};}
.driver-info p{font-size:11px;color:${TEXT_MUTED};margin-top:1px;}
.driver-rating{display:flex;align-items:center;gap:3px;font-size:11px;font-weight:600;color:#A07800;}
.plate-badge{background:${DARK};color:${WHITE};font-family:'Inter',sans-serif;font-size:12px;font-weight:600;padding:5px 11px;border-radius:7px;letter-spacing:0.5px;}
.action-btns{display:flex;gap:7px;margin-top:4px;}
.action-btn{flex:1;padding:11px;border:2px solid ${GRAY2};border-radius:11px;background:transparent;font-family:'Inter',sans-serif;font-size:12px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all 0.18s;}
.action-btn:hover{border-color:${YELLOW};background:rgba(255,184,0,0.06);}
.action-btn.danger{border-color:#FFCDD2;color:#E53935;}

/* RATING */
.rating-screen{height:100%;display:flex;flex-direction:column;background:${WHITE};padding:48px 22px 32px;overflow-y:auto;}
.trip-summary-card{background:${GRAY};border-radius:16px;padding:16px;margin:18px 0;}
.trip-stat{display:flex;justify-content:space-between;align-items:center;padding:6px 0;}
.trip-stat:not(:last-child){border-bottom:1px solid ${GRAY2};}
.trip-stat span:first-child{font-size:12px;color:${TEXT_MUTED};}
.trip-stat span:last-child{font-size:12px;font-weight:700;color:${DARK};}
.stars-row{display:flex;gap:7px;justify-content:center;margin:16px 0;}
.star{font-size:34px;cursor:pointer;transition:transform 0.18s;filter:grayscale(1) opacity(0.4);}
.star.lit{filter:grayscale(0);transform:scale(1.1);}
.tip-row{display:flex;gap:6px;margin-bottom:16px;}
.tip-btn{flex:1;padding:8px;border:2px solid ${GRAY2};border-radius:10px;background:transparent;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.18s;}
.tip-btn.selected{border-color:${YELLOW};background:rgba(255,184,0,0.1);}

/* HISTORY */
.history-screen{height:100%;display:flex;flex-direction:column;background:${WHITE};}
.history-header{padding:42px 16px 13px;background:${WHITE};border-bottom:1px solid ${GRAY2};flex-shrink:0;}
.history-header h2{font-family:'Inter',sans-serif;font-size:22px;font-weight:700;}
.history-list{flex:1;overflow-y:auto;padding:12px 16px;}
.history-item{display:flex;align-items:center;gap:9px;padding:11px 6px;border-bottom:1px solid ${GRAY};cursor:pointer;border-radius:10px;transition:background 0.14s;}
.history-item:hover{background:rgba(255,184,0,0.05);}
.history-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
.history-info{flex:1;}
.history-info h4{font-size:13px;font-weight:600;color:${DARK};}
.history-info p{font-size:11px;color:${TEXT_MUTED};margin-top:1px;}
.history-price{font-family:'Inter',sans-serif;font-size:14px;font-weight:600;color:${DARK};}
.history-status{font-size:10px;font-weight:600;padding:2px 6px;border-radius:5px;margin-top:3px;display:inline-block;}
.status-completed{background:rgba(76,175,80,0.12);color:#2E7D32;}
.status-cancelled{background:rgba(229,57,53,0.1);color:#C62828;}

/* RIDE DETAIL */
.ridedetail-screen{height:100%;display:flex;flex-direction:column;background:${WHITE};overflow-y:auto;}
.ridedetail-hero{background:${YELLOW};padding:46px 18px 22px;position:relative;flex-shrink:0;}
.detail-section{padding:16px 18px;border-bottom:1px solid ${GRAY};}
.detail-section h3{font-size:10px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:1px;margin-bottom:11px;}
.detail-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;}
.detail-row span:first-child{font-size:12px;color:${TEXT_MUTED};}
.detail-row span:last-child{font-size:12px;font-weight:600;color:${DARK};}
.driver-detail-card{display:flex;align-items:center;gap:11px;padding:13px;background:${GRAY};border-radius:13px;}
.report-btn{margin:16px 18px 26px;padding:13px;border:2px solid #FFCDD2;border-radius:13px;background:transparent;color:#E53935;font-family:'Inter',sans-serif;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;width:calc(100% - 36px);transition:all 0.18s;}
.report-btn:hover{background:#FFF5F5;}
.report-modal{position:absolute;inset:0;background:rgba(0,0,0,0.48);z-index:500;display:flex;align-items:flex-end;}
.report-sheet{background:${WHITE};border-radius:22px 22px 0 0;padding:22px 18px 38px;width:100%;}
.report-sheet h3{font-family:'Inter',sans-serif;font-size:19px;font-weight:600;margin-bottom:5px;}
.report-option{display:flex;align-items:center;gap:9px;padding:12px 0;border-bottom:1px solid ${GRAY};cursor:pointer;font-size:13px;font-weight:500;color:${DARK};transition:color 0.14s;}
.report-option:hover{color:#E53935;}

/* PROFILE */
.profile-screen{height:100%;display:flex;flex-direction:column;background:${WHITE};}
.profile-hero{background:${YELLOW};padding:46px 20px 26px;display:flex;flex-direction:column;align-items:center;flex-shrink:0;}
.profile-avatar-lg{width:70px;height:70px;background:rgba(0,0,0,0.14);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;font-size:26px;font-weight:700;color:${DARK};margin-bottom:9px;position:relative;}
.edit-badge{position:absolute;bottom:0;right:0;width:22px;height:22px;background:${DARK};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;}
.profile-hero h2{font-family:'Inter',sans-serif;font-size:19px;font-weight:700;color:${DARK};}
.profile-hero p{font-size:11px;color:rgba(0,0,0,0.55);margin-top:3px;}
.profile-stats{display:flex;gap:1px;background:${GRAY2};margin-top:14px;width:100%;border-radius:13px;overflow:hidden;}
.stat-box{flex:1;background:rgba(255,255,255,0.6);padding:9px 5px;text-align:center;}
.stat-box h3{font-family:'Inter',sans-serif;font-size:18px;font-weight:700;color:${DARK};}
.stat-box p{font-size:10px;color:rgba(0,0,0,0.5);margin-top:1px;}
.profile-section{padding:14px 16px;}
.profile-section h3{font-size:10px;font-weight:700;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:1px;margin-bottom:9px;}
.profile-row{display:flex;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid ${GRAY};cursor:pointer;}
.profile-row-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.profile-row-info h4{font-size:13px;font-weight:600;color:${DARK};}
.profile-row-info p{font-size:11px;color:${TEXT_MUTED};margin-top:1px;}
.chevron{color:${GRAY2};font-size:14px;}

/* PROMO */
.promo-screen{height:100%;display:flex;flex-direction:column;background:${WHITE};}
.promo-header{padding:42px 16px 14px;flex-shrink:0;}
.promo-header h2{font-family:'Inter',sans-serif;font-size:22px;font-weight:700;}
.promo-input-row{display:flex;gap:7px;margin:0 16px;flex-shrink:0;}
.promo-input-row input{flex:1;padding:11px 13px;background:${GRAY};border:2px solid transparent;border-radius:11px;font-family:'Inter',sans-serif;font-size:13px;outline:none;transition:border-color 0.18s;}
.promo-input-row input:focus{border-color:${YELLOW};}
.apply-btn{padding:11px 16px;background:${YELLOW};border:none;border-radius:11px;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;cursor:pointer;}
.promo-list{flex:1;overflow-y:auto;padding:14px 16px;}
.promo-card{background:linear-gradient(135deg,${YELLOW} 0%,#FF9500 100%);border-radius:16px;padding:16px;margin-bottom:9px;position:relative;overflow:hidden;cursor:pointer;}
.promo-card::after{content:'';position:absolute;right:-26px;top:-26px;width:100px;height:100px;background:rgba(255,255,255,0.12);border-radius:50%;}
.promo-card h3{font-family:'Inter',sans-serif;font-size:18px;font-weight:700;color:${DARK};}
.promo-card p{font-size:11px;color:rgba(0,0,0,0.6);margin-top:4px;}
.promo-code-badge{background:rgba(0,0,0,0.13);display:inline-block;padding:3px 9px;border-radius:6px;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;color:${DARK};margin-top:9px;letter-spacing:0.5px;}
.promo-card.used{background:${GRAY};opacity:0.7;cursor:default;}
.promo-card.used h3,.promo-card.used p{color:${TEXT_MUTED};}
.used-badge{position:absolute;top:13px;right:13px;background:rgba(0,0,0,0.08);padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;color:${TEXT_MUTED};}

/* SAFETY */
.safety-screen{height:100%;display:flex;flex-direction:column;background:${WHITE};overflow-y:auto;}
.safety-header{padding:42px 16px 16px;background:${YELLOW};flex-shrink:0;}
.safety-header h2{font-family:'Inter',sans-serif;font-size:22px;font-weight:700;color:${DARK};}
.safety-header p{font-size:12px;color:rgba(0,0,0,0.6);margin-top:4px;}
.sos-btn{width:100px;height:100px;background:#E53935;border-radius:50%;border:none;font-family:'Inter',sans-serif;font-size:19px;font-weight:700;color:white;cursor:pointer;display:flex;align-items:center;justify-content:center;margin:22px auto;box-shadow:0 7px 26px rgba(229,57,53,0.35);animation:sosPulse 2s ease-in-out infinite;}
@keyframes sosPulse{0%,100%{box-shadow:0 7px 26px rgba(229,57,53,0.35)}50%{box-shadow:0 7px 40px rgba(229,57,53,0.55)}}
.safety-feature{display:flex;align-items:flex-start;gap:11px;padding:13px 16px;border-bottom:1px solid ${GRAY};}
.safety-feature-icon{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0;}
.safety-feature h4{font-size:13px;font-weight:700;color:${DARK};}
.safety-feature p{font-size:12px;color:${TEXT_MUTED};margin-top:3px;line-height:1.4;}
.emergency-contacts{padding:14px 16px;}
.contact-item{display:flex;align-items:center;gap:9px;padding:9px 13px;background:${GRAY};border-radius:11px;margin-bottom:6px;}
.contact-avatar{width:36px;height:36px;background:${YELLOW};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;}
.contact-info h4{font-size:13px;font-weight:600;color:${DARK};}
.contact-info p{font-size:11px;color:${TEXT_MUTED};}
.add-contact{display:flex;align-items:center;gap:8px;padding:9px 13px;border:2px dashed ${GRAY2};border-radius:11px;cursor:pointer;color:${TEXT_MUTED};font-size:12px;font-weight:600;}

/* DRIVER SCREENS */
.driver-upload-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:16px 0;}
.driver-upload-box{background:rgba(255,255,255,0.55);border:2.5px dashed rgba(0,0,0,0.18);border-radius:16px;padding:22px 12px;display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;transition:background 0.2s;}
.driver-upload-box:hover{background:rgba(255,255,255,0.75);}
.driver-upload-box.full-width{grid-column:1/-1;}
.driver-upload-box .upload-emoji{font-size:28px;}
.driver-upload-box .upload-label{font-size:11px;font-weight:600;color:${DARK};text-align:center;}

.checklist-grid{display:flex;flex-direction:column;gap:6px;margin:14px 0;}
.checklist-item{display:flex;align-items:center;gap:10px;padding:11px 14px;background:rgba(255,255,255,0.55);border-radius:13px;cursor:pointer;transition:all 0.18s;border:2px solid transparent;}
.checklist-item.checked{border-color:rgba(76,175,80,0.5);background:rgba(76,175,80,0.08);}
.checklist-check{width:22px;height:22px;border-radius:7px;border:2px solid ${GRAY2};display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;transition:all 0.18s;}
.checklist-item.checked .checklist-check{background:#4CAF50;border-color:#4CAF50;color:white;}

/* DRIVER HOME */
.live-toggle{position:absolute;bottom:72px;left:50%;transform:translateX(-50%);z-index:900;display:flex;align-items:center;gap:9px;padding:10px 20px;border-radius:50px;border:none;cursor:pointer;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;transition:all 300ms ease-out;box-shadow:0 5px 20px rgba(0,0,0,0.25);}
.live-toggle.offline{background:${WHITE};color:${DARK};}
.live-toggle.online{background:#4CAF50;color:${WHITE};}
.live-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;transition:background 300ms ease-out;}
.live-dot.offline{background:${GRAY2};}
.live-dot.online{background:${WHITE};animation:livePulse 1.5s ease-in-out infinite;}
@keyframes livePulse{0%,100%{opacity:1}50%{opacity:0.4}}

.heatmap-btn{position:absolute;top:13px;right:60px;z-index:900;width:40px;height:40px;background:${WHITE};border-radius:11px;border:none;cursor:pointer;font-size:16px;box-shadow:0 3px 10px rgba(0,0,0,0.22);display:flex;align-items:center;justify-content:center;}
.heatmap-btn.active{background:${YELLOW};}

/* RIDE REQUEST POPUP */
.ride-request-popup{position:absolute;bottom:0;left:0;right:0;z-index:1000;background:${WHITE};border-radius:22px 22px 0 0;padding:18px 16px 26px;box-shadow:0 -10px 40px rgba(0,0,0,0.2);animation:slideUp 0.3s ease-out;}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.ride-request-popup .req-badge{display:inline-block;padding:3px 10px;border-radius:8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;}
.req-badge.standard{background:rgba(255,184,0,0.15);color:#A07800;}
.req-badge.comfort{background:rgba(33,150,243,0.12);color:#1565C0;}

.slide-accept{position:relative;height:56px;background:${GRAY};border-radius:28px;margin-top:14px;overflow:hidden;user-select:none;touch-action:none;}
.slide-accept-track{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
.slide-accept-track span{font-size:13px;font-weight:600;color:${TEXT_MUTED};pointer-events:none;}
.slide-accept-thumb{position:absolute;left:4px;top:4px;width:48px;height:48px;background:#4CAF50;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:grab;transition:none;z-index:2;}
.slide-accept-thumb.released{transition:left 300ms ease-out;}
.slide-accept-fill{position:absolute;left:0;top:0;bottom:0;background:rgba(76,175,80,0.15);border-radius:28px;transition:none;}
.slide-accept-fill.released{transition:width 300ms ease-out;}

.decline-btn{width:100%;padding:12px;background:transparent;border:2px solid #FFCDD2;border-radius:13px;color:#E53935;font-family:'Inter',sans-serif;font-size:13px;font-weight:600;cursor:pointer;margin-top:9px;transition:background 0.14s;}
.decline-btn:hover{background:#FFF5F5;}

/* DRIVER TRIP PHASES */
.driver-trip-sheet{background:${WHITE};border-radius:22px 22px 0 0;padding:14px 16px 22px;flex-shrink:0;}
.trip-phase-badge{display:inline-block;padding:4px 12px;border-radius:8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;}
.phase-topickup{background:rgba(33,150,243,0.12);color:#1565C0;}
.phase-enroute{background:rgba(255,184,0,0.15);color:#A07800;}
.phase-arrived{background:rgba(76,175,80,0.12);color:#2E7D32;}

/* DRIVER SIDE MENU EXTRAS */
.earnings-card{background:linear-gradient(135deg,${YELLOW} 0%,#FF9500 100%);border-radius:16px;padding:16px;margin:0 9px 12px;}
.earnings-card h3{font-family:'Inter',sans-serif;font-size:22px;font-weight:700;color:${DARK};}
.earnings-card p{font-size:11px;color:rgba(0,0,0,0.6);margin-top:2px;}

.commission-card{background:#FFF3E0;border-radius:16px;padding:14px;margin:0 9px 12px;border:2px solid #FFE0B2;}
.commission-card h4{font-size:13px;font-weight:700;color:${DARK};}
.commission-card .comm-amount{font-family:'Inter',sans-serif;font-size:20px;font-weight:700;color:#E65100;margin-top:4px;}
.commission-warning{background:#FFF5F5;border:2px solid #FFCDD2;border-radius:13px;padding:12px;margin:0 9px 12px;display:flex;align-items:flex-start;gap:8px;}
.commission-warning p{font-size:11px;color:#C62828;line-height:1.4;}

/* REQUEST TIMER */
.request-timer{display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:10px;}
.timer-circle{width:36px;height:36px;border-radius:50%;border:3px solid #E53935;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;font-size:15px;font-weight:700;color:#E53935;position:relative;}
.timer-circle.warning{border-color:#FF6F00;color:#FF6F00;animation:timerPulse 1s ease-in-out infinite;}
@keyframes timerPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
.timer-label{font-size:11px;color:${TEXT_MUTED};font-weight:500;}

/* NOTIFICATIONS */
.notif-stack{position:absolute;top:10px;left:10px;right:10px;z-index:9999;display:flex;flex-direction:column;gap:6px;pointer-events:none;}
.notif-toast{pointer-events:all;display:flex;align-items:center;gap:10px;padding:12px 14px;background:${WHITE};border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,0.18);animation:notifIn 0.35s cubic-bezier(0.34,1.2,0.64,1);border-left:4px solid ${YELLOW};}
.notif-toast.success{border-left-color:#4CAF50;}
.notif-toast.warning{border-left-color:#FF6F00;}
.notif-toast.error{border-left-color:#E53935;}
@keyframes notifIn{from{transform:translateY(-30px);opacity:0}to{transform:translateY(0);opacity:1}}
.notif-icon{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;}
.notif-text h4{font-size:12px;font-weight:700;color:${DARK};}
.notif-text p{font-size:10px;color:${TEXT_MUTED};margin-top:1px;}
.notif-close{background:none;border:none;font-size:14px;color:${TEXT_MUTED};cursor:pointer;padding:4px;margin-left:auto;flex-shrink:0;}

/* PAYMENT SCREEN */
.payment-screen{height:100%;display:flex;flex-direction:column;background:${WHITE};}
.payment-header{padding:42px 16px 13px;background:${WHITE};border-bottom:1px solid ${GRAY2};flex-shrink:0;}
.payment-header h2{font-family:'Inter',sans-serif;font-size:22px;font-weight:700;}
.payment-body{flex:1;overflow-y:auto;padding:16px;}
.payment-amount-card{background:linear-gradient(135deg,#FFF3E0,#FFE0B2);border-radius:18px;padding:20px;text-align:center;margin-bottom:18px;border:2px solid #FFB74D;}
.payment-amount-card h3{font-family:'Inter',sans-serif;font-size:28px;font-weight:700;color:#E65100;}
.payment-amount-card p{font-size:12px;color:rgba(0,0,0,0.55);margin-top:4px;}
.momo-option{display:flex;align-items:center;gap:12px;padding:16px;border:2px solid ${GRAY2};border-radius:16px;cursor:pointer;transition:all 0.18s;margin-bottom:10px;}
.momo-option:hover,.momo-option.selected{border-color:${YELLOW};background:rgba(255,184,0,0.04);}
.momo-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;}
.momo-details h4{font-size:14px;font-weight:700;color:${DARK};}
.momo-details p{font-size:11px;color:${TEXT_MUTED};margin-top:2px;}
.momo-radio{width:20px;height:20px;border-radius:50%;border:2px solid ${GRAY2};margin-left:auto;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.18s;}
.momo-option.selected .momo-radio{border-color:${YELLOW};background:${YELLOW};}
.payment-input{width:100%;padding:14px;background:${GRAY};border:2px solid transparent;border-radius:13px;font-family:'Inter',sans-serif;font-size:14px;color:${DARK};outline:none;margin-bottom:10px;transition:border-color 0.2s;}
.payment-input:focus{border-color:${YELLOW};}
.payment-summary{background:${GRAY};border-radius:13px;padding:14px;margin:14px 0;}

/* CHAT OVERLAY */
.chat-overlay{position:absolute;inset:0;z-index:9998;display:flex;flex-direction:column;background:${WHITE};animation:slideUp 0.3s ease-out;}
.chat-header{padding:42px 16px 12px;background:${YELLOW};flex-shrink:0;display:flex;align-items:center;gap:11px;}
.chat-messages{flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:8px;}
.chat-bubble{max-width:75%;padding:10px 14px;border-radius:16px;font-size:13px;line-height:1.4;position:relative;}
.chat-bubble.me{background:${YELLOW};color:${DARK};align-self:flex-end;border-bottom-right-radius:4px;}
.chat-bubble.other{background:${GRAY};color:${DARK};align-self:flex-start;border-bottom-left-radius:4px;}
.chat-bubble .chat-time{font-size:9px;color:${TEXT_MUTED};margin-top:3px;}
.chat-input-row{display:flex;gap:8px;padding:10px 16px 22px;border-top:1px solid ${GRAY2};flex-shrink:0;background:${WHITE};}
.chat-input-row input{flex:1;padding:11px 14px;background:${GRAY};border:none;border-radius:22px;font-family:'Inter',sans-serif;font-size:13px;color:${DARK};outline:none;}
.chat-send-btn{width:42px;height:42px;background:${YELLOW};border:none;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}

/* SUPPORT SCREEN */
.support-screen{height:100%;display:flex;flex-direction:column;background:${WHITE};}
.support-header{padding:42px 16px 16px;background:${YELLOW};flex-shrink:0;}
.support-header h2{font-family:'Inter',sans-serif;font-size:22px;font-weight:700;color:${DARK};}
.support-header p{font-size:12px;color:rgba(0,0,0,0.6);margin-top:4px;}
.support-body{flex:1;overflow-y:auto;padding:14px 16px;}
.support-topic{border:2px solid ${GRAY2};border-radius:16px;padding:14px;margin-bottom:10px;cursor:pointer;transition:all 0.18s;}
.support-topic:hover,.support-topic.expanded{border-color:${YELLOW};background:rgba(255,184,0,0.03);}
.support-topic-header{display:flex;align-items:center;gap:11px;}
.support-topic-icon{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
.support-topic-info h4{font-size:14px;font-weight:700;color:${DARK};}
.support-topic-info p{font-size:11px;color:${TEXT_MUTED};margin-top:2px;}
.support-items{margin-top:10px;padding-top:10px;border-top:1px solid ${GRAY2};}
.support-item{display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid ${GRAY};cursor:pointer;font-size:12px;font-weight:500;color:${DARK};transition:color 0.14s;}
.support-item:hover{color:${YELLOW};}
.support-item:last-child{border-bottom:none;}
.support-chat-prompt{background:${GRAY};border-radius:16px;padding:18px;margin-top:14px;text-align:center;}
.support-chat-prompt h4{font-size:14px;font-weight:700;color:${DARK};margin-bottom:4px;}
.support-chat-prompt p{font-size:11px;color:${TEXT_MUTED};margin-bottom:10px;}

/* FEEDBACK TEXTAREA */
.feedback-textarea{width:100%;padding:12px 14px;background:${GRAY};border:2px solid transparent;border-radius:13px;font-family:'Inter',sans-serif;font-size:13px;color:${DARK};outline:none;resize:none;min-height:70px;transition:border-color 0.2s;margin-bottom:12px;}
.feedback-textarea:focus{border-color:${YELLOW};}
.feedback-textarea::placeholder{color:rgba(0,0,0,0.35);}

/* DRIVER RATING OF PASSENGER */
.driver-rating-screen{height:100%;display:flex;flex-direction:column;background:${WHITE};padding:48px 22px 32px;overflow-y:auto;}

/* LEAFLET */
.leaflet-control-zoom{display:none!important;}
.leaflet-control-attribution{font-size:8px!important;opacity:0.45;}
`;

// ── Leaflet Map ──────────────────────────────────────────────────────────────
function LeafletMap({ destination, showRoute, showHeatmap, driverMode, driverMarkerPos }) {
  const ref = useRef(null);
  const instance = useRef(null);
  const driverMarkerRef = useRef(null);

  useEffect(() => {
    if (instance.current) { instance.current.remove(); instance.current = null; }

    const init = () => {
      if (!ref.current || !window.L) return;
      const L = window.L;
      const map = L.map(ref.current, {
        center: [5.6502, -0.1869], zoom: 15,
        zoomControl: false, scrollWheelZoom: false, attributionControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:"© OpenStreetMap", maxZoom:19,
      }).addTo(map);

      // User dot
      const meColor = driverMode ? "#4CAF50" : "#4A90E2";
      const meIcon = L.divIcon({
        html:`<div style="width:14px;height:14px;background:${meColor};border-radius:50%;border:3px solid white;box-shadow:0 0 0 5px ${meColor}33;"></div>`,
        className:"", iconAnchor:[7,7],
      });
      L.marker([5.6502,-0.1869],{icon:meIcon}).addTo(map);

      // Driver marker for passenger tracking
      if (driverMarkerPos) {
        const drvIcon = L.divIcon({
          html:`<div style="width:18px;height:18px;background:#4CAF50;border-radius:50%;border:3px solid white;box-shadow:0 0 0 5px rgba(76,175,80,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;">🚗</div>`,
          className:"", iconAnchor:[9,9],
        });
        const drvM = L.marker(driverMarkerPos,{icon:drvIcon}).addTo(map);
        driverMarkerRef.current = drvM;
      }

      // Heatmap overlay
      if (showHeatmap) {
        HEATMAP_ZONES.forEach(zone => {
          L.circle(zone.coords, {
            radius: zone.radius,
            color: 'transparent',
            fillColor: `rgba(255,87,34,${zone.intensity * 0.5})`,
            fillOpacity: zone.intensity * 0.5,
            interactive: false,
          }).addTo(map);
          L.circle(zone.coords, {
            radius: zone.radius * 0.5,
            color: 'transparent',
            fillColor: `rgba(255,87,34,${zone.intensity * 0.7})`,
            fillOpacity: zone.intensity * 0.7,
            interactive: false,
          }).addTo(map);
        });
      }

      // Destination
      if (destination?.coords) {
        const dIcon = L.divIcon({
          html:`<div style="width:28px;height:28px;background:${DARK};border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 9px rgba(0,0,0,0.4);"><span style="transform:rotate(45deg);font-size:12px;">📍</span></div>`,
          className:"", iconAnchor:[14,28],
        });
        L.marker(destination.coords,{icon:dIcon}).addTo(map).bindPopup(`<b>${destination.name}</b>`);
        if (showRoute) {
          const routePoints = driverMarkerPos
            ? [driverMarkerPos, destination.coords]
            : [[5.6502,-0.1869], destination.coords];
          const line = L.polyline(routePoints,
            {color:YELLOW, weight:5, opacity:0.9, dashArray:"10,6"}).addTo(map);
          map.fitBounds(line.getBounds(),{padding:[54,54]});
        }
      }

      // Place labels
      CAMPUS_PLACES.slice(0,10).forEach(p => {
        const lbl = L.divIcon({
          html:`<div style="background:rgba(17,17,17,0.78);color:#fff;padding:2px 7px;border-radius:7px;font-size:9px;font-weight:600;white-space:nowrap;font-family:'Inter',sans-serif;">${p.name.split(" ").slice(0,2).join(" ")}</div>`,
          className:"", iconAnchor:[20,8],
        });
        L.marker(p.coords,{icon:lbl}).addTo(map);
      });

      instance.current = map;
    };

    const loadLeaflet = () => {
      if (!document.getElementById("lf-css")) {
        const s = document.createElement("link"); s.id="lf-css"; s.rel="stylesheet";
        s.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
        document.head.appendChild(s);
      }
      if (!document.getElementById("lf-js")) {
        const s = document.createElement("script"); s.id="lf-js";
        s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
        s.onload = init; document.body.appendChild(s);
      } else if (window.L) { init(); }
      else { document.getElementById("lf-js").addEventListener("load", init); }
    };

    loadLeaflet();
    return () => { if (instance.current) { instance.current.remove(); instance.current = null; } };
  }, [destination?.name, showHeatmap, driverMode, driverMarkerPos?.[0], driverMarkerPos?.[1]]);

  return (
    <div ref={ref} style={{width:"100%",height:"100%",background:"#2C3347"}}>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]       = useState("splash");
  const [screenKey, setScreenKey] = useState(0);
  const [role, setRole]           = useState("passenger");
  const [menuOpen, setMenuOpen]   = useState(false);
  const [selRide, setSelRide]     = useState("standard");
  const [stars, setStars]         = useState(0);
  const [selTip, setSelTip]       = useState(null);
  const [otpVals, setOtpVals]     = useState(["","","","",""]);
  const [destQ, setDestQ]         = useState("");
  const [showDrop, setShowDrop]   = useState(false);
  const [dest, setDest]           = useState(null);
  const [selHist, setSelHist]     = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [timeSlot, setTimeSlot]   = useState(getTimeSlot());
  const otpRefs = [useRef(),useRef(),useRef(),useRef(),useRef()];

  // Driver state
  const [driverApproved, setDriverApproved] = useState(false);
  const [driverLive, setDriverLive]         = useState(false);
  const [showHeatmap, setShowHeatmap]       = useState(false);
  const [driverRideRequest, setDriverRideRequest] = useState(null);
  const [driverTripPhase, setDriverTripPhase] = useState(null);
  const [driverChecklist, setDriverChecklist] = useState([]);
  const [showCommission, setShowCommission]   = useState(false);
  const [slideX, setSlideX] = useState(0);
  const [sliding, setSliding] = useState(false);
  const slideRef = useRef(null);
  const slideXRef = useRef(0);
  const [requestTimer, setRequestTimer] = useState(15);
  const [notifications, setNotifications] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [paymentPhone, setPaymentPhone] = useState("");

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState(DEMO_CHAT_MESSAGES);
  const [chatInput, setChatInput] = useState("");

  // Rating feedback state
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [driverStars, setDriverStars] = useState(0);
  const [driverFeedback, setDriverFeedback] = useState("");
  const [driverReportPassenger, setDriverReportPassenger] = useState(false);

  // Support state
  const [supportExpanded, setSupportExpanded] = useState(null);

  // Passenger real-time driver tracking
  const [driverPos, setDriverPos] = useState([5.6480, -0.1840]);

  const driverTotalEarnings = DRIVER_PAST_RIDES.reduce((s,r)=>s+r.fare,0);
  const todayRides = DRIVER_PAST_RIDES.filter(r=>r.date.startsWith("Today"));
  const todayEarnings = todayRides.reduce((s,r)=>s+r.fare,0);
  const commissionOwed = Math.round(driverTotalEarnings * 0.15 * 100)/100;

  useEffect(() => {
    const t = setInterval(() => setTimeSlot(getTimeSlot()), 30000);
    return () => clearInterval(t);
  }, []);

  // Simulate driver movement for passenger tracking
  useEffect(() => {
    if (screen !== "enroute") return;
    const target = dest?.coords || [5.6502,-0.1869];
    const interval = setInterval(() => {
      setDriverPos(prev => {
        const newLat = prev[0] + (target[0] - prev[0]) * 0.08 + (Math.random()-0.5)*0.0003;
        const newLng = prev[1] + (target[1] - prev[1]) * 0.08 + (Math.random()-0.5)*0.0003;
        return [newLat, newLng];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [screen, dest]);

  // Reset driver pos when entering enroute
  useEffect(() => {
    if (screen === "enroute") {
      setDriverPos([5.6480, -0.1840]);
      addNotification("🚗","Driver On The Way","Kwame is heading to your pickup","info");
    }
  }, [screen === "enroute"]);

  const addNotification = (icon, title, message, type="info") => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, {id, icon, title, message, type}]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  // Simulate ride request popup when driver goes live
  useEffect(() => {
    if (driverLive && !driverRideRequest && !driverTripPhase) {
      const t = setTimeout(() => {
        setDriverRideRequest({
          pickup: "Commonwealth Hall",
          pickupCoords: [5.6460,-0.1810],
          dest: "Balme Library",
          destCoords: [5.6512,-0.1869],
          passenger: { name:"Ama Serwaa", rating:4.9, avatar:"AS" },
          type: "comfort",
          fare: 15,
        });
        setRequestTimer(15);
        addNotification("🚗","New Ride Request","Ama Serwaa needs a ride nearby","info");
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [driverLive, driverRideRequest, driverTripPhase]);

  // 15-second countdown timer for ride requests
  useEffect(() => {
    if (!driverRideRequest) return;
    if (requestTimer <= 0) {
      setDriverRideRequest(null);
      addNotification("⏰","Request Expired","Ride sent to another driver","warning");
      return;
    }
    const t = setTimeout(() => setRequestTimer(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [driverRideRequest, requestTimer]);

  const go = (s) => { setMenuOpen(false); setShowReport(false); setShowDrop(false); setShowCommission(false); setChatOpen(false); setScreenKey(k=>k+1); setScreen(s); };

  // Splash screen timer
  useEffect(() => {
    if (screen !== "splash") return;
    const t = setTimeout(() => go("signup"), 2000);
    return () => clearTimeout(t);
  }, [screen]);

  const filtered = CAMPUS_PLACES.filter(p =>
    !destQ || p.name.toLowerCase().includes(destQ.toLowerCase()) || p.category.toLowerCase().includes(destQ.toLowerCase())
  );

  const handleOtp = (i,v) => {
    if (!/^\d?$/.test(v)) return;
    const n=[...otpVals]; n[i]=v; setOtpVals(n);
    if (v && i<4) otpRefs[i+1].current?.focus();
  };

  const price = (r) => (timeSlot==="day" ? r.dayPrice : r.nightPrice);

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
    setChatMessages(prev => [...prev, {id:Date.now(), from:"me", text:chatInput.trim(), time}]);
    setChatInput("");
    // Simulate reply
    setTimeout(() => {
      setChatMessages(prev => [...prev, {id:Date.now()+1, from:"other", text:"Got it, thanks! 👍", time}]);
    }, 1500);
  };

  // Slide to accept handlers
  const handleSlideStart = (e) => {
    setSliding(true);
    slideXRef.current = 0;
    const startX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    const trackWidth = slideRef.current?.offsetWidth || 300;
    const maxX = trackWidth - 56;

    const handleMove = (ev) => {
      const currX = ev.type === 'touchmove' ? ev.touches[0].clientX : ev.clientX;
      const diff = Math.max(0, Math.min(currX - startX, maxX));
      slideXRef.current = diff;
      setSlideX(diff);
    };

    const handleEnd = () => {
      const trackW = slideRef.current?.offsetWidth || 300;
      const threshold = trackW - 80;
      if (slideXRef.current >= threshold) {
        const req = driverRideRequest;
        setDriverRideRequest(null);
        setDriverTripPhase("topickup");
        setDest({name: req?.pickup || "Commonwealth Hall", coords: req?.pickupCoords || [5.6460,-0.1810]});
        addNotification("✅","Ride Accepted","Navigate to pickup location","success");
        go("driver-topickup");
      }
      setSlideX(0);
      slideXRef.current = 0;
      setSliding(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  };

  // Chat overlay component
  const renderChatOverlay = (otherName, otherAvatar) => (
    <div className="chat-overlay">
      <div className="chat-header">
        <button onClick={()=>setChatOpen(false)} style={{background:"rgba(0,0,0,0.1)",border:"none",borderRadius:11,width:38,height:38,fontSize:17,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>←</button>
        <div className="driver-avatar" style={{width:36,height:36,fontSize:12}}>{otherAvatar}</div>
        <div>
          <div style={{fontFamily:"Inter",fontSize:15,fontWeight:600,color:DARK}}>{otherName}</div>
          <div style={{fontSize:10,color:"rgba(0,0,0,0.5)"}}>Online</div>
        </div>
      </div>
      <div className="chat-messages">
        {chatMessages.map(m=>(
          <div key={m.id} className={`chat-bubble ${m.from}`}>
            {m.text}
            <div className="chat-time">{m.time}</div>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input placeholder="Type a message…" value={chatInput} onChange={e=>setChatInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&sendChat()}/>
        <button className="chat-send-btn" onClick={sendChat}>➤</button>
      </div>
    </div>
  );

  // reusable sub-components
  const renderMapWrap = (props = {}) => {
    const {destination: d, showRoute: sr, driverMode: dm, heatmap: hm, driverMarkerPos: dmp} = props;
    return (
      <div className="map-container" style={{flex:1}}>
        <LeafletMap destination={d} showRoute={sr} showHeatmap={hm} driverMode={dm} driverMarkerPos={dmp}/>
        <div className="map-overlay-btns">
          <button className="menu-btn" onClick={()=>setMenuOpen(true)}>
            <div className="menu-line"/><div className="menu-line"/><div className="menu-line" style={{width:"70%"}}/>
          </button>
          <div style={{display:"flex",gap:7}}>
            {dm && (
              <button className={`heatmap-btn ${hm?"active":""}`} onClick={()=>setShowHeatmap(!showHeatmap)} title="Toggle heatmap">
                🔥
              </button>
            )}
            <button className="map-recenter">🎯</button>
          </div>
        </div>
        {!dm && (
          <div className="time-badge">
            <div style={{width:7,height:7,borderRadius:"50%",background:timeSlot==="day"?"#FFD600":"#90CAF9",flexShrink:0}}/>
            {timeSlot==="day"?"☀️ Day rates":"🌙 Night rates"}
          </div>
        )}
      </div>
    );
  };

  const renderSideMenu = () => {
    const isDriver = role === "driver" && (screen.startsWith("driver") || screen === "driver-home");
    return (
      <div className="side-menu">
        <div className="menu-backdrop" onClick={()=>setMenuOpen(false)}/>
        <div className="menu-panel">
          <div className="menu-profile">
            <div className="profile-avatar">{isDriver?"DA":"JJ"}</div>
            <div>
              <div style={{fontFamily:"Inter",fontSize:15,fontWeight:600}}>{isDriver?"Daniel Adjei":"John Jones"}</div>
              <div className="rating-badge"><span>⭐ {isDriver?"4.7":"4.9"}</span></div>
            </div>
          </div>
          {isDriver ? (<>
            <div className="earnings-card">
              <p>Today's Earnings</p>
              <h3>GH₵ {todayEarnings}.00</h3>
              <p style={{marginTop:6,fontSize:10}}>{todayRides.length} rides today · GH₵ {driverTotalEarnings}.00 total</p>
            </div>
            <div className="commission-card">
              <h4>💰 Commission Owed</h4>
              <div className="comm-amount">GH₵ {commissionOwed.toFixed(2)}</div>
              <p style={{fontSize:10,color:TEXT_MUTED,marginTop:3}}>15% per ride</p>
            </div>
            {commissionOwed >= 40 && (
              <div className="commission-warning">
                <span>⚠️</span>
                <p>Warning: If commission owed reaches <b>GH₵ 50.00</b>, your account will be locked until payment is made.</p>
              </div>
            )}
            <div className="menu-items">
              {[
                {icon:"🏠",label:"Home",bg:"rgba(76,175,80,0.1)",s:"driver-home"},
                {icon:"🕐",label:"Past Rides",bg:"rgba(33,150,243,0.1)",s:"driver-rides"},
                {icon:"👤",label:"Profile",bg:"rgba(255,184,0,0.12)",s:"driver-profile"},
                {icon:"💬",label:"Support",bg:"rgba(76,175,80,0.1)",s:"support"},
                {icon:"ℹ️",label:"About",bg:"rgba(156,39,176,0.1)",s:null},
              ].map((item,i)=>(
                <div key={i} className="menu-item" onClick={()=>item.s?go(item.s):setMenuOpen(false)}>
                  <div className="menu-item-icon" style={{background:item.bg}}>{item.icon}</div>
                  <span style={{fontSize:13,fontWeight:500,color:DARK}}>{item.label}</span>
                  <span style={{marginLeft:"auto",color:GRAY2,fontSize:14}}>›</span>
                </div>
              ))}
            </div>
          </>) : (
            <div className="menu-items">
              {[
                {icon:"🎁",label:"Promo Code",bg:"rgba(255,184,0,0.12)",s:"promo"},
                {icon:"🛡️",label:"Safety",bg:"rgba(229,57,53,0.1)",s:"safety"},
                {icon:"🕐",label:"Past Rides",bg:"rgba(33,150,243,0.1)",s:"history"},
                {icon:"💬",label:"Support",bg:"rgba(76,175,80,0.1)",s:"support"},
                {icon:"ℹ️",label:"About",bg:"rgba(156,39,176,0.1)",s:null},
              ].map((item,i)=>(
                <div key={i} className="menu-item" onClick={()=>item.s?go(item.s):setMenuOpen(false)}>
                  <div className="menu-item-icon" style={{background:item.bg}}>{item.icon}</div>
                  <span style={{fontSize:13,fontWeight:500,color:DARK}}>{item.label}</span>
                  <span style={{marginLeft:"auto",color:GRAY2,fontSize:14}}>›</span>
                </div>
              ))}
            </div>
          )}
          <div className="menu-footer">
            <div className="logout-btn" onClick={()=>{setRole("passenger");setDriverLive(false);setDriverTripPhase(null);setDriverRideRequest(null);go("login");}}>
              <span>🚪</span><span>Log Out</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const BottomNav = () => (
    <div className="nav-bar">
      {[{icon:"🏠",label:"Home",s:"home"},{icon:"🕐",label:"Rides",s:"history"},{icon:"👤",label:"Profile",s:"profile"}].map(n=>(
        <div key={n.s} className={`nav-item ${(screen===n.s||(screen==="ridedetail"&&n.s==="history"))?"active":""}`} onClick={()=>go(n.s)}>
          <div className="nav-icon">{n.icon}</div>
          <div className="nav-label">{n.label}</div>
        </div>
      ))}
    </div>
  );

  const DriverBottomNav = () => (
    <div className="nav-bar">
      {[{icon:"🏠",label:"Home",s:"driver-home"},{icon:"🕐",label:"Rides",s:"driver-rides"},{icon:"👤",label:"Profile",s:"driver-profile"}].map(n=>(
        <div key={n.s} className={`nav-item ${screen===n.s?"active":""}`} onClick={()=>go(n.s)}>
          <div className="nav-icon">{n.icon}</div>
          <div className="nav-label">{n.label}</div>
        </div>
      ))}
    </div>
  );

  const BackBtn = ({to,light}) => (
    <button onClick={()=>go(to)} style={{
      background:light?"rgba(0,0,0,0.1)":GRAY,border:"none",borderRadius:11,
      width:38,height:38,fontSize:17,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
    }}>←</button>
  );



  // ── SPLASH SCREEN ────────────────────────────────────────────────────────
  if (screen === "splash") {
    return (<>
      <style>{CSS}</style>
      <div className="app-shell">
        <div className="phone-shell"><div className="screen">
          <div className="splash-screen">
            <div className="splash-logo">🚗</div>
            <div className="splash-title">Campus Chauffeur</div>
            <div className="splash-sub">Your campus ride, simplified.</div>
            <div className="splash-loader">
              <div className="splash-dot"/><div className="splash-dot"/><div className="splash-dot"/>
            </div>
          </div>
        </div></div>
      </div>
    </>);
  }

  // ── AUTH SCREENS (signup/login) ──────────────────────────────────────────
  if (screen === "signup" || screen === "login") {
    const isSU = screen==="signup";
    return (<>
      <style>{CSS}</style>
      <div className="app-shell">
        <div className="phone-shell"><div className="screen screen-transition" key={screenKey}>
          <div className="auth-screen">
            <div className="auth-top">
              <h1>Welcome</h1>
              <p>{isSU?"We're lucky to have you":"We're glad you're back"}</p>
              <div className="toggle-row">
                <div className={`toggle-slider ${role}`}/>
                <button className={`toggle-btn ${role==="passenger"?"active":"inactive"}`} onClick={()=>setRole("passenger")}>Passenger</button>
                <button className={`toggle-btn ${role==="driver"?"active":"inactive"}`} onClick={()=>setRole("driver")}>Driver</button>
              </div>
            </div>
            <div className="auth-card">
              <h2>{isSU?"Sign Up":"Login"}{role==="driver"?" as Driver":""}</h2>
              {isSU?(<>
                <div className="input-row">
                  <div className="field"><input placeholder="First Name"/></div>
                  <div className="field"><input placeholder="Last Name"/></div>
                </div>
                <div className="field"><input placeholder="Student ID / Email"/></div>
                <div className="field"><input placeholder="Phone Number" type="tel"/></div>
                {role==="driver" && (
                  <div className="field"><input placeholder="Vehicle Plate Number" style={{letterSpacing:1}}/></div>
                )}
                <div className="field"><input placeholder="Password" type="password"/></div>
              </>):(<>
                <div className="field"><input placeholder="Student ID / Email"/></div>
                <div className="field"><input placeholder="Password" type="password"/></div>
              </>)}
              <button className="btn-primary" onClick={()=>{
                if (isSU) {
                  go("otp");
                } else {
                  go(role==="driver" ? (driverApproved?"driver-home":"driver-pending") : "home");
                }
              }}>{isSU?"Create Account":"Log In"}</button>
              <div className="auth-footer">
                {isSU?<span onClick={()=>go("login")}>Already registered? Login.</span>
                     :<span onClick={()=>go("signup")}>Not registered? Sign up.</span>}
              </div>
              {!isSU&&<div className="forgot">Forgot Password?</div>}
            </div>
          </div>
        </div></div>
      </div>
    </>);
  }

  // All other screens use shared wrapper
  const renderInner = () => {
    switch(screen) {
      case "otp": return (
        <div className="otp-screen">
          <button className="otp-back" onClick={()=>go("signup")}>←</button>
          <h2>Verify Your Number</h2>
          <p>We sent a code to your registered phone.<br/>Enter it below.</p>
          <div className="otp-inputs">
            {otpVals.map((v,i)=>(
              <input key={i} ref={otpRefs[i]} className="otp-input" maxLength={1} value={v}
                onChange={e=>handleOtp(i,e.target.value)}/>
            ))}
          </div>
          <div className="resend-text">Request new code in <span>00:45</span></div>
          <button className="btn-primary" style={{width:"100%",background:DARK}} onClick={()=>go(role==="driver"?"driver-selfie":"studentid")}>Verify</button>
        </div>
      );

      case "studentid": return (
        <div className="id-screen">
          <button className="otp-back" onClick={()=>go("otp")}>←</button>
          <h2 style={{fontFamily:"Inter",fontSize:22,fontWeight:700,color:DARK,textAlign:"center",marginTop:8,position:"relative",zIndex:1}}>Student ID</h2>
          <p style={{fontSize:12,color:"rgba(0,0,0,0.6)",textAlign:"center",marginTop:7,lineHeight:1.5,position:"relative",zIndex:1}}>
            Upload your valid UG student ID to verify campus membership.
          </p>
          <div className="upload-box">
            <span style={{fontSize:38}}>📤</span>
            <strong style={{fontSize:14,fontWeight:600,color:DARK}}>Tap to upload</strong>
            <p style={{fontSize:12,color:"rgba(0,0,0,0.5)",textAlign:"center"}}>JPG, PNG or PDF · Max 5MB</p>
          </div>
          <button className="btn-primary" style={{width:"100%",background:DARK,position:"relative",zIndex:1}} onClick={()=>go("allset")}>Submit</button>
        </div>
      );

      case "allset": return (
        <div className="allset-screen">
          <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 60% 30%, rgba(255,255,255,0.15) 0%, transparent 70%)",pointerEvents:"none"}}/>
          <div className="allset-circle">👍</div>
          <h1 style={{fontFamily:"Inter",fontSize:"30px",fontWeight:700,color:DARK,textAlign:"center",position:"relative",zIndex:1}}>You're All Set!</h1>
          <p style={{fontSize:13,color:"rgba(0,0,0,0.6)",marginTop:7,textAlign:"center",position:"relative",zIndex:1}}>Your campus ride experience<br/>starts now. Let's go!</p>
          <button className="btn-primary" style={{marginTop:36,width:"100%",position:"relative",zIndex:1}} onClick={()=>go("home")}>
            Start Riding
          </button>
        </div>
      );

      // ── DRIVER SIGNUP FLOW ──────────────────────────────────────────────
      case "driver-selfie": return (
        <div className="id-screen" style={{overflow:"auto"}}>
          <button className="otp-back" onClick={()=>go("otp")}>←</button>
          <h2 style={{fontFamily:"Inter",fontSize:22,fontWeight:700,color:DARK,textAlign:"center",marginTop:8,position:"relative",zIndex:1}}>Identity Verification</h2>
          <p style={{fontSize:12,color:"rgba(0,0,0,0.6)",textAlign:"center",marginTop:7,lineHeight:1.5,position:"relative",zIndex:1}}>
            Upload a clear selfie and your driver's license.
          </p>
          <div className="driver-upload-grid" style={{position:"relative",zIndex:1}}>
            <div className="driver-upload-box">
              <div className="upload-emoji">🤳</div>
              <div className="upload-label">Selfie Photo</div>
              <p style={{fontSize:10,color:TEXT_MUTED}}>Clear face shot</p>
            </div>
            <div className="driver-upload-box">
              <div className="upload-emoji">🪪</div>
              <div className="upload-label">Driver's License</div>
              <p style={{fontSize:10,color:TEXT_MUTED}}>Front of license</p>
            </div>
          </div>
          <button className="btn-primary" style={{width:"100%",background:DARK,position:"relative",zIndex:1}} onClick={()=>go("driver-vehicle")}>Continue</button>
        </div>
      );

      case "driver-vehicle": return (
        <div className="id-screen" style={{overflow:"auto"}}>
          <button className="otp-back" onClick={()=>go("driver-selfie")}>←</button>
          <h2 style={{fontFamily:"Inter",fontSize:22,fontWeight:700,color:DARK,textAlign:"center",marginTop:8,position:"relative",zIndex:1}}>Vehicle Photos</h2>
          <p style={{fontSize:12,color:"rgba(0,0,0,0.6)",textAlign:"center",marginTop:7,lineHeight:1.5,position:"relative",zIndex:1}}>
            Upload clear photos of your vehicle from all angles.
          </p>
          <div className="driver-upload-grid" style={{position:"relative",zIndex:1,gridTemplateColumns:"1fr 1fr 1fr"}}>
            <div className="driver-upload-box">
              <div className="upload-emoji">🚗</div>
              <div className="upload-label">Front</div>
            </div>
            <div className="driver-upload-box">
              <div className="upload-emoji">🚙</div>
              <div className="upload-label">Side</div>
            </div>
            <div className="driver-upload-box">
              <div className="upload-emoji">🔙</div>
              <div className="upload-label">Back</div>
            </div>
          </div>
          <button className="btn-primary" style={{width:"100%",background:DARK,position:"relative",zIndex:1}} onClick={()=>go("driver-checklist")}>Continue</button>
        </div>
      );

      case "driver-checklist": return (
        <div className="id-screen" style={{overflow:"auto",paddingBottom:80}}>
          <button className="otp-back" onClick={()=>go("driver-vehicle")}>←</button>
          <h2 style={{fontFamily:"Inter",fontSize:20,fontWeight:700,color:DARK,textAlign:"center",marginTop:8,position:"relative",zIndex:1}}>Vehicle Checklist</h2>
          <p style={{fontSize:12,color:"rgba(0,0,0,0.6)",textAlign:"center",marginTop:7,lineHeight:1.5,position:"relative",zIndex:1}}>
            Confirm all features are present and working in your vehicle.
          </p>
          <div className="checklist-grid" style={{position:"relative",zIndex:1}}>
            {DRIVER_CHECKLIST_ITEMS.map(item => {
              const checked = driverChecklist.includes(item.id);
              return (
                <div key={item.id} className={`checklist-item ${checked?"checked":""}`}
                  onClick={()=>setDriverChecklist(prev=>checked?prev.filter(x=>x!==item.id):[...prev,item.id])}>
                  <div className="checklist-check">{checked?"✓":""}</div>
                  <span style={{fontSize:15,flexShrink:0}}>{item.icon}</span>
                  <span style={{fontSize:13,fontWeight:500,color:DARK}}>{item.label}</span>
                </div>
              );
            })}
          </div>
          <button className="btn-primary" style={{width:"100%",background:DARK,position:"relative",zIndex:1,marginTop:8}} onClick={()=>go("driver-submitted")}>
            Submit Application
          </button>
        </div>
      );

      case "driver-submitted": return (
        <div className="allset-screen">
          <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 60% 30%, rgba(255,255,255,0.15) 0%, transparent 70%)",pointerEvents:"none"}}/>
          <div className="allset-circle">📋</div>
          <h1 style={{fontFamily:"Inter",fontSize:24,fontWeight:700,color:DARK,textAlign:"center",position:"relative",zIndex:1}}>Application Submitted!</h1>
          <p style={{fontSize:13,color:"rgba(0,0,0,0.6)",marginTop:7,textAlign:"center",lineHeight:1.6,position:"relative",zIndex:1}}>
            Your data has been logged successfully<br/>and is <b>awaiting approval</b>.
          </p>
          <p style={{fontSize:11,color:"rgba(0,0,0,0.45)",marginTop:14,textAlign:"center",position:"relative",zIndex:1}}>
            We'll notify you once your account has been reviewed.
          </p>
          <button className="btn-primary" style={{marginTop:36,width:"100%",position:"relative",zIndex:1}} onClick={()=>go("driver-pending")}>
            Continue
          </button>
        </div>
      );

      case "driver-pending": return (
        <div className="allset-screen" style={{background:WHITE}}>
          <div style={{width:100,height:100,background:GRAY,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,marginBottom:22}}>
            ⏳
          </div>
          <h1 style={{fontFamily:"Inter",fontSize:24,fontWeight:700,color:DARK,textAlign:"center"}}>Awaiting Approval</h1>
          <p style={{fontSize:13,color:TEXT_MUTED,marginTop:7,textAlign:"center",lineHeight:1.6,maxWidth:280}}>
            Your driver application is being reviewed. You'll be able to access the app once approved.
          </p>
          <button className="btn-primary" style={{marginTop:28,width:"100%",background:YELLOW,color:DARK}} onClick={()=>{setDriverApproved(true);addNotification("✅","Approved!","Your driver account has been approved","success");go("driver-home");}}>
            ✓ Simulate Approval (Demo)
          </button>
          <button className="btn-secondary" style={{marginTop:6}} onClick={()=>go("login")}>
            Back to Login
          </button>
        </div>
      );

      // ── DRIVER MAIN APP ─────────────────────────────────────────────────
      case "driver-home": return (
        <div className="home-screen">
          {renderMapWrap({driverMode:true, heatmap:showHeatmap})}
          <button className={`live-toggle ${driverLive?"online":"offline"}`}
            onClick={()=>{setDriverLive(!driverLive);if(driverLive){setDriverRideRequest(null);}}}>
            <div className={`live-dot ${driverLive?"online":"offline"}`}/>
            {driverLive?"You're Live":"Go Online"}
          </button>
          <DriverBottomNav/>
          {menuOpen && renderSideMenu()}
          {driverRideRequest && (
            <div className="ride-request-popup">
              <div className="sheet-handle"/>
              <div className="request-timer">
                <div className={`timer-circle ${requestTimer<=5?"warning":""}`}>{requestTimer}</div>
                <span className="timer-label">seconds to respond</span>
              </div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <h3 style={{fontFamily:"Inter",fontSize:17,fontWeight:700,color:DARK}}>New Ride Request</h3>
                <span className={`req-badge ${driverRideRequest.type}`}>
                  {driverRideRequest.type==="comfort"?"❄️ AC Ride":"🚗 Standard"}
                </span>
              </div>
              <div style={{display:"flex",gap:10,marginBottom:10}}>
                <div className="driver-avatar" style={{width:40,height:40,fontSize:13}}>{driverRideRequest.passenger.avatar}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700,color:DARK}}>{driverRideRequest.passenger.name}</div>
                  <div style={{fontSize:11,color:TEXT_MUTED}}>⭐ {driverRideRequest.passenger.rating}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"Inter",fontSize:18,fontWeight:700,color:DARK}}>GH₵ {driverRideRequest.fare}</div>
                </div>
              </div>
              <div style={{background:GRAY,borderRadius:13,padding:12,marginBottom:6}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:YELLOW}}/>
                  <span style={{fontSize:12,fontWeight:600,color:DARK}}>{driverRideRequest.pickup}</span>
                </div>
                <div style={{width:1,height:12,background:GRAY2,marginLeft:3}}/>
                <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:DARK}}/>
                  <span style={{fontSize:12,fontWeight:600,color:DARK}}>{driverRideRequest.dest}</span>
                </div>
              </div>
              <div className="slide-accept" ref={slideRef}>
                <div className={`slide-accept-fill ${!sliding?"released":""}`} style={{width:slideX+52}}/>
                <div className="slide-accept-track"><span>Slide to Accept →</span></div>
                <div className={`slide-accept-thumb ${!sliding?"released":""}`}
                  style={{left:4+slideX}}
                  onMouseDown={handleSlideStart}
                  onTouchStart={handleSlideStart}>
                  ✓
                </div>
              </div>
              <button className="decline-btn" onClick={()=>{setDriverRideRequest(null);addNotification("❌","Ride Declined","Request sent to another driver","warning");}}>Decline</button>
            </div>
          )}
        </div>
      );

      case "driver-rides": return (
        <div className="history-screen">
          <div className="history-header"><h2>My Rides</h2></div>
          <div className="history-list">
            {DRIVER_PAST_RIDES.map(r=>(
              <div key={r.id} className="history-item">
                <div className="history-icon" style={{background:"rgba(76,175,80,0.12)"}}>🚗</div>
                <div className="history-info">
                  <h4>{r.pickup} → {r.dest}</h4>
                  <p>{r.passenger.name} · ⭐ {r.passenger.rating}</p>
                  <p>{r.date}</p>
                  <span className={`req-badge ${r.type}`} style={{marginTop:3}}>
                    {r.type==="comfort"?"❄️ AC":"🚗 Std"}
                  </span>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div className="history-price">GH₵ {r.fare}.00</div>
                  <div style={{fontSize:10,color:TEXT_MUTED,marginTop:3}}>earned</div>
                </div>
              </div>
            ))}
          </div>
          <DriverBottomNav/>
        </div>
      );

      case "driver-profile": return (
        <div className="profile-screen">
          <div className="profile-hero">
            <div className="profile-avatar-lg">DA<div className="edit-badge">✏️</div></div>
            <h2>Daniel Adjei</h2>
            <p>daniel.adjei@st.ug.edu.gh · Toyota Corolla</p>
            <div className="profile-stats" style={{justifyContent:"center"}}>
              {[[`${DRIVER_PAST_RIDES.length}`,"Rides"],["4.7","Rating"],[`GH₵ ${driverTotalEarnings}`,"Earned"]].map(([v,l])=>(
                <div key={l} className="stat-box" style={{textAlign:"center"}}><h3>{v}</h3><p>{l}</p></div>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflow:"auto"}}>
            <div className="profile-section">
              <h3>Account</h3>
              {[{icon:"👤",bg:"rgba(255,184,0,0.12)",title:"Personal Info",sub:"Name, phone, email"},
                {icon:"🚗",bg:"rgba(33,150,243,0.1)",title:"Vehicle Info",sub:"Toyota Corolla · GR-2341-24"},
                {icon:"🪪",bg:"rgba(76,175,80,0.1)",title:"Documents",sub:"License & photos verified"},
                {icon:"🔔",bg:"rgba(156,39,176,0.1)",title:"Notifications",sub:"Manage alerts"}].map((r,i)=>(
                <div key={i} className="profile-row">
                  <div className="profile-row-icon" style={{background:r.bg}}>{r.icon}</div>
                  <div className="profile-row-info"><h4>{r.title}</h4><p>{r.sub}</p></div>
                  <span className="chevron">›</span>
                </div>
              ))}
            </div>
            <div className="profile-section">
              <h3>Earnings</h3>
              <div style={{background:GRAY,borderRadius:13,padding:14,marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:12,color:TEXT_MUTED}}>Today</span>
                  <span style={{fontSize:14,fontWeight:700,color:DARK}}>GH₵ {todayEarnings}.00</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:12,color:TEXT_MUTED}}>Total Earned</span>
                  <span style={{fontSize:14,fontWeight:700,color:DARK}}>GH₵ {driverTotalEarnings}.00</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,color:TEXT_MUTED}}>Commission Owed (15%)</span>
                  <span style={{fontSize:14,fontWeight:700,color:"#E65100"}}>GH₵ {commissionOwed.toFixed(2)}</span>
                </div>
              </div>
              {commissionOwed >= 40 && (
                <div className="commission-warning" style={{margin:0}}>
                  <span>⚠️</span>
                  <p>Warning: If commission reaches <b>GH₵ 50.00</b>, your account will be locked until payment.</p>
                </div>
              )}
              <button className="btn-primary" style={{margin:"8px 0",background:"#E65100"}} onClick={()=>go("driver-payment")}>
                💰 Pay Commission
              </button>
            </div>
            <div style={{padding:"0 16px 28px"}}>
              <button className="btn-secondary" onClick={()=>{setRole("passenger");setDriverLive(false);go("login");}}>Log Out</button>
            </div>
          </div>
          <DriverBottomNav/>
        </div>
      );

      // ── DRIVER TRIP PHASES ──────────────────────────────────────────────
      case "driver-topickup": return (
        <div className="enroute-screen">
          {renderMapWrap({destination:{name:"Commonwealth Hall",coords:[5.6460,-0.1810]}, showRoute:true, driverMode:true})}
          <div className="driver-trip-sheet">
            <div className="sheet-handle"/>
            <div className="trip-phase-badge phase-topickup">📍 Heading to Pickup</div>
            <div className="eta-banner">
              <div><h3>Picking up passenger</h3><p>Commonwealth Hall</p></div>
              <div className="eta-time">3 min</div>
            </div>
            <div className="driver-card">
              <div className="driver-avatar" style={{background:"rgba(33,150,243,0.15)"}}>AS</div>
              <div className="driver-info" style={{flex:1}}>
                <h4>Ama Serwaa</h4>
                <div className="driver-rating">⭐ 4.9 · Passenger</div>
              </div>
              <span className="req-badge comfort" style={{fontSize:10}}>❄️ AC</span>
            </div>
            <div className="action-btns">
              <button className="action-btn" onClick={()=>{}}>📞 Call</button>
              <button className="action-btn" onClick={()=>setChatOpen(true)}>💬 Chat</button>
            </div>
            <button className="btn-primary" style={{marginTop:11,background:"#1565C0"}} onClick={()=>{setDest({name:"Balme Library",coords:[5.6512,-0.1869]});setDriverTripPhase("enroute");go("driver-enroute");}}>
              Passenger Picked Up →
            </button>
          </div>
          {chatOpen && renderChatOverlay("Ama Serwaa", "AS")}
        </div>
      );

      case "driver-enroute": return (
        <div className="enroute-screen">
          {renderMapWrap({destination:{name:"Balme Library",coords:[5.6512,-0.1869]}, showRoute:true, driverMode:true})}
          <div className="driver-trip-sheet">
            <div className="sheet-handle"/>
            <div className="trip-phase-badge phase-enroute">🚗 En Route to Destination</div>
            <div className="eta-banner">
              <div><h3>Heading to destination</h3><p>Balme Library</p></div>
              <div className="eta-time">5 min</div>
            </div>
            <div className="driver-card">
              <div className="driver-avatar" style={{background:"rgba(33,150,243,0.15)"}}>AS</div>
              <div className="driver-info" style={{flex:1}}>
                <h4>Ama Serwaa</h4>
                <div className="driver-rating">⭐ 4.9 · In vehicle</div>
              </div>
              <span className="req-badge comfort" style={{fontSize:10}}>❄️ AC</span>
            </div>
            <div className="action-btns">
              <button className="action-btn" onClick={()=>setChatOpen(true)}>💬 Chat</button>
            </div>
            <button className="btn-primary" style={{marginTop:11,background:"#4CAF50"}} onClick={()=>{setDriverTripPhase("arrived");go("driver-arrived");}}>
              Arrived at Destination →
            </button>
          </div>
          {chatOpen && renderChatOverlay("Ama Serwaa", "AS")}
        </div>
      );

      case "driver-arrived": return (
        <div className="allset-screen" style={{background:WHITE}}>
          <div style={{width:100,height:100,background:"rgba(76,175,80,0.12)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,marginBottom:22,animation:"popIn 0.6s cubic-bezier(0.34,1.56,0.64,1)"}}>
            ✅
          </div>
          <h1 style={{fontFamily:"Inter",fontSize:24,fontWeight:700,color:DARK,textAlign:"center"}}>Trip Complete!</h1>
          <div style={{background:GRAY,borderRadius:16,padding:16,margin:"18px 0",width:"100%"}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${GRAY2}`}}>
              <span style={{fontSize:12,color:TEXT_MUTED}}>Ride Type</span>
              <span className="req-badge comfort" style={{fontSize:10}}>❄️ AC Ride</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${GRAY2}`}}>
              <span style={{fontSize:12,color:TEXT_MUTED}}>Pickup</span>
              <span style={{fontSize:12,fontWeight:600,color:DARK}}>Commonwealth Hall</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${GRAY2}`}}>
              <span style={{fontSize:12,color:TEXT_MUTED}}>Destination</span>
              <span style={{fontSize:12,fontWeight:600,color:DARK}}>Balme Library</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 4px"}}>
<span style={{fontFamily:"Inter",fontSize:14,fontWeight:600}}>Passenger Pays</span>
              <span style={{fontFamily:"Inter",fontSize:22,fontWeight:700,color:YELLOW}}>GH₵ 15.00</span>
            </div>
          </div>
          <p style={{fontSize:11,color:TEXT_MUTED,textAlign:"center",marginBottom:4}}>Commission (15%): GH₵ 2.25</p>
          <button className="btn-primary" style={{marginTop:16,width:"100%"}} onClick={()=>{setDriverTripPhase(null);setDriverRideRequest(null);addNotification("💰","Earnings Updated","GH₵ 15.00 added to your balance","success");go("driver-rate-passenger");}}>
            Rate Passenger →
          </button>
        </div>
      );

      // ── DRIVER RATES PASSENGER ──────────────────────────────────────────
      case "driver-rate-passenger": return (
        <div className="driver-rating-screen">
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
            <button style={{background:"none",border:"none",fontSize:19,cursor:"pointer"}} onClick={()=>go("driver-home")}>✕</button>
            <div>
              <h2 style={{fontFamily:"Inter",fontSize:22,fontWeight:700}}>Rate Passenger</h2>
              <p style={{fontSize:12,color:TEXT_MUTED,marginTop:2}}>How was your experience with Ama?</p>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,padding:14,background:GRAY,borderRadius:14,marginBottom:16}}>
            <div className="driver-avatar" style={{width:44,height:44,fontSize:14}}>AS</div>
            <div>
              <div style={{fontSize:15,fontWeight:700,color:DARK}}>Ama Serwaa</div>
              <div style={{fontSize:11,color:TEXT_MUTED}}>⭐ 4.9 · Commonwealth → Balme Library</div>
            </div>
          </div>
          <div className="stars-row">
            {[1,2,3,4,5].map(s=>(
              <div key={s} className={`star ${s<=driverStars?"lit":""}`} onClick={()=>setDriverStars(s)}>⭐</div>
            ))}
          </div>
          <textarea className="feedback-textarea" placeholder="Leave a compliment or note about the passenger (optional)…"
            value={driverFeedback} onChange={e=>setDriverFeedback(e.target.value)} rows={3}/>
          {!driverReportPassenger ? (
            <div style={{textAlign:"center",marginBottom:12}}>
              <span style={{fontSize:12,color:"#E53935",cursor:"pointer",fontWeight:600}} onClick={()=>setDriverReportPassenger(true)}>
                🚩 Report an issue with passenger
              </span>
            </div>
          ) : (
            <div style={{background:"#FFF5F5",border:"2px solid #FFCDD2",borderRadius:13,padding:12,marginBottom:12}}>
              <p style={{fontSize:12,fontWeight:700,color:"#C62828",marginBottom:8}}>Report Passenger Issue</p>
              {["Passenger was rude","Passenger made a mess","Passenger was a no-show","Safety concern","Other issue"].map((o,i)=>(
                <div key={i} className="report-option" style={{padding:"8px 0"}} onClick={()=>{setDriverReportPassenger(false);addNotification("🚩","Report Submitted","Your report has been logged","warning");}}>
                  <span>⚠️</span><span>{o}</span>
                </div>
              ))}
              <button style={{background:"none",border:"none",fontSize:12,color:TEXT_MUTED,cursor:"pointer",marginTop:6}} onClick={()=>setDriverReportPassenger(false)}>Cancel</button>
            </div>
          )}
          <button className="btn-primary" onClick={()=>{addNotification("⭐","Rating Submitted","Thanks for your feedback","success");setDriverStars(0);setDriverFeedback("");go("driver-home");}}>
            Submit Rating
          </button>
        </div>
      );

      // ── PASSENGER SCREENS ───────────────────────────────────────────────
      case "home": return (
        <div className="home-screen">
          {renderMapWrap()}
          <div className="where-bar">
            <div className="where-input" onClick={()=>go("destination")}>
              <div className="where-dot"/>
              <span>Where are you going?</span>
            </div>
          </div>
          <BottomNav/>
          {menuOpen && renderSideMenu()}
        </div>
      );

      case "destination": return (
        <div className="dest-screen">
          <div className="dest-header">
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
              <BackBtn to="home"/>
              <h2 style={{margin:0}}>Where to?</h2>
            </div>
            <div className="location-inputs">
              <div className="loc-input-row">
                <div className="loc-dot pickup"/>
                <input readOnly defaultValue="My Location · UG Campus" style={{color:TEXT_MUTED}}/>
              </div>
              <div style={{width:1,height:12,background:GRAY2,marginLeft:18}}/>
              <div className="loc-input-row" style={{position:"relative"}}>
                <div className="loc-dot dest"/>
                <input placeholder="Search destination…" value={destQ} autoFocus
                  onChange={e=>{setDestQ(e.target.value);setShowDrop(true);}}
                  onFocus={()=>setShowDrop(true)}/>
                {destQ&&<span style={{cursor:"pointer",fontSize:15,color:TEXT_MUTED}} onClick={()=>{setDestQ("");setShowDrop(false);}}>✕</span>}
                {showDrop&&(
                  <div className="dest-dropdown">
                    {filtered.length===0&&<div style={{padding:"14px 12px",fontSize:12,color:TEXT_MUTED}}>No places found</div>}
                    {filtered.map((p,i)=>(
                      <div key={i} className="dropdown-item" onClick={()=>{setDest(p);setDestQ(p.name);setShowDrop(false);go("rideselect");}}>
                        <span style={{fontSize:18}}>{p.icon}</span>
                        <div>
                          <div style={{fontSize:13,fontWeight:600,color:DARK}}>{p.name}</div>
                          <div className="dropdown-cat">{p.category}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="dest-content" onClick={()=>setShowDrop(false)}>
            <div className="section-title" style={{marginBottom:9}}>Nearby Campus Spots</div>
            {[
              {icon:"🏛️",name:"Great Hall",sub:"Landmark · Central UG"},
              {icon:"📚",name:"Balme Library",sub:"Academic · Main Campus"},
              {icon:"🏠",name:"Commonwealth Hall",sub:"Hostel · East Campus"},
              {icon:"🍔",name:"Enam's Place",sub:"Food · Near Viking Hostel"},
              {icon:"🛒",name:"Akornor Market",sub:"Market · Off Campus Rd"},
              {icon:"⚽",name:"Athletic Oval",sub:"Sports · UG Complex"},
            ].map((r,i)=>{
              const match = CAMPUS_PLACES.find(p=>p.name===r.name)||{name:r.name,coords:[5.6502,-0.1869]};
              return (
                <div key={i} className="nearby-item" onClick={()=>{setDest({...match});setDestQ(r.name);go("rideselect");}}>
                  <div className="nearby-icon">{r.icon}</div>
                  <div className="nearby-info"><h4>{r.name}</h4><p>{r.sub}</p></div>
                  <span style={{color:TEXT_MUTED,fontSize:14}}>›</span>
                </div>
              );
            })}
          </div>
        </div>
      );

      case "rideselect": return (
        <div className="ride-screen">
          {renderMapWrap({destination:dest, showRoute:true})}
          <div className="ride-sheet">
            <div className="sheet-handle"/>
            <h2>Choose a Ride</h2>
            <div className="price-note">
              {timeSlot==="day"?<><span>☀️</span>Day rates active (5 AM – 10 PM)</>:<><span>🌙</span>Night rates active (10 PM – 5 AM)</>}
            </div>
            {RIDE_OPTIONS.map(r=>(
              <div key={r.id} className={`ride-option ${selRide===r.id?"selected":""}`} onClick={()=>setSelRide(r.id)}>
                <div className="ride-img">{r.icon}</div>
                <div className="ride-details">
                  <h3>{r.name}</h3>
                  <p>{r.desc}</p>
                  <div className="ride-time-badge">~3 min</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="ride-price">GH₵ {price(r)}</div>
                  {timeSlot==="night"&&<div style={{fontSize:9,color:TEXT_MUTED,textDecoration:"line-through"}}>GH₵ {r.dayPrice} day</div>}
                </div>
              </div>
            ))}
            <button className="btn-primary" onClick={()=>go("rideconfirm")}>
              Select {RIDE_OPTIONS.find(r=>r.id===selRide)?.name}
            </button>
          </div>
        </div>
      );

      case "rideconfirm": {
        const ch = RIDE_OPTIONS.find(r=>r.id===selRide);
        return (
          <div className="confirm-screen">
            {renderMapWrap({destination:dest, showRoute:true})}
            <div className="confirm-sheet">
              <div className="sheet-handle"/>
              <h2 style={{fontFamily:"Inter",fontSize:18,fontWeight:700,marginBottom:12}}>Confirm Ride</h2>
              <div className="confirm-route">
                <div className="confirm-dots">
                  <div className="cdot" style={{background:YELLOW}}/><div className="cline"/><div className="cdot" style={{background:DARK}}/>
                </div>
                <div className="confirm-addrs">
                  <div className="confirm-addr"><p>PICKUP</p><p>My Location · UG Campus</p></div>
                  <div className="confirm-addr"><p>DROPOFF</p><p>{dest?.name||"Destination"}</p></div>
                </div>
              </div>
              {[["Ride type",ch?.name],["Est. distance","1.2 km"],["Est. time","5 min"],["Rate",timeSlot==="day"?"Day rate ☀️":"Night rate 🌙"]].map(([k,v])=>(
                <div key={k} className="fare-row"><span>{k}</span><span>{v}</span></div>
              ))}
              <div className="fare-total"><span>Total Fare</span><span>GH₵ {price(ch)}.00</span></div>
              <div className="payment-row">
                <span>💵</span><span style={{flex:1,fontSize:13,fontWeight:500}}>Cash</span>
                <span style={{color:TEXT_MUTED,fontSize:13}}>›</span>
              </div>
              <button className="btn-primary" onClick={()=>go("finding")}>Confirm & Request</button>
            </div>
          </div>
        );
      }

      case "finding": return (
        <div className="finding-screen">
          <div className="sonar"/><div className="sonar"/><div className="sonar"/>
          <div className="car-icon-big">🚗</div>
          <div className="finding-text">
            <h2>Finding your driver</h2>
            <p>Matching with a campus driver…</p>
            <div className="dot-loader"><div className="dot"/><div className="dot"/><div className="dot"/></div>
          </div>
          <div className="found-btn-wrap">
            <button className="btn-primary" style={{padding:"12px 32px",background:DARK,borderRadius:13,width:"auto"}} onClick={()=>go("enroute")}>
              Driver Found! →
            </button>
          </div>
          <div className="cancel-link" onClick={()=>go("home")}>Cancel Request</div>
        </div>
      );

      case "enroute": return (
        <div className="enroute-screen">
          {renderMapWrap({destination:dest, showRoute:true, driverMarkerPos:driverPos})}
          <div className="enroute-sheet">
            <div className="sheet-handle"/>
            <div className="eta-banner">
              <div><h3>Driver arriving</h3><p>{dest?.name||"Your pickup"}</p></div>
              <div className="eta-time">3 min</div>
            </div>
            <div className="driver-card">
              <div className="driver-avatar">KM</div>
              <div className="driver-info" style={{flex:1}}>
                <h4>Kwame Mensah</h4>
                <div className="driver-rating">⭐ 4.8 · Toyota Corolla</div>
              </div>
              <div className="plate-badge">GR-2341-24</div>
            </div>
            <div className="action-btns">
              <button className="action-btn" onClick={()=>{}}>📞 Call</button>
              <button className="action-btn" onClick={()=>setChatOpen(true)}>💬 Chat</button>
              <button className="action-btn danger" onClick={()=>go("home")}>✕ Cancel</button>
            </div>
            <button className="btn-primary" style={{marginTop:11}} onClick={()=>go("rating")}>Complete Ride →</button>
          </div>
          {chatOpen && renderChatOverlay("Kwame Mensah", "KM")}
        </div>
      );

      case "rating": {
        const r = RIDE_OPTIONS.find(r=>r.id===selRide);
        return (
          <div className="rating-screen">
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
              <button style={{background:"none",border:"none",fontSize:19,cursor:"pointer"}} onClick={()=>go("home")}>✕</button>
              <div>
                <h2 style={{fontFamily:"Inter",fontSize:22,fontWeight:700}}>How was your ride?</h2>
                <p style={{fontSize:12,color:TEXT_MUTED,marginTop:2}}>Rate Kwame's service</p>
              </div>
            </div>
            <div className="trip-summary-card">
              {[["From","My Location"],["To",dest?.name||"Destination"],["Duration","6 min"],["Fare",`GH₵ ${price(r)}.00`]].map(([k,v])=>(
                <div key={k} className="trip-stat"><span>{k}</span><span>{v}</span></div>
              ))}
            </div>
            <div className="stars-row">
              {[1,2,3,4,5].map(s=>(
                <div key={s} className={`star ${s<=stars?"lit":""}`} onClick={()=>setStars(s)}>⭐</div>
              ))}
            </div>
            <textarea className="feedback-textarea" placeholder="Leave a compliment or report an incident (optional)…"
              value={ratingFeedback} onChange={e=>setRatingFeedback(e.target.value)} rows={3}/>
            <p style={{textAlign:"center",fontSize:11,color:TEXT_MUTED,marginBottom:10}}>Add a tip for your driver</p>
            <div className="tip-row">
              {["GH₵ 1","GH₵ 2","GH₵ 5","No tip"].map(t=>(
                <button key={t} className={`tip-btn ${selTip===t?"selected":""}`} onClick={()=>setSelTip(t)}>{t}</button>
              ))}
            </div>
            <button className="btn-primary" onClick={()=>{addNotification("⭐","Rating Submitted","Thanks for your feedback!","success");setRatingFeedback("");go("home");}}>Submit Rating</button>
          </div>
        );
      }

      case "history": return (
        <div className="history-screen">
          <div className="history-header"><h2>Past Rides</h2></div>
          <div className="history-list">
            {PAST_RIDES.map(h=>(
              <div key={h.id} className="history-item" onClick={()=>{setSelHist(h);go("ridedetail");}}>
                <div className="history-icon" style={{background:h.status==="completed"?"rgba(255,184,0,0.12)":"rgba(229,57,53,0.07)"}}>🚗</div>
                <div className="history-info">
                  <h4>{h.dest}</h4>
                  <p>From {h.from}</p>
                  <p>{h.date}</p>
                  <div className={`history-status status-${h.status}`}>{h.status==="completed"?"✓ Completed":"✕ Cancelled"}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div className="history-price">{h.price}</div>
                  <div style={{fontSize:10,color:YELLOW,marginTop:3,fontWeight:700,cursor:"pointer"}}
                    onClick={e=>{e.stopPropagation();setDest(CAMPUS_PLACES.find(p=>p.name===h.dest)||{name:h.dest,coords:[5.6502,-0.1869]});go("rideselect");}}>
                    Rebook ›
                  </div>
                </div>
              </div>
            ))}
          </div>
          <BottomNav/>
        </div>
      );

      case "ridedetail": {
        const ride = selHist; if (!ride) return null;
        return (
          <div className="ridedetail-screen" style={{position:"relative"}}>
            <div className="ridedetail-hero">
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
                <BackBtn to="history" light/>
                <div>
                  <h2 style={{fontFamily:"Inter",fontSize:20,fontWeight:700,color:DARK}}>{ride.dest}</h2>
                  <p style={{fontSize:12,color:"rgba(0,0,0,0.6)",marginTop:2}}>{ride.date}</p>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{background:"rgba(0,0,0,0.1)",padding:"5px 12px",borderRadius:9,fontSize:13,fontWeight:700,color:DARK}}>{ride.price}</div>
                <div style={{background:ride.status==="completed"?"rgba(76,175,80,0.2)":"rgba(229,57,53,0.2)",padding:"5px 12px",borderRadius:9,fontSize:11,fontWeight:700,color:ride.status==="completed"?"#2E7D32":"#C62828"}}>
                  {ride.status==="completed"?"✓ Completed":"✕ Cancelled"}
                </div>
              </div>
            </div>
            <div className="detail-section">
              <h3>Route</h3>
              <div className="confirm-route" style={{marginBottom:0}}>
                <div className="confirm-dots">
                  <div className="cdot" style={{background:YELLOW}}/><div className="cline"/><div className="cdot" style={{background:DARK}}/>
                </div>
                <div className="confirm-addrs">
                  <div className="confirm-addr"><p>PICKUP</p><p>{ride.from}</p></div>
                  <div className="confirm-addr"><p>DROPOFF</p><p>{ride.dest}</p></div>
                </div>
              </div>
            </div>
            <div className="detail-section">
              <h3>Trip Stats</h3>
              {[["Duration",ride.duration],["Distance",ride.distance],["Total Fare",ride.price]].map(([k,v])=>(
                <div key={k} className="detail-row"><span>{k}</span><span>{v}</span></div>
              ))}
            </div>
            {ride.driver&&(
              <div className="detail-section">
                <h3>Driver</h3>
                <div className="driver-detail-card">
                  <div className="driver-avatar">{ride.driver.avatar}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:DARK}}>{ride.driver.name}</div>
                    <div style={{fontSize:11,color:TEXT_MUTED,marginTop:1}}>{ride.driver.car}</div>
                    <div className="driver-rating" style={{marginTop:2}}>⭐ {ride.driver.rating}</div>
                  </div>
                  <div className="plate-badge">{ride.driver.plate}</div>
                </div>
              </div>
            )}
            <div style={{padding:"13px 16px",display:"flex",gap:8}}>
              <button className="btn-primary" style={{flex:1,marginTop:0,padding:"12px"}}
                onClick={()=>{setDest(CAMPUS_PLACES.find(p=>p.name===ride.dest)||{name:ride.dest,coords:[5.6502,-0.1869]});go("rideselect");}}>
                🔁 Rebook This Ride
              </button>
            </div>
            {ride.driver&&(
              <button className="report-btn" onClick={()=>setShowReport(true)}>
                🚩 Report an Issue
              </button>
            )}
            {showReport&&(
              <div className="report-modal" onClick={()=>setShowReport(false)}>
                <div className="report-sheet" onClick={e=>e.stopPropagation()}>
                  <div style={{width:34,height:4,background:GRAY2,borderRadius:4,margin:"0 auto 16px"}}/>
                  <h3>Report an Issue</h3>
                  <p style={{fontSize:12,color:TEXT_MUTED,marginBottom:14}}>What happened on this ride?</p>
                  {["Driver was rude / unprofessional","Driver took the wrong route","Overcharged / incorrect fare","Driver arrived very late","Safety concern during ride","Left an item in the vehicle","Other issue"].map((o,i)=>(
                    <div key={i} className="report-option" onClick={()=>{setShowReport(false);addNotification("🚩","Report Submitted","We'll review your report shortly","warning");}}>
                      <span>⚠️</span><span>{o}</span>
                    </div>
                  ))}
                  <button className="btn-secondary" style={{marginTop:14}} onClick={()=>setShowReport(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        );
      }

      case "profile": return (
        <div className="profile-screen">
          <div className="profile-hero">
            <div className="profile-avatar-lg">JJ<div className="edit-badge">✏️</div></div>
            <h2>John Jones</h2>
            <p>john.jones@st.ug.edu.gh · ID: 10834521</p>
            <div className="profile-stats" style={{justifyContent:"center"}}>
              {[["47","Rides"],["4.9","Rating"],["GH₵ 312","Spent"]].map(([v,l])=>(
                <div key={l} className="stat-box" style={{textAlign:"center"}}><h3>{v}</h3><p>{l}</p></div>
              ))}
            </div>
          </div>
          <div style={{flex:1,overflow:"auto"}}>
            <div className="profile-section">
              <h3>Account</h3>
              {[{icon:"👤",bg:"rgba(255,184,0,0.12)",title:"Personal Info",sub:"Name, phone, email"},
                {icon:"🎓",bg:"rgba(33,150,243,0.1)",title:"Student Verification",sub:"Verified · UG Legon"},
                {icon:"🔔",bg:"rgba(156,39,176,0.1)",title:"Notifications",sub:"Manage alerts"}].map((r,i)=>(
                <div key={i} className="profile-row">
                  <div className="profile-row-icon" style={{background:r.bg}}>{r.icon}</div>
                  <div className="profile-row-info"><h4>{r.title}</h4><p>{r.sub}</p></div>
                  <span className="chevron">›</span>
                </div>
              ))}
            </div>
            <div className="profile-section">
              <h3>Preferences</h3>
              {[{icon:"💳",bg:"rgba(76,175,80,0.1)",title:"Payment Methods",sub:"Cash · Add card"},
                {icon:"🎁",bg:"rgba(255,152,0,0.12)",title:"Promo Codes",sub:"2 active codes",action:()=>go("promo")},
                {icon:"🛡️",bg:"rgba(229,57,53,0.1)",title:"Safety",sub:"Emergency contacts",action:()=>go("safety")},
                {icon:"💬",bg:"rgba(76,175,80,0.1)",title:"Support",sub:"Help & FAQ",action:()=>go("support")}].map((r,i)=>(
                <div key={i} className="profile-row" onClick={r.action}>
                  <div className="profile-row-icon" style={{background:r.bg}}>{r.icon}</div>
                  <div className="profile-row-info"><h4>{r.title}</h4><p>{r.sub}</p></div>
                  <span className="chevron">›</span>
                </div>
              ))}
            </div>
            <div style={{padding:"0 16px 28px"}}>
              <button className="btn-secondary" onClick={()=>go("login")}>Log Out</button>
            </div>
          </div>
          <BottomNav/>
        </div>
      );

      case "promo": return (
        <div className="promo-screen">
          <div className="promo-header">
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <BackBtn to="profile"/>
              <h2 style={{margin:0}}>Promo Codes</h2>
            </div>
          </div>
          <div className="promo-input-row"><input placeholder="Enter promo code"/><button className="apply-btn">Apply</button></div>
          <div className="promo-list" style={{marginTop:14}}>
            <div className="section-title" style={{marginBottom:9}}>Active Codes</div>
            {[{code:"UGFRESH24",title:"30% OFF",desc:"First 3 rides on campus",valid:"Expires Dec 31, 2025"},
              {code:"LEGON10",title:"GH₵ 10 OFF",desc:"Weekend rides · Min GH₵ 20",valid:"Expires Jan 15, 2026"}].map((p,i)=>(
              <div key={i} className="promo-card">
                <h3>{p.title}</h3><p>{p.desc}</p>
                <div style={{marginTop:5,fontSize:10,color:"rgba(0,0,0,0.5)"}}>{p.valid}</div>
                <div className="promo-code-badge">{p.code}</div>
              </div>
            ))}
            <div className="section-title" style={{padding:"12px 0 8px"}}>Used Codes</div>
            <div className="promo-card used">
              <div className="used-badge">USED</div>
              <h3>GH₵ 5 OFF</h3><p>Welcome bonus · Used Oct 3</p>
              <div className="promo-code-badge">WELCOME5</div>
            </div>
          </div>
        </div>
      );

      case "safety": return (
        <div className="safety-screen">
          <div className="safety-header">
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <BackBtn to="profile" light/>
              <div><h2>Safety Centre</h2><p>Your safety is our priority</p></div>
            </div>
          </div>
          <button className="sos-btn">SOS</button>
          <p style={{textAlign:"center",fontSize:11,color:TEXT_MUTED,padding:"0 26px 4px"}}>Press SOS to alert campus security and your emergency contacts</p>
          {[{icon:"📍",bg:"rgba(255,184,0,0.12)",title:"Share Trip",desc:"Share your live location with trusted contacts during rides"},
            {icon:"🎙️",bg:"rgba(33,150,243,0.1)",title:"Audio Recording",desc:"Automatically record audio during rides for safety review"},
            {icon:"🏫",bg:"rgba(76,175,80,0.1)",title:"Campus Security",desc:"Direct line: UG Campus Security · 0302-500-114"}].map((f,i)=>(
            <div key={i} className="safety-feature">
              <div className="safety-feature-icon" style={{background:f.bg}}>{f.icon}</div>
              <div><h4>{f.title}</h4><p>{f.desc}</p></div>
            </div>
          ))}
          <div className="emergency-contacts">
            <div className="section-title" style={{marginBottom:9}}>Emergency Contacts</div>
            {[{initials:"MA",name:"Mom",phone:"+233 24 000 1234"},{initials:"KO",name:"Kofi Owusu",phone:"+233 50 111 9876"}].map((c,i)=>(
              <div key={i} className="contact-item">
                <div className="contact-avatar">{c.initials}</div>
                <div className="contact-info"><h4>{c.name}</h4><p>{c.phone}</p></div>
                <span style={{color:TEXT_MUTED,cursor:"pointer"}}>✕</span>
              </div>
            ))}
            <div className="add-contact"><span>＋</span><span>Add Emergency Contact</span></div>
          </div>
        </div>
      );

      // ── SUPPORT SCREEN ──────────────────────────────────────────────────
      case "support": return (
        <div className="support-screen">
          <div className="support-header">
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <BackBtn to={role==="driver"?"driver-profile":"profile"} light/>
              <div><h2>Support</h2><p>How can we help you?</p></div>
            </div>
          </div>
          <div className="support-body">
            {SUPPORT_TOPICS.map((topic,i)=>(
              <div key={i} className={`support-topic ${supportExpanded===i?"expanded":""}`} onClick={()=>setSupportExpanded(supportExpanded===i?null:i)}>
                <div className="support-topic-header">
                  <div className="support-topic-icon" style={{background:GRAY}}>{topic.icon}</div>
                  <div className="support-topic-info">
                    <h4>{topic.title}</h4>
                    <p>{topic.desc}</p>
                  </div>
                  <span style={{marginLeft:"auto",color:GRAY2,fontSize:16,transition:"transform 0.2s",transform:supportExpanded===i?"rotate(90deg)":"none"}}>›</span>
                </div>
                {supportExpanded===i && (
                  <div className="support-items">
                    {topic.items.map((item,j)=>(
                      <div key={j} className="support-item" onClick={e=>{e.stopPropagation();addNotification("📩","Ticket Created",`"${item}" — we'll get back to you soon`,"success");}}>
                        <span>•</span><span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="support-chat-prompt">
              <h4>💬 Still need help?</h4>
              <p>Chat with our support team for personalized assistance</p>
              <button className="btn-primary" style={{width:"auto",padding:"10px 24px",fontSize:13}} onClick={()=>addNotification("💬","Support Chat","Connecting you to an agent…","info")}>
                Start Live Chat
              </button>
            </div>
          </div>
        </div>
      );

      case "driver-payment": return (
        <div className="payment-screen">
          <div className="payment-header">
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <BackBtn to="driver-profile"/>
              <h2 style={{margin:0}}>Pay Commission</h2>
            </div>
          </div>
          <div className="payment-body">
            <div className="payment-amount-card">
              <p>Commission Owed</p>
              <h3>GH₵ {commissionOwed.toFixed(2)}</h3>
              <p style={{marginTop:6,fontSize:10}}>15% of GH₵ {driverTotalEarnings}.00 total earnings</p>
            </div>
            {commissionOwed >= 40 && (
              <div className="commission-warning" style={{margin:"0 0 16px"}}>
                <span>⚠️</span>
                <p>Your commission is approaching the <b>GH₵ 50.00</b> lockout threshold. Please pay soon to avoid account suspension.</p>
              </div>
            )}
            <div className="section-title" style={{marginBottom:10}}>Select Payment Method</div>
            {[
              {id:"mtn", name:"MTN Mobile Money", desc:"Pay via MTN MoMo", icon:"📱", color:"#FFCA28", bg:"rgba(255,202,40,0.12)"},
              {id:"vodafone", name:"Vodafone Cash", desc:"Pay via Vodafone Cash", icon:"📲", color:"#E53935", bg:"rgba(229,57,53,0.08)"},
            ].map(m => (
              <div key={m.id} className={`momo-option ${paymentMethod===m.id?"selected":""}`} onClick={()=>setPaymentMethod(m.id)}>
                <div className="momo-icon" style={{background:m.bg}}>{m.icon}</div>
                <div className="momo-details">
                  <h4>{m.name}</h4>
                  <p>{m.desc}</p>
                </div>
                <div className="momo-radio">{paymentMethod===m.id&&<span style={{fontSize:10}}>●</span>}</div>
              </div>
            ))}
            {paymentMethod && (
              <>
                <input className="payment-input" placeholder={paymentMethod==="mtn"?"MTN Number (e.g. 024 XXX XXXX)":"Vodafone Number (e.g. 020 XXX XXXX)"} value={paymentPhone} onChange={e=>setPaymentPhone(e.target.value)} type="tel"/>
                <div className="payment-summary">
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:12,color:TEXT_MUTED}}>Amount</span>
                    <span style={{fontSize:12,fontWeight:700,color:DARK}}>GH₵ {commissionOwed.toFixed(2)}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:12,color:TEXT_MUTED}}>Method</span>
                    <span style={{fontSize:12,fontWeight:600,color:DARK}}>{paymentMethod==="mtn"?"MTN MoMo":"Vodafone Cash"}</span>
                  </div>
                </div>
                <button className="btn-primary" style={{background:"#4CAF50"}} onClick={()=>{addNotification("✅","Payment Initiated","Check your phone to confirm payment","success");go("driver-profile");}}>
                  Pay GH₵ {commissionOwed.toFixed(2)}
                </button>
                <p style={{fontSize:10,color:TEXT_MUTED,textAlign:"center",marginTop:8}}>A prompt will be sent to your phone to confirm payment</p>
              </>
            )}
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <>
      <style>{CSS}</style>
       <div className="app-shell">
         <div className="phone-frame">
           <div className="phone-notch"></div>
           <div className="phone-shell">
             <div className="screen screen-transition" key={screenKey}>
               {renderInner()}
               {notifications.length > 0 && (
                 <div className="notif-stack">
                   {notifications.map(n => (
                     <div key={n.id} className={`notif-toast ${n.type}`}>
                       <div className="notif-icon" style={{background: n.type==="success"?"rgba(76,175,80,0.12)":n.type==="warning"?"rgba(255,111,0,0.12)":n.type==="error"?"rgba(229,57,53,0.12)":"rgba(255,184,0,0.12)"}}>{n.icon}</div>
                       <div className="notif-text"><h4>{n.title}</h4><p>{n.message}</p></div>
                       <button className="notif-close" onClick={()=>setNotifications(prev=>prev.filter(x=>x.id!==n.id))}>✕</button>
                     </div>
                   ))}
                 </div>
               )}
             </div>
             <div className="phone-home-indicator"></div>
           </div>
         </div>
       </div>
    </>
  );
}
