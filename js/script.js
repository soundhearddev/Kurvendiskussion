function calculate() {
  document.getElementById("demo").innerHTML = "Berechen..ng läuft...";
  document.getElementById("analyze_form").addEventListener("submit", function (e) {
  e.preventDefault();

  var formData = new FormData(form);
  // output as an object
  console.log(Object.fromEntries(formData));

  // ...or iterate through the name-value pairs
  for (var pair of formData.entries()) {
    console.log(pair[0] + ": " + pair[1]);
  }
});
}
