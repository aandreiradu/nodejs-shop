const deleteProduct = async (btn) => {
  btn.disabled = true;
  console.log("clicked", btn);
  console.log("parentNode", btn.parentNode);

  const productId = btn.parentNode.querySelector("[name=productId]").value;
  const csrfToken = btn.parentNode.querySelector("[name=_csrf]").value;
  const productEl = btn.closest("article");

  console.log(productId, csrfToken);
  console.log("productEl", productEl);

  try {
    const response = await fetch(`/admin/product/${productId}`, {
      method: "DELETE",
      headers: {
        "csrf-token": csrfToken,
      },
    });

    console.log("response", response);
    const responseParsed = await response.json();
    console.log("responseParsed", responseParsed);
    const { message } = responseParsed;
    if (message === "Success") {
      console.log("succes ok => remove from DOM");
      productEl.parentNode.removeChild(productEl);
      btn.disabled = false;
    }
  } catch (error) {
    console.log("error", error);
    btn.disabled = false;
  }
};
