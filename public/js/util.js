

function copyToClipboard(text) {
    var dummy = document.createElement("textarea");
    // to avoid breaking orgain page when copying more words
    // cant copy when adding below this code
    // dummy.style.display = 'none'
    document.body.appendChild(dummy);
    //Be careful if you use texarea. setAttribute('value', value), which works with "input" does not work with "textarea". – Eduard
    dummy.value = text;

    function execCopy() {
    dummy.select();
    document.execCommand("copy");
    document.body.removeChild(dummy);
    document.removeEventListener('click', execCopy);
    }
    
    document.addEventListener('click',execCopy);
    document.click();
}

function toastSnackbar(text){
    let copiedToast = document.createElement("div");
    copiedToast.innerHTML = text;copiedToast.style.cssText = " min-width: 250px; /* Set a default minimum width */ margin-left: -125px; /* Divide value of min-width by 2 */ background-color: #333; /* Black background color */ color: #fff; /* White text color */ text-align: center; /* Centered text */ border-radius: 2px; /* Rounded borders */ padding: 16px; /* Padding */ position: fixed; /* Sit on top of the screen */z-index: 1; /* Add a z-index if needed */ left: 50%; /* Center the snackbar */ bottom: 30px; /* 30px from the bottom */";
    let style = document.createElement("style");
    style.innerHTML = "@keyframes fadein { from {bottom: 0; opacity: 0;} to {bottom: 30px; opacity: 1;} }\
      @keyframes fadeout {from {bottom: 30px; opacity: 1;}to {bottom: 0; opacity: 0;}}";
    copiedToast.style.animation = "fadein 0.5s, fadeout 0.5s 2.5s";
}
