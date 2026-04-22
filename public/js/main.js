(function () {
  "use strict";
  var c, currentScrollTop = 0;
  var navbar = document.querySelector(".x-bar");
  if (navbar) {
    window.addEventListener("scroll", function () {
      var a = window.scrollY || document.documentElement.scrollTop;
      var b = navbar.offsetHeight;
      currentScrollTop = a;
      if (c < currentScrollTop && a > b + b) {
        navbar.classList.add("scrollUp");
      } else if (c > currentScrollTop && !(a <= b)) {
        navbar.classList.remove("scrollUp");
      }
      c = currentScrollTop;
    });
  }
})();

(function () {
  "use strict";
  var forms = document.querySelectorAll(".needs-validation");
  Array.prototype.slice.call(forms).forEach(function (form) {
    form.addEventListener(
      "submit",
      function (event) {
        if (!form.checkValidity()) {
          event.preventDefault();
          event.stopPropagation();
        }
        form.classList.add("was-validated");
      },
      false
    );
  });
})();

if (typeof SignaturePad !== "undefined") {
  var canvas = document.getElementById("signature-canvas");
  if (canvas) {
    var signaturePad = new SignaturePad(canvas, {
      backgroundColor: "rgba(0, 0, 0, 0)",
    });
    var clearEl = document.getElementById("clear");
    var saveEl = document.getElementById("save");
    if (clearEl) {
      clearEl.addEventListener("click", function () {
        signaturePad.clear();
      });
    }
    if (saveEl) {
      saveEl.addEventListener("click", function () {
        var sig = document.getElementById("signature");
        if (!sig) return;
        if (signaturePad.isEmpty()) {
          sig.value = "";
          return;
        }
        sig.value = signaturePad.toDataURL();
      });
    }
  }
}
