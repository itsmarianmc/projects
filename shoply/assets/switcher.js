// Switcher from https://codepen.io/DenDionigi/pen/JodwNzX

const switcher = document.querySelector(".switcher");

const trackPrevious = (el) => {
    const radios = el.querySelectorAll('input[type="radio"]');
    let previousValue = null;

    const initiallyChecked = el.querySelector('input[type="radio"]:checked');
    if (initiallyChecked) {
        previousValue = initiallyChecked.getAttribute("c-option");
        el.setAttribute("c-previous", previousValue);
        showSection(initiallyChecked.value);
    }

    radios.forEach((radio) => {
        radio.addEventListener("change", () => {
            if (radio.checked) {
                el.setAttribute("c-previous", previousValue ?? "");
                previousValue = radio.getAttribute("c-option");
                showSection(radio.value);
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
    });
};

function showSection(value) {
    const radios = document.querySelectorAll('input[type="radio"][name="section"]');
    radios.forEach(radio => {
        const sectionDiv = document.getElementById(radio.value);
        if (sectionDiv) {
            if (radio.value === value) {
                sectionDiv.classList.remove("isHidden", "hidden");
            } else {
                sectionDiv.classList.add("isHidden", "hidden");
            }
        }
    });
}

trackPrevious(switcher);