const socketClient = io();

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('view-details-button')) {
      const productId = event.target.getAttribute('data-product-id');
      viewDetails(productId);
    }

    if (event.target.classList.contains('add-to-cart-button')) {
      const productId = event.target.getAttribute('data-product-id');
      getCartIdAndAddToCart(productId); 
    }
  });
});