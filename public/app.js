function openTab(tab) {
    document.querySelectorAll(".tab").forEach(t => t.style.display = "none");
    document.getElementById(tab).style.display = "block";
  }
  
  openTab("apis");