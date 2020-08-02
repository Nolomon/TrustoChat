function btrAlert(title, content, tail) {
  //* create alert elements
  let mdl = document.createElement("div");
  mdl.className = "w3-modal";
  mdl.style.display = "block";
  let mdlContent = document.createElement("div");
  mdlContent.className = "w3-modal-content w3-animate-top w3-card-4";
  mdl.appendChild(mdlContent);

  // Header
  let header = document.createElement("header");
  header.className = "btrAlert-header w3-container w3-black w3-display-container";
  let closeBtn = document.createElement("span");
  closeBtn.className =
    "btrAlert-closeBtn w3-button w3-xlarge w3-display-topright w3-hover-black w3-hover-opacity";
  closeBtn.innerHTML = "×";
  let alertTitle = document.createElement("h2");
  header.appendChild(closeBtn);
  header.appendChild(alertTitle);

  // Body
  let body = document.createElement("div");
  body.className = "btrAlert-body w3-container";
  body.innerHTML = "<p></p>";
  body.style.fontSize = '9px';

  // Footer
  let footer = document.createElement("footer");
  footer.className = "btrAlert-footer w3-container w3-black";
  footer.innerHTML = "<p></p>";

  //* Composing Alert Elements
  mdlContent.appendChild(header);
  mdlContent.appendChild(body);
  mdlContent.appendChild(footer);

  //* Filling Values
  alertTitle.textContent = title;
  body.children[0].textContent = content;
  footer.children[0].textContent = tail;

  //* CSS

  //* Closing Event
  closeBtn.onclick = () => {
    mdl.style.display = "none";
  };
  return document.body.appendChild(mdl);
}

function toastSnackbar(text, duration) {
  let saveToast = document.createElement("div");
  saveToast.id = "snackbar";
  saveToast.className = 'show';
  saveToast.innerHTML = text;
  let style = document.createElement("style");
  document.getElementsByTagName("head")[0].appendChild(style);
  style.innerHTML = `
        #snackbar {
        min-width: 250px;
        margin-left: -125px;
        background-color: #333;
        color: #fff;
        text-align: center;
        border-radius: 2px;
        padding: 16px;
        position: fixed;
        z-index: 1;
        left: 50%;
        bottom: 15%;
        font-size: 17px;
      }
      
      #snackbar.show {
        -webkit-animation: fadein 0.5s;
        animation: fadein 0.5s;
      }

      #snackbar.hide {
        -webkit-animation: fadeout 0.25s;
        animation: fadeout 0.25s;
      }

      @-webkit-keyframes fadein {
        from {bottom: 0; opacity: 0;} 
        to {bottom: 15%; opacity: 1;}
      }
      
      @keyframes fadein {
        from {bottom: 0; opacity: 0;}
        to {bottom: 15%; opacity: 1;}
      }
      
      @-webkit-keyframes fadeout {
        from {bottom: 15%; opacity: 1;} 
        to {bottom: 0; opacity: 0;}
      }
      
      @keyframes fadeout {
        from {bottom: 15%; opacity: 1;}
        to {bottom: 0; opacity: 0;}
      }`;

  document.body.appendChild(saveToast);
    setTimeout(function () {
        saveToast.className = saveToast.className.replace("show", "hide");
        setTimeout(() => {
            saveToast.remove();
        }, 250);
      }, duration);
}




function downloadText(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}