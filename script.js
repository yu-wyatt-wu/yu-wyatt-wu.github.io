const topButton = document.querySelector(".top-button");

topButton?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
