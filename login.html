<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Lakshmi ID Maker</title>

<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />

<style>
/* ==== BASIC STYLES ==== */
:root{--sidebar-width:72px;--primary-color:#1da1f2;--secondary-color:#0096c7;--bg-dark:#1e2a38;--bg-hover:#27394f;--text-light:#fff;--text-muted:#a0aec0;--shadow:0 4px 12px rgba(0,0,0,0.1);--transition:all 0.3s ease;--card-bg:#fff;--input-bg:#e9ecef;--text-color:#212529;--placeholder-color:#6c757d;--border-color:#dee2e6;}
*{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif;}
body{display:flex;flex-direction:column;height:100vh;background:#f4f6f8;overflow:hidden;position:relative;}
.view{position:absolute;top:0;left:0;width:100%;height:100%;transition:opacity 0.5s ease-out,visibility 0.5s ease-out;opacity:0;visibility:hidden;}
.view.active{opacity:1;visibility:visible;z-index:100;}
/* SPLASH */
.splash-screen{background:var(--card-bg);display:flex;justify-content:center;align-items:center;z-index:9999;}
.splash-content img{max-width:350px;animation:pulse 2s infinite ease-in-out;}
@keyframes pulse{0%{transform:scale(1);opacity:1}50%{transform:scale(1.08);opacity:0.95}100%{transform:scale(1);opacity:1}}
/* LOGIN */
.login-view-container{display:flex;justify-content:center;align-items:center;background-image:url('https://i.ibb.co/wZ1F6MdS/flat-lay-workstation-with-copy-space-laptop.jpg');background-size:cover;background-position:center;background-repeat:no-repeat;}
.login-container{width:100%;max-width:450px;background:var(--card-bg);border-radius:20px;padding:40px;box-shadow:0 10px 40px rgba(0,0,0,0.1);border:1px solid var(--border-color);}
.login-logo{text-align:center;margin-bottom:20px;}
.login-logo img{max-width:150px;}
.login-logo h1{font-size:1.8rem;margin-top:10px;color:var(--primary-color);font-weight:700;}
.input-group{margin-bottom:20px;position:relative;}
.input-group input{width:100%;padding:12px 15px;padding-left:45px;border-radius:10px;border:1px solid var(--border-color);background:var(--input-bg);color:var(--text-color);font-size:1rem;transition:all 0.3s ease;}
.input-group input:focus{border-color:var(--primary-color);box-shadow:0 0 10px rgba(0,119,182,0.2);outline:none;background:#fff;}
.input-group .fas{position:absolute;left:15px;top:50%;transform:translateY(-50%);color:var(--placeholder-color);font-size:1.1rem;}
.input-group .fas.fa-eye,.input-group .fas.fa-eye-slash{left:auto;right:15px;cursor:pointer;color:var(--primary-color);transition:color 0.3s ease;}
.login-btn{width:100%;padding:14px;background:var(--primary-color);color:#fff;font-weight:600;font-size:1.1rem;border:none;border-radius:12px;cursor:pointer;transition:all 0.3s ease;box-shadow:0 5px 20px rgba(0,119,182,0.4);}
.login-btn:hover{background:var(--secondary-color);box-shadow:0 5px 25px rgba(0,150,199,0.6);transform:translateY(-2px);}
.error-message{margin-top:20px;text-align:center;color:#dc3545;background:rgba(220,53,69,0.1);padding:10px;border-radius:8px;border:1px solid #dc3545;display:none;}
.footer-login{margin-top:30px;font-size:13px;text-align:center;color:var(--placeholder-color);}
.footer-login a{color:var(--primary-color);text-decoration:none;transition:color 0.3s ease;}
.footer-login a:hover{color:var(--secondary-color);text-decoration:underline;}
/* APP */
.app-view-container{display:flex;flex:1;overflow:hidden;}
.sidebar{width:var(--sidebar-width);background:var(--bg-dark);color:var(--text-light);display:flex;flex-direction:column;transition:var(--transition);box-shadow:var(--shadow);z-index:1000;}
.sidebar-header{padding:20px 0 10px;background:#1c2733;display:flex;flex-direction:column;align-items:center;}
.sidebar-header img{width:42px;height:42px;margin-bottom:4px;}
.menu{flex:1;padding-top:10px;display:flex;flex-direction:column;}
.menu-item{position:relative;display:flex;justify-content:center;align-items:center;padding:16px 0;margin:8px;cursor:pointer;color:var(--text-muted);border-radius:10px;transition:var(--transition);}
.menu-item i{font-size:26px;z-index:2;}
.menu-item:hover{background:var(--bg-hover);color:#fff;box-shadow:0 0 12px rgba(29,161,242,0.6);transform:scale(1.1);}
.menu-item.active{background:var(--primary-color);color:#fff;}
.main-content{flex:1;background:#fff;position:relative;}
iframe{width:100%;height: calc(100vh - 40px);border:none;opacity:0;transition:opacity 0.5s ease;}
iframe.visible{opacity:1;}
#loader{position:absolute;width:100%;height: calc(100vh - 40px);background:#fff;display:flex;align-items:center;justify-content:center;z-index:10;}
.spinner{width:48px;height:48px;border:6px solid #e0e0e0;border-top:6px solid var(--primary-color);border-radius:50%;animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
footer{width:100%;background:#1e2a38;color:#fff;font-size:14px;text-align:center;padding:10px 0;z-index:999;box-shadow:0 -2px 8px rgba(0,0,0,0.1);}
footer a{color:var(--primary-color);text-decoration:none;}
</style>
</head>
<body>

<!-- SPLASH -->
<div class="view splash-screen active" id="splashView">
    <div class="splash-content">
        <img src="https://i.ibb.co/r2zt8CRQ/Penport-logo-03.png" alt="Logo">
    </div>
</div>

<!-- LOGIN -->
<div class="view login-view-container" id="loginView">
    <div class="login-container">
        <div class="login-logo">
            <img src="https://i.ibb.co/spxrb3cK/Logo-Lakshmi.png" alt="Logo">
            <h1>Lakshmi ID Maker</h1>
        </div>
        <form id="loginForm">
            <div class="input-group">
                <i class="fas fa-envelope"></i>
                <input type="email" id="email" placeholder="Email" required autocomplete="username" />
            </div>
            <div class="input-group">
                <i class="fas fa-lock"></i>
                <input type="password" id="password" placeholder="Password" required autocomplete="current-password" />
                <i class="fas fa-eye" id="togglePassword"></i>
            </div>
            <button type="submit" class="login-btn">LOG IN</button>
            <div id="errorMsg" class="error-message"></div>
        </form>
        <div class="footer-login">
            © 2025 Developed by <a href="https://penportindia.github.io/penport/" target="_blank">Penport India</a>
        </div>
    </div>
</div>

<!-- APP -->
<div class="view app-view-container" id="appView">
    <div class="sidebar">
        <div class="sidebar-header">
            <img src="https://i.ibb.co/pv4P6tML/Lakshmi-Logo-01.png" alt="Logo"/>
        </div>
        <div class="menu">
            <div class="menu-item active" data-key="dashboard" onclick="loadPage(this,'dashboard')">
                <i class="material-icons">dashboard</i>
            </div>
            <div class="menu-item" data-key="create" onclick="loadPage(this,'create')">
                <i class="material-icons">add_circle</i>
            </div>
            <div class="menu-item" data-key="manage" onclick="loadPage(this,'manage')">
                <i class="material-icons">folder</i>
            </div>
            <div class="menu-item" data-key="template" onclick="loadPage(this,'template')">
                <i class="material-icons">description</i>
            </div>
            <div class="menu-item" data-key="schools" onclick="loadPage(this,'schools')">
                <i class="material-icons">school</i>
            </div>
            <div class="menu-item" data-key="print" onclick="loadPage(this,'print')">
                <i class="material-icons">print</i>
            </div>
            <div class="menu-item" data-key="export" onclick="loadPage(this,'export')">
                <i class="material-icons">file_upload</i>
            </div>
            <div class="menu-item" data-key="logout" onclick="logout()" style="margin-top:auto;margin-bottom:16px;">
                <i class="material-icons">logout</i>
            </div>
        </div>
    </div>
    <div class="main-content">
        <div id="loader"><div class="spinner"></div></div>
        <iframe id="contentFrame"></iframe>
    </div>
    <footer>
        <p>© 2025 Lakshmi ID Maker. All rights reserved.</p>
    </footer>
</div>

<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAR3KIgxzn12zoWwF3rMs7b0FfP-qe3mO4",
    authDomain: "schools-cdce8.firebaseapp.com",
    projectId: "schools-cdce8",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const splashView=document.getElementById('splashView');
const loginView=document.getElementById('loginView');
const appView=document.getElementById('appView');
const form=document.getElementById("loginForm");
const errorDiv=document.getElementById("errorMsg");
const passwordInput=document.getElementById("password");
const emailInput=document.getElementById("email");
const iframe=document.getElementById("contentFrame");
const loader=document.getElementById("loader");
const togglePassword=document.getElementById('togglePassword');

const pageLinks={
    dashboard:"https://penportindia.github.io/lak/Pages/Dashboard/index.html",
    create:"https://penportindia.github.io/lak/Pages/Addnew.html",
    manage:"https://penportindia.github.io/lak/Pages/Manage/Manage.html",
    template:"https://penportindia.github.io/lak/Pages/Template/index.html",
    schools:"https://penportindia.github.io/lak/Pages/Schools/index.html",
    print:"https://penportindia.github.io/lak/Pages/Print/Print.html",
    export:"https://penportindia.github.io/lak/Pages/Export/index.html"
};

// Show view
function showView(view){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));view.classList.add('active');}

// Logout
window.logout=function(){
    sessionStorage.clear();
    signOut(auth).then(()=>{showView(loginView);}).catch(()=>{showView(loginView);});
}

// Check auth
function checkAuthentication(){
    onAuthStateChanged(auth,user=>{
        if(user && sessionStorage.getItem('isAuthenticated')==='true'){
            showView(appView);
            loadPage(document.querySelector(".menu-item[data-key='dashboard']"),'dashboard');
        }else{
            sessionStorage.clear();
            showView(loginView);
        }
    });
}

// Login form
form.addEventListener("submit",e=>{
    e.preventDefault();
    errorDiv.style.display="none";
    signInWithEmailAndPassword(auth,emailInput.value,passwordInput.value)
    .then(()=>{
        sessionStorage.setItem('isAuthenticated','true');
        checkAuthentication();
    })
    .catch(()=>{errorDiv.textContent="❌ Invalid Email or Password";errorDiv.style.display="block";passwordInput.value="";});
});

// Password toggle
togglePassword.addEventListener('click',()=>{
    const type=passwordInput.type==='password'?'text':'password';
    passwordInput.type=type;
    togglePassword.classList.toggle('fa-eye');togglePassword.classList.toggle('fa-eye-slash');
});

// Active menu
window.setActiveMenu=function(el){document.querySelectorAll(".menu-item").forEach(i=>i.classList.remove("active"));el.classList.add("active");}

// Load iframe page
window.loadPage=function(el,key){
    setActiveMenu(el);
    loader.style.display="flex";
    iframe.classList.remove("visible");
    if(sessionStorage.getItem('isAuthenticated')!=='true'){logout();return;}
    iframe.src=pageLinks[key]||pageLinks.dashboard;
    setTimeout(()=>{iframe.classList.add("visible");loader.style.display="none";},500);
}

// On load
window.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{checkAuthentication();},1500);});

// Clear session on page unload/close
window.addEventListener('beforeunload',()=>{sessionStorage.clear();});
</script>

</body>
</html>
