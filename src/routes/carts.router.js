import { Router } from 'express';
import { MongoCartManager } from '../DATA/DAOs/cartsMongo.dao.js';
import { isUser } from '../middlewares/auth.middlewares.js';
import { cartService} from '../services/carts.service.js'
import { productService} from '../services/product.service.js'
import { ticketService } from '../services/ticket.service.js';
import { generateUniqueCode } from '../utils/codeGenerator.js';
import { ErrorMessages } from '../errors/errorNum.js';
import CustomError from '../errors/customErrors.js';
import logger from '../winston.js';




const router = Router();

const cartManagerInstance = new MongoCartManager();

router.post('/', (req, res) => {
  const newCart = cartManagerInstance.createCart();
  logger.info('Carrito creado con éxito -TestLogger');
  res.status(201).json(newCart);
});


router.get('/:cid', async (req, res) => {
  const cartId = req.params.cid;
  try {
    const cart = await cartManagerInstance.getPopulatedCartById(cartId);
    res.json(cart.products);
  } catch (error) {
    const customError = CustomError.createError(ErrorMessages.CART_NOT_FOUND);
    logger.error('Carrito no encontrado -TestLogger');
    return res.status(customError.status).json(customError);
  }
});


router.post('/:cid/product/:pid', isUser, async (req, res) => {
  const cartId = req.params.cid;  
  const productId = req.params.pid; 
  const { quantity } = req.body;

  if (!quantity || isNaN(quantity)) {
    const customError = CustomError.createError(ErrorMessages.QUANTITY_NOT_VALID);
    logger.error('Cantidad no válida -TestLogger');
    return res.status(customError.status).json(customError);
  }

  const cart = cartManagerInstance.addProductToCart(cartId, productId, quantity);
  if (!cart) {
    const customError = CustomError.createError(ErrorMessages.CART_NOT_FOUND);
    logger.error('Carrito no encontrado -TestLogger');
    return res.status(customError.status).json(customError);
  }
  res.json(cart);
});


router.delete('/:cid/product/:pid', async (req, res) => {
  const cartId = req.params.cid;
  const productId = req.params.pid;

  try {
    const cart = await cartManagerInstance.removeProductFromCart(cartId, productId);
    if (!cart) {
      const customError = CustomError.createError(ErrorMessages.CART_NOT_FOUND);
      logger.error('Carrito no encontrado -TestLogger');
      return res.status(customError.status).json(customError);
    }
    res.json(cart);
  } catch (error) {
    const customError = CustomError.createError(ErrorMessages.REMOVE_FROM_CART_ERROR);
    logger.error('Error al eliminar producto -TestLogger');
    return res.status(customError.status).json(customError);
  }
});


router.delete('/:cid', async (req, res) => {
  const cartId = req.params.cid;

  try {
    const cart = await cartManagerInstance.clearCart(cartId);
    if (!cart) {
     const customError = CustomError.createError(ErrorMessages.CART_NOT_FOUND);
     logger.error('Carrito no encontrado -TestLogger');
     return res.status(customError.status).json(customError);
    }
    res.json(cart);
  } catch (error) {
    const customError = CustomError.createError(ErrorMessages.CLEAR_CART_ERROR);
    logger.error('Error al vaciar carrito -TestLogger');
    return res.status(customError.status).json(customError);
  }
});

router.put('/:cid', async (req, res) => {
  const cartId = req.params.cid;
  const newProducts = req.body.products;

  try {
    console.log(' Nuevos productos recibidos:', newProducts);
    
    const cart = await cartManagerInstance.updateCart(cartId, newProducts);

    console.log('Carrito actualizado:', cart);
    res.json(cart);
  } catch (error) {
    logger.error('Error al actualizar el carrito -TestLogger');
    res.status(500).json({ error: 'Error al actualizar el carrito' });
  }
});


router.put('/:cid/product/:pid', async (req, res) => {
  const cartId = req.params.cid;
  const productId = req.params.pid;
  const newQuantity = req.body.quantity;

  try {
    const cart = await cartManagerInstance.updateProductQuantity(cartId, productId, newQuantity);
    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la cantidad de productos en el carrito' });
  }
});

router.post('/:cid/purchase', async (req, res) => {
  const cartId = req.params.cid;

  try {
    const cart = await cartService.getCartById(cartId);
    if (!cart) {
      return res.status(404).json({ error: 'Carrito no encontrado' });
    }
    const productsNotPurchased = [];
    for (const productInfo of cart.products) {
      const product = await productService.getProductById(productInfo.product);
      if (!product) {
        return res.status(404).json({ error: 'No se encontró el producto' });
      }
      if (product.stock < productInfo.quantity) {
        productsNotPurchased.push(productInfo.product);
        continue;
      } else {
      product.stock -= productInfo.quantity;
      await product.save();
      }

    }
    cart.productsNotPurchased = productsNotPurchased;

    await cartService.calculateTotalAmount(cart);

    const ticketData = {
      code: await generateUniqueCode(), 
      purchase_datetime: new Date(),
      amount: cart.totalAmount,  
      purchaser: "JUAN",
    };
    const ticket = await ticketService.createTicket(ticketData);

    await cart.save();

    res.status(201).json({ message: 'Compra exitosa', ticket, notPurchasedProducts: productsNotPurchased });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


export default router;