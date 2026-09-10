document.addEventListener('DOMContentLoaded', function() {
    var acc = document.getElementsByClassName("accordion");
    var i;

    for (i = 0; i < acc.length; i++) {
        acc[i].addEventListener("click", function() {
            // Fecha qualquer sanfona que já estiver aberta
            var currentActive = document.querySelector(".accordion.active");
            if (currentActive && currentActive !== this) {
                currentActive.classList.remove("active");
                currentActive.nextElementSibling.style.maxHeight = null;
            }

            // Abre/fecha a sanfona clicada
            this.classList.toggle("active");
            var panel = this.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    }
});
